import "dotenv/config";

import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { Client } from "pg";

import { normalizeMediaReference } from "@/scripts/phase1/transform";

type MediaRow = {
  audio: string | null;
  image: string | null;
  sentenceAudio: string | null;
};

type FileInfo = { path: string; size: number };

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function inventory(root: string): Promise<Map<string, FileInfo>> {
  const result = new Map<string, FileInfo>();
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) {
        const path = relative(root, absolute).split(sep).join("/");
        result.set(path, { path, size: (await stat(absolute)).size });
      }
    }
  }
  await walk(root);
  return result;
}

async function readMediaRows(client: Client): Promise<{
  source: string;
  rows: MediaRow[];
}> {
  try {
    const result = await client.query<MediaRow>(`
      SELECT "audioFile" AS "audio", "imageFile" AS "image",
             "sentenceAudioFile" AS "sentenceAudio"
      FROM "hibi_vocab_card"
    `);
    return { source: "hibi_vocab_card", rows: result.rows };
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code !== "42P01") throw error;
    const result = await client.query<MediaRow>(`
      SELECT "audio", "image", "sentenceAudio"
      FROM "AnkiCard"
    `);
    return { source: "AnkiCard (pre-migration fallback)", rows: result.rows };
  }
}

const apply = process.argv.includes("--apply");
const overwriteMismatch = process.argv.includes("--overwrite-mismatch");
const sourceRoot = resolve(
  option("--source") ?? resolve(process.cwd(), "..", "public", "anki-media"),
);
const targetRoot = resolve(
  option("--target") ?? resolve(process.cwd(), "public", "anki-media"),
);
const reportPath = resolve(
  option("--report") ??
    resolve(process.cwd(), "reports", "phase1", "media-copy.json"),
);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const [source, target] = await Promise.all([
  inventory(sourceRoot),
  inventory(targetRoot).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return new Map<string, FileInfo>();
    throw error;
  }),
]);

const toCopy: FileInfo[] = [];
const sameSize: FileInfo[] = [];
const sizeMismatches: Array<{ path: string; sourceSize: number; targetSize: number }> = [];
for (const file of source.values()) {
  const existing = target.get(file.path);
  if (!existing) toCopy.push(file);
  else if (existing.size === file.size) sameSize.push(file);
  else {
    sizeMismatches.push({
      path: file.path,
      sourceSize: file.size,
      targetSize: existing.size,
    });
  }
}
const targetOnly = [...target.values()]
  .filter((file) => !source.has(file.path))
  .map((file) => file.path)
  .sort();

const client = new Client({ connectionString });
await client.connect();

try {
  const mediaRows = await readMediaRows(client);
  const references = new Set<string>();
  const invalidReferences: string[] = [];
  for (const row of mediaRows.rows) {
    for (const raw of [row.audio, row.image, row.sentenceAudio]) {
      if (!raw) continue;
      const normalized = normalizeMediaReference(raw);
      if (normalized) references.add(normalized);
      else invalidReferences.push(raw);
    }
  }

  let copied = 0;
  let overwritten = 0;
  let blockedReason: string | null = null;
  if (apply && sizeMismatches.length > 0 && !overwriteMismatch) {
    blockedReason =
      "Size mismatches require the explicit --overwrite-mismatch flag";
  } else if (apply) {
    for (const file of toCopy) {
      const destination = resolve(targetRoot, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(resolve(sourceRoot, file.path), destination);
      copied += 1;
    }
    if (overwriteMismatch) {
      for (const file of sizeMismatches) {
        const destination = resolve(targetRoot, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(resolve(sourceRoot, file.path), destination);
        overwritten += 1;
      }
    }
  }

  const finalTarget = apply && !blockedReason ? await inventory(targetRoot) : target;
  const missingSourceReferences = [...references]
    .filter((reference) => !source.has(reference))
    .sort();
  const missingTargetReferences = [...references]
    .filter((reference) => !finalTarget.has(reference))
    .sort();
  const remainingSizeMismatches = [...source.values()]
    .flatMap((file) => {
      const existing = finalTarget.get(file.path);
      return existing && existing.size !== file.size
        ? [{ path: file.path, sourceSize: file.size, targetSize: existing.size }]
        : [];
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    sourceRoot,
    targetRoot,
    referenceSource: mediaRows.source,
    sourceFiles: source.size,
    targetFilesBefore: target.size,
    targetFilesAfter: finalTarget.size,
    plannedCopies: toCopy.length,
    skippedSameSize: sameSize.length,
    copied,
    overwritten,
    sizeMismatches,
    remainingSizeMismatches,
    targetOnly,
    references: references.size,
    invalidReferences: [...new Set(invalidReferences)].sort(),
    missingSourceReferences,
    missingTargetReferences,
    blockedReason,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`report: ${reportPath}`);
  console.log(
    `source=${source.size} targetBefore=${target.size} copy=${toCopy.length} sameSize=${sameSize.length} mismatch=${sizeMismatches.length}`,
  );
  console.log(
    `references=${references.size} missingSource=${missingSourceReferences.length} missingTarget=${missingTargetReferences.length}`,
  );

  if (blockedReason) throw new Error(blockedReason);
  if (apply && (remainingSizeMismatches.length > 0 || missingTargetReferences.length > 0)) {
    throw new Error("Media verification failed; inspect the JSON report");
  }
  if (!apply) console.log("dry-run only; pass --apply to copy files");
} finally {
  await client.end();
}
