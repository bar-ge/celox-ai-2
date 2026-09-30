#!/usr/bin/env node
// Self-test for document OCR: normalisation, the Gemini retry ladder, and the
// API route's auth / tenancy / file checks. No network, no API keys — Gemini and
// Supabase are stubbed. It bounds REGRESSION and logic errors; it cannot say
// whether Gemini reads a real license correctly. Use scripts/ocr-try.mjs for that.
//   node scripts/ocr-selftest.mjs

import assert from 'node:assert/strict'
import { normalize, cleanDate, cleanText, sniffMime, buildGeminiRequest, extractFromImage } from '../api/_lib/ocr.js'
import { callGeminiLadder } from '../api/_lib/gemini-client.js'
import { handleOcr, _resetRateLimit } from '../api/ocr/document.js'
import { buildProposal, buildPatch, mergeLevels, doubt, expiryState, formatDate } from '../src/ocr/ocrMapping.js'

let passed = 0, failed = 0
const queue = []
const test = (name, fn) => queue.push(async () => {
  try { await fn(); passed++; console.log(`  ok  ${name}`) }
  catch (e) { failed++; console.error(`FAIL  ${name}\n      ${e.message}`) }
})
const section = s => queue.push(async () => console.log(`\n${s}`))

// ── helpers ──────────────────────────────────────────────────────────────────
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)])
const PDF  = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64)])
const CO_A = '11111111-1111-4111-8111-111111111111'
const CO_B = '22222222-2222-4222-8222-222222222222'
const pathA = `${CO_A}/driver/d1/1700000000_lic.jpg`

function fakeRes() {
  const r = { code: 200, body: null, headers: {} }
  r.setHeader = (k, v) => { r.headers[k] = v }
  r.status = c => { r.code = c; return r }
  r.json = b => { r.body = b; return r }
  r.end = () => r
  return r
}
const req = (body, method = 'POST') => ({ method, headers: { authorization: 'Bearer t' }, body })

function deps({ user, row, file = JPEG, extract, apiKey = 'k' } = {}) {
  return {
    apiKey,
    requireUser: async () => user ?? { ok: true, userId: 'u1', email: 'a@x.com', isMaster: false, companyId: CO_A },
    db: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row === undefined ? { id: 'doc1', company_id: CO_A, entity_type: 'driver' } : row }) }) }) }),
      storage: { from: () => ({ download: async () => file ? ({ data: new Blob([file]), error: null }) : ({ data: null, error: { message: 'nope' } }) }) },
    },
    extract: extract ?? (async () => ({ ok: true, documentKind: 'driver_license', legible: true, fields: { license: '1234567' }, model: 'm', attempt: 1 })),
  }
}

// ── normalisation ────────────────────────────────────────────────────────────
section('date parsing')
test('accepts ISO', () => assert.equal(cleanDate('2029-03-14'), '2029-03-14'))
test('converts DD/MM/YYYY', () => assert.equal(cleanDate('14/03/2029'), '2029-03-14'))
test('converts DD.MM.YYYY and single digits', () => assert.equal(cleanDate('4.3.2029'), '2029-03-04'))
test('rejects 31 Feb', () => assert.equal(cleanDate('2029-02-31'), null))
test('rejects month 13', () => assert.equal(cleanDate('2029-13-01'), null))
test('rejects two-digit years rather than guessing a century', () => assert.equal(cleanDate('14/03/29'), null))
test('rejects absurd years', () => assert.equal(cleanDate('1850-01-01'), null))
test('rejects non-strings', () => { assert.equal(cleanDate(null), null); assert.equal(cleanDate(20290314), null) })

section('text cleaning')
test('strips control and bidi marks', () => assert.equal(cleanText('‮abc‏\u0000 d'), 'abc d'))
test('caps length', () => assert.equal(cleanText('x'.repeat(500), 40).length, 40))
test('empty becomes null', () => assert.equal(cleanText('   '), null))

section('driver license normalisation')
test('happy path', () => {
  const n = normalize('driver_license', {
    documentKind: 'driver_license', legible: true, fullName: ' דוד  כהן ', nationalId: '012345678',
    birthDate: '1990-05-01', licenseNumber: '1234567', licenseExpiry: '14/03/2029',
    licenseClasses: ['b', 'C 1', 'B'], address: 'הרצל 1', city: 'חיפה',
  })
  assert.deepEqual(n.fields, {
    name: 'דוד כהן', national_id: '012345678', birth_date: '1990-05-01', license: '1234567',
    license_expiry: '2029-03-14', license_levels: ['B', 'C1'], address: 'הרצל 1', city: 'חיפה',
  })
})
test('short ID is left-padded, not rejected', () => assert.equal(normalize('driver_license', { documentKind: 'driver_license', nationalId: '12345678' }).fields.national_id, '012345678'))
test('junk classes are dropped', () => assert.equal(normalize('driver_license', { documentKind: 'driver_license', licenseClasses: ['DROP TABLE', '???'] }).fields.license_levels, undefined))
test('null / missing fields are omitted, not stored as null', () => assert.deepEqual(normalize('driver_license', { documentKind: 'driver_license', licenseNumber: '7654321' }).fields, { license: '7654321' }))
test('a wrong-kind document yields NO fields at all', () => {
  const n = normalize('driver_license', { documentKind: 'vehicle_license', plate: '1234567', licenseNumber: '7654321' })
  assert.equal(n.documentKind, 'vehicle_license'); assert.deepEqual(n.fields, {})
})
test('garbage input does not throw', () => { for (const v of [null, undefined, 'x', 5, [], {}]) assert.deepEqual(normalize('driver_license', v).fields, {}) })

section('vehicle license normalisation')
test('happy path', () => {
  const n = normalize('vehicle_license', {
    documentKind: 'vehicle_license', legible: true, plate: '12-345-67', make: 'טויוטה', model: 'קורולה', year: 2019,
    chassisNo: 'jtd bb 23e 000 123456', engineNo: 'a-1234', color: 'לבן', fuel: 'Hybrid', engineVolume: 1798,
    registrationExpiry: '2026-11-30', ownerName: 'חברה בע"מ', totalWeight: '1750.4',
  })
  assert.equal(n.fields.plate, '1234567'); assert.equal(n.fields.chassis_no, 'JTDBB23E000123456')
  assert.equal(n.fields.engine_no, 'A1234'); assert.equal(n.fields.fuel, 'Hybrid')
  assert.equal(n.fields.weight_total, 1750); assert.equal(n.fields.registration_expiry, '2026-11-30')
})
test('unknown fuel is dropped', () => assert.equal(normalize('vehicle_license', { documentKind: 'vehicle_license', fuel: 'Steam' }).fields.fuel, undefined))
test('implausible year / volume / weight are dropped', () => {
  const f = normalize('vehicle_license', { documentKind: 'vehicle_license', year: 1901, engineVolume: 9, totalWeight: 5 }).fields
  assert.deepEqual(f, {})
})
test('a 200-char string cannot reach a column', () => assert.ok(normalize('vehicle_license', { documentKind: 'vehicle_license', make: 'x'.repeat(200) }).fields.make.length <= 50))

section('mime sniffing')
test('jpeg / pdf recognised', () => { assert.equal(sniffMime(JPEG), 'image/jpeg'); assert.equal(sniffMime(PDF), 'application/pdf') })
test('a .doc / .xlsx (zip) is rejected', () => assert.equal(sniffMime(Buffer.from('PK\u0003\u0004' + 'x'.repeat(40))), null))
test('a renamed exe is rejected', () => assert.equal(sniffMime(Buffer.from('MZ' + 'x'.repeat(40))), null))

section('request shape')
test('key is never placed in the URL and body carries the schema', async () => {
  const seen = []
  await callGeminiLadder({ apiKey: 'SECRET', body: buildGeminiRequest('driver_license', 'image/jpeg', 'AAAA'), models: ['m1'],
    fetchImpl: async (url, init) => { seen.push({ url, init }); return { ok: true, json: async () => ({}) } } })
  assert.ok(!seen[0].url.includes('SECRET'), 'key leaked into the URL')
  assert.equal(seen[0].init.headers['x-goog-api-key'], 'SECRET')
  const body = JSON.parse(seen[0].init.body)
  assert.equal(body.generationConfig.responseMimeType, 'application/json')
  assert.ok(body.generationConfig.responseSchema.properties.licenseExpiry)
  assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'image/jpeg')
  assert.ok(body.generationConfig.maxOutputTokens >= 4096)
})

// ── retry ladder ─────────────────────────────────────────────────────────────
section('retry ladder')
const bad = (s, t = 'busy') => ({ ok: false, status: s, text: async () => t })
const ok = j => ({ ok: true, json: async () => j })
const scripted = steps => { const seen = []; return { seen, fn: async url => { seen.push(url.match(/models\/([^:]+):/)[1]); const s = steps[seen.length - 1]; return typeof s === 'function' ? s() : s } } }
const noSleep = async () => {}
test('503 then success retries the same model', async () => {
  const s = scripted([bad(503), ok({ a: 1 })]); const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a', 'a', 'b'], fetchImpl: s.fn, sleep: noSleep })
  assert.ok(r.data); assert.deepEqual(s.seen, ['a', 'a'])
})
test('reaches the fallback model on the third attempt', async () => {
  const s = scripted([bad(503), bad(503), ok({})]); const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a', 'a', 'b'], fetchImpl: s.fn, sleep: noSleep })
  assert.ok(r.data); assert.deepEqual(s.seen, ['a', 'a', 'b'])
})
test('a timeout is retried', async () => {
  const s = scripted([() => { throw new Error('timeout') }, ok({})]); const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a', 'a'], fetchImpl: s.fn, sleep: noSleep })
  assert.ok(r.data); assert.equal(s.seen.length, 2)
})
test('400/403/404 are NOT retried', async () => {
  for (const st of [400, 403, 404]) {
    const s = scripted([bad(st), ok({})]); const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a', 'a', 'b'], fetchImpl: s.fn, sleep: noSleep })
    assert.equal(r.data, null); assert.equal(s.seen.length, 1); assert.equal(r.retryable, false)
  }
})
test('honours the total time budget', async () => {
  let t = 0; const s = scripted([bad(503), bad(503), ok({})])
  const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a', 'a', 'b'], fetchImpl: s.fn, sleep: noSleep, now: () => (t += 30000), totalBudgetMs: 40000 })
  assert.equal(r.data, null); assert.ok(s.seen.length < 3)
})
test('the error text carries no more than 160 chars of the vendor body', async () => {
  const s = scripted([bad(400, 'x'.repeat(2000))]); const r = await callGeminiLadder({ apiKey: 'k', body: '{}', models: ['a'], fetchImpl: s.fn, sleep: noSleep })
  assert.ok(r.lastError.length < 200)
})

section('extractFromImage')
test('parses model JSON and normalises it', async () => {
  const fetchImpl = async () => ok({ candidates: [{ content: { parts: [{ text: JSON.stringify({ documentKind: 'driver_license', legible: true, licenseNumber: '1234567', licenseExpiry: '2029-03-14', licenseClasses: [] }) }] } }] })
  const r = await extractFromImage({ apiKey: 'k', kind: 'driver_license', mime: 'image/jpeg', base64: 'AA', fetchImpl, sleep: noSleep })
  assert.equal(r.ok, true); assert.equal(r.fields.license, '1234567'); assert.equal(r.fields.license_expiry, '2029-03-14')
})
test('JSON wrapped in prose is still recovered', async () => {
  const fetchImpl = async () => ok({ candidates: [{ content: { parts: [{ text: 'Here you go: {"documentKind":"driver_license","legible":true,"licenseNumber":"7654321"} done' }] } }] })
  const r = await extractFromImage({ apiKey: 'k', kind: 'driver_license', mime: 'image/jpeg', base64: 'AA', fetchImpl, sleep: noSleep })
  assert.equal(r.fields.license, '7654321')
})
test('unparsable output is reported, not thrown', async () => {
  const fetchImpl = async () => ok({ candidates: [{ content: { parts: [{ text: '{"reply":"trunc' }] } }] })
  const r = await extractFromImage({ apiKey: 'k', kind: 'driver_license', mime: 'image/jpeg', base64: 'AA', fetchImpl, sleep: noSleep })
  assert.deepEqual([r.ok, r.reason], [false, 'unparsable'])
})

// ── route ────────────────────────────────────────────────────────────────────
section('route: authentication and tenancy')
const call = async (body, d, method) => { const res = fakeRes(); await handleOcr(req(body, method), res, d); return res }
test('GET is 405', async () => assert.equal((await call({}, deps(), 'GET')).code, 405))
test('unauthenticated is 401', async () => assert.equal((await call({ path: pathA, kind: 'driver_license' }, deps({ user: { ok: false, status: 401, reason: 'missing_token' } }))).code, 401))
test('another company\'s file is 403 and never downloaded', async () => {
  let downloaded = false
  const d = deps({ user: { ok: true, userId: 'u2', isMaster: false, companyId: CO_B } }); d.db.storage.from = () => ({ download: async () => { downloaded = true; return { data: new Blob([JPEG]), error: null } } })
  const r = await call({ path: pathA, kind: 'driver_license' }, d)
  assert.equal(r.code, 403); assert.equal(downloaded, false)
})
test('the master account may read any company', async () => {
  _resetRateLimit()
  assert.equal((await call({ path: pathA, kind: 'driver_license' }, deps({ user: { ok: true, userId: 'm', isMaster: true, companyId: null } }))).code, 200)
})
test('a path that is not a recorded document is 404', async () => { _resetRateLimit(); assert.equal((await call({ path: pathA, kind: 'driver_license' }, deps({ row: null }))).code, 404) })
test('a documents row from a different company is rejected', async () => { _resetRateLimit(); assert.equal((await call({ path: pathA, kind: 'driver_license' }, deps({ row: { id: 'x', company_id: CO_B, entity_type: 'driver' } }))).code, 404) })

section('route: input checks')
test('unknown kind is 400', async () => assert.equal((await call({ path: pathA, kind: 'passport' }, deps())).code, 400))
test('traversal path is 400', async () => assert.equal((await call({ path: `${CO_A}/driver/../x/y`, kind: 'driver_license' }, deps())).code, 400))
test('a non-conforming path is 400', async () => assert.equal((await call({ path: 'form-submissions/abc/x.jpg', kind: 'driver_license' }, deps())).code, 400))
test('driver_license against a car path is 400', async () => assert.equal((await call({ path: `${CO_A}/car/9/1_x.jpg`, kind: 'driver_license' }, deps())).code, 400))
test('missing GEMINI_API_KEY is 503 not_configured', async () => { const r = await call({ path: pathA, kind: 'driver_license' }, deps({ apiKey: '' })); assert.equal(r.code, 503); assert.equal(r.body.reason, 'not_configured') })
test('an over-size file is 413 and never sent to the vendor', async () => {
  _resetRateLimit(); let sent = false
  const r = await call({ path: pathA, kind: 'driver_license' }, deps({ file: Buffer.concat([JPEG, Buffer.alloc(9 * 1024 * 1024)]), extract: async () => { sent = true } }))
  assert.equal(r.code, 413); assert.equal(sent, false)
})
test('a non-image file is 415 and never sent to the vendor', async () => {
  _resetRateLimit(); let sent = false
  const r = await call({ path: pathA, kind: 'driver_license' }, deps({ file: Buffer.from('PK\u0003\u0004' + 'x'.repeat(50)), extract: async () => { sent = true } }))
  assert.equal(r.code, 415); assert.equal(sent, false)
})

section('route: results')
test('happy path returns fields and no-store', async () => {
  _resetRateLimit(); const r = await call({ path: pathA, kind: 'driver_license' }, deps())
  assert.equal(r.code, 200); assert.equal(r.body.ok, true); assert.deepEqual(r.body.fields, { license: '1234567' }); assert.equal(r.headers['Cache-Control'], 'no-store')
})
test('the response carries nothing but the agreed keys', async () => {
  _resetRateLimit(); const r = await call({ path: pathA, kind: 'driver_license' }, deps())
  assert.deepEqual(Object.keys(r.body).sort(), ['documentKind', 'fields', 'kind', 'ok', 'warnings'])
})
test('a wrong document is flagged', async () => {
  _resetRateLimit(); const r = await call({ path: pathA, kind: 'driver_license' }, deps({ extract: async () => ({ ok: true, documentKind: 'vehicle_license', legible: true, fields: {} }) }))
  assert.deepEqual(r.body.warnings, ['wrong_document'])
})
test('an unreadable image is flagged', async () => {
  _resetRateLimit(); const r = await call({ path: pathA, kind: 'driver_license' }, deps({ extract: async () => ({ ok: true, documentKind: 'driver_license', legible: false, fields: {} }) }))
  assert.deepEqual(r.body.warnings, ['unreadable'])
})
test('upstream failure is 503 and the vendor body is not echoed', async () => {
  _resetRateLimit(); const r = await call({ path: pathA, kind: 'driver_license' }, deps({ extract: async () => ({ ok: false, reason: 'upstream_failed', detail: '503 SECRET-DETAIL' }) }))
  assert.equal(r.code, 503); assert.ok(!JSON.stringify(r.body).includes('SECRET-DETAIL'))
})
test('rate limit trips at 30 per window', async () => {
  _resetRateLimit(); let last
  for (let i = 0; i < 31; i++) last = await call({ path: pathA, kind: 'driver_license' }, deps())
  assert.equal(last.code, 429)
})

// ── client: proposal and patch ───────────────────────────────────────────────
const TODAY = '2026-09-29'
const row = (p, k) => p.rows.find(r => r.key === k)
section('proposal: driver')
test('an empty driver: everything is offered and every valid row is ticked', () => {
  const p = buildProposal('driver_license', { license: '1234567', license_expiry: '2029-03-14', license_levels: ['B'], name: 'דוד כהן', national_id: '000000018', birth_date: '1990-05-01' }, {}, TODAY)
  assert.ok(p.rows.length >= 5); assert.ok(p.rows.every(r => r.checked), JSON.stringify(p.rows.map(r => [r.key, r.checked, r.doubt])))
})
test('an identical value is not offered, just counted', () => {
  const p = buildProposal('driver_license', { license: '1234567', license_expiry: '2029-03-14' }, { license: '1234567', license_expiry: null }, TODAY)
  assert.equal(p.unchanged, 1); assert.deepEqual(p.rows.map(r => r.key), ['license_expiry'])
})
test('the compliance expiry that DIFFERS is ticked and marked as replacing', () => {
  const r = row(buildProposal('driver_license', { license_expiry: '2031-01-01' }, { license_expiry: '2026-01-01' }, TODAY), 'license_expiry')
  assert.equal(r.checked, true); assert.equal(r.replaces, true); assert.equal(r.current, '2026-01-01')
})
test('identity fields already on record are shown but NOT ticked', () => {
  const p = buildProposal('driver_license', { name: 'David Cohen', city: 'Haifa' }, { name: 'דוד כהן', city: '' }, TODAY)
  assert.equal(row(p, 'name').checked, false); assert.equal(row(p, 'city').checked, true)
})
test('a bad ID check digit is flagged and unticked', () => {
  const r = row(buildProposal('driver_license', { national_id: '123456789' }, {}, TODAY), 'national_id')
  assert.equal(r.doubt, 'id_checksum'); assert.equal(r.checked, false)
})
test('a valid ID passes', () => assert.equal(row(buildProposal('driver_license', { national_id: '000000018' }, {}, TODAY), 'national_id').doubt, null))
test('an implausible birth year is flagged', () => assert.equal(doubt('driver_license', 'birth_date', '2020-01-01', TODAY), 'implausible_date'))
test('an expiry 40 years out is flagged, a normal one is not', () => {
  assert.equal(doubt('driver_license', 'license_expiry', '2066-01-01', TODAY), 'implausible_date')
  assert.equal(doubt('driver_license', 'license_expiry', '2031-01-01', TODAY), null)
})
test('an EXPIRED licence is real information, not a doubt — still ticked', () => {
  const r = row(buildProposal('driver_license', { license_expiry: '2025-01-01' }, {}, TODAY), 'license_expiry')
  assert.equal(r.doubt, null); assert.equal(r.checked, true); assert.equal(expiryState('2025-01-01', TODAY), 'expired')
})
test('a malformed licence number is flagged', () => assert.equal(row(buildProposal('driver_license', { license: '12' }, {}, TODAY), 'license').doubt, 'format'))

section('proposal: license classes')
test('classes are unioned, never removed', () => assert.deepEqual(mergeLevels(['B', 'Other'], ['C1', 'B']), ['B', 'C1', 'Other']))
test('unknown classes are not added', () => assert.deepEqual(mergeLevels([], ['B', 'Z9']), ['B']))
test('nothing new to add means nothing offered', () => assert.equal(buildProposal('driver_license', { license_levels: ['B'] }, { license_levels: ['B', 'C'] }, TODAY).rows.length, 0))
test('a new class is offered with the merged result', () => assert.deepEqual(row(buildProposal('driver_license', { license_levels: ['C1'] }, { license_levels: ['B'] }, TODAY), 'license_levels').next, ['B', 'C1']))

section('proposal: vehicle')
test('matching plate: no banner, registry details ticked', () => {
  const p = buildProposal('vehicle_license', { plate: '12-345-67', chassis_no: 'ABC123', registration_expiry: '2027-02-01' }, { plate: '1234567' }, TODAY)
  assert.equal(p.banner, null); assert.equal(row(p, 'chassis_no').checked, true)
})
test('a DIFFERENT plate raises the banner and unticks everything', () => {
  const p = buildProposal('vehicle_license', { plate: '7654321', chassis_no: 'ABC123', registration_expiry: '2027-02-01' }, { plate: '1234567' }, TODAY)
  assert.equal(p.banner.type, 'plate_mismatch'); assert.ok(p.rows.length > 0 && p.rows.every(r => !r.checked))
})
test('make/model/year/fuel on record are not overwritten by default', () => {
  const p = buildProposal('vehicle_license', { plate: '1234567', make: 'TOYOTA', model: 'COROLLA', year: 2019, fuel: 'Petrol' }, { plate: '1234567', make: 'טויוטה', model: 'קורולה', year: 2018, fuel: 'Diesel' }, TODAY)
  for (const k of ['make', 'model', 'year', 'fuel']) assert.equal(row(p, k).checked, false, k)
})
test('the same make in a different case is not offered at all', () => assert.equal(buildProposal('vehicle_license', { make: 'Toyota' }, { make: 'TOYOTA' }, TODAY).rows.length, 0))
test('numbers compare numerically, not as text', () => assert.equal(buildProposal('vehicle_license', { engine_volume: 1798 }, { engine_volume: '1798' }, TODAY).rows.length, 0))

section('patch')
test('only ticked rows are written', () => {
  const p = buildProposal('driver_license', { license: '1234567', name: 'X Y' }, { name: 'קיים' }, TODAY)
  assert.deepEqual(buildPatch(p.rows), { license: '1234567' })
  row(p, 'name').checked = true; assert.deepEqual(buildPatch(p.rows), { license: '1234567', name: 'X Y' })
})
test('unticking everything yields an empty patch', () => { const p = buildProposal('driver_license', { license: '1234567' }, {}, TODAY); p.rows.forEach(r => (r.checked = false)); assert.deepEqual(buildPatch(p.rows), {}) })
test('a levels patch is the merged array', () => assert.deepEqual(buildPatch(buildProposal('driver_license', { license_levels: ['C1'] }, { license_levels: ['B'] }, TODAY).rows), { license_levels: ['B', 'C1'] }))
test('date formatting', () => { assert.equal(formatDate('2029-03-14'), '14/03/2029'); assert.equal(formatDate(null), '') })

for (const t of queue) await t()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
