/**
 * Seed bank grammar (features/kakou/grammar/bank.generated.json) ke database.
 * Idempoten lewat upsert pada legacyId. Setiap GrammarPoint mendapat satu
 * ReviewItem(kind GRAMMAR) supaya bisa masuk antrean review terpadu.
 *
 * Jalankan (override DATABASE_URL ke hibi_db bila perlu):
 *   DATABASE_URL="..." bun scripts/grammar/seed-bank.ts --apply
 * Tanpa --apply hanya dry-run (menghitung, tidak menulis).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import type { GrammarPointSeed } from "@/features/kakou/grammar/transform";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const apply = process.argv.includes("--apply");
const bankPath = resolve(
  import.meta.dir,
  "../../features/kakou/grammar/bank.generated.json",
);
const seeds = JSON.parse(readFileSync(bankPath, "utf8")) as GrammarPointSeed[];

console.log(`bank: ${seeds.length} grammar points from ${bankPath}`);
if (!apply) {
  console.log("dry-run only; pass --apply to write to the database");
  process.exit(0);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const jsonOrNull = (value: unknown) =>
  value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

try {
  let created = 0;
  for (const s of seeds) {
    const data = {
      legacyId: s.legacyId,
      level: s.level,
      chapter: s.chapter,
      pattern: s.pattern,
      meaningId: s.meaningId,
      frame: s.frame,
      writingTask: s.writingTask,
      constraints: jsonOrNull(s.constraints),
      expectedForms: jsonOrNull(s.expectedForms),
      weaknessTags: s.weaknessTags as Prisma.InputJsonValue,
      commonMistakes: jsonOrNull(s.commonMistakes),
      examples: s.examples as Prisma.InputJsonValue,
      provenance: s.provenance,
      verified: s.verified,
    };
    const point = await prisma.grammarPoint.upsert({
      where: { legacyId: s.legacyId },
      update: data,
      create: data,
    });
    await prisma.reviewItem.upsert({
      where: { grammarId: point.id },
      update: {},
      create: { kind: "GRAMMAR", grammarId: point.id },
    });
    created += 1;
  }
  const total = await prisma.grammarPoint.count();
  const items = await prisma.reviewItem.count({ where: { kind: "GRAMMAR" } });
  console.log(`upserted ${created} points`);
  console.log(`hibi_grammar_point total: ${total}`);
  console.log(`GRAMMAR review items: ${items}`);
} finally {
  await prisma.$disconnect();
}
