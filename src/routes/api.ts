import { Hono } from "hono";
import type { Env } from "../types";
import { verifyApiKey } from "../middleware/auth";
import { getProvider, listModels } from "../providers";

type HonoEnv = { Bindings: Env; Variables: { keyId: string } };

const api = new Hono<HonoEnv>();

// List available models
api.get("/v1/models", verifyApiKey, (c) => {
  const models = listModels().map((m) => ({
    id: m.id,
    object: "model",
    created: 1700000000,
    owned_by: m.provider,
  }));
  return c.json({ object: "list", data: models });
});

// Chat completions
api.post("/v1/chat/completions", verifyApiKey, async (c) => {
  const body = await c.req.json();
  const { model } = body;

  if (!model) {
    return c.json({ error: { message: "model is required", type: "invalid_request_error" } }, 400);
  }

  const provider = getProvider(model);
  if (!provider) {
    return c.json(
      { error: { message: `Model '${model}' is not supported`, type: "invalid_request_error" } },
      400
    );
  }

  const startTime = Date.now();

  try {
    const response = await provider.chat(body, c.env);
    const duration = Date.now() - startTime;

    // Log usage for non-streaming (streaming usage is harder to track in MVP)
    if (!body.stream && response.ok) {
      const cloned = response.clone();
      const data = await cloned.json() as any;
      if (data.usage) {
        await logUsage(c.env.DB, {
          keyId: c.get("keyId"),
          model,
          provider: provider.name,
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          cost: calculateCost(model, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0),
          durationMs: duration,
        });
      }
    }

    return response;
  } catch (err: any) {
    return c.json(
      { error: { message: err.message || "Internal server error", type: "server_error" } },
      500
    );
  }
});

// Pricing per 1M tokens [input, output] in USD
const PRICING: Record<string, [number, number]> = {
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4-turbo": [10, 30],
  "gpt-3.5-turbo": [0.5, 1.5],
  "claude-sonnet-4-20250514": [3, 15],
  "claude-opus-4-20250514": [15, 75],
  "claude-haiku-4-20250414": [0.8, 4],
  "deepseek-chat": [0.14, 0.28],
  "deepseek-coder": [0.14, 0.28],
  "deepseek-reasoner": [0.55, 2.19],
  "moonshot-v1-8k": [0.17, 0.17],
  "moonshot-v1-32k": [0.34, 0.34],
  "moonshot-v1-128k": [0.85, 0.85],
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICING[model] || [1, 1];
  return (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000;
}

async function logUsage(
  db: D1Database,
  params: {
    keyId: string;
    model: string;
    provider: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    durationMs: number;
  }
) {
  try {
    await db
      .prepare(
        `INSERT INTO usage_logs (key_id, model, provider, prompt_tokens, completion_tokens, total_tokens, cost, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.keyId,
        params.model,
        params.provider,
        params.promptTokens,
        params.completionTokens,
        params.totalTokens,
        params.cost,
        params.durationMs
      )
      .run();

    // Deduct balance
    await db
      .prepare(`UPDATE api_keys SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(params.cost, params.keyId)
      .run();
  } catch {
    // Non-critical, don't block response
  }
}

export default api;
