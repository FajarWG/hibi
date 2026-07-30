"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  createSessionCookie,
  destroySessionCookie,
  getSession,
} from "@/lib/session";

export type AuthFormState = {
  fieldErrors?: Record<string, string[]>;
  message?: string;
} | null;

const credentials = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(32, "Use at most 32 characters")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Use only letters, numbers, and the characters _ . -",
    ),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "Use at most 200 characters"),
});

/**
 * Zod v4 menandai `.flatten()` sebagai deprecated, jadi field error
 * dibangun langsung dari `issues` supaya tidak bergantung pada API itu.
 */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

/** Membatasi redirect ke path internal supaya tidak bisa dipakai open redirect. */
function safeNextPath(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "/today";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/today";
  return raw;
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { username, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) {
    return { fieldErrors: { username: ["This username is already in use"] } };
  }

  const user = await prisma.user.create({
    data: { username, passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true, username: true, role: true },
  });

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  redirect(safeNextPath(formData.get("next")));
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  // Validasi gagal dijawab dengan pesan yang sama seperti kredensial salah,
  // supaya tidak membocorkan username mana yang terdaftar.
  if (!parsed.success) {
    return { message: "Username or password is incorrect" };
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true, passwordHash: true },
  });

  // Tetap jalankan bcrypt walau user tidak ada, supaya waktu responsnya
  // tidak membocorkan keberadaan akun (timing attack).
  const dummyHash = "$2b$12$rpRD9oFN4.1MeD32CE9SDOWq8/t8LTfR/tVx/wXxVBElQc7.YSzs.";
  const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !matches) {
    return { message: "Username or password is incorrect" };
  }

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  redirect(safeNextPath(formData.get("next")));
}

export async function logout(): Promise<void> {
  await destroySessionCookie();
  redirect("/login");
}

/** Dipakai Server Action lain yang wajib punya user. Melempar kalau belum login. */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new Error("Tidak terautentikasi");
  }
  return session.userId;
}
