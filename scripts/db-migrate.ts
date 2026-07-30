import "dotenv/config";

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const migrationsDir = join(process.cwd(), "db", "migrations");
const lockName = "hibi_schema_migrations";
const client = new Client({ connectionString });

function checksum(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function main() {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [lockName]);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "hibi_schema_migration" (
        "id" TEXT PRIMARY KEY,
        "checksum" TEXT NOT NULL,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const id of files) {
      const raw = await readFile(join(migrationsDir, id), "utf8");
      // PowerShell 5 dapat menambahkan UTF-8 BOM. PostgreSQL menganggapnya
      // token asing pada karakter pertama, jadi normalisasi sebelum checksum.
      const sql = raw.replace(/^\uFEFF/, "");
      const digest = checksum(sql);
      const applied = await client.query<{ checksum: string }>(
        'SELECT "checksum" FROM "hibi_schema_migration" WHERE "id" = $1',
        [id],
      );

      if (applied.rowCount) {
        if (applied.rows[0].checksum !== digest) {
          throw new Error(
            `Migration ${id} changed after it was applied. Create a new migration instead.`,
          );
        }
        console.log(`skip  ${id}`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "hibi_schema_migration" ("id", "checksum") VALUES ($1, $2)',
          [id, digest],
        );
        await client.query("COMMIT");
        console.log(`apply ${id}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [lockName]);
    await client.end();
  }
}

await main();
