export async function callOpenRouterJSON({
  model,
  system,
  user,
  temperature = 0.2,
}: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
}) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Feedback Reporter",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Ask for strict JSON; some models ignore—handle fallback below
      response_format: { type: "json_object" },
    }),
    // Avoid Edge runtime quirks
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`OpenRouter: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    // Fallback: extract first JSON object substring
    const match = content.match(/\{[\s\S]*\}$/m);
    if (!match) throw new Error("Model returned non-JSON content.");
    return JSON.parse(match[0]);
  }
}
