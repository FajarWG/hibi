import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import {
  defaultDekiruSource,
  loadDekiruCards,
  loadLegacySnapshot,
} from "@/scripts/phase1/source";
import {
  applyReviewItems,
  applyReviewStates,
  applyVocabCards,
} from "@/scripts/phase1/sql";
import {
  buildVocabSeeds,
  resolveReviewSeeds,
} from "@/scripts/phase1/transform";
import { applyUsers, loadExistingHibiUsers, planUsers } from "@/scripts/phase1/users";
import type { Phase1Report } from "@/scripts/phase1/types";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const apply = process.argv.includes("--apply");
const allowUnmatched = process.argv.includes("--allow-unmatched");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const migratedAt = new Date();
const sourceFile = resolve(option("--dekiru-source") ?? defaultDekiruSource());
const defaultReport = resolve(
  process.cwd(),
  "reports",
  "phase1",
  apply ? "anki-etl-apply.json" : "anki-etl-dry-run.json",
);
const reportPath = resolve(option("--report") ?? defaultReport);
const client = new Client({ connectionString });

async function saveReport(report: Phase1Report): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

await client.connect();
let locked = false;

try {
  const snapshot = await loadLegacySnapshot(client);
  const existingUsers = await loadExistingHibiUsers(client);
  const dekiru = await loadDekiruCards(sourceFile);
  const users = planUsers(snapshot.users, existingUsers);
  const vocab = buildVocabSeeds(
    snapshot.customCards,
    dekiru.cards,
    migratedAt,
  );
  const resolved = resolveReviewSeeds(
    snapshot.progress,
    users.legacyUserMap,
    vocab.byLegacyCardKey,
    migratedAt,
  );

  const progressKeys = new Set(snapshot.progress.map((row) => row.cardKey));
  const customProgress = snapshot.progress.filter((row) =>
    row.cardKey.startsWith("custom-"),
  ).length;
  const report: Phase1Report = {
    generatedAt: migratedAt.toISOString(),
    mode: apply ? "apply" : "dry-run",
    source: {
      users: snapshot.users.length,
      customCards: snapshot.customCards.length,
      dekiruCards: dekiru.cards.length,
      progress: snapshot.progress.length,
      progressCustom: customProgress,
      progressDekiru: snapshot.progress.length - customProgress,
      dueAtCutoff: snapshot.progress.filter(
        (row) => row.dueDate.getTime() <= migratedAt.getTime(),
      ).length,
    },
    target: {
      usersPlanned: users.seeds.length,
      vocabCardsPlanned: vocab.cards.length,
      reviewItemsPlanned: vocab.items.length,
      reviewStatesPlanned: resolved.reviews.length,
    },
    integrity: {
      duplicateDekiruKeys: dekiru.duplicateKeys,
      unmatchedProgress: resolved.unmatched,
      userCollisions: users.collisions,
      customCardsWithoutProgress: snapshot.customCards.filter(
        (card) => !progressKeys.has(`custom-${card.id}`),
      ).length,
      dekiruCardsWithoutProgress: dekiru.cards.filter(
        (card) => !progressKeys.has(card.cardKey),
      ).length,
    },
  };

  await saveReport(report);
  console.log(`report: ${reportPath}`);
  console.log(
    `source users=${report.source.users} cards=${report.source.customCards + report.source.dekiruCards} progress=${report.source.progress}`,
  );
  console.log(
    `planned users=${report.target.usersPlanned} cards=${report.target.vocabCardsPlanned} states=${report.target.reviewStatesPlanned}`,
  );
  console.log(
    `integrity duplicateKeys=${dekiru.duplicateKeys.length} unmatched=${resolved.unmatched.length} userCollisions=${users.collisions.length}`,
  );

  if (!apply) {
    console.log("dry-run only; pass --apply after reviewing the report");
    process.exitCode =
      dekiru.duplicateKeys.length > 0 || users.collisions.length > 0 ? 2 : 0;
  } else {
    const hardProblems = dekiru.duplicateKeys.length + users.collisions.length;
    if (hardProblems > 0) {
      throw new Error("Apply refused: duplicate card keys or user collisions exist");
    }
    if (resolved.unmatched.length > 0 && !allowUnmatched) {
      throw new Error(
        "Apply refused: unmatched progress exists. Review report or pass --allow-unmatched explicitly.",
      );
    }

    await client.query("SELECT pg_advisory_lock(hashtext($1))", [
      "hibi_phase1_anki_etl",
    ]);
    locked = true;
    await client.query("BEGIN");
    try {
      await applyUsers(client, users.seeds);
      await applyVocabCards(client, vocab.cards);
      await applyReviewItems(client, vocab.items);
      await applyReviewStates(client, resolved.reviews);
      await client.query("COMMIT");
      console.log("apply complete");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  if (locked) {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [
      "hibi_phase1_anki_etl",
    ]);
  }
  await client.end();
}
