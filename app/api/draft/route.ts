// app/api/draft/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Msg = { timestamp?: string; sender?: string; message: string };

type Quote = { text: string; speaker?: string; timestamp?: string };
type IssueRow = { theme: string; details: string; count?: number };
type ActionItem = {
  title: string;
  rationale: string;
  owner?: string;
  priority?: "High" | "Medium" | "Low";
  due_window?: string;
};

type ReportFields = {
  patient_name?: string;
  dob?: string;
  medical_aid?: string;
  medical_aid_number?: string;
  occupation?: string;
  physiotherapist?: string;
  referral_diagnosis?: string;
  doctor_name?: string;

  intro_paragraph?: string;
  assessment_paragraph?: string;
  objective_paragraph?: string;
  reassessment_paragraph?: string;
  closing?: string;

  representative_quotes?: Quote[];
  issues_table?: IssueRow[];
  action_items?: ActionItem[];

  physio_signature_name?: string;
  physio_signature_title?: string;
};

function capMessages(messages: Msg[], maxMsgs = 800, maxChars = 1500): Msg[] {
  return (messages || []).slice(0, maxMsgs).map((m) => ({
    timestamp: m.timestamp?.slice(0, 40),
    sender: (m.sender ?? "").slice(0, 80),
    message: (m.message ?? "").slice(0, maxChars),
  }));
}

const SCHEMA_EXAMPLE = `{
  "patient_name": "John Doe",
  "dob": "1999-07-21",
  "medical_aid": "NHP",
  "medical_aid_number": "12345678",
  "occupation": "Teacher",
  "physiotherapist": "A. Mak",
  "referral_diagnosis": "De Quervain's tenosynovitis",
  "doctor_name": "Smith",

  "intro_paragraph": "Context with dates, services, and setting. Keep concrete details.",
  "assessment_paragraph": "What the feedback reveals; do not compress unique items.",
  "objective_paragraph": "Measurable facts (times, counts, costs, locations).",
  "reassessment_paragraph": "Changes over time; what improved/worsened; remaining issues.",
  "closing": "Professional sign-off, next steps and follow-up plan.",

  "representative_quotes": [
    { "text": "Delivery was 2 hours late and the box was dented.", "speaker": "Client A", "timestamp": "12/08/24, 09:15" }
  ],
  "issues_table": [
    { "theme": "Delivery delays", "details": "'2 hours late', affected order #123 and #128", "count": 2 }
  ],
  "action_items": [
    { "title": "Adjust courier pickup window", "rationale": "Directly addresses '2 hours late' quotes", "owner": "Ops", "priority": "High", "due_window": "7 days" }
  ],

  "physio_signature_name": "Andile J. Mak",
  "physio_signature_title": "Physiotherapist"
}`;

const SYSTEM = `
You turn clinical notes into professional physiotherapy reports. 

AUTOMATICALLY ADJUST DETAIL LEVEL based on what you observe in the clinical notes:

FOR COMPLEX CASES (you'll recognize these by: extended treatment periods, critical care settings, surgeries, complications, multiple specialties, life support equipment):
- Preserve ALL clinical details with exact dates and values
- Show chronological progression day by day
- Include all equipment settings, vital signs, medication changes
- Document every complication and critical event
- Use detailed quotes for clinical decision-making

FOR MODERATE CASES (you'll recognize these by: inpatient care, some complications, post-surgical, multiple sessions over several days):
- Include key clinical findings and important interventions
- Show treatment progression with significant dates
- Document major complications and responses
- Include representative quotes for key issues

FOR SIMPLE CASES (you'll recognize these by: outpatient visits, routine conditions, few sessions, straightforward progress):
- Provide concise clinical summary with essential findings
- Focus on treatment approach and functional outcomes
- Brief documentation appropriate for routine care

PRESERVE REGARDLESS OF COMPLEXITY:
- MUST CAPTURE CLINICAL ITEMS: any diagnoses/diagnosis/Dx/impression/assessment AND any procedures/ops/surgeries/injections/tests that were DONE
- All specific treatments/techniques used with exact names
- Patient response to interventions with measurable outcomes
- Clinical reasoning for treatment decisions and modifications
- Concrete details: numbers, dates, names, locations, timings, laterality

OUTPUT: Single JSON object with exact schema keys, with detail level matching case complexity.
`.trim();

async function callOpenRouterJSON(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<any> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("Missing LLM_API_KEY in env");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 3500, // Increased for complex cases
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

function renderHTML(fields: ReportFields) {
  const esc = (s?: string) =>
    (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
    <p><strong>Name:</strong> ${esc(fields.patient_name)} | <strong>DOB:</strong> ${esc(fields.dob)}</p>
    <p><strong>Medical aid:</strong> ${esc(fields.medical_aid)} | <strong>No:</strong> ${esc(fields.medical_aid_number)}</p>
    <p><strong>Occupation:</strong> ${esc(fields.occupation)} | <strong>Physio:</strong> ${esc(fields.physiotherapist)}</p>
    <p><strong>Referral Dx:</strong> ${esc(fields.referral_diagnosis)}</p>

    <h2>Report</h2>
    ${fields.intro_paragraph ? `<p>${esc(fields.intro_paragraph)}</p>` : ""}
    ${fields.assessment_paragraph ? `<p>${esc(fields.assessment_paragraph)}</p>` : ""}
    ${fields.objective_paragraph ? `<p>${esc(fields.objective_paragraph)}</p>` : ""}
    ${fields.reassessment_paragraph ? `<p>${esc(fields.reassessment_paragraph)}</p>` : ""}

    ${fields.closing ? `<p>${esc(fields.closing)}</p>` : ""}

    <br/>
    <p>${esc(fields.physio_signature_name)}</p>
    <p>${esc(fields.physio_signature_title)}</p>
  `;
}

export async function POST(req: Request) {
  try {
    const { messages, templateId } = await req.json();
    const limited = capMessages(messages);

    const userPrompt = [
      `Template: ${templateId || "adaptive-complexity"}`,
      `Schema keys:`,
      SCHEMA_EXAMPLE,
      `Now fill the SAME KEYS using these messages:`,
      JSON.stringify(limited),
    ].join("\n\n");

    const json = (await callOpenRouterJSON(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ]
    )) as ReportFields;

    const html = renderHTML(json);
    return NextResponse.json({ html, analysisJSON: json });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Draft failed" }, { status: 500 });
  }
}
