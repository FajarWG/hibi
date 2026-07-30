import "dotenv/config";

import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { Client } from "pg";
import { SignJWT } from "jose";

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
if (!databaseUrl || !jwtSecret) {
  throw new Error("DATABASE_URL and JWT_SECRET are required");
}

const port = 3217;
const origin = `http://127.0.0.1:${port}`;
const userId = `http-smoke-${randomUUID()}`;
const username = `smoke_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const db = new Client({ connectionString: databaseUrl });
let server: ReturnType<typeof Bun.spawn> | null = null;

await db.connect();

try {
  // A previously interrupted smoke run may have left its temporary account.
  const stale = await db.query(
    `DELETE FROM "hibi_user" WHERE "id" LIKE 'http-smoke-%'`,
  );
  if (stale.rowCount) console.log(`removed ${stale.rowCount} stale smoke user(s)`);

  await db.query(
    `INSERT INTO "hibi_user"
      ("id", "username", "passwordHash", "updatedAt")
     VALUES ($1, $2, 'smoke-only', NOW())`,
    [userId, username],
  );

  const token = await new SignJWT({ userId, username, role: "USER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(jwtSecret));

  // Spawn Next directly. Spawning through `bun run start` leaves a Node child
  // alive on Windows when only the Bun parent is killed.
  server = Bun.spawn(
    [
      "node",
      join(process.cwd(), "node_modules", "next", "dist", "bin", "next"),
      "start",
      "-p",
      String(port),
    ],
    { cwd: process.cwd(), stdout: "ignore", stderr: "pipe" },
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${origin}/login`, { redirect: "manual" });
      if (response.status === 200) break;
    } catch {
      // Server is still starting.
    }
    if (attempt === 79) {
      throw new Error("Next.js did not start within 20 seconds");
    }
    await Bun.sleep(250);
  }

  const publicPage = await fetch(`${origin}/login`, { redirect: "manual" });
  if (publicPage.status !== 200) {
    throw new Error(`Expected /login 200, got ${publicPage.status}`);
  }

  const anonymous = await fetch(`${origin}/today`, { redirect: "manual" });
  if (![307, 308].includes(anonymous.status)) {
    throw new Error(`Expected anonymous redirect, got ${anonymous.status}`);
  }
  const anonymousLocation = anonymous.headers.get("location") ?? "";
  if (!anonymousLocation.includes("/login")) {
    throw new Error(`Expected redirect to /login, got ${anonymousLocation}`);
  }

  const authenticated = await fetch(`${origin}/today`, {
    headers: { cookie: `hibi_session=${token}` },
    redirect: "manual",
  });
  const html = await authenticated.text();
  if (authenticated.status !== 200) {
    throw new Error(`Authenticated shell status was ${authenticated.status}`);
  }
  if (!html.includes("Welcome back") || !html.includes(username)) {
    throw new Error("Authenticated shell did not render the signed-in user");
  }

  const signedInAuthPage = await fetch(`${origin}/login`, {
    headers: { cookie: `hibi_session=${token}` },
    redirect: "manual",
  });
  if (![307, 308].includes(signedInAuthPage.status)) {
    throw new Error(`Expected signed-in redirect, got ${signedInAuthPage.status}`);
  }

  console.log("public login page: ok");
  console.log("anonymous protected redirect: ok");
  console.log("authenticated app shell: ok");
  console.log("signed-in auth-page redirect: ok");
} finally {
  if (server && server.exitCode === null) {
    server.kill(9);
    await Promise.race([server.exited, Bun.sleep(5000)]);
  }
  await db.query('DELETE FROM "hibi_user" WHERE "id" = $1', [userId]);
  await db.end();
  console.log("temporary smoke user removed");
}
