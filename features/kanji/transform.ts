/**
 * Transform Kanji Tamago: legacy kanji_tamago.json -> KanjiEntry Hibi.
 * Murni & bebas IO agar bisa di-unit-test tanpa file/DB.
 */

export type LegacyKanjiItem = { moji: string; yomi: string; imi: string };
export type LegacyKanjiCategory = {
  kanji?: LegacyKanjiItem[];
  kata?: LegacyKanjiItem[];
};
export type LegacyKanjiChapter = {
  ka: string | number;
  topik: string;
  teishutsu_kanji?: LegacyKanjiCategory;
  yomeru?: LegacyKanjiCategory;
  mite_wakaru?: LegacyKanjiCategory;
};

export type KanjiExample = { word: string; yomi: string; imi: string };
export type KanjiEntrySeed = {
  chapter: string;
  topic: string;
  category: string;
  character: string;
  readings: string;
  meaning: string;
  examples: KanjiExample[] | null;
};

export const KANJI_CATEGORIES = [
  "teishutsu_kanji",
  "yomeru",
  "mite_wakaru",
] as const;

function itemsOf(category?: LegacyKanjiCategory): LegacyKanjiItem[] {
  if (!category) return [];
  return category.kanji ?? category.kata ?? [];
}

export function chapterToEntries(
  chapter: LegacyKanjiChapter,
  examplesMap: Record<string, KanjiExample[]> = {},
): KanjiEntrySeed[] {
  const ka = String(chapter.ka);
  const entries: KanjiEntrySeed[] = [];
  for (const category of KANJI_CATEGORIES) {
    for (const item of itemsOf(chapter[category])) {
      const examples = examplesMap[item.moji];
      entries.push({
        chapter: ka,
        topic: chapter.topik,
        category,
        character: item.moji,
        readings: item.yomi,
        meaning: item.imi,
        examples: examples && examples.length > 0 ? examples : null,
      });
    }
  }
  return entries;
}

export function buildKanjiBank(
  chapters: LegacyKanjiChapter[],
  examplesMap: Record<string, KanjiExample[]> = {},
): KanjiEntrySeed[] {
  const seen = new Set<string>();
  const out: KanjiEntrySeed[] = [];
  for (const chapter of chapters) {
    for (const entry of chapterToEntries(chapter, examplesMap)) {
      const key = `${entry.chapter}:${entry.category}:${entry.character}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
  }
  return out;
}

export type KanjiValidationIssue = {
  key: string;
  field: string;
  message: string;
};

export function validateKanjiBank(
  entries: KanjiEntrySeed[],
): KanjiValidationIssue[] {
  const issues: KanjiValidationIssue[] = [];
  const categories: readonly string[] = KANJI_CATEGORIES;
  for (const entry of entries) {
    const key = `${entry.chapter}:${entry.category}:${entry.character}`;
    if (!entry.character.trim())
      issues.push({ key, field: "character", message: "empty" });
    if (!entry.readings.trim())
      issues.push({ key, field: "readings", message: "empty" });
    if (!entry.meaning.trim())
      issues.push({ key, field: "meaning", message: "empty" });
    if (!categories.includes(entry.category))
      issues.push({ key, field: "category", message: `invalid ${entry.category}` });
  }
  return issues;
}
