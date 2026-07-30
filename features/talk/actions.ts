"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/features/auth/actions";

const turnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(4000),
  at: z.string(),
});

const saveSchema = z.object({
  scenario: z.string().max(40),
  level: z.enum(["N5", "N4", "N3"]),
  turns: z.array(turnSchema).max(1000),
  summary: z
    .object({
      newVocab: z.array(z.string().max(64)).max(50).default([]),
      corrections: z.array(z.string().max(500)).max(50).default([]),
      score: z.number().min(0).max(100).nullable().default(null),
    })
    .nullable()
    .default(null),
});

/** Simpan transkrip percakapan + ringkasan pasca-sesi. */
export async function saveTalkSession(
  input: unknown,
): Promise<{ id: string }> {
  const userId = await requireUserId();
  const data = saveSchema.parse(input);

  const created = await prisma.talkSession.create({
    data: {
      userId,
      scenario: data.scenario,
      level: data.level,
      turns: data.turns as unknown as Prisma.InputJsonValue,
      summary: data.summary
        ? (data.summary as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      endedAt: new Date(),
    },
    select: { id: true },
  });

  revalidatePath("/talk");
  return { id: created.id };
}
