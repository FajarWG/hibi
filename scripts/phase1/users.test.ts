import { describe, expect, test } from "bun:test";

import { planUsers } from "@/scripts/phase1/users";
import type {
  ExistingHibiUser,
  LegacyUser,
} from "@/scripts/phase1/types";

const legacy: LegacyUser[] = [
  {
    id: 1,
    username: "fajar",
    password: "$2b$legacy",
    role: "ADMIN",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
];

describe("planUsers", () => {
  test("adopts an existing username without replacing its target id", () => {
    const existing: ExistingHibiUser[] = [
      { id: "hibi-user", legacyId: null, username: "fajar", role: "USER" },
    ];
    const result = planUsers(legacy, existing);

    expect(result.collisions).toHaveLength(0);
    expect(result.legacyUserMap.get(1)).toBe("hibi-user");
    expect(result.seeds[0]).toMatchObject({
      id: "hibi-user",
      legacyId: 1,
      existing: true,
      role: "ADMIN",
    });
  });

  test("creates deterministic ids for users not yet in Hibi", () => {
    const first = planUsers(legacy, []);
    const second = planUsers(legacy, []);

    expect(first.seeds[0].id).toBe(second.seeds[0].id);
    expect(first.seeds[0].existing).toBe(false);
  });

  test("refuses mappings where legacy id and username point to different users", () => {
    const existing: ExistingHibiUser[] = [
      { id: "by-id", legacyId: 1, username: "other", role: "USER" },
      { id: "by-name", legacyId: null, username: "fajar", role: "USER" },
    ];
    const result = planUsers(legacy, existing);

    expect(result.seeds).toHaveLength(0);
    expect(result.collisions).toEqual([
      {
        legacyUserId: 1,
        username: "fajar",
        reason: "legacyId and username point to different Hibi users",
      },
    ]);
  });
});
