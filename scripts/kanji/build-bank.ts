/**
 * Bangun bank kanji dari legacy kanji_tamago.json -> features/kanji/
 * bank.generated.json. DRY / bebas DB. Jalankan: bun scripts/kanji/build-bank.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildKanjiBank,
  validateKanjiBank,
  type KanjiEntrySeed,
  type KanjiExample,
  type LegacyKanjiChapter,
} from "@/features/kanji/transform";

const LEGACY = resolve(import.meta.dir, "../../../read-japan/src/helper");

const chapters = JSON.parse(
  readFileSync(resolve(LEGACY, "kanji_tamago.json"), "utf8"),
) as LegacyKanjiChapter[];

let examplesMap: Record<string, KanjiExample[]> = {};
const examplesPath = resolve(LEGACY, "kanji_tamago_examples.json");
if (existsSync(examplesPath)) {
  examplesMap = JSON.parse(readFileSync(examplesPath, "utf8"));
}

const entries = buildKanjiBank(chapters, examplesMap);
const issues = validateKanjiBank(entries);

function countBy(
  seeds: KanjiEntrySeed[],
  key: (s: KanjiEntrySeed) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of seeds) out[key(s)] = (out[key(s)] ?? 0) + 1;
  return out;
}

const outPath = resolve(
  import.meta.dir,
  "../../features/kanji/bank.generated.json",
);
writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`);

const chapterCount = new Set(entries.map((e) => e.chapter)).size;
const withExamples = entries.filter((e) => e.examples).length;
console.log(`chapters: ${chapterCount} | kanji entries: ${entries.length}`);
console.log("by category:", countBy(entries, (e) => e.category));
console.log(`with examples: ${withExamples}`);
console.log(`validation issues: ${issues.length}`);
for (const issue of issues.slice(0, 20)) {
  console.log(`  [${issue.key}] ${issue.field}: ${issue.message}`);
}
console.log(`wrote ${outPath}`);

if (issues.length > 0) process.exitCode = 1;
