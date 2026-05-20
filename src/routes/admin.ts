import { Hono } from "hono";
import type { Env } from "../types";

type HonoEnv = { Bindings: Env };

const admin = new Hono<HonoEnv>();

// Admin auth
admin.use("*", async (c, next) => {
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${c.env.ADMIN_SECRET}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Create API key
admin.post("/keys", async (c) => {
  const { name, balance } = await c.req.json<{ name?: string; balance?: number }>();
  const id = crypto.randomUUID();
  const rawKey = `sk-relay-${generateRandomKey(32)}`;
  const keyHash = await hashKey(rawKey);

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, key_hash, name, balance) VALUES (?, ?, ?, ?)`
  )
    .bind(id, keyHash, name || "", balance || 0)
    .run();

  // Store key -> id mapping in KV for fast lookup
  await c.env.KV.put(`key:${keyHash}`, JSON.stringify({ id, status: "active", balance: balance || 0 }));

  return c.json({ id, key: rawKey, name: name || "", balance: balance || 0 });
});

// List keys
admin.get("/keys", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id, name, balance, status, created_at, updated_at FROM api_keys ORDER BY created_at DESC`
  ).all();
  return c.json({ data: result.results });
});

// Get key usage
admin.get("/keys/:id/usage", async (c) => {
  const keyId = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "50");

  const result = await c.env.DB.prepare(
    `SELECT model, provider, prompt_tokens, completion_tokens, total_tokens, cost, duration_ms, created_at
     FROM usage_logs WHERE key_id = ? ORDER BY created_at DESC LIMIT ?`
  )
    .bind(keyId, limit)
    .all();

  const summary = await c.env.DB.prepare(
    `SELECT COUNT(*) as total_requests, SUM(total_tokens) as total_tokens, SUM(cost) as total_cost
     FROM usage_logs WHERE key_id = ?`
  )
    .bind(keyId)
    .first();

  return c.json({ summary, logs: result.results });
});

// Recharge key
admin.post("/keys/:id/recharge", async (c) => {
  const keyId = c.req.param("id");
  const { amount } = await c.req.json<{ amount: number }>();

  if (!amount || amount <= 0) {
    return c.json({ error: "Invalid amount" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE api_keys SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(amount, keyId)
    .run();

  // Update KV cache
  const key = await c.env.DB.prepare(`SELECT * FROM api_keys WHERE id = ?`).bind(keyId).first();
  if (key) {
    await c.env.KV.put(
      `key:${key.key_hash}`,
      JSON.stringify({ id: key.id, status: key.status, balance: key.balance })
    );
  }

  return c.json({ success: true, new_balance: key?.balance });
});

// Disable/Enable key
admin.post("/keys/:id/status", async (c) => {
  const keyId = c.req.param("id");
  const { status } = await c.req.json<{ status: "active" | "disabled" }>();

  await c.env.DB.prepare(
    `UPDATE api_keys SET status = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(status, keyId)
    .run();

  return c.json({ success: true });
});

function generateRandomKey(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default admin;
