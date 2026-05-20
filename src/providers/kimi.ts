import { BaseProvider } from "./base";
import type { Env } from "../types";

export class KimiProvider extends BaseProvider {
  name = "kimi";
  baseUrl = "https://api.moonshot.cn/v1";
  supportedModels = [
    "moonshot-v1-8k",
    "moonshot-v1-32k",
    "moonshot-v1-128k",
  ];

  getApiKey(env: Env): string {
    if (!env.KIMI_API_KEY) throw new Error("KIMI_API_KEY not configured");
    return env.KIMI_API_KEY;
  }
}
