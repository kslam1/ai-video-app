import type { Env } from "../types";

const SCRIPT_SYSTEM_PROMPT = `你是一个专业的短视频脚本编剧。用户会给你一个选题或关键词，你需要生成一段适合短视频口播的脚本。

要求：
1. 时长控制在 60-120 秒（约 200-400 字）
2. 开头要有吸引力的 hook（前 3 秒抓住注意力）
3. 内容有信息量、有观点、有节奏感
4. 语言口语化，适合朗读
5. 结尾要有互动引导（点赞/关注/评论）

输出格式：直接输出脚本正文，不需要标题、分镜、备注等额外内容。`;

export async function generateScript(
  topic: string,
  env: Env,
  options?: { style?: string; duration?: "short" | "medium" | "long" }
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const durationHint =
    options?.duration === "short"
      ? "控制在 30-60 秒（100-200字）"
      : options?.duration === "long"
      ? "控制在 2-3 分钟（400-600字）"
      : "控制在 60-120 秒（200-400字）";

  const userPrompt = `选题：${topic}\n\n时长要求：${durationHint}${
    options?.style ? `\n风格：${options.style}` : ""
  }`;

  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SCRIPT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Script generation failed: ${err}`);
  }

  const data: any = await resp.json();
  return data.choices[0].message.content.trim();
}
