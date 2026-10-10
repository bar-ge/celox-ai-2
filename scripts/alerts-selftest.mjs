// Self-test for the alert email + Send now. No network: Supabase and Resend are
// stubbed. Run: npm run test:alerts   (needs Node >= 22.6 for .ts files)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fdir = path.join(root, 'supabase/functions')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const { buildEmail, describe, esc, alertKey } = await import(pathToFileURL(path.join(fdir, 'daily-alerts/email.ts')))

// ── email content ───────────────────────────────────────────────────────────
console.log('email')
const A = (o) => ({ severity: 'warning', label: '', date: '2026-10-05', entity_name: null, category: null, source_id: '1', ...o })
const alerts = [
  A({ type: 'registration', entity_name: '12-345-67', date: '2026-10-01', source_id: '10' }),
  A({ type: 'test', entity_name: '12-345-67', source_id: '11' }),
  A({ type: 'insurance', entity_name: '12-345-67', category: 'mandatory', source_id: '12' }),
  A({ type: 'leasing', entity_name: '12-345-67', source_id: '13' }),
  A({ type: 'tachograph', entity_name: '12-345-67', source_id: '14' }),
  A({ type: 'license', label: 'רישיון נהיגה: דנה', entity_name: 'דנה', source_id: 'd1' }),
  A({ type: 'certification', label: 'ADR — דנה', entity_name: 'דנה', source_id: '15' }),
  A({ type: 'maintenance', label: 'Oil Change — 12-345-67', entity_name: '12-345-67', category: 'Oil Change', date: '2026-09-01', source_id: '16' }),
  A({ type: 'document', label: 'ביטוח.pdf (רכב)', source_id: '17' }),
  A({ type: 'custom', label: 'Renew <b>fuel</b> card', entity_name: '12-345-67', source_id: '18' }),
]
const en = buildEmail({ alerts, accidents: [], isHe: false, appUrl: 'https://x.test', todayStr: '2026-09-30', now: new Date('2026-09-30T07:00:00Z') })
const he = buildEmail({ alerts, accidents: [], isHe: true, appUrl: 'https://x.test', todayStr: '2026-09-30', now: new Date('2026-09-30T07:00:00Z') })
ok(en.total === 10, 'counts every alert type (10)')
for (const w of ['Vehicle registration', 'Annual test', 'Insurance', 'Driver license', 'Certifications', 'Maintenance', 'Tachograph', 'Leasing end', 'Documents', 'Reminders'])
  ok(en.html.includes(w), `English email has a "${w}" section`)
ok(!/[֐-׿]/.test(en.html.replace('ביטוח.pdf', '').replace('דנה', '').replace(/דנה/g, '')), 'English email has no Hebrew boilerplate')
ok(en.html.includes('Mandatory insurance — 12-345-67'), 'insurance policy type translated')
ok(en.html.includes('Oil Change — 12-345-67') && he.html.includes('החלפת שמן — 12-345-67'), 'maintenance type localised')
ok(he.html.includes('dir="rtl"') && he.html.includes('טסט שנתי'), 'Hebrew email is RTL with Hebrew labels')
ok(en.html.includes('Overdue') && en.html.includes('Upcoming'), 'overdue and upcoming both shown')
ok(!en.html.includes('<b>fuel</b>') && en.html.includes('&lt;b&gt;fuel&lt;/b&gt;'), 'user text is HTML-escaped')
ok(en.subject.includes('10 alerts') && he.subject.includes('10 התראות'), 'subject counts alerts')
const one = buildEmail({ alerts: [alerts[0]], accidents: [], isHe: false, appUrl: 'u', todayStr: '2026-09-30' })
ok(one.subject.includes('1 alert —'), 'singular subject')
ok(esc(`<a href="x">'&`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;', 'esc covers <>"\'&')
ok(describe(A({ type: 'document', label: 'a.pdf (נהג)' }), false) === 'a.pdf (Driver)', 'document suffix translated')
ok(alertKey('c', { type: 'license', source_id: 'd1' }) === 'c:license:d1', 'history key format unchanged (company:type:id)')
const acc = buildEmail({ alerts: [], accidents: [{ id: '1', created_at: '2026-09-01T00:00:00Z', other_plate: '<x>', description: 'd' }], isHe: false, appUrl: 'u', todayStr: '2026-09-30' })
ok(acc.total === 1 && acc.html.includes('Open Accidents') && acc.html.includes('&lt;x&gt;'), 'accidents still included and escaped')

// ── daily-alerts handler with stubs ─────────────────────────────────────────
function load(file, env) {
  let src = fs.readFileSync(path.join(fdir, file), 'utf8')
  src = src.replace(/import \{ createClient \} from 'https:\/\/esm\.sh[^']*'/, 'const createClient = (...a) => globalThis.__createClient(...a)')
  const tmp = path.join(fdir, file.replace('index.ts', `.tmp-${Math.random().toString(36).slice(2)}.ts`))
  fs.writeFileSync(tmp, src)
  let handler
  globalThis.Deno = { env: { get: (k) => env[k] }, serve: (h) => { handler = h } }
  return import(pathToFileURL(tmp) + '?' + Math.random()).then(() => { fs.unlinkSync(tmp); return handler }, (e) => { fs.unlinkSync(tmp); throw e })
}

function world({ companies, alerts = {}, history = [], admins = {}, accidents = {}, resendOk = true }) {
  const sent = [], upserts = [], errors = []
  const origErr = console.error; console.error = (...a) => errors.push(a.join(' '))
  const client = {
    rpc: async (name, args) => name === 'company_expiry_alerts' ? { data: alerts[args.p_company] ?? [], error: null } : { data: null, error: { message: 'unknown' } },
    from(t) {
      const st = { filters: {}, t }
      const chain = {
        select: () => chain,
        eq: (k, v) => { st.filters[k] = v; return chain },
        gt: () => chain, lt: () => chain, limit: () => chain,
        upsert: async (rows) => { upserts.push(...rows); return { error: null } },
        then: (res) => {
          let data = []
          if (t === 'companies') data = companies.filter(c => (st.filters.id ? c.id === st.filters.id : true) && (st.filters.email_alerts_enabled ? c.email_alerts_enabled : true))
          if (t === 'alert_history') data = history
          if (t === 'profiles') data = (admins[st.filters.company_id] ?? []).map(email => ({ email }))
          if (t === 'accident_reports') data = accidents[st.filters.company_id] ?? []
          return Promise.resolve({ data, error: null }).then(res)
        },
      }
      return chain
    },
  }
  globalThis.__createClient = () => client
  globalThis.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: resendOk, text: async () => 'boom' } }
  return { sent, upserts, errors, done: () => { console.error = origErr } }
}
const env = { RESEND_API_KEY: 'k', CRON_SECRET: 's', SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'srv' }
const req = (body, secret = 's') => new Request('http://x', { method: 'POST', headers: { 'x-cron-secret': secret }, body: body ? JSON.stringify(body) : undefined })
const co = (id, o = {}) => ({ id, name: id, email_lang: 'he', email_alerts_enabled: true, alert_recipients: [], ...o })
const item = (o) => ({ severity: 'warning', label: 'x', date: '2026-10-05', entity_name: 'P', category: null, ...o })

console.log('daily-alerts')
{
  const daily = await load('daily-alerts/index.ts', env)
  ok((await daily(req(null, 'wrong'))).status === 401, 'wrong cron secret -> 401')

  let w = world({ companies: [co('A'), co('B', { email_alerts_enabled: false })], alerts: { A: [item({ type: 'insurance', source_id: 'i1' }), item({ type: 'test', source_id: 't1' })], B: [item({ type: 'test', source_id: 't2' })] }, admins: { A: ['boss@a.test'] } })
  let out = await (await daily(req({}))).json(); w.done()
  ok(out.emails_sent === 1 && out.alerts_sent === 2, 'cron: sends one email covering insurance + test (types the old email skipped)')
  ok(w.sent.length === 1 && w.sent[0].body.to[0] === 'boss@a.test', 'falls back to the first admin')
  ok(w.upserts.length === 2 && w.upserts.every(r => r.company_id === 'A') && w.upserts.map(r => r.entity_type).sort().join() === 'insurance,test', 'history recorded per type with source id')
  ok(!w.sent.some(s => JSON.stringify(s.body).includes('t2')) , 'disabled company B gets nothing')

  w = world({ companies: [co('A')], alerts: { A: [item({ type: 'test', source_id: 't1' }), item({ type: 'license', source_id: 'd1' })] }, history: [{ company_id: 'A', entity_type: 'test', entity_id: 't1' }], admins: { A: ['boss@a.test'] } })
  out = await (await daily(req({}))).json(); w.done()
  ok(out.alerts_sent === 1 && w.upserts.length === 1 && w.upserts[0].entity_id === 'd1', 'cron: item alerted within 7 days is not re-sent')

  w = world({ companies: [co('A')], alerts: { A: [item({ type: 'test', source_id: 't1' })] }, history: [{ company_id: 'A', entity_type: 'test', entity_id: 't1' }], admins: { A: ['boss@a.test'] } })
  out = await (await daily(req({ companyId: 'A' }))).json(); w.done()
  ok(out.alerts_sent === 1, 'manual: ignores the 7-day de-dup')

  w = world({ companies: [co('A')], alerts: { A: [item({ type: 'test', source_id: 't1' })] }, admins: {} })
  out = await (await daily(req({}))).json(); w.done()
  ok(out.emails_sent === 0 && out.skipped_no_recipient?.[0] === 'A' && w.errors.some(e => e.includes('no recipient')), 'no admin + no recipients: reported in response AND logged (was silent)')

  w = world({ companies: [co('A', { alert_recipients: ['x@a.test', 'y@a.test'] })], alerts: { A: [item({ type: 'test', source_id: 't1' })] }, admins: { A: ['boss@a.test'] } })
  await daily(req({})); w.done()
  ok(w.sent[0].body.to.join() === 'x@a.test,y@a.test', 'configured recipients win over the admin')

  w = world({ companies: [co('A')], alerts: { A: [] }, admins: { A: ['boss@a.test'] } })
  out = await (await daily(req({ companyId: 'A', to: ['me@a.test'] }))).json(); w.done()
  ok(out.reason === 'nothing_due' && out.alerts_sent === 0 && w.sent.length === 0, 'manual with nothing due: reason nothing_due, no email')

  w = world({ companies: [co('A', { email_alerts_enabled: false })], alerts: { A: [item({ type: 'test', source_id: 't1' })] } })
  out = await (await daily(req({ companyId: 'A', to: ['me@a.test'] }))).json(); w.done()
  ok(out.alerts_sent === 1 && w.sent[0].body.to[0] === 'me@a.test', 'manual works even if daily emails are switched off, and honours "to"')

  w = world({ companies: [co('A')], alerts: { A: [item({ type: 'test', source_id: 't1' })] }, admins: { A: ['b@a.test'] }, resendOk: false })
  out = await (await daily(req({}))).json(); w.done()
  ok(out.ok === false && out.failed?.[0] === 'A' && w.upserts.length === 0, 'Resend failure: reported, nothing marked as sent')

  w = world({ companies: [co('A')], alerts: { A: [item({ type: 'custom', source_id: 'c1', label: 'Call insurer' })] }, admins: { A: ['b@a.test'] } })
  await daily(req({})); w.done()
  ok(w.sent[0].body.html.includes('Call insurer') && w.upserts[0].entity_type === 'custom', 'custom reminders are emailed and de-duped by type "custom"')
}

// ── trigger-alerts ("Send now") ─────────────────────────────────────────────
console.log('trigger-alerts')
{
  const mk = (profile, company, dailyResp = { ok: true, alerts_sent: 3 }) => {
    const calls = []
    globalThis.__createClient = (url, key, opts) => ({
      auth: { getUser: async () => (opts?.global?.headers?.Authorization === 'Bearer good' ? { data: { user: { id: 'u1' } }, error: null } : { data: { user: null }, error: { message: 'no' } }) },
      from: (t) => ({ select: () => ({ eq: () => ({ single: async () => ({ data: t === 'profiles' ? profile : company }) }), }) }),
    })
    globalThis.fetch = async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, json: async () => dailyResp } }
    return calls
  }
  const tenv = { ...env, SUPABASE_ANON_KEY: 'anon' }
  const trig = await load('trigger-alerts/index.ts', tenv)
  const r = (auth, body) => new Request('http://x', { method: 'POST', headers: { Authorization: auth }, body: JSON.stringify(body ?? {}) })

  let calls = mk({ role: 'admin', company_id: 'A', email: 'boss@a.test' }, { alert_recipients: [] })
  ok((await trig(r('Bearer bad'))).status === 401, 'no valid login -> 401')
  let res = await trig(r('Bearer good')); let out = await res.json()
  ok(out.ok && out.alerts_sent === 3 && calls[0].body.companyId === 'A' && calls[0].body.to.join() === 'boss@a.test', 'admin: sends for own company, to themselves when no recipients configured')
  ok(calls[0].init.headers['x-cron-secret'] === 's', 'calls daily-alerts with the cron secret')

  calls = mk({ role: 'admin', company_id: 'A', email: 'boss@a.test' }, { alert_recipients: ['x@a.test', 'y@a.test'] })
  await trig(r('Bearer good'))
  ok(calls[0].body.to.join() === 'x@a.test,y@a.test', 'admin: configured recipients are used')

  calls = mk({ role: 'admin', company_id: 'A', email: 'boss@a.test' }, { alert_recipients: [] })
  await trig(r('Bearer good', { companyId: 'OTHER' }))
  ok(calls[0].body.companyId === 'A', 'admin cannot target another company')

  calls = mk({ role: 'master', company_id: 'T', email: 'bar@x.test' }, { alert_recipients: [] })
  res = await trig(r('Bearer good', { companyId: 'B' }))
  ok(res.status === 200 && calls[0].body.companyId === 'B', 'master: allowed (was 403) and may target another company')

  mk({ role: 'member', company_id: 'A', email: 'm@a.test' }, {})
  ok((await trig(r('Bearer good'))).status === 403, 'plain member -> 403')

  mk({ role: 'admin', company_id: 'A', email: null }, { alert_recipients: [] })
  out = await (await trig(r('Bearer good'))).json()
  ok(out.ok === false && out.reason === 'no_recipient', 'no address anywhere -> clear reason')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
