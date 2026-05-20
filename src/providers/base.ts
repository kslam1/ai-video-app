import type { ChatCompletionRequest, Env } from "../types";

export interface ProviderResult {
  response: Response;
  provider: string;
}

export abstract class BaseProvider {
  abstract name: string;
  abstract baseUrl: string;
  abstract supportedModels: string[];

  abstract getApiKey(env: Env): string;

  supports(model: string): boolean {
    return this.supportedModels.some(
      (m) => model === m || model.startsWith(m.replace("*", ""))
    );
  }

  async chat(
    request: ChatCompletionRequest,
    env: Env
  ): Promise<Response> {
    const apiKey = this.getApiKey(env);
    const body = this.transformRequest(request);
    const url = `${this.baseUrl}/chat/completions`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const error = await resp.text();
      return new Response(
        JSON.stringify({
          error: {
            message: `Upstream error from ${this.name}: ${error}`,
            type: "upstream_error",
            code: resp.status,
          },
        }),
        { status: resp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.stream) {
      return this.handleStream(resp, request.model);
    }

    const data = await resp.json();
    return new Response(JSON.stringify(this.transformResponse(data, request.model)), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Override if request format differs from OpenAI
  protected transformRequest(request: ChatCompletionRequest): any {
    return request;
  }

  // Override if response format differs from OpenAI
  protected transformResponse(data: any, model: string): any {
    return data;
  }

  // Default: pass through SSE stream
  protected handleStream(resp: Response, model: string): Response {
    return new Response(resp.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
