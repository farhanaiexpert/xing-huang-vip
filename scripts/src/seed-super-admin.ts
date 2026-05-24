/**
 * Seed the super_admin account.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:super-admin
 *
 * The script is idempotent — it skips insertion if the email already exists.
 * Credentials are read from env vars so they are never committed to source:
 *
 *   SUPER_ADMIN_EMAIL    (default: superadmin@cupbett.com)
 *   SUPER_ADMIN_USERNAME (default: super_admin)
 *   SUPER_ADMIN_PASSWORD (required — no hardcoded default)
 */

import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@cupbett.com";
const username = process.env.SUPER_ADMIN_USERNAME ?? "super_admin";
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!password) {
  console.error(
    "ERROR: SUPER_ADMIN_PASSWORD env var is required.\n" +
    "Set it before running this script, e.g.:\n" +
    "  SUPER_ADMIN_PASSWORD=<secret> pnpm --filter @workspace/scripts run seed:super-admin"
  );
  process.exit(1);
}

const existing = await db
  .select({ id: usersTable.id })
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);

if (existing.length > 0) {
  console.log(`super_admin account already exists (id=${existing[0].id}). Nothing to do.`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);

const [user] = await db
  .insert(usersTable)
  .values({
    email,
    username,
    passwordHash,
    role: "super_admin",
    kycStatus: "approved",
    referralCode: "SUPERADM1",
  })
  .returning();

await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });

console.log(`super_admin created — id=${user.id}, email=${user.email}`);
process.exit(0);
