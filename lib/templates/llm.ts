// lib/llm.ts
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callOpenRouterJSON(
  messages: ChatMessage[],
  {
    model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    temperature = 0.2,
    max_output_tokens = 1500,
    abortSignal,
    retries = 2,
    timeoutMs = 60_000,
  }: {
    model?: string;
    temperature?: number;
    max_output_tokens?: number;
    abortSignal?: AbortSignal;
    retries?: number;
    timeoutMs?: number;
  } = {}
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    // Hints for OpenRouter routing / dashboard:
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Feedback Reporter",
  };

  const body = {
    model,
    messages,
    temperature,
    // Ask models that support it to return strict JSON:
    response_format: { type: "json_object" },
    // Some providers respect this name:
    max_output_tokens,
  };

  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortSignal ?? controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 500)}`);
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content returned from model");
      // Try parse; if the model wrapped JSON in text, extract best-effort:
      try {
        return JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}$/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Model response was not valid JSON");
      }
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}
