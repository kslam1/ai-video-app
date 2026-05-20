import { BaseProvider } from "./base";
import type { Env } from "../types";

export class DeepSeekProvider extends BaseProvider {
  name = "deepseek";
  baseUrl = "https://api.deepseek.com/v1";
  supportedModels = ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"];

  getApiKey(env: Env): string {
    if (!env.DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY not configured");
    return env.DEEPSEEK_API_KEY;
  }
}
