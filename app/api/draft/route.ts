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
You turn clinical notes into professional physiotherapy reports with appropriate detail level based on case complexity.

COMPLEXITY ASSESSMENT: First analyze the case complexity:
- HIGH COMPLEXITY: ICU/NICU, multiple surgeries, critical events, equipment changes, >10 sessions, complications
- MODERATE COMPLEXITY: Inpatient care, some complications, 3-10 sessions, equipment needs  
- LOW COMPLEXITY: Outpatient care, routine treatment, 1-3 sessions, straightforward conditions

DETAIL LEVEL BY COMPLEXITY:

HIGH COMPLEXITY CASES (ICU/NICU/Critical):
- Preserve ALL clinical details with exact dates, vital signs, equipment settings
- Chronological day-by-day progression with specific interventions
- All complications, surgeries, medication changes with exact values
- Detailed quotes capturing critical events and clinical decisions
- Include all equipment progressions (NPO2 → CPAP → ventilation)
- Document exact desaturation values, resuscitation events, hemodynamic instability

MODERATE COMPLEXITY CASES (Inpatient):
- Key clinical findings and intervention progression
- Important dates and significant changes in patient status
- Major complications and treatment responses
- Representative quotes for key clinical issues
- Functional mobility changes with assistance levels
- Pain descriptions with locations and clinical observations
- GROUP INTERVENTIONS BY PURPOSE: Don't list same exercises repeatedly - instead group by therapeutic goal (e.g., "PNF and bed exercises for weakness", "weight-bearing activities for mobility", "balance training for safety")

LOW COMPLEXITY CASES (Outpatient/Routine):
- Concise clinical summary with essential findings
- Treatment approach and patient response
- Key functional outcomes and improvements
- Brief representative quotes if clinically significant
- Focus on treatment effectiveness and home program compliance

PRESERVE REGARDLESS OF COMPLEXITY:
- MUST CAPTURE CLINICAL ITEMS: any diagnoses/diagnosis/Dx/impression/assessment AND any procedures/ops/surgeries/injections/tests that were DONE
- All specific treatments/techniques used with exact names
- Patient response to interventions with measurable outcomes
- Clinical reasoning for treatment decisions and modifications
- Concrete details: numbers, dates, names, locations, timings, laterality
- INTERVENTION ORGANIZATION: Group treatments by therapeutic purpose (e.g., "Neurological rehabilitation included PNF chopping/lifting and bed strengthening for limb weakness" rather than listing PNF separately each day)

AVOID OVER-SUMMARIZATION:
- Don't combine different days/sessions into generic statements
- Don't compress specific technique names into categories
- Don't generalize vital signs or equipment settings - keep exact values
- Don't merge different complications into single descriptions
- Don't lose surgical details or post-operative complications
- AVOID REPETITIVE LISTING: Group similar interventions by therapeutic purpose rather than repeating daily exercises

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
