/**
 * Tipe DTO review yang aman diserialisasi (Date -> ISO string) sehingga bisa
 * dikirim dari Server Component ke client. Sengaja murni: tidak meng-import
 * Prisma maupun `server-only`, jadi komponen client boleh mengimpornya.
 */
import type { ReviewGrade, SrsState } from "@/features/srs/scheduler";

export type ReviewDirection = "RECOGNIZE" | "RECALL";
export type ReviewKind = "VOCAB" | "KANJI" | "GRAMMAR";

/** Muatan tampilan untuk kartu vocab. Kind lain menambah muatannya sendiri. */
export type VocabPayload = {
  deck: string;
  term: string;
  reading: string;
  meaning: string;
  sentence: string | null;
  sentenceMeaning: string | null;
  audioFile: string | null;
  imageFile: string | null;
};

/** Muatan tampilan untuk kartu kanji (Kanji Tamago). */
export type KanjiPayload = {
  character: string;
  readings: string;
  meaning: string;
  chapter: string;
  topic: string;
  category: string;
  examples: { word: string; yomi: string; imi: string }[] | null;
};

/** SrsState dengan Date diserialisasi. */
export type SrsStateDto = Omit<SrsState, "lastReviewedAt" | "dueAt"> & {
  lastReviewedAt: string | null;
  dueAt: string;
};

export type ReviewCardDto = {
  stateId: string;
  itemId: string;
  kind: ReviewKind;
  direction: ReviewDirection;
  vocab?: VocabPayload | null;
  kanji?: KanjiPayload | null;
  /** State FSRS saat ini, HANYA untuk preview interval di client.
   *  Server tidak mempercayai nilai ini; ia membaca ulang dari database. */
  state: SrsStateDto;
};

/** Satu jawaban review yang dikirim client ke server. */
export type ReviewSubmission = {
  itemId: string;
  direction: ReviewDirection;
  grade: ReviewGrade;
  reviewedAt: string; // ISO
  elapsedMs: number;
};

/** Hidupkan kembali Date dari DTO untuk dipakai engine murni di client. */
export function reviveState(dto: SrsStateDto): SrsState {
  return {
    ...dto,
    lastReviewedAt: dto.lastReviewedAt ? new Date(dto.lastReviewedAt) : null,
    dueAt: new Date(dto.dueAt),
  };
}
