import { BaseProvider } from "./base";
import type { ChatCompletionRequest, Env, Message } from "../types";

export class ClaudeProvider extends BaseProvider {
  name = "claude";
  baseUrl = "https://api.anthropic.com/v1";
  supportedModels = [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-20250414",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-haiku-20240307",
  ];

  getApiKey(env: Env): string {
    if (!env.CLAUDE_API_KEY) throw new Error("CLAUDE_API_KEY not configured");
    return env.CLAUDE_API_KEY;
  }

  async chat(request: ChatCompletionRequest, env: Env): Promise<Response> {
    const apiKey = this.getApiKey(env);
    const body = this.buildClaudeRequest(request);

    const resp = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.text();
      return new Response(
        JSON.stringify({
          error: {
            message: `Upstream error from Claude: ${error}`,
            type: "upstream_error",
            code: resp.status,
          },
        }),
        { status: resp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.stream) {
      return this.convertClaudeStream(resp, request.model);
    }

    const data: any = await resp.json();
    return new Response(JSON.stringify(this.convertClaudeResponse(data, request.model)), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private buildClaudeRequest(request: ChatCompletionRequest): any {
    // Extract system message
    let system: string | undefined;
    const messages: any[] = [];

    for (const msg of request.messages) {
      if (msg.role === "system") {
        system = typeof msg.content === "string" ? msg.content : "";
      } else {
        messages.push({
          role: msg.role,
          content: typeof msg.content === "string"
            ? msg.content
            : msg.content.map((part) => {
                if (part.type === "text") return { type: "text", text: part.text };
                if (part.type === "image_url") {
                  return {
                    type: "image",
                    source: { type: "url", url: part.image_url!.url },
                  };
                }
                return part;
              }),
        });
      }
    }

    const body: any = {
      model: request.model,
      messages,
      max_tokens: request.max_tokens || 4096,
    };

    if (system) body.system = system;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.stream) body.stream = true;
    if (request.stop) {
      body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    return body;
  }

  private convertClaudeResponse(data: any, model: string): any {
    const content = data.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");

    return {
      id: `chatcmpl-${data.id}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: data.stop_reason === "end_turn" ? "stop" : data.stop_reason,
        },
      ],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  private convertClaudeStream(resp: Response, model: string): Response {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "message_start") {
                inputTokens = event.message?.usage?.input_tokens || 0;
              } else if (event.type === "content_block_delta") {
                const text = event.delta?.text || "";
                if (text) {
                  const chunk = {
                    id: `chatcmpl-stream`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: text },
                        finish_reason: null,
                      },
                    ],
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
                  );
                }
              } else if (event.type === "message_delta") {
                outputTokens = event.usage?.output_tokens || 0;
                const chunk = {
                  id: `chatcmpl-stream`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model,
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: "stop",
                    },
                  ],
                  usage: {
                    prompt_tokens: inputTokens,
                    completion_tokens: outputTokens,
                    total_tokens: inputTokens + outputTokens,
                  },
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
                );
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
