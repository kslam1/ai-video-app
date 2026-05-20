import { OpenAIProvider } from "./openai";
import { DeepSeekProvider } from "./deepseek";
import { KimiProvider } from "./kimi";
import { ClaudeProvider } from "./claude";
import { BaseProvider } from "./base";

const providers: BaseProvider[] = [
  new OpenAIProvider(),
  new DeepSeekProvider(),
  new KimiProvider(),
  new ClaudeProvider(),
];

export function getProvider(model: string): BaseProvider | null {
  return providers.find((p) => p.supports(model)) || null;
}

export function listModels(): { id: string; provider: string }[] {
  return providers.flatMap((p) =>
    p.supportedModels.map((m) => ({ id: m, provider: p.name }))
  );
}
