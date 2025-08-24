# PulseNote report generator

- Input text clincal notes → parse → draft HTML → edit → **Download DOCX**.

## Install & run
```bash
npm install
npm run dev
# open http://localhost:3000
```

## DOCX export
Uses `html-docx-js` to convert the editor HTML into a Word document with simple styles.

## LLM hookup (server-side sketch)
Create `.env.local` and add:
```
LLM_API_KEY=sk-...           # your key
LLM_BASE_URL=https://api.your-llm.com/v1
```

Example server call (replace `/api/draft` content):
```ts
// pseudo-code
const res = await fetch(process.env.LLM_BASE_URL + "/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.LLM_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "your-model-name",
    messages: [
      { role: "system", content: "You are an analyst ..." },
      { role: "user", content: "JSON-spec + pasted messages here ..." }
    ],
    response_format: { type: "json_object" }
  })
});
```

## Template fields (from your Word doc)
We extracted a structure and propose these fields you can map from LLM JSON:
- patient_name, dob, medical_aid, medical_aid_number
- occupation, physiotherapist, referral_diagnosis
- doctor_name, intro_paragraph, assessment_paragraph, objective_paragraph, reassessment_paragraph
- closing, physio_signature_name, physio_signature_title

You can render them either via the TipTap HTML draft or build a direct DOCX using a templater later.
