// Cloudflare Workers bindings
export interface Env {
  KV: KVNamespace;
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_SECRET: string;
  // Provider API keys (set via wrangler secret)
  OPENAI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  KIMI_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  MINIMAX_GROUP_ID?: string;
  VIDEO_WORKER_URL?: string;
}

// OpenAI-compatible request
export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

// OpenAI-compatible response
export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: "assistant"; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Provider definition
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  models: string[];
  // Price per 1M tokens [input, output] in USD
  pricing: Record<string, [number, number]>;
}

// API Key record
export interface ApiKeyRecord {
  id: string;
  key_hash: string;
  name: string;
  balance: number;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}
