import { Hono } from "hono";
import type { Env } from "../types";

type HonoEnv = { Bindings: Env };

const auth = new Hono<HonoEnv>();

// Register
auth.post("/register", async (c) => {
  const { email, password, name } = await c.req.json<{
    email: string;
    password: string;
    name?: string;
  }>();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, name, free_credits) VALUES (?, ?, ?, ?, 3)"
  )
    .bind(id, email, passwordHash, name || email.split("@")[0])
    .run();

  const token = await generateToken(id);
  await c.env.KV.put(`session:${token}`, id, { expirationTtl: 86400 * 7 });

  return c.json({ token, user: { id, email, name: name || email.split("@")[0], balance: 0, free_credits: 3 } });
});

// Login
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  const user: any = await c.env.DB.prepare(
    "SELECT id, email, password_hash, name, balance, free_credits, plan FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await generateToken(user.id);
  await c.env.KV.put(`session:${token}`, user.id, { expirationTtl: 86400 * 7 });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balance: user.balance,
      free_credits: user.free_credits,
      plan: user.plan,
    },
  });
});

// Get current user
auth.get("/me", async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const user: any = await c.env.DB.prepare(
    "SELECT id, email, name, balance, free_credits, plan, created_at FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();

  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

// Helper: extract user ID from session token
export async function getUserId(c: any): Promise<string | null> {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const userId = await c.env.KV.get(`session:${token}`);
  return userId;
}

async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password + "relay-salt-v1");
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

async function generateToken(userId: string): Promise<string> {
  const raw = `${userId}-${Date.now()}-${crypto.randomUUID()}`;
  const encoded = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default auth;
