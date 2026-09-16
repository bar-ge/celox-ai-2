// One-off manual comparison — NOT part of the test suite.
//
// Sends the SAME realistic Hebrew prompts — one WhatsApp-lead-agent turn,
// one in-app-avatar turn — to up to two models, using the app's own real
// system prompts, and prints side by side: latency, whether the reply is
// valid JSON in the shape each agent actually requires, and the reply text
// itself for you to judge Hebrew quality by eye. No published benchmark had
// Hebrew-specific numbers for Gemma 4 or Qwen3 as of this writing (checked),
// so this direct comparison is the most reliable way to pick a model.
//
// Works against EITHER backend this app supports:
//
//   On-prem VPS (scripts/onprem-vps-bootstrap.sh):
//     ONPREM_LLM_URL=https://llm.celoxai.com/v1/chat/completions \
//     ONPREM_LLM_API_KEY=<token> \
//     node scripts/_compare-onprem-models.mjs gemma4:4b qwen3:8b
//
//   Hugging Face free router (docs/onprem-llm-setup.md, Tier 2):
//     HF_API_TOKEN=<token> \
//     node scripts/_compare-onprem-models.mjs \
//       "meta-llama/Llama-3.1-8B-Instruct:novita" "Qwen/Qwen2.5-7B-Instruct:together"
//
// (Model ids on the CLI always win; pick real current ones from
// huggingface.co/docs/inference-providers or your VPS's `ollama list`.)

const ONPREM_URL = process.env.ONPREM_LLM_URL
const ONPREM_KEY = process.env.ONPREM_LLM_API_KEY || ''
const HF_TOKEN = process.env.HF_API_TOKEN
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions'

const URL = ONPREM_URL || (HF_TOKEN ? HF_ROUTER_URL : null)
const KEY = ONPREM_URL ? ONPREM_KEY : HF_TOKEN

if (!URL) {
  console.error('Set either ONPREM_LLM_URL (+ ONPREM_LLM_API_KEY) or HF_API_TOKEN first — see the header comment.')
  process.exit(1)
}

const [modelA, modelB] = process.argv.slice(2)
if (!modelA || !modelB) {
  console.error('Pass two model ids to compare, e.g.: node scripts/_compare-onprem-models.mjs modelA modelB')
  process.exit(1)
}

const { buildSystemPrompt: buildWaPrompt } = await import('../api/_lib/system-prompt.js')
const { buildSystemPrompt: buildAvatarPrompt } = await import('../api/_lib/avatar-knowledge.js')

const waSystemPrompt = buildWaPrompt({ lead: { first_name: null, stage: 'OPENING' }, slots: [] })
const avatarSystemPrompt = buildAvatarPrompt('he')

const SCENARIOS = [
  {
    label: 'WhatsApp lead agent — opening message',
    systemPrompt: waSystemPrompt,
    userMessage: 'היי, ראיתי את המודעה שלכם. יש לי צי של 12 משאיות, כרגע מנהלים הכל באקסל',
    validate: (obj) => obj && typeof obj.reply === 'string' && typeof obj.intent === 'string' && typeof obj.next_stage === 'string' && 'extracted' in obj,
  },
  {
    label: 'WhatsApp lead agent — asking about pricing (should NOT invent a number)',
    systemPrompt: waSystemPrompt,
    userMessage: 'כמה זה עולה בחודש?',
    validate: (obj) => obj && typeof obj.reply === 'string' && typeof obj.intent === 'string',
  },
  {
    label: 'In-app avatar — navigation intent',
    systemPrompt: avatarSystemPrompt,
    userMessage: 'איך אני עובר למסך הרכבים?',
    validate: (obj) => obj && typeof obj.reply === 'string' && ['qa', 'navigate', 'escalate', 'unclear'].includes(obj.intent) && typeof obj.confidence === 'number',
  },
  {
    label: 'In-app avatar — free-form question',
    systemPrompt: avatarSystemPrompt,
    userMessage: 'איך מוסיפים נהג חדש למערכת?',
    validate: (obj) => obj && typeof obj.reply === 'string' && typeof obj.confidence === 'number',
  },
]

function extractJson(raw) {
  let s = String(raw || '').trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

async function callModel(model, systemPrompt, userMessage) {
  const startedAt = Date.now()
  try {
    const resp = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })
    const latencyMs = Date.now() - startedAt
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      return { ok: false, latencyMs, error: `${resp.status} ${body.slice(0, 300)}` }
    }
    const data = await resp.json()
    const text = data?.choices?.[0]?.message?.content ?? ''
    const parsed = extractJson(text)
    return { ok: true, latencyMs, text, parsed }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - startedAt, error: err instanceof Error ? err.message : String(err) }
  }
}

console.log(`Comparing ${modelA} vs ${modelB} against ${URL}\n`)

for (const scenario of SCENARIOS) {
  console.log('='.repeat(72))
  console.log(scenario.label)
  console.log(`User: ${scenario.userMessage}`)
  console.log('='.repeat(72))

  for (const model of [modelA, modelB]) {
    const result = await callModel(model, scenario.systemPrompt, scenario.userMessage)
    console.log(`\n--- ${model} ---`)
    if (!result.ok) {
      console.log(`FAILED (${result.latencyMs}ms): ${result.error}`)
      continue
    }
    const validShape = scenario.validate(result.parsed)
    console.log(`latency: ${result.latencyMs}ms | valid JSON shape: ${validShape ? 'yes' : 'NO'}`)
    console.log(result.parsed ? JSON.stringify(result.parsed, null, 2) : `(unparsable raw text)\n${result.text.slice(0, 500)}`)
  }
  console.log('')
}

console.log('Done. Judge Hebrew fluency/tone by eye above, then set ONPREM_LLM_MODEL or HF_MODEL to the winner.')
