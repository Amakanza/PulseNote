// lib/reportTemplate.ts

export type ReportFields = {
  patient_name?: string;
  dob?: string;
  medical_aid?: string;
  medical_aid_number?: string;
  occupation?: string;
  physiotherapist?: string;
  referral_diagnosis?: string;
  doctor_name?: string;

  // Core narrative blocks — we’ll push for detail retention
  intro_paragraph?: string;
  assessment_paragraph?: string;
  objective_paragraph?: string;
  reassessment_paragraph?: string;
  closing?: string;

  // Detail-preserving extras
  representative_quotes?: { text: string; speaker?: string; timestamp?: string }[];
  issues_table?: { theme: string; details: string; count?: number }[];
  action_items?: { title: string; rationale: string; owner?: string; priority?: "High" | "Medium" | "Low"; due_window?: string }[];

  physio_signature_name?: string;
  physio_signature_title?: string;
};

export function renderHTML(fields: ReportFields) {
  const esc = (s?: string) => (s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const quotes = (fields.representative_quotes ?? []).map(q => 
    `<li>“${esc(q.text)}”${q.speaker ? ` — <em>${esc(q.speaker)}</em>` : ""}${q.timestamp ? ` <span style="color:#64748b">(${esc(q.timestamp)})</span>` : ""}</li>`
  ).join("");

  const issues = (fields.issues_table ?? []).map(i =>
    `<tr><td>${esc(i.theme)}</td><td>${esc(i.details)}</td><td>${i.count ?? ""}</td></tr>`
  ).join("");

  const actions = (fields.action_items ?? []).map((a, idx) =>
    `<tr><td>${idx + 1}</td><td>${esc(a.title)}</td><td>${a.priority ?? ""}</td><td>${esc(a.owner ?? "")}</td><td>${esc(a.due_window ?? "")}</td><td>${esc(a.rationale)}</td></tr>`
  ).join("");

  return `
    <p><strong>Name:</strong> ${esc(fields.patient_name)} &nbsp;&nbsp;&nbsp; <strong>Date of birth:</strong> ${esc(fields.dob)}</p>
    <p><strong>Medical aid:</strong> ${esc(fields.medical_aid)} &nbsp;&nbsp;&nbsp; <strong>Medical aid number:</strong> ${esc(fields.medical_aid_number)}</p>
    <p><strong>Occupation:</strong> ${esc(fields.occupation)} &nbsp;&nbsp;&nbsp; <strong>Physiotherapist:</strong> ${esc(fields.physiotherapist)}</p>
    <p><strong>Referral Diagnosis:</strong> ${esc(fields.referral_diagnosis)}</p>

    <h2>Re: Physiotherapy management report</h2>
    <p>Dear Dr ${esc(fields.doctor_name)}</p>

    ${fields.intro_paragraph ? `<p>${esc(fields.intro_paragraph)}</p>` : ""}
    ${fields.assessment_paragraph ? `<p>${esc(fields.assessment_paragraph)}</p>` : ""}
    ${fields.objective_paragraph ? `<p>${esc(fields.objective_paragraph)}</p>` : ""}
    ${fields.reassessment_paragraph ? `<p>${esc(fields.reassessment_paragraph)}</p>` : ""}

    ${(fields.representative_quotes?.length ?? 0) > 0 ? `
      <h2 id="quotes">Representative Quotes</h2>
      <ul>${quotes}</ul>
    ` : ""}

    ${(fields.issues_table?.length ?? 0) > 0 ? `
      <h2 id="themes">Detailed Issues (verbatim-preserving)</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Theme</th><th>Specific details kept verbatim</th><th>Mentions</th></tr></thead>
        <tbody>${issues}</tbody>
      </table>
    ` : ""}

    ${(fields.action_items?.length ?? 0) > 0 ? `
      <h2 id="actions">Action Items</h2>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>#</th><th>Action</th><th>Priority</th><th>Owner</th><th>Due window</th><th>Rationale (traceable to quotes/issues)</th></tr></thead>
        <tbody>${actions}</tbody>
      </table>
    ` : ""}

    ${fields.closing ? `<p>${esc(fields.closing)}</p>` : ""}

    <br/>
    <p>${esc(fields.physio_signature_name)}</p>
    <p>${esc(fields.physio_signature_title)}</p>
  `;
}
