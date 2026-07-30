import type { Client } from "pg";

import { stableId } from "@/scripts/phase1/transform";
import type {
  ExistingHibiUser,
  LegacyUser,
  UserCollision,
  UserSeed,
} from "@/scripts/phase1/types";

export async function loadExistingHibiUsers(
  client: Client,
): Promise<ExistingHibiUser[]> {
  const result = await client.query<ExistingHibiUser>(`
    SELECT "id", "legacyId", "username", "role"::text
    FROM "hibi_user" ORDER BY "id"
  `);
  return result.rows;
}

export function planUsers(
  legacyUsers: LegacyUser[],
  existingUsers: ExistingHibiUser[],
): {
  seeds: UserSeed[];
  legacyUserMap: Map<number, string>;
  collisions: UserCollision[];
} {
  const byLegacyId = new Map(
    existingUsers
      .filter((user) => user.legacyId !== null)
      .map((user) => [user.legacyId as number, user]),
  );
  const byUsername = new Map(existingUsers.map((user) => [user.username, user]));
  const seeds: UserSeed[] = [];
  const legacyUserMap = new Map<number, string>();
  const collisions: UserCollision[] = [];

  for (const legacy of legacyUsers) {
    const idMatch = byLegacyId.get(legacy.id);
    const usernameMatch = byUsername.get(legacy.username);

    if (idMatch && usernameMatch && idMatch.id !== usernameMatch.id) {
      collisions.push({
        legacyUserId: legacy.id,
        username: legacy.username,
        reason: "legacyId and username point to different Hibi users",
      });
      continue;
    }
    if (
      usernameMatch?.legacyId !== null &&
      usernameMatch?.legacyId !== undefined &&
      usernameMatch.legacyId !== legacy.id
    ) {
      collisions.push({
        legacyUserId: legacy.id,
        username: legacy.username,
        reason: `username already belongs to legacyId ${usernameMatch.legacyId}`,
      });
      continue;
    }

    const target = idMatch ?? usernameMatch;
    const targetId = target?.id ?? stableId("usr", String(legacy.id));
    seeds.push({
      id: targetId,
      legacyId: legacy.id,
      username: legacy.username,
      passwordHash: legacy.password,
      role: legacy.role,
      createdAt: legacy.createdAt,
      existing: Boolean(target),
    });
    legacyUserMap.set(legacy.id, targetId);
  }

  return { seeds, legacyUserMap, collisions };
}

/**
 * Existing Hibi accounts keep their current passwordHash. The old bcrypt
 * hash is stored in legacyPasswordHash for lossless audit. New users receive
 * the legacy hash as both active and legacy hash, so old credentials work.
 */
export async function applyUsers(client: Client, seeds: UserSeed[]): Promise<void> {
  for (const seed of seeds) {
    if (seed.existing) {
      await client.query(
        `UPDATE "hibi_user"
         SET "legacyId" = COALESCE("legacyId", $2),
             "legacyPasswordHash" = $3,
             "role" = CASE WHEN "role" = 'ADMIN' OR $4::text = 'ADMIN'
                           THEN 'ADMIN'::"hibi_role" ELSE 'USER'::"hibi_role" END,
             "updatedAt" = NOW()
         WHERE "id" = $1`,
        [seed.id, seed.legacyId, seed.passwordHash, seed.role],
      );
      continue;
    }

    await client.query(
      `INSERT INTO "hibi_user"
        ("id", "legacyId", "username", "passwordHash", "legacyPasswordHash",
         "role", "timezone", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $4, $5::text::"hibi_role", 'Asia/Tokyo', $6, $6)
       ON CONFLICT ("legacyId") DO UPDATE
       SET "legacyPasswordHash" = EXCLUDED."legacyPasswordHash",
           "role" = CASE WHEN "hibi_user"."role" = 'ADMIN' OR EXCLUDED."role" = 'ADMIN'
                         THEN 'ADMIN'::"hibi_role" ELSE "hibi_user"."role" END,
           "updatedAt" = NOW()`,
      [
        seed.id,
        seed.legacyId,
        seed.username,
        seed.passwordHash,
        seed.role,
        seed.createdAt,
      ],
    );
  }
}
