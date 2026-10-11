// Emits per-URL copies of the built index.html with the right <head> for
// /us (English) and /privacy (Hebrew), so crawlers and link previews that do
// not run JS see the correct title, description, canonical and structured data.
// vercel.json rewrites /us -> /us.html and /privacy -> /privacy-app.html.
// "/" and "/il" keep using index.html (Hebrew). Pattern misses only warn.
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const warn = (m) => console.warn('[region-heads] ' + m)

function setTitle(html, v) {
  const re = /<title>[\s\S]*?<\/title>/
  if (!re.test(html)) { warn('title not found'); return html }
  return html.replace(re, () => `<title>${esc(v)}</title>`)
}
function setMeta(html, attr, key, v) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`)
  if (!re.test(html)) { warn(`meta ${key} not found`); return html }
  return html.replace(re, (_, a, b) => a + esc(v) + b)
}
function setCanonical(html, url) {
  const re = /(<link rel="canonical" href=")[^"]*(")/
  if (!re.test(html)) { warn('canonical not found'); return html }
  return html.replace(re, (_, a, b) => a + url + b)
}
function setLang(html, lang) {
  return html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
}
function mutateLd(html, fn) {
  const re = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/
  const m = html.match(re)
  if (!m) { warn('json-ld not found'); return html }
  const data = JSON.parse(m[2])
  fn(data)
  return html.replace(re, (_, a, __, c) => a + '\n' + JSON.stringify(data, null, 2) + '\n    ' + c)
}
function setNoscript(html, inner) {
  const re = /<noscript>[\s\S]*?<\/noscript>/
  if (!re.test(html)) { warn('noscript not found'); return html }
  return html.replace(re, () => `<noscript>\n${inner}\n    </noscript>`)
}

const US_NOSCRIPT = `      <div dir="ltr" lang="en" style="max-width:52rem;margin:0 auto;padding:2rem;font-family:Heebo,system-ui,sans-serif;line-height:1.7">
        <h1>Celox AI — full control over your entire fleet</h1>
        <p>Everything you need to manage vehicles, drivers, costs and documents — in one place. From your first vehicle to large fleets.</p>

        <h2>How it works</h2>
        <ol>
          <li><strong>Add your fleet</strong> — vehicles, drivers and branches, including one-click Excel import.</li>
          <li><strong>Track and get alerts</strong> — inspections, insurance, licenses and service, all before they expire.</li>
          <li><strong>Get insights</strong> — costs, reports and budget, so decisions are based on data.</li>
        </ol>

        <h2>What the platform includes</h2>
        <ul>
          <li><strong>Vehicle management</strong> — add, update and remove vehicles, with live status tracking.</li>
          <li><strong>Driver management</strong> — full driver profiles, license tracking and vehicle assignment.</li>
          <li><strong>Cost management</strong> — track every expense with categories and a monthly budget.</li>
          <li><strong>Cloud documents</strong> — insurance, licenses and files available from any device.</li>
          <li><strong>Scheduled maintenance</strong> — plan and track preventive service across the fleet.</li>
          <li><strong>Reports and analysis</strong> — detailed cost, budget and maintenance reports per vehicle and per fleet.</li>
        </ul>

        <h2>Who it is for</h2>
        <p>Fleet managers and safety officers at companies that operate vehicle fleets.</p>

        <h2>Regions</h2>
        <ul>
          <li><a href="/il">ישראל — Celox AI לניהול צי רכב</a></li>
          <li><a href="/us">United States — Celox AI Fleet Management</a></li>
        </ul>

        <p><a href="/privacy">Privacy policy</a> · <a href="mailto:office@celoxai.com">office@celoxai.com</a></p>
      </div>`

const US = {
  title: 'Celox AI — Fleet Management Software for Businesses',
  desc: 'Full control over your fleet: manage vehicles, drivers, costs and documents in one place, with alerts before inspections, insurance and licenses expire.',
  ogDesc: 'Full control over your fleet — vehicles, drivers, costs and documents in one place.',
  url: 'https://celoxai.com/us',
}
const PRIVACY = {
  title: 'מדיניות פרטיות — Celox AI',
  desc: 'מדיניות הפרטיות של Celox AI: אילו נתונים נאספים, כיצד הם משמשים וכיצד ניתן לפנות אלינו.',
  url: 'https://celoxai.com/privacy',
}

function variant(base, v, { lang, locale, ld, noscript }) {
  let h = setLang(base, lang)
  h = setTitle(h, v.title)
  h = setMeta(h, 'name', 'description', v.desc)
  h = setCanonical(h, v.url)
  h = setMeta(h, 'property', 'og:title', v.title)
  h = setMeta(h, 'property', 'og:description', v.ogDesc || v.desc)
  h = setMeta(h, 'property', 'og:url', v.url)
  h = setMeta(h, 'property', 'og:locale', locale)
  h = setMeta(h, 'name', 'twitter:title', v.title)
  h = setMeta(h, 'name', 'twitter:description', v.ogDesc || v.desc)
  if (ld) h = mutateLd(h, ld)
  if (noscript) h = setNoscript(h, noscript)
  return h
}

// Render the landing to static HTML so the hero text is in the first response
// (no waiting for JS) and crawlers see the real page. The CSS the page normally
// injects from an effect is inlined too, otherwise the HTML would be unstyled
// until JS runs. main.jsx hydrates this markup.
async function renderLanding(root, region) {
  const vite = await createServer({
    root, configFile: false, plugins: [react()], logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  })
  try {
    // Native imports: vite externalizes node_modules in SSR, so the page
    // module resolves the very same React instance.
    const { createElement } = await import('react')
    const { renderToString } = await import('react-dom/server')
    const mod = await vite.ssrLoadModule('/src/LandingPage.jsx')
    const Landing = mod.default
    const css = mod.LANDING_CSS.replace(/@import url\([^)]*\);?/g, '')
    const out = {}
    for (const r of region) out[r] = { html: renderToString(createElement(Landing, { region: r })), css }
    return out
  } finally { await vite.close() }
}

// Inline the small entry stylesheet so the prerendered pages have no
// render-blocking request (PageSpeed: "Render-blocking requests").
function inlineEntryCss(html, outDir) {
  return html.replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/, (m, href) => {
    try {
      const css = fs.readFileSync(path.join(outDir, href), 'utf8')
      return css.length < 20000 ? `<style id="entry-css">${css}</style>` : m
    } catch { return m }
  })
}

function injectPrerender(html, { html: body, css }) {
  const hasRoot = /<div id="root"><\/div>/.test(html)
  if (!hasRoot) { warn('empty #root not found; prerender skipped'); return html }
  const style = `<style id="lp-css-static">body{margin:0;background:#fff;overflow-x:hidden}${css}</style>`
  return html
    .replace('</head>', () => style + '\n  </head>')
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}

export default function regionHeads() {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'celox-region-heads',
    apply: 'build',
    configResolved(cfg) { root = cfg.root; outDir = path.resolve(cfg.root, cfg.build.outDir) },
    async closeBundle() {
      const src = path.join(outDir, 'index.html')
      if (!fs.existsSync(src)) { warn('dist/index.html missing'); return }
      const base = fs.readFileSync(src, 'utf8')

      const us = variant(base, US, {
        lang: 'en', locale: 'en_US', noscript: US_NOSCRIPT,
        ld(d) {
          for (const n of d['@graph']) {
            if (n['@type'] === 'Organization') n.description = 'Fleet management software for businesses.'
            if (n['@type'] === 'WebSite') n.inLanguage = 'en-US'
            if (n['@type'] === 'SoftwareApplication') {
              n.inLanguage = 'en-US'
              n.description = 'Manage, track and optimize fleet operations — vehicles, drivers, costs and documents in one system.'
              n.featureList = [
                'Vehicle management with real-time status tracking',
                'Driver management and license tracking',
                'Cost management and monthly budget',
                'Cloud documents — insurance and licenses',
                'Scheduled maintenance and alerts before expiry',
                'Reports and cost analysis per vehicle and per fleet',
              ]
            }
          }
        },
      })
      // Hebrew landing for "/" and "/il". index.html stays an empty shell,
      // because it is also the fallback for every /app route.
      const il = base // already the Hebrew /il head
      let pre = null
      try { pre = await renderLanding(root, ['il', 'us']) }
      catch (e) { warn('prerender failed, shipping client-rendered pages: ' + e.message) }
      fs.writeFileSync(path.join(outDir, 'us.html'), pre ? inlineEntryCss(injectPrerender(us, pre.us), outDir) : us)
      fs.writeFileSync(path.join(outDir, 'il.html'), pre ? inlineEntryCss(injectPrerender(il, pre.il), outDir) : il)

      const pr = variant(base, PRIVACY, { lang: 'he', locale: 'he_IL' })
      fs.writeFileSync(path.join(outDir, 'privacy-app.html'), pr)
    },
  }
}
