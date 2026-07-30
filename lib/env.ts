import { z } from "zod";

/**
 * Validasi environment variable sekali di satu tempat.
 *
 * `GEMINI_API_KEY` sengaja opsional. Kalau kosong, fitur AI mati tapi
 * seluruh fitur inti tetap jalan: review SRS, sesi tulis Kakou tingkat 2
 * dan 3, kuis kanji, library, timer.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET minimal 32 karakter agar tidak mudah ditebak"),
  GEMINI_API_KEY: z.string().optional().default(""),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

const parsed = schema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Environment variable tidak valid. Salin .env.example ke .env lalu isi:\n${detail}`,
  );
}

export const env = parsed.data;

/** Apakah fitur AI tersedia. Dipakai untuk menurunkan tingkat, bukan mematikan fitur. */
export const aiEnabled = env.GEMINI_API_KEY.length > 0;
