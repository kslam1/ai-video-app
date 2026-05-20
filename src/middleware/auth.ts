import { createMiddleware } from "hono/factory";
import type { Env } from "../types";

type HonoEnv = { Bindings: Env; Variables: { keyId: string } };

export const verifyApiKey = createMiddleware<HonoEnv>(async (c, next) => {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return c.json(
      { error: { message: "Missing Authorization header", type: "auth_error" } },
      401
    );
  }

  const rawKey = auth.slice(7);
  const keyHash = await hashKey(rawKey);

  // Fast lookup from KV
  const cached = await c.env.KV.get(`key:${keyHash}`);
  if (!cached) {
    return c.json(
      { error: { message: "Invalid API key", type: "auth_error" } },
      401
    );
  }

  const keyData = JSON.parse(cached) as { id: string; status: string; balance: number };

  if (keyData.status !== "active") {
    return c.json(
      { error: { message: "API key is disabled", type: "auth_error" } },
      403
    );
  }

  if (keyData.balance <= 0) {
    return c.json(
      { error: { message: "Insufficient balance", type: "billing_error" } },
      402
    );
  }

  c.set("keyId", keyData.id);
  await next();
});

async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
