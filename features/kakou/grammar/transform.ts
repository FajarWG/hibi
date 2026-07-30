/**
 * Transform bank grammar: data legacy Bunpou/Katsuyou -> GrammarPoint Hibi.
 *
 * Bunpou/Katsuyou adalah REFERENSI untuk dibaca; Kakou adalah LATIHAN untuk
 * diproduksi. Jadi field ditransformasi, bukan disalin (PLAN 7.2.3):
 *   - dibuang: romaji, descEn, exampleEn (satu bahasa penjelasan: Indonesia)
 *   - dipertahankan: pattern, kana, contoh Jepang, arti Indonesia, blok mistake
 *   - ditambahkan: writingTask, frame, weaknessTags (default terderivasi;
 *     constraints/expectedForms diisi saat authoring, awalnya null)
 *
 * Modul murni & bebas IO supaya bisa di-unit-test tanpa file legacy / DB.
 */

// ── Bentuk input legacy (subset yang dipakai) ──
export type LegacyBunpouExample = {
  exampleJp: string;
  exampleKana: string;
  exampleId: string;
};
export type LegacyBunpouPattern = {
  id: string;
  pattern: string;
  jlpt: string;
  descId: string;
  examples: LegacyBunpouExample[];
};
export type LegacyBunpouLesson = {
  chapter: number;
  patterns: LegacyBunpouPattern[];
};
export type LegacyGrammarPattern = {
  pattern: string;
  jlpt: string;
  descId: string;
  exampleJp: string;
  exampleKana: string;
  exampleId: string;
};
export type LegacyMistakeExample = {
  bad: string;
  good: string;
  noteId: string;
};
export type LegacyConjugationGuide = {
  formKey: string;
  mistake?: { examples: LegacyMistakeExample[] };
  grammarPatterns: LegacyGrammarPattern[];
};

// ── Bentuk output (cocok dengan model GrammarPoint) ──
export type GrammarExample = {
  jp: string;
  kana: string;
  meaningId: string;
  highlight: string | null;
};
export type CommonMistake = { bad: string; good: string; noteId: string };
export type ExpectedForm = { kind: string; match: string; label: string };
export type GrammarProvenance = "bunpou" | "katsuyou" | "authored";

export type GrammarPointSeed = {
  legacyId: string;
  level: string;
  chapter: number | null;
  pattern: string;
  meaningId: string;
  frame: string | null;
  writingTask: string;
  constraints: string[] | null;
  expectedForms: ExpectedForm[] | null;
  weaknessTags: string[];
  commonMistakes: CommonMistake[] | null;
  examples: GrammarExample[];
  provenance: GrammarProvenance;
  verified: boolean;
};

const KANJI_RE = /[\u4e00-\u9faf\u3005]/;

const WEAKNESS_RULES: readonly (readonly [RegExp, string])[] = [
  [/を/, "particle-wo"],
  [/[はわ]は/, "particle-wa"],
  [/が/, "particle-ga"],
  [/に/, "particle-ni"],
  [/で/, "particle-de"],
  [/へ/, "particle-e"],
  [/より|ほど|くらい|一番/, "comparison"],
  [/ている|ておく|てから|てください|てはいけない/, "te-form"],
  [/ない|ません|なければ/, "negation"],
  [/ました|でした|～た/, "past-tense"],
  [/です|である/, "copula"],
];

function deriveWeaknessTags(pattern: string, formKey?: string): string[] {
  const tags = new Set<string>();
  for (const [re, tag] of WEAKNESS_RULES) if (re.test(pattern)) tags.add(tag);
  if (formKey) tags.add(`form-${formKey}`);
  return [...tags];
}

/** Ganti placeholder latin N1/N2/... dengan ruang isian. Null kalau tak ada. */
export function deriveFrame(pattern: string): string | null {
  const framed = pattern.replace(/N[0-9]/g, "___");
  return framed !== pattern ? framed : null;
}

function deriveWritingTask(pattern: string, meaningId: string): string {
  return `Tulis satu kalimat bahasa Jepang yang memakai pola「${pattern}」. Makna: ${meaningId}`;
}

function slug(value: string): string {
  return value
    .replace(/[^0-9a-zA-Z\u3040-\u30ff\u4e00-\u9faf]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function bunpouLessonToSeeds(
  lesson: LegacyBunpouLesson,
): GrammarPointSeed[] {
  return lesson.patterns.map((p) => ({
    legacyId: `bunpou:${p.id}`,
    level: p.jlpt,
    chapter: lesson.chapter ?? null,
    pattern: p.pattern,
    meaningId: p.descId,
    frame: deriveFrame(p.pattern),
    writingTask: deriveWritingTask(p.pattern, p.descId),
    constraints: null,
    expectedForms: null,
    weaknessTags: deriveWeaknessTags(p.pattern),
    commonMistakes: null,
    examples: p.examples.map((e) => ({
      jp: e.exampleJp,
      kana: e.exampleKana,
      meaningId: e.exampleId,
      highlight: null,
    })),
    provenance: "bunpou",
    verified: true,
  }));
}

export function katsuyouGuideToSeeds(
  guide: LegacyConjugationGuide,
): GrammarPointSeed[] {
  const commonMistakes: CommonMistake[] | null = guide.mistake
    ? guide.mistake.examples.map((m) => ({
        bad: m.bad,
        good: m.good,
        noteId: m.noteId,
      }))
    : null;

  return guide.grammarPatterns.map((gp) => ({
    legacyId: `katsuyou:${guide.formKey}:${slug(gp.pattern)}`,
    level: gp.jlpt,
    chapter: null,
    pattern: gp.pattern,
    meaningId: gp.descId,
    frame: deriveFrame(gp.pattern),
    writingTask: deriveWritingTask(gp.pattern, gp.descId),
    constraints: null,
    expectedForms: null,
    weaknessTags: deriveWeaknessTags(gp.pattern, guide.formKey),
    commonMistakes,
    examples: [
      {
        jp: gp.exampleJp,
        kana: gp.exampleKana,
        meaningId: gp.exampleId,
        highlight: null,
      },
    ],
    provenance: "katsuyou",
    verified: true,
  }));
}

/** Gabung semua sumber; dedup per legacyId lalu per (level, pattern).
 *  Bunpou (referensi N5 kanonik) dikonkat lebih dulu, jadi saat sebuah pola
 *  muncul di Bunpou dan Katsuyou (mis. ても, たら), entri Bunpou yang menang. */
export function buildBank(
  lessons: LegacyBunpouLesson[],
  guides: LegacyConjugationGuide[],
): GrammarPointSeed[] {
  const byId = new Map<string, GrammarPointSeed>();
  for (const seed of [
    ...lessons.flatMap(bunpouLessonToSeeds),
    ...guides.flatMap(katsuyouGuideToSeeds),
  ]) {
    byId.set(seed.legacyId, seed);
  }

  const byPattern = new Map<string, GrammarPointSeed>();
  for (const seed of byId.values()) {
    const key = `${seed.level}:${seed.pattern}`;
    if (!byPattern.has(key)) byPattern.set(key, seed);
  }
  return [...byPattern.values()];
}

export type ValidationIssue = {
  legacyId: string;
  field: string;
  message: string;
};

/** Cek skema, konsistensi kana, dan duplikat pola. */
export function validateBank(seeds: GrammarPointSeed[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();
  for (const s of seeds) {
    if (!s.pattern.trim())
      issues.push({ legacyId: s.legacyId, field: "pattern", message: "empty" });
    if (!s.meaningId.trim())
      issues.push({ legacyId: s.legacyId, field: "meaningId", message: "empty" });
    if (!/^N[1-5]$/.test(s.level))
      issues.push({
        legacyId: s.legacyId,
        field: "level",
        message: `invalid level "${s.level}"`,
      });
    if (s.examples.length === 0)
      issues.push({ legacyId: s.legacyId, field: "examples", message: "none" });
    for (const ex of s.examples) {
      if (KANJI_RE.test(ex.kana))
        issues.push({
          legacyId: s.legacyId,
          field: "examples.kana",
          message: `kana contains kanji: ${ex.kana}`,
        });
    }
    const key = `${s.level}:${s.pattern}`;
    const prev = seen.get(key);
    if (prev)
      issues.push({
        legacyId: s.legacyId,
        field: "pattern",
        message: `duplicate of ${prev}`,
      });
    else seen.set(key, s.legacyId);
  }
  return issues;
}
