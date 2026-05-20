import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import api from "./routes/api";
import admin from "./routes/admin";
import auth from "./routes/auth";
import video from "./routes/video";

type HonoEnv = { Bindings: Env; Variables: { keyId: string } };

const app = new Hono<HonoEnv>();

// CORS
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "API Relay",
    version: "1.0.0",
    status: "ok",
  });
});

// API routes (OpenAI-compatible)
app.route("/", api);

// Auth routes
app.route("/auth", auth);

// Video routes
app.route("/video", video);

// Admin routes
app.route("/admin", admin);

// Serve R2 files
app.get("/storage/*", async (c) => {
  const key = c.req.path.replace("/storage/", "");
  const object = await c.env.R2.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=3600");

  return new Response(object.body, { headers });
});

// 404
app.notFound((c) => {
  return c.json({ error: { message: "Not found", type: "not_found" } }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json(
    { error: { message: "Internal server error", type: "server_error" } },
    500
  );
});

export default app;
