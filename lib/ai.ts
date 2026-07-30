import "server-only";

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import { aiEnabled, env } from "@/lib/env";

/**
 * Klien Gemini sisi server. Kunci API TIDAK PERNAH dikirim ke browser —
 * semua panggilan AI lewat modul ini dan route di app/api/ai/.
 */

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!aiEnabled) {
    throw new Error("AI is disabled: GEMINI_API_KEY is not set");
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export type WritingCorrection = {
  issue: string;
  suggestion: string;
  category: string;
};

export type WritingReviewResult = {
  corrections: WritingCorrection[];
  scores: { accuracy: number; complexity: number; naturalness: number };
};

const resultSchema = z.object({
  corrections: z
    .array(
      z.object({
        issue: z.string().max(500),
        suggestion: z.string().max(500),
        category: z.string().max(64),
      }),
    )
    .max(20)
    .default([]),
  scores: z.object({
    accuracy: z.number(),
    complexity: z.number(),
    naturalness: z.number(),
  }),
});

const clampScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

export async function reviewWriting(input: {
  text: string;
  pattern: string;
  meaning: string;
}): Promise<WritingReviewResult> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      `Pola tata bahasa: 「${input.pattern}」(${input.meaning}).`,
      `Kalimat siswa: ${input.text}`,
      "Nilai kalimat ini. Untuk tiap kesalahan beri: issue (deskripsi singkat), suggestion (perbaikan), dan category (slug pendek seperti particle-wo, te-form, word-order, politeness). Beri skor accuracy, complexity, naturalness (0-100).",
    ].join("\n"),
    config: {
      systemInstruction:
        "Anda guru bahasa Jepang yang teliti. Balasan penjelasan (issue/suggestion) dalam bahasa Indonesia. Jujur namun mendukung.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          corrections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issue: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                category: { type: Type.STRING },
              },
              required: ["issue", "suggestion", "category"],
            },
          },
          scores: {
            type: Type.OBJECT,
            properties: {
              accuracy: { type: Type.NUMBER },
              complexity: { type: Type.NUMBER },
              naturalness: { type: Type.NUMBER },
            },
            required: ["accuracy", "complexity", "naturalness"],
          },
        },
        required: ["corrections", "scores"],
      },
    },
  });

  const parsed = resultSchema.parse(JSON.parse(response.text ?? "{}"));
  return {
    corrections: parsed.corrections,
    scores: {
      accuracy: clampScore(parsed.scores.accuracy),
      complexity: clampScore(parsed.scores.complexity),
      naturalness: clampScore(parsed.scores.naturalness),
    },
  };
}


/**
 * Error khusus saat kuota/token AI kita habis (RESOURCE_EXHAUSTED / 429).
 * Dipakai route untuk memberi sinyal ke UI agar beralih ke jalur manual
 * (pengguna menyalin prompt lalu memeriksa fotonya di AI miliknya sendiri).
 */
export class AiQuotaError extends Error {
  constructor(message = "AI quota exhausted") {
    super(message);
    this.name = "AiQuotaError";
  }
}

function isQuotaError(cause: unknown): boolean {
  const message = (cause instanceof Error ? cause.message : String(cause)).toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("resource exhausted") ||
    message.includes("exhausted") ||
    message.includes("429") ||
    message.includes("rate limit")
  );
}

export type WritingPhotoReviewResult = WritingReviewResult & {
  /** Teks tulisan tangan yang dibaca AI dari foto. */
  transcript: string;
};

const photoResultSchema = z.object({
  transcript: z.string().max(5000).default(""),
  corrections: z
    .array(
      z.object({
        issue: z.string().max(500),
        suggestion: z.string().max(500),
        category: z.string().max(64),
      }),
    )
    .max(30)
    .default([]),
  scores: z.object({
    accuracy: z.number(),
    complexity: z.number(),
    naturalness: z.number(),
  }),
});

/**
 * Review tulisan tangan dari FOTO buku catatan (Gemini multimodal). Membaca
 * aksara Jepang di foto, lalu menilai tiap bagian terhadap pola yang dilatih.
 * Melempar {@link AiQuotaError} bila kuota AI kita habis.
 */
export async function reviewWritingPhoto(input: {
  imageBase64: string;
  mimeType: string;
  pattern: string;
  meaning: string;
  parts: string[];
}): Promise<WritingPhotoReviewResult> {
  const ai = getClient();

  const partsText = input.parts.length
    ? input.parts.map((part, i) => `${i + 1}. ${part}`).join("\n")
    : "(tidak ada rincian bagian)";

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: input.imageBase64,
            mimeType: input.mimeType,
          },
        },
        [
          `Foto ini berisi tulisan tangan bahasa Jepang di buku catatan siswa.`,
          `Pola tata bahasa yang dilatih: 「${input.pattern}」(${input.meaning}).`,
          `Siswa diminta menulis 3 bagian berikut:\n${partsText}`,
          "Baca seluruh tulisan tangan di foto (field transcript). Bila ada bagian yang tidak terbaca, tulis [tidak terbaca].",
          "Nilai tulisannya. Untuk tiap kesalahan beri: issue (deskripsi singkat), suggestion (perbaikan), dan category (slug pendek seperti particle-wo, te-form, word-order, politeness). Beri skor accuracy, complexity, naturalness (0-100).",
        ].join("\n"),
      ],
      config: {
        systemInstruction:
          "Anda guru bahasa Jepang yang teliti dan mampu membaca tulisan tangan. Balasan penjelasan (transcript apa adanya; issue/suggestion dalam bahasa Indonesia). Jujur namun mendukung.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ["issue", "suggestion", "category"],
              },
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.NUMBER },
                complexity: { type: Type.NUMBER },
                naturalness: { type: Type.NUMBER },
              },
              required: ["accuracy", "complexity", "naturalness"],
            },
          },
          required: ["transcript", "corrections", "scores"],
        },
      },
    });
  } catch (cause) {
    if (isQuotaError(cause)) throw new AiQuotaError();
    throw cause;
  }

  const parsed = photoResultSchema.parse(JSON.parse(response.text ?? "{}"));
  return {
    transcript: parsed.transcript,
    corrections: parsed.corrections,
    scores: {
      accuracy: clampScore(parsed.scores.accuracy),
      complexity: clampScore(parsed.scores.complexity),
      naturalness: clampScore(parsed.scores.naturalness),
    },
  };
}


/** Model Gemini Live untuk percakapan suara real-time. */
export const TALK_MODEL = "gemini-2.0-flash-live-001";

/**
 * Buat ephemeral auth token berumur pendek untuk Gemini Live. Token inilah —
 * bukan kunci API asli — yang dipakai browser untuk menyambung ke Live API.
 * Kunci asli tetap di server.
 */
export async function createTalkToken(): Promise<string> {
  const ai = getClient();
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 2 * 60_000).toISOString(),
    },
  });
  if (!token.name) throw new Error("Failed to mint Live auth token");
  return token.name;
}
