/**
 * Engine SRS terpadu Hibi.
 *
 * Satu-satunya tempat penjadwalan review dihitung. Anki, Kanji Tamago, dan
 * pola grammar Kakou memakai fungsi yang sama lewat model `ReviewState`.
 * Nihongo Flow lama punya tiga implementasi SM-2 terpisah; Hibi punya satu.
 *
 * Modul ini SENGAJA murni: tidak meng-import Prisma maupun `server-only`,
 * sehingga bisa di-unit-test tanpa database dan dipakai di server maupun
 * (untuk preview interval) di client.
 *
 * Konversi SM-2 -> FSRS untuk data warisan dilakukan sekali saat ETL, lihat
 * `scripts/phase1/transform.ts` dan `docs/srs.md`. Di sini kita hanya
 * menjadwalkan maju dari state yang sudah ada.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type FSRS,
  type Grade,
  type State,
} from "ts-fsrs";

/** Nilai review yang terlihat user. Dipetakan 1:1 ke Rating ts-fsrs 1..4. */
export type ReviewGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

/** Urutan tetap, dipakai UI grading bar dan preview interval. */
export const REVIEW_GRADES: readonly ReviewGrade[] = [
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
] as const;

const GRADE_TO_RATING: Record<ReviewGrade, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

/** Rating numerik (1..4) untuk disimpan di `ReviewLog.rating`. */
export function gradeToRating(grade: ReviewGrade): number {
  return GRADE_TO_RATING[grade];
}

/**
 * Subset field `ReviewState` yang relevan untuk penjadwalan, dilepas dari
 * Prisma supaya engine tetap murni. Row Prisma bisa langsung dilewatkan
 * karena secara struktural kompatibel.
 *
 * Catatan: ts-fsrs v5 menambah `learning_steps` yang TIDAK disimpan di
 * skema `ReviewState`. Kita default-kan 0 saat memuat. Konsekuensinya kartu
 * yang sedang di tengah langkah belajar jangka pendek memulai ulang langkahnya
 * setelah proses restart. Dapat diterima untuk app personal yang datanya
 * mayoritas state Review; lihat docs/srs.md untuk jalur upgrade.
 */
export type SrsState = {
  stability: number;
  difficulty: number;
  state: number; // 0 New, 1 Learning, 2 Review, 3 Relearning
  reps: number;
  lapses: number;
  scheduledDays: number;
  elapsedDays: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
};

/** Cocok dengan kolom `ReviewLog`. Nilai adalah snapshot SEBELUM transisi. */
export type SrsLog = {
  rating: number;
  state: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  dueAt: Date;
  reviewedAt: Date;
};

export type ScheduleResult = {
  state: SrsState;
  log: SrsLog;
};

export type GradePreview = {
  grade: ReviewGrade;
  rating: number;
  dueAt: Date;
  scheduledDays: number;
  intervalLabel: string;
};

const DAY_MS = 86_400_000;

// Satu instance dengan parameter default (request_retention 0.9). Fuzz
// dimatikan agar interval deterministik dan bisa di-test.
let engine: FSRS | null = null;
function getEngine(): FSRS {
  engine ??= fsrs(generatorParameters({ enable_fuzz: false }));
  return engine;
}

function toCard(state: SrsState): Card {
  return {
    due: state.dueAt,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: 0,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReviewedAt ?? undefined,
  };
}

function fromCard(card: Card): SrsState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    state: card.state,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduled_days,
    elapsedDays: card.elapsed_days,
    lastReviewedAt: card.last_review ?? null,
    dueAt: card.due,
  };
}

/** State untuk item yang belum pernah dilihat (kind apa pun). */
export function newState(now: Date = new Date()): SrsState {
  return fromCard(createEmptyCard(now));
}

/**
 * Interval singkat yang mudah dibaca untuk label grading bar.
 * Berbasis selisih `dueAt - now`, jadi langkah belajar sub-hari (mis. 10m)
 * ikut tampil benar.
 */
export function formatInterval(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return "1m";
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    return `${Math.round(minutes / 60)}h`;
  }
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Jadwalkan maju satu review. Mengembalikan state baru untuk disimpan dan
 * log untuk `ReviewLog`. Fungsi murni: `now` di-inject agar deterministik.
 */
export function schedule(
  state: SrsState,
  grade: ReviewGrade,
  now: Date = new Date(),
): ScheduleResult {
  const { card, log } = getEngine().next(
    toCard(state),
    now,
    GRADE_TO_RATING[grade],
  );
  return {
    state: fromCard(card),
    log: {
      rating: log.rating,
      state: log.state,
      stability: log.stability,
      difficulty: log.difficulty,
      elapsedDays: log.elapsed_days,
      scheduledDays: log.scheduled_days,
      dueAt: log.due,
      reviewedAt: log.review,
    },
  };
}

/**
 * Preview keempat pilihan grade tanpa menyimpan apa pun. Dipakai grading bar
 * untuk memperlihatkan "Again 10m / Hard 1d / Good 3d / Easy 7d".
 */
export function previewGrades(
  state: SrsState,
  now: Date = new Date(),
): GradePreview[] {
  const record = getEngine().repeat(toCard(state), now);
  return REVIEW_GRADES.map((grade) => {
    const item = record[GRADE_TO_RATING[grade]];
    const days = (item.card.due.getTime() - now.getTime()) / DAY_MS;
    return {
      grade,
      rating: GRADE_TO_RATING[grade],
      dueAt: item.card.due,
      scheduledDays: item.card.scheduled_days,
      intervalLabel: formatInterval(days),
    };
  });
}

/** Probabilitas mengingat saat ini (0..1). Untuk analitik dan pemilihan antrean. */
export function retrievability(
  state: SrsState,
  now: Date = new Date(),
): number {
  return getEngine().get_retrievability(toCard(state), now, false);
}

/** Apakah item jatuh tempo pada waktu tertentu. */
export function isDue(state: SrsState, now: Date = new Date()): boolean {
  return state.dueAt.getTime() <= now.getTime();
}
