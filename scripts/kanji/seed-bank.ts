/**
 * Seed bank kanji (features/kanji/bank.generated.json) ke database.
 * Idempoten via upsert pada (chapter, category, character). Setiap entri
 * mendapat ReviewItem(kind KANJI) untuk antrean review terpadu.
 *
 *   DATABASE_URL="..." bun scripts/kanji/seed-bank.ts --apply
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import type { KanjiEntrySeed } from "@/features/kanji/transform";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const apply = process.argv.includes("--apply");
const bankPath = resolve(
  import.meta.dir,
  "../../features/kanji/bank.generated.json",
);
const entries = JSON.parse(readFileSync(bankPath, "utf8")) as KanjiEntrySeed[];

console.log(`bank: ${entries.length} kanji entries from ${bankPath}`);
if (!apply) {
  console.log("dry-run only; pass --apply to write to the database");
  process.exit(0);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const jsonOrNull = (value: unknown) =>
  value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);

try {
  let count = 0;
  for (const e of entries) {
    const data = {
      chapter: e.chapter,
      topic: e.topic,
      category: e.category,
      character: e.character,
      readings: e.readings,
      meaning: e.meaning,
      examples: jsonOrNull(e.examples),
    };
    const entry = await prisma.kanjiEntry.upsert({
      where: {
        chapter_category_character: {
          chapter: e.chapter,
          category: e.category,
          character: e.character,
        },
      },
      update: data,
      create: data,
    });
    await prisma.reviewItem.upsert({
      where: { kanjiId: entry.id },
      update: {},
      create: { kind: "KANJI", kanjiId: entry.id },
    });
    count += 1;
  }
  const total = await prisma.kanjiEntry.count();
  const items = await prisma.reviewItem.count({ where: { kind: "KANJI" } });
  console.log(`upserted ${count} entries`);
  console.log(`hibi_kanji_entry total: ${total}`);
  console.log(`KANJI review items: ${items}`);
} finally {
  await prisma.$disconnect();
}
