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
