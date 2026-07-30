import "dotenv/config";

import { randomUUID } from "node:crypto";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString });
const userId = `smoke-${randomUUID()}`;

await client.connect();
try {
  const schema = await client.query<{
    user_table: string | null;
    timer_table: string | null;
    migration_count: string;
  }>(`
    SELECT
      to_regclass('public.hibi_user')::text AS user_table,
      to_regclass('public.hibi_study_timer')::text AS timer_table,
      (SELECT COUNT(*)::text FROM "hibi_schema_migration") AS migration_count
  `);

  const state = schema.rows[0];
  if (!state.user_table || !state.timer_table || state.migration_count !== "1") {
    throw new Error(`Unexpected schema state: ${JSON.stringify(state)}`);
  }

  await client.query("BEGIN");
  await client.query(
    `INSERT INTO "hibi_user"
      ("id", "username", "passwordHash", "updatedAt")
     VALUES ($1, $2, 'smoke-only', NOW())`,
    [userId, userId],
  );
  await client.query(
    `INSERT INTO "hibi_study_timer"
      ("id", "userId", "activeKey", "lastStartedAt", "updatedAt")
     VALUES ($1, $2, $2, NOW(), NOW())`,
    [`timer-${randomUUID()}`, userId],
  );

  await client.query("SAVEPOINT duplicate_active");
  let duplicateBlocked = false;
  try {
    await client.query(
      `INSERT INTO "hibi_study_timer"
        ("id", "userId", "activeKey", "lastStartedAt", "updatedAt")
       VALUES ($1, $2, $2, NOW(), NOW())`,
      [`timer-${randomUUID()}`, userId],
    );
  } catch (error) {
    duplicateBlocked = (error as { code?: string }).code === "23505";
    await client.query("ROLLBACK TO SAVEPOINT duplicate_active");
  }
  if (!duplicateBlocked) throw new Error("Duplicate active timer was not blocked");

  await client.query('DELETE FROM "hibi_user" WHERE "id" = $1', [userId]);
  const remaining = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM "hibi_study_timer" WHERE "userId" = $1',
    [userId],
  );
  if (remaining.rows[0].count !== "0") {
    throw new Error("Timer rows did not cascade when the user was deleted");
  }

  await client.query("ROLLBACK");
  console.log("schema: ok");
  console.log("one-active-timer constraint: ok");
  console.log("user-to-timer cascade: ok");
  console.log("transaction rolled back: no smoke data persisted");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
