import type { Env } from "../types";

export interface VideoComposeRequest {
  taskId: string;
  audioUrl: string;
  subtitleSrt: string;
  backgroundType: "color" | "image";
  backgroundColor?: string;
  backgroundImage?: string;
  resolution: "1080x1920" | "1920x1080" | "1080x1080";
  subtitleStyle?: {
    fontSize?: number;
    color?: string;
    bgColor?: string;
    position?: "bottom" | "center";
  };
}

export interface VideoComposeResult {
  videoUrl: string;
  durationSec: number;
  fileSizeBytes: number;
}

/**
 * Dispatch video composition task to the video-worker service.
 * The video-worker is a separate server running FFmpeg.
 */
export async function dispatchVideoCompose(
  request: VideoComposeRequest,
  env: Env
): Promise<void> {
  const workerUrl = env.VIDEO_WORKER_URL || 'http://localhost:3001';

  // Update task status in DB
  await env.DB.prepare(
    `UPDATE video_tasks SET status = 'composing', updated_at = datetime('now') WHERE id = ?`
  )
    .bind(request.taskId)
    .run();

  // Call video-worker to start composition
  try {
    await fetch(`${workerUrl}/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (err: any) {
    // If worker is unreachable, mark as failed
    await handleVideoError(request.taskId, `Video worker unreachable: ${err.message}`, env);
    throw err;
  }
}

/**
 * Called by video-worker to report completion.
 */
export async function handleVideoComplete(
  taskId: string,
  result: VideoComposeResult,
  env: Env
): Promise<void> {
  await env.DB.prepare(
    `UPDATE video_tasks SET status = 'completed', video_url = ?, duration_sec = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(result.videoUrl, result.durationSec, taskId)
    .run();

  // Cleanup KV
  await env.KV.delete(`video-task:${taskId}`);
}

/**
 * Called by video-worker to report failure.
 */
export async function handleVideoError(
  taskId: string,
  error: string,
  env: Env
): Promise<void> {
  await env.DB.prepare(
    `UPDATE video_tasks SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(error, taskId)
    .run();

  await env.KV.delete(`video-task:${taskId}`);
}
