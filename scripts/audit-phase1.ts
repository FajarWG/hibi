import "dotenv/config";

import { readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Client } from "pg";

import {
  defaultDekiruSource,
  loadDekiruCards,
  loadLegacySnapshot,
} from "@/scripts/phase1/source";
import { normalizeMediaReference } from "@/scripts/phase1/transform";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sourceRoot = resolve(process.argv[2] ?? resolve(process.cwd(), ".."));
const mediaRoot = resolve(sourceRoot, "public", "anki-media");
const reportPath = resolve(
  process.cwd(),
  "reports",
  "phase1",
  "source-audit.json",
);

async function walkFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) {
        result.push(relative(root, absolute).split(sep).join("/"));
      }
    }
  }
  await walk(root);
  return result.sort();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

const client = new Client({ connectionString });
await client.connect();

try {
  const snapshot = await loadLegacySnapshot(client);
  const tables = await client.query<{ tablename: string }>(`
    SELECT "tablename" FROM "pg_tables"
    WHERE "schemaname" = 'public'
    ORDER BY "tablename"
  `);
  const [dekiru, mediaFiles] = await Promise.all([
    loadDekiruCards(defaultDekiruSource()),
    walkFiles(mediaRoot),
  ]);

  const tableRows: Record<string, number> = {};
  for (const { tablename } of tables.rows) {
    const count = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS "count" FROM ${quoteIdentifier(tablename)}`,
    );
    tableRows[tablename] = Number(count.rows[0].count);
  }

  let mediaBytes = 0;
  for (const file of mediaFiles) {
    mediaBytes += (await stat(resolve(mediaRoot, file))).size;
  }

  const references = new Set<string>();
  const invalidReferences: string[] = [];
  for (const card of snapshot.customCards) {
    for (const raw of [card.audio, card.image, card.sentenceAudio]) {
      if (!raw) continue;
      const normalized = normalizeMediaReference(raw);
      if (normalized) references.add(normalized);
      else invalidReferences.push(raw);
    }
  }

  const mediaSet = new Set(mediaFiles);
  const missingReferences = [...references]
    .filter((reference) => !mediaSet.has(reference))
    .sort();
  const unreferencedFiles = mediaFiles
    .filter((file) => !references.has(file))
    .sort();
  const caseFolded = new Map<string, string[]>();
  for (const file of mediaFiles) {
    const key = file.normalize("NFC").toLocaleLowerCase("en-US");
    caseFolded.set(key, [...(caseFolded.get(key) ?? []), file]);
  }
  const caseCollisions = [...caseFolded.values()].filter(
    (files) => files.length > 1,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    tableRows,
    anki: {
      users: snapshot.users.length,
      customCards: snapshot.customCards.length,
      dekiruCards: dekiru.cards.length,
      progress: snapshot.progress.length,
      customProgress: snapshot.progress.filter((row) =>
        row.cardKey.startsWith("custom-"),
      ).length,
      dekiruProgress: snapshot.progress.filter(
        (row) => !row.cardKey.startsWith("custom-"),
      ).length,
      duplicateDekiruKeys: dekiru.duplicateKeys,
    },
    media: {
      files: mediaFiles.length,
      bytes: mediaBytes,
      references: references.size,
      missingReferences,
      invalidReferences: [...new Set(invalidReferences)].sort(),
      unreferencedFiles,
      caseOrUnicodeCollisions: caseCollisions,
    },
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`report: ${reportPath}`);
  console.log(
    `users=${report.anki.users} customCards=${report.anki.customCards} dekiruCards=${report.anki.dekiruCards} progress=${report.anki.progress}`,
  );
  console.log(
    `media files=${report.media.files} referenced=${report.media.references} missing=${missingReferences.length}`,
  );
} finally {
  await client.end();
}
