export interface SubtitleEntry {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Generate SRT subtitle from TTS timestamps.
 * Groups words into subtitle lines (~15 chars per line).
 */
export function generateSRT(
  timestamps: { word: string; startMs: number; endMs: number }[]
): string {
  if (timestamps.length === 0) return "";

  const entries = groupIntoSubtitles(timestamps, 15);
  return entries
    .map(
      (entry) =>
        `${entry.index}\n${formatTime(entry.startMs)} --> ${formatTime(entry.endMs)}\n${entry.text}\n`
    )
    .join("\n");
}

/**
 * Generate VTT subtitle (for web video player).
 */
export function generateVTT(
  timestamps: { word: string; startMs: number; endMs: number }[]
): string {
  if (timestamps.length === 0) return "WEBVTT\n\n";

  const entries = groupIntoSubtitles(timestamps, 15);
  const lines = entries.map(
    (entry) =>
      `${formatTime(entry.startMs)} --> ${formatTime(entry.endMs)}\n${entry.text}`
  );
  return "WEBVTT\n\n" + lines.join("\n\n") + "\n";
}

function groupIntoSubtitles(
  timestamps: { word: string; startMs: number; endMs: number }[],
  maxCharsPerLine: number
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentText = "";
  let startMs = timestamps[0].startMs;
  let endMs = timestamps[0].endMs;
  let index = 1;

  for (const ts of timestamps) {
    if (currentText.length + ts.word.length > maxCharsPerLine && currentText.length > 0) {
      entries.push({ index, startMs, endMs, text: currentText.trim() });
      index++;
      currentText = ts.word;
      startMs = ts.startMs;
      endMs = ts.endMs;
    } else {
      currentText += ts.word;
      endMs = ts.endMs;
    }
  }

  if (currentText.trim()) {
    entries.push({ index, startMs, endMs, text: currentText.trim() });
  }

  return entries;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad3(millis)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}
