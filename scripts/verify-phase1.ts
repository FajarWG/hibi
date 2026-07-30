import "dotenv/config";

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Client } from "pg";

import {
  defaultDekiruSource,
  loadDekiruCards,
  loadLegacySnapshot,
} from "@/scripts/phase1/source";
import { buildVocabSeeds } from "@/scripts/phase1/transform";
import type { VocabSeed } from "@/scripts/phase1/types";

type Failure = { scope: string; key: string; message: string };
type TargetUser = {
  legacyId: number;
  username: string;
  legacyPasswordHash: string | null;
};
type TargetState = {
  legacyProgressId: number;
  legacyCardKey: string | null;
  legacyInterval: number | null;
  legacyEase: number | null;
  legacyRepetitions: number | null;
  dueAt: Date;
  direction: string;
  legacyId: number | null;
  legacyKey: string;
};

type TargetVocab = VocabSeed & { updatedAt: Date };

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function inventory(root: string): Promise<Map<string, number>> {
  const files = new Map<string, number>();
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) {
        files.set(
          relative(root, absolute).split(sep).join("/"),
          (await stat(absolute)).size,
        );
      }
    }
  }
  await walk(root);
  return files;
}

function equal(left: unknown, right: unknown): boolean {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  return left === right;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const cutoff = new Date(option("--cutoff") ?? new Date().toISOString());
if (Number.isNaN(cutoff.getTime())) throw new Error("Invalid --cutoff value");
const sourceMedia = resolve(process.cwd(), "..", "public", "anki-media");
const targetMedia = resolve(process.cwd(), "public", "anki-media");
const reportPath = resolve(
  option("--report") ??
    resolve(process.cwd(), "reports", "phase1", "verification.json"),
);
const failures: Failure[] = [];
const fail = (scope: string, key: string, message: string) =>
  failures.push({ scope, key, message });

const client = new Client({ connectionString });
await client.connect();

try {
  const snapshot = await loadLegacySnapshot(client);
  const dekiru = await loadDekiruCards(defaultDekiruSource());
  const usersResult = await client.query<TargetUser>(`
    SELECT "legacyId", "username", "legacyPasswordHash"
    FROM "hibi_user" WHERE "legacyId" IS NOT NULL
  `);
  const vocabResult = await client.query<TargetVocab>(
    `SELECT * FROM "hibi_vocab_card"`,
  );
  const statesResult = await client.query<TargetState>(`
    SELECT s."legacyProgressId", s."legacyCardKey", s."legacyInterval",
           s."legacyEase", s."legacyRepetitions", s."dueAt",
           s."direction"::text, u."legacyId", v."legacyKey"
    FROM "hibi_review_state" s
    JOIN "hibi_user" u ON u."id" = s."userId"
    JOIN "hibi_review_item" i ON i."id" = s."itemId"
    JOIN "hibi_vocab_card" v ON v."id" = i."vocabId"
    WHERE s."legacyProgressId" IS NOT NULL
  `);
  const itemCount = await client.query<{ count: string }>(`
    SELECT COUNT(*)::text AS "count" FROM "hibi_review_item"
    WHERE "kind" = 'VOCAB'
  `);
  const expectedVocab = buildVocabSeeds(
    snapshot.customCards,
    dekiru.cards,
    cutoff,
  ).cards;
  const users = new Map(usersResult.rows.map((row) => [row.legacyId, row]));
  for (const source of snapshot.users) {
    const target = users.get(source.id);
    if (!target) fail("user", String(source.id), "missing migrated user");
    else {
      if (target.username !== source.username) {
        fail("user", String(source.id), "username differs");
      }
      if (target.legacyPasswordHash !== source.password) {
        fail("user", String(source.id), "legacy password hash differs");
      }
    }
  }

  const vocab = new Map(vocabResult.rows.map((row) => [row.legacyKey, row]));
  const fields: Array<keyof VocabSeed> = [
    "id", "legacyAnkiId", "source", "deck", "chapter", "sectionIndex",
    "sourceOrder", "term", "reading", "meaning", "romaji", "audioFile",
    "imageFile", "sentence", "sentenceMeaning", "sentenceAudioFile",
  ];
  for (const expected of expectedVocab) {
    const actual = vocab.get(expected.legacyKey);
    if (!actual) {
      fail("vocab", expected.legacyKey, "missing card");
      continue;
    }
    for (const field of fields) {
      if (!equal(actual[field], expected[field])) {
        fail("vocab", expected.legacyKey, `${field} differs`);
      }
    }
    if (expected.source === "CUSTOM" && !equal(actual.createdAt, expected.createdAt)) {
      fail("vocab", expected.legacyKey, "createdAt differs");
    }
  }
  if (vocabResult.rows.length !== expectedVocab.length) {
    fail("count", "vocab", `${vocabResult.rows.length} != ${expectedVocab.length}`);
  }
  if (Number(itemCount.rows[0].count) !== expectedVocab.length) {
    fail("count", "reviewItem", `${itemCount.rows[0].count} != ${expectedVocab.length}`);
  }

  const states = new Map(
    statesResult.rows.map((row) => [row.legacyProgressId, row]),
  );
  for (const source of snapshot.progress) {
    const target = states.get(source.id);
    if (!target) {
      fail("reviewState", String(source.id), "missing state");
      continue;
    }
    const expectedCard = expectedVocab.find((card) =>
      card.legacyKey === source.cardKey,
    );
    const checks: Array<[unknown, unknown, string]> = [
      [target.legacyId, source.userId, "legacy user id"],
      [target.legacyKey, expectedCard?.legacyKey, "linked card"],
      [target.legacyCardKey, source.cardKey, "legacyCardKey"],
      [target.legacyInterval, source.interval, "legacyInterval"],
      [target.legacyEase, source.ease, "legacyEase"],
      [target.legacyRepetitions, source.repetitions, "legacyRepetitions"],
      [target.dueAt.getTime(), source.dueDate.getTime(), "dueAt"],
      [target.direction, "RECOGNIZE", "direction"],
    ];
    for (const [actual, expected, label] of checks) {
      if (actual !== expected) fail("reviewState", String(source.id), `${label} differs`);
    }
  }
  if (statesResult.rows.length !== snapshot.progress.length) {
    fail("count", "reviewState", `${statesResult.rows.length} != ${snapshot.progress.length}`);
  }

  const sourceDue = snapshot.progress.filter((row) => row.dueDate <= cutoff).length;
  const targetDue = statesResult.rows.filter((row) => row.dueAt <= cutoff).length;
  if (sourceDue !== targetDue) fail("due", cutoff.toISOString(), `${targetDue} != ${sourceDue}`);

  const [sourceFiles, targetFiles] = await Promise.all([
    inventory(sourceMedia),
    inventory(targetMedia),
  ]);
  for (const [path, size] of sourceFiles) {
    const targetSize = targetFiles.get(path);
    if (targetSize === undefined) fail("media", path, "missing target file");
    else if (targetSize !== size) fail("media", path, `size ${targetSize} != ${size}`);
  }
  for (const card of vocabResult.rows) {
    for (const path of [card.audioFile, card.imageFile, card.sentenceAudioFile]) {
      if (path && !targetFiles.has(path)) fail("mediaReference", path, "missing file");
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cutoff: cutoff.toISOString(),
    passed: failures.length === 0,
    counts: {
      users: snapshot.users.length,
      vocabCards: expectedVocab.length,
      reviewStates: snapshot.progress.length,
      sourceDue,
      targetDue,
      sourceMedia: sourceFiles.size,
      targetMedia: targetFiles.size,
    },
    failures,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`report: ${reportPath}`);
  console.log(JSON.stringify(report.counts));
  if (!report.passed) throw new Error(`${failures.length} verification failures`);
  console.log("phase 1 verification passed");
} finally {
  await client.end();
}
