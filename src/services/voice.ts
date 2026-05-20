import type { Env } from "../types";

export interface VoiceOption {
  id: string;
  name: string;
  gender: "male" | "female";
  style: string;
}

// MiniMax TTS voice options
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "male-qn-qingse", name: "青涩男声", gender: "male", style: "年轻清新" },
  { id: "male-qn-jingying", name: "精英男声", gender: "male", style: "成熟稳重" },
  { id: "male-qn-badao", name: "霸道男声", gender: "male", style: "自信有力" },
  { id: "female-shaonv", name: "少女音", gender: "female", style: "甜美活泼" },
  { id: "female-yujie", name: "御姐音", gender: "female", style: "成熟知性" },
  { id: "female-chengshu", name: "成熟女声", gender: "female", style: "温柔沉稳" },
  { id: "presenter_male", name: "男主播", gender: "male", style: "专业播音" },
  { id: "presenter_female", name: "女主播", gender: "female", style: "专业播音" },
];

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  durationMs: number;
  // Word-level timestamps for subtitle generation
  timestamps: { word: string; startMs: number; endMs: number }[];
}

export async function textToSpeech(
  text: string,
  voiceId: string,
  env: Env
): Promise<TTSResult> {
  const apiKey = env.MINIMAX_API_KEY;
  const groupId = env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) throw new Error("MINIMAX_API_KEY or MINIMAX_GROUP_ID not configured");

  const resp = await fetch(
    `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "speech-01-turbo",
        text,
        stream: false,
        voice_setting: {
          voice_id: voiceId,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 24000,
          bitrate: 128000,
          format: "mp3",
        },
        // Request word timestamps
        timber_weights: [{ voice_id: voiceId, weight: 1 }],
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`TTS failed: ${err}`);
  }

  const data: any = await resp.json();

  if (data.base_resp?.status_code !== 0) {
    throw new Error(`TTS error: ${data.base_resp?.status_msg || "unknown"}`);
  }

  // Decode base64 audio
  const audioBase64 = data.data?.audio;
  if (!audioBase64) throw new Error("No audio data returned");

  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Extract subtitle/timestamp info if available
  const subtitleInfo = data.data?.subtitle_info || [];
  const timestamps = subtitleInfo.map((item: any) => ({
    word: item.text || "",
    startMs: item.start_time || 0,
    endMs: item.end_time || 0,
  }));

  const durationMs = data.data?.audio_length_ms ||
    (timestamps.length > 0 ? timestamps[timestamps.length - 1].endMs : 0);

  return {
    audioBuffer: bytes.buffer,
    durationMs,
    timestamps,
  };
}
