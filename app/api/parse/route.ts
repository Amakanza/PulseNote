import { NextResponse } from "next/server";

const LINE = /^(\[?\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4},?\s+\d{1,2}:\d{2}(?:\s?[AP]M)?\]?)[\s\-]*([^:]+):\s+([\s\S]+)$/;

function parse(text: string) {
  const lines = text.split(/\r?\n/);
  const messages: { timestamp?: string; sender?: string; message: string }[] = [];
  let buffer: any = null;

  for (const raw of lines) {
    const m = raw.match(LINE);
    if (m) {
      if (buffer) messages.push(buffer);
      buffer = { timestamp: m[1], sender: m[2].trim(), message: m[3].trim() };
    } else {
      if (buffer) buffer.message += "\n" + raw.trim();
    }
  }
  if (buffer) messages.push(buffer);

  if (!messages.length && text.trim()) {
    messages.push({ message: text.trim() });
  }
  return messages;
}

export async function POST(req: Request) {
  try {
    const { rawText } = await req.json();
    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ error: "rawText is required" }, { status: 400 });
    }
    const messages = parse(rawText);
    return NextResponse.json({ messages });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to parse" }, { status: 500 });
  }
}
