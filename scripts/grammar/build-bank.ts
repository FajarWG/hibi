/**
 * Bangun bank grammar dari data legacy Nihongo Flow -> features/kakou/grammar/
 * bank.generated.json (artefak yang masuk git, bisa di-review).
 *
 * DRY / bebas DB: hanya membaca file legacy dan menulis JSON. Seeding ke
 * database adalah langkah terpisah setelah DB dipilih.
 *
 * Legacy diimpor dinamis dengan path runtime supaya `tsc` tidak ikut
 * mengetik file di luar project. Jalankan: bun scripts/grammar/build-bank.ts
 */
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

import {
  buildBank,
  validateBank,
  type GrammarPointSeed,
  type LegacyBunpouLesson,
  type LegacyConjugationGuide,
} from "@/features/kakou/grammar/transform";

const LEGACY = resolve(import.meta.dir, "../../../read-japan");

async function loadLegacy(): Promise<{
  lessons: LegacyBunpouLesson[];
  guides: LegacyConjugationGuide[];
}> {
  const bunpouPath = resolve(LEGACY, "src/modules/bunpou/data/bunpouData.ts");
  const katsuyouPath = resolve(
    LEGACY,
    "src/modules/katsuyou/data/conjugationGuides.ts",
  );
  const bunpou = (await import(bunpouPath)) as {
    BUNPOU_DATA?: LegacyBunpouLesson[];
  };
  const katsuyou = (await import(katsuyouPath)) as {
    CONJUGATION_GUIDES?: Record<string, LegacyConjugationGuide>;
  };
  return {
    lessons: bunpou.BUNPOU_DATA ?? [],
    guides: Object.values(katsuyou.CONJUGATION_GUIDES ?? {}),
  };
}

function countBy(
  seeds: GrammarPointSeed[],
  key: (s: GrammarPointSeed) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of seeds) {
    const k = key(s);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

const { lessons, guides } = await loadLegacy();
const seeds = buildBank(lessons, guides);
const issues = validateBank(seeds);

const outPath = resolve(
  import.meta.dir,
  "../../features/kakou/grammar/bank.generated.json",
);
writeFileSync(outPath, `${JSON.stringify(seeds, null, 2)}\n`);

console.log(
  `Bunpou lessons: ${lessons.length} | Katsuyou guides: ${guides.length}`,
);
console.log(`GrammarPoints: ${seeds.length}`);
console.log("By level:", countBy(seeds, (s) => s.level));
console.log("By provenance:", countBy(seeds, (s) => s.provenance));
console.log(`Validation issues: ${issues.length}`);
for (const issue of issues.slice(0, 20)) {
  console.log(`  [${issue.legacyId}] ${issue.field}: ${issue.message}`);
}
console.log(`Wrote ${outPath}`);

if (issues.length > 0) process.exitCode = 1;
