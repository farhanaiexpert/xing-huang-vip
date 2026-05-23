import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, registerSchema, loginSchema } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken, requireAuth } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { username, email, password } = parsed.data;

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        email
          ? or(eq(usersTable.username, username), eq(usersTable.email, email))
          : eq(usersTable.username, username)
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "conflict", message: "Username or email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = randomUUID();

    await db.insert(usersTable).values({
      id,
      username,
      email: email ?? null,
      passwordHash,
      role: "user",
      status: "active",
    });

    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    const token = signToken({ userId: id, role: "user" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ token, user });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "internal", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "login and password are required" });
    return;
  }

  const { login, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, login),
          eq(usersTable.email, login),
          eq(usersTable.walletAddress, login),
        )
      )
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({ error: "forbidden", message: `Account is ${user.status}` });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: "unauthorized", message: "Password login not configured for this account" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...publicUser } = user;
    res.json({ token, user: publicUser });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "internal", message: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  try {
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "get me error");
    res.status(500).json({ error: "internal", message: "Failed to fetch user" });
  }
});

export default router;
