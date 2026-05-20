import { BaseProvider } from "./base";
import type { Env } from "../types";

export class OpenAIProvider extends BaseProvider {
  name = "openai";
  baseUrl = "https://api.openai.com/v1";
  supportedModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1-preview",
    "o1-mini",
  ];

  getApiKey(env: Env): string {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    return env.OPENAI_API_KEY;
  }
}
