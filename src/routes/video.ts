import { Hono } from "hono";
import type { Env } from "../types";
import { getUserId } from "./auth";
import { generateScript } from "../services/script";
import { textToSpeech, VOICE_OPTIONS } from "../services/voice";
import { generateSRT, generateVTT } from "../services/subtitle";
import { dispatchVideoCompose, handleVideoComplete, handleVideoError } from "../services/video";

type HonoEnv = { Bindings: Env; Variables: { userId: string } };

const video = new Hono<HonoEnv>();

// Auth middleware for video routes
video.use("*", async (c, next) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", userId);
  await next();
});

// List voice options
video.get("/voices", (c) => {
  return c.json({ voices: VOICE_OPTIONS });
});

// Generate script from topic
video.post("/script", async (c) => {
  const { topic, style, duration } = await c.req.json<{
    topic: string;
    style?: string;
    duration?: "short" | "medium" | "long";
  }>();

  if (!topic) return c.json({ error: "Topic is required" }, 400);

  const userId = c.get("userId");

  // Check credits
  const user: any = await c.env.DB.prepare(
    "SELECT balance, free_credits FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user || (user.balance <= 0 && user.free_credits <= 0)) {
    return c.json({ error: "Insufficient credits" }, 402);
  }

  const script = await generateScript(topic, c.env, { style, duration });
  return c.json({ script });
});

// Create video task
video.post("/tasks", async (c) => {
  const { title, topic, script, voiceId } = await c.req.json<{
    title?: string;
    topic: string;
    script: string;
    voiceId?: string;
  }>();

  if (!script) return c.json({ error: "Script is required" }, 400);

  const userId = c.get("userId");
  const taskId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO video_tasks (id, user_id, title, topic, script, voice_id, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`
  )
    .bind(taskId, userId, title || topic.slice(0, 50), topic, script, voiceId || "male-qn-qingse")
    .run();

  return c.json({ taskId, status: "draft" });
});

// Generate audio + subtitle for a task
video.post("/tasks/:id/generate-audio", async (c) => {
  const taskId = c.req.param("id");
  const userId = c.get("userId");

  const task: any = await c.env.DB.prepare(
    "SELECT * FROM video_tasks WHERE id = ? AND user_id = ?"
  ).bind(taskId, userId).first();

  if (!task) return c.json({ error: "Task not found" }, 404);

  const user: any = await c.env.DB.prepare(
    "SELECT balance, free_credits FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user || (user.balance <= 0 && user.free_credits <= 0)) {
    return c.json({ error: "Insufficient credits" }, 402);
  }

  await c.env.DB.prepare(
    "UPDATE video_tasks SET status = 'generating_audio', updated_at = datetime('now') WHERE id = ?"
  ).bind(taskId).run();

  try {
    const ttsResult = await textToSpeech(task.script, task.voice_id, c.env);

    const audioKey = `audio/${taskId}.mp3`;
    await c.env.R2.put(audioKey, ttsResult.audioBuffer, {
      httpMetadata: { contentType: "audio/mpeg" },
    });

    const srt = generateSRT(ttsResult.timestamps);
    const vtt = generateVTT(ttsResult.timestamps);

    const srtKey = `subtitles/${taskId}.srt`;
    const vttKey = `subtitles/${taskId}.vtt`;
    await c.env.R2.put(srtKey, srt, { httpMetadata: { contentType: "text/plain" } });
    await c.env.R2.put(vttKey, vtt, { httpMetadata: { contentType: "text/vtt" } });

    await c.env.DB.prepare(
      `UPDATE video_tasks SET status = 'audio_ready', audio_url = ?, subtitle_url = ?,
       duration_sec = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(audioKey, vttKey, ttsResult.durationMs / 1000, taskId).run();

    if (user.free_credits > 0) {
      await c.env.DB.prepare(
        "UPDATE users SET free_credits = free_credits - 1, updated_at = datetime('now') WHERE id = ?"
      ).bind(userId).run();
    } else {
      await c.env.DB.prepare(
        "UPDATE users SET balance = balance - 0.5, updated_at = datetime('now') WHERE id = ?"
      ).bind(userId).run();
    }

    return c.json({
      status: "audio_ready",
      audioUrl: `/storage/${audioKey}`,
      subtitleUrl: `/storage/${vttKey}`,
      durationSec: ttsResult.durationMs / 1000,
    });
  } catch (err: any) {
    await c.env.DB.prepare(
      "UPDATE video_tasks SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(err.message, taskId).run();
    return c.json({ error: err.message }, 500);
  }
});

// Compose video
video.post("/tasks/:id/compose", async (c) => {
  const taskId = c.req.param("id");
  const userId = c.get("userId");
  const { resolution, backgroundType, backgroundColor } = await c.req.json<{
    resolution?: "1080x1920" | "1920x1080" | "1080x1080";
    backgroundType?: "color" | "image";
    backgroundColor?: string;
  }>();

  const task: any = await c.env.DB.prepare(
    "SELECT * FROM video_tasks WHERE id = ? AND user_id = ?"
  ).bind(taskId, userId).first();

  if (!task) return c.json({ error: "Task not found" }, 404);
  if (task.status !== "audio_ready") {
    return c.json({ error: "Audio must be generated first" }, 400);
  }

  const srtObj = await c.env.R2.get(`subtitles/${taskId}.srt`);
  const srt = srtObj ? await srtObj.text() : "";

  await dispatchVideoCompose(
    {
      taskId,
      audioUrl: task.audio_url,
      subtitleSrt: srt,
      backgroundType: backgroundType || "color",
      backgroundColor: backgroundColor || "#1a1a2e",
      resolution: resolution || "1080x1920",
    },
    c.env
  );

  return c.json({ status: "composing" });
});

// Get task status
video.get("/tasks/:id", async (c) => {
  const taskId = c.req.param("id");
  const userId = c.get("userId");

  const task: any = await c.env.DB.prepare(
    `SELECT id, title, topic, script, voice_id, status, audio_url, subtitle_url, video_url,
     duration_sec, error, created_at, updated_at
     FROM video_tasks WHERE id = ? AND user_id = ?`
  ).bind(taskId, userId).first();

  if (!task) return c.json({ error: "Task not found" }, 404);

  if (task.audio_url) task.audio_url = `/storage/${task.audio_url}`;
  if (task.subtitle_url) task.subtitle_url = `/storage/${task.subtitle_url}`;
  if (task.video_url) task.video_url = `/storage/${task.video_url}`;

  return c.json({ task });
});

// List user's tasks
video.get("/tasks", async (c) => {
  const userId = c.get("userId");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  const result = await c.env.DB.prepare(
    `SELECT id, title, topic, status, video_url, duration_sec, created_at, updated_at
     FROM video_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(userId, limit, offset).all();

  const tasks = (result.results || []).map((t: any) => {
    if (t.video_url) t.video_url = `/storage/${t.video_url}`;
    return t;
  });

  return c.json({ tasks });
});

// Delete task
video.delete("/tasks/:id", async (c) => {
  const taskId = c.req.param("id");
  const userId = c.get("userId");

  await c.env.DB.prepare(
    "DELETE FROM video_tasks WHERE id = ? AND user_id = ?"
  ).bind(taskId, userId).run();

  await Promise.allSettled([
    c.env.R2.delete(`audio/${taskId}.mp3`),
    c.env.R2.delete(`subtitles/${taskId}.srt`),
    c.env.R2.delete(`subtitles/${taskId}.vtt`),
    c.env.R2.delete(`video/${taskId}.mp4`),
  ]);

  return c.json({ success: true });
});

// Webhook: video-worker reports completion
video.post("/webhook/video-complete", async (c) => {
  const { taskId, videoUrl, durationSec, fileSizeBytes, error } = await c.req.json<{
    taskId: string;
    videoUrl?: string;
    durationSec?: number;
    fileSizeBytes?: number;
    error?: string;
  }>();

  if (error) {
    await handleVideoError(taskId, error, c.env);
    return c.json({ ok: true });
  }

  await handleVideoComplete(
    taskId,
    { videoUrl: videoUrl!, durationSec: durationSec!, fileSizeBytes: fileSizeBytes! },
    c.env
  );
  return c.json({ ok: true });
});

export default video;
