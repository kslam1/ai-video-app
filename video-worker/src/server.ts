import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { execFile } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const app = new Hono();
const WORK_DIR = '/tmp/video-worker';
const RELAY_URL = process.env.RELAY_URL || 'http://localhost:8787';

app.get('/', (c) => c.json({ status: 'ok', service: 'video-worker' }));

app.post('/compose', async (c) => {
  const { taskId, audioUrl, subtitleSrt, backgroundType, backgroundColor, resolution } =
    await c.req.json();

  const taskDir = join(WORK_DIR, taskId);
  await mkdir(taskDir, { recursive: true });

  try {
    // Download audio
    const audioResp = await fetch(`${RELAY_URL}/storage/${audioUrl}`);
    const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
    const audioPath = join(taskDir, 'audio.mp3');
    await writeFile(audioPath, audioBuffer);

    // Write subtitle file
    const srtPath = join(taskDir, 'subtitle.srt');
    await writeFile(srtPath, subtitleSrt, 'utf-8');

    // Parse resolution
    const [w, h] = resolution.split('x').map(Number);

    // Get audio duration
    const { stdout: probeOut } = await execFileAsync('ffprobe', [
      '-v', 'quiet', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', audioPath,
    ]);
    const duration = parseFloat(probeOut.trim());

    // Build FFmpeg command
    const outputPath = join(taskDir, 'output.mp4');
    const bgColor = backgroundColor || '#1a1a2e';

    const ffmpegArgs = [
      '-y',
      // Create solid color background
      '-f', 'lavfi', '-i', `color=c=${bgColor}:s=${w}x${h}:d=${duration}:r=30`,
      // Audio input
      '-i', audioPath,
      // Subtitle filter
      '-vf', `subtitles=${srtPath}:force_style='FontSize=22,PrimaryColour=&Hffffff&,OutlineColour=&H000000&,Outline=2,Alignment=2,MarginV=80,FontName=Noto Sans CJK SC'`,
      // Encoding
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      '-shortest',
      outputPath,
    ];

    await execFileAsync('ffmpeg', ffmpegArgs, { timeout: 120000 });

    // Read output and upload to relay R2
    const { readFile, stat } = await import('fs/promises');
    const videoBuffer = await readFile(outputPath);
    const fileStat = await stat(outputPath);

    // Upload to relay storage
    const uploadResp = await fetch(`${RELAY_URL}/storage/video/${taskId}.mp4`, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoBuffer,
    });

    // Notify relay of completion
    await fetch(`${RELAY_URL}/video/webhook/video-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        videoUrl: `video/${taskId}.mp4`,
        durationSec: duration,
        fileSizeBytes: fileStat.size,
      }),
    });

    return c.json({ status: 'completed', duration });
  } catch (err: any) {
    // Notify relay of failure
    await fetch(`${RELAY_URL}/video/webhook/video-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, error: err.message }),
    }).catch(() => {});

    return c.json({ error: err.message }, 500);
  } finally {
    // Cleanup
    await import('fs/promises').then((fs) => fs.rm(taskDir, { recursive: true, force: true })).catch(() => {});
  }
});

const port = parseInt(process.env.PORT || '3001');
console.log(`Video worker listening on port ${port}`);
serve({ fetch: app.fetch, port });
