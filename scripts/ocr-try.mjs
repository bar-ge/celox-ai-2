#!/usr/bin/env node
// Try the document reader on a REAL photo, locally, before anything is deployed.
// Uses the exact request, prompt, schema and normaliser the API route uses; it
// just skips Supabase, so there is no login and nothing is stored anywhere.
//
//   $env:GEMINI_API_KEY = "..."           (PowerShell)
//   node scripts/ocr-try.mjs C:\path\to\license.jpg driver_license
//   node scripts/ocr-try.mjs C:\path\to\car.jpg     vehicle_license
//
// The image goes to Google exactly as it would in production — use your own
// license, not a customer's, while you are deciding whether you trust this.

import { readFileSync } from 'node:fs'
import { extractFromImage, sniffMime, KINDS } from '../api/_lib/ocr.js'

const [file, kind] = process.argv.slice(2)
if (!file || !KINDS.includes(kind)) {
  console.error(`usage: node scripts/ocr-try.mjs <image-or-pdf> <${KINDS.join('|')}>`)
  process.exit(2)
}
if (!process.env.GEMINI_API_KEY) { console.error('Set GEMINI_API_KEY first.'); process.exit(2) }

const buf = readFileSync(file)
const mime = sniffMime(buf)
if (!mime) { console.error('That file is not a JPEG, PNG, WebP or PDF.'); process.exit(2) }

const t0 = Date.now()
const r = await extractFromImage({ apiKey: process.env.GEMINI_API_KEY, kind, mime, base64: buf.toString('base64') })
const secs = ((Date.now() - t0) / 1000).toFixed(1)

if (!r.ok) {
  console.error(`\nFAILED after ${secs}s: ${r.reason}${r.detail ? ' — ' + r.detail : ''}`)
  process.exit(1)
}
console.log(`\nread in ${secs}s by ${r.model} (attempt ${r.attempt})`)
console.log(`document type detected : ${r.documentKind}${r.documentKind === kind ? '' : '   <-- NOT what you asked for'}`)
console.log(`legible                : ${r.legible}`)
console.log('\nfields the app would offer to fill:')
const keys = Object.keys(r.fields)
if (!keys.length) console.log('  (none)')
for (const k of keys) console.log(`  ${k.padEnd(20)} ${JSON.stringify(r.fields[k])}`)
console.log('\nCheck each value against the physical card. Wrong digits are the risk, not missing ones.')
