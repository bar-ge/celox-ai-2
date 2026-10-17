// Painterly sections of the marketing landing (ported from the approved Design demo).
// Purely additive: the original landing sections live in LandingPage.jsx.
import { PAINT_DEFS, SKY_INNER, SCENE_INNER } from './paint-art.js'

const INK = '#2B2630'
const SUB = '#5A5460'
const CREAM = '#F4F3EF'
const BLUE = '#2563EB'
const PAPER = '#FBFAF7'
const HEAD_FONT = "'Heebo', system-ui, sans-serif"

const COPY = {
  he: {
    frame: {
      title: 'סטטוס הצי', sample: 'נתוני דוגמה',
      nav: ['רכבים', 'נהגים', 'התראות', 'מסמכים', 'עלויות', 'דוחות'],
      stats: [['רכבים פעילים', '124', false], ['טסט בקרוב', '9', true], ['ביטוח בקרוב', '6', true]],
      rows: [
        ['12-345-67', 'טויוטה קורולה', 'טסט בעוד 14 ימים', 'warn'],
        ['98-765-43', 'יונדאי טוסון', 'הכול תקין', 'ok'],
        ['55-501-22', 'סקודה אוקטביה', 'ביטוח פג תוקף', 'bad'],
      ],
      ctaT: 'רוצה לראות את הצי שלך במערכת?',
      ctaD: 'ייבוא מאקסל בקליק אחד — והרכבים שלך כבר בפנים.',
      ctaBtn: 'נסה עם הצי שלך', enter: 'כניסה למערכת',
    },
    band: {
      h1: 'לעולם לא תפספס', h2: 'מועד חשוב',
      sub: 'Celox עובד ברקע, כדי שאתה תעבוד על העסק.',
      cards: [
        ['מסמכים בענן', 'ביטוחים, רישיונות ומסמכים שמורים בצורה מסודרת, נגישים מכל מכשיר.'],
        ['התראות חכמות', 'קבל תזכורת על תחזוקה, פקיעת רישיון או מסמך — לפני שיאוחר.'],
        ['נגיש מכל מכשיר', 'ממשק מותאם לנייד, לטאבלט ולמחשב — גישה מכל מקום.'],
      ],
    },
    scene: {
      tagline: 'תוכנה אמינה ונעימה לניהול צי רכב.',
      product: 'מוצר', contactH: 'יצירת קשר',
      how: 'איך זה עובד', benefits: 'יתרונות', enter: 'כניסה למערכת',
    },
  },
  en: {
    frame: {
      title: 'Fleet status', sample: 'Sample data',
      nav: ['Vehicles', 'Drivers', 'Alerts', 'Documents', 'Costs', 'Reports'],
      stats: [['Active vehicles', '124', false], ['Test due soon', '9', true], ['Insurance due soon', '6', true]],
      rows: [
        ['12-345-67', 'Toyota Corolla', 'Test due in 14 days', 'warn'],
        ['98-765-43', 'Hyundai Tucson', 'All good', 'ok'],
        ['55-501-22', 'Skoda Octavia', 'Insurance expired', 'bad'],
      ],
      ctaT: 'Want to see your fleet in the system?',
      ctaD: 'One-click Excel import — and your vehicles are already in.',
      ctaBtn: 'Try it with your fleet', enter: 'Enter System',
    },
    band: {
      h1: 'Never miss', h2: 'an important date',
      sub: 'Celox works in the background, so you can work on your business.',
      cards: [
        ['Cloud documents', 'Insurance, licenses and documents stored neatly — accessible from any device.'],
        ['Smart alerts', "Get a reminder for maintenance, license or document expiry — before it's too late."],
        ['Any device access', 'Fully responsive for mobile, tablet and desktop — access from anywhere.'],
      ],
    },
    scene: {
      tagline: 'Reliable, pleasant software for fleet management.',
      product: 'Product', contactH: 'Contact',
      how: 'How it works', benefits: 'Features', enter: 'Enter System',
    },
  },
}

export const getPaintCopy = lang => COPY[lang] || COPY.he

export const PAINT_CSS = `
  .px-head { font-family:${HEAD_FONT}; font-weight:700; letter-spacing:-.04em }
  .px-deco { position:absolute; pointer-events:none; z-index:0 }
  .px-deco svg, .px-deco use, #cx-tree { overflow:visible }
  .px-deco svg { display:block; max-width:44vw; height:auto }
  @media (max-width:1100px) { .px-deco { opacity:.35 !important } }
  @media (max-width:700px) { .px-deco { z-index:0 !important } }
  
  .px-app-side { flex:0 0 190px; padding:18px 14px; border-inline-end:1px solid rgba(43,38,48,.08); display:flex; flex-direction:column; gap:4px; font-size:14px; box-sizing:border-box }
  .px-app-nav { padding:9px 12px }
  .px-app-main { flex:1 1 440px; padding:22px; box-sizing:border-box; min-width:0 }
  .px-app-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px }
  .px-app-stat { padding:12px 14px }
  .px-app-stat-l { font-size:12px }
  .px-app-stat-n { font-size:26px }
  .px-app-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; flex-wrap:wrap }
  @media (max-width:700px) {
    .px-app-side { flex:0 0 100%; display:grid; grid-template-columns:repeat(3,1fr); text-align:center; gap:4px; padding:10px 8px; border-inline-end:none; border-bottom:1px solid rgba(43,38,48,.08); font-size:14px }
    .px-app-nav { padding:8px 6px; white-space:nowrap }
    .px-app-main { flex:1 1 100%; padding:14px 12px }
    .px-app-stats { gap:8px }
    .px-app-stat { padding:10px 10px }
    .px-app-stat-l { font-size:11px; line-height:1.3 }
    .px-app-stat-n { font-size:22px }
    .px-app-row { padding:10px 12px; font-size:13px; gap:6px 10px }
  }
  .px-bg { position:absolute; inset:0; width:100%; height:100%; z-index:0 }
  .px-card { transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s }
  .px-card:hover { transform:translateY(-4px); box-shadow:0 18px 44px rgba(43,38,48,.12) }
  .px-btn { transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s }
  .px-btn:hover { transform:translateY(-2px); box-shadow:0 12px 30px rgba(37,99,235,.3) }
  .px-foot-link { color:inherit; text-decoration:none; transition:opacity .18s }
  .px-foot-link:hover { opacity:.7 }
  @media (prefers-reduced-motion: reduce) { .px-card, .px-btn { transition:none } }
`

// Hidden SVG with the shared filters, gradients and the tree symbol. Render once per page.
export function PaintDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false"
      dangerouslySetInnerHTML={{ __html: PAINT_DEFS }} />
  )
}

// One painted tree in a corner. `side` is logical: 'start' | 'end'.
export function Tree({ side = 'start', width = 360, height = 780, style }) {
  const pos = side === 'start'
    ? { left: -60 }                         // physical on purpose: the art is mirror-symmetric decoration
    : { right: -50, transform: 'scaleX(-1)' } // and its cut edge must always sit off-screen
  return (
    <div className="px-deco" aria-hidden="true" style={{ ...pos, ...style }}>
      <svg width={width} height={height} viewBox="0 0 360 780" fill="none"
        dangerouslySetInnerHTML={{ __html: '<use href="#cx-tree" width="360" height="780"/>' }} />
    </div>
  )
}

// One continuous painted sky behind hero + app preview (reads as a single picture).
export function WideSky() {
  const inner = `<g transform="scale(1.25 2.2)">${SKY_INNER}</g>`
  return (
    <svg className="px-bg" aria-hidden="true" viewBox="0 0 1500 1760" preserveAspectRatio="xMidYMin slice"
      dangerouslySetInnerHTML={{ __html: inner }} />
  )
}

// Second painted version: warm dusk (peach / lilac) with soft hills, so sections don't all share one sky.
const DUSK_INNER = `
<g filter="url(#cx-paint)">
  <rect x="-120" y="-120" width="1440" height="1040" fill="#f1dccd"/>
  <ellipse cx="200" cy="140" rx="380" ry="150" fill="#dccbe6"/>
  <ellipse cx="960" cy="110" rx="400" ry="140" fill="#f7d3b4"/>
  <ellipse cx="600" cy="330" rx="470" ry="150" fill="#e9bfb8"/>
  <ellipse cx="1040" cy="430" rx="320" ry="150" fill="#fbe6c8"/>
  <ellipse cx="150" cy="430" rx="300" ry="130" fill="#cdbbe0"/>
  <rect x="80" y="250" width="520" height="62" rx="31" fill="#fbf0e0" opacity=".7" transform="rotate(-6 340 280)"/>
  <rect x="700" y="330" width="440" height="56" rx="28" fill="#fdeed6" opacity=".7" transform="rotate(5 920 358)"/>
</g>
<circle cx="880" cy="470" r="210" fill="url(#cx-sun)"/>
<g filter="url(#cx-paint)">
  <path d="M-100 600 C150 520 330 570 520 530 C720 490 900 560 1080 520 C1200 495 1300 520 1320 530 L1320 900 L-100 900Z" fill="#c9b6d4"/>
  <path d="M-100 680 C140 610 380 670 600 630 C820 590 1000 660 1320 610 L1320 900 L-100 900Z" fill="#a9b189"/>
  <path d="M-100 760 C200 710 420 770 640 740 C860 710 1060 770 1320 730 L1320 900 L-100 900Z" fill="#7f9a62"/>
</g>
<rect width="1200" height="800" filter="url(#cx-grain)"/>`

function SkyDusk() {
  return (
    <svg className="px-bg" aria-hidden="true" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice"
      dangerouslySetInnerHTML={{ __html: DUSK_INNER }} />
  )
}

function Sky() {
  return (
    <svg className="px-bg" aria-hidden="true" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
      dangerouslySetInnerHTML={{ __html: SKY_INNER }} />
  )
}

const BADGE = {
  warn: { background: '#fdf1d9', color: '#8a4b08' },
  ok:   { background: '#dff3e6', color: '#17633a' },
  bad:  { background: '#fde4e1', color: '#9b1c10' },
}

// App-preview band under the hero.
export function ProductFrame({ t, lang }) {
  const c = getPaintCopy(lang).frame
  const line = '1px solid rgba(43,38,48,.08)'
  return (
    <section id="product" aria-label={c.title} style={{ position: 'relative', margin: '0 auto', padding: '0 16px', boxSizing: 'border-box', direction: t.dir }}>
      <div style={{ padding: 'clamp(0px,2vw,24px) clamp(0px,3vw,48px) clamp(48px,7vw,110px)', position: 'relative' }}>
        <div style={{ position: 'relative', background: PAPER, borderRadius: 18, boxShadow: '0 30px 80px rgba(43,38,48,.18)', overflow: 'hidden', maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 16px', borderBottom: line }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#e3dfd8' }} />)}
            <span style={{ marginInlineStart: 14, fontSize: 12, color: SUB }} dir="ltr">celoxai.com/app</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div className="px-app-side">
              {c.nav.map((n, i) => (
                <div key={n} className="px-app-nav" style={i === 0
                  ? { borderRadius: 9, background: 'rgba(37,99,235,.1)', color: BLUE, fontWeight: 700 }
                  : { color: SUB }}>{n}</div>
              ))}
            </div>
            <div className="px-app-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: INK }}>{c.title}</div>
                <div style={{ fontSize: 12, color: SUB }}>{c.sample}</div>
              </div>
              <div className="px-app-stats">
                {c.stats.map(([l, n, warn]) => (
                  <div key={l} className="px-app-stat" style={{ background: '#fff', border: line, borderRadius: 12 }}>
                    <div className="px-app-stat-l" style={{ color: SUB }}>{l}</div>
                    <div className="px-app-stat-n" style={{ fontWeight: 800, color: warn ? '#b45309' : INK }}>{n}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                {c.rows.map(([plate, car, status, kind]) => (
                  <div key={plate} className="px-app-row" style={{ background: '#fff', border: line, borderRadius: 12 }}>
                    <span style={{ fontWeight: 700, color: INK }} dir="ltr">{plate}</span>
                    <span style={{ color: SUB }}>{car}</span>
                    <span style={{ ...BADGE[kind], borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, maxWidth: 980, margin: '28px auto 0' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: INK }}>{c.ctaT}</div>
            <div style={{ fontSize: 14, color: SUB, marginTop: 4, maxWidth: 360, lineHeight: 1.6 }}>{c.ctaD}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="#contact" className="px-btn" style={{ background: BLUE, color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '13px 26px', borderRadius: 11, fontSize: 15 }}>{c.ctaBtn}</a>
            <a href="/app" className="px-btn" style={{ background: 'rgba(255,255,255,.7)', color: INK, textDecoration: 'none', fontWeight: 600, padding: '13px 24px', borderRadius: 11, fontSize: 15 }}>{c.enter}</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// Blue-sky band with three cards and a tree in each bottom corner.
export function PaintBand({ t, lang }) {
  const c = getPaintCopy(lang).band
  return (
    <section aria-label={`${c.h1} ${c.h2}`} style={{ maxWidth: 1240, margin: '0 auto', padding: '100px 16px 0', boxSizing: 'border-box', direction: t.dir }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 32, padding: 'clamp(36px,7vw,90px) clamp(18px,4vw,60px)', background: 'linear-gradient(165deg,#f3dccf 0%,#ead5e0 50%,#f6e6cf 100%)', textAlign: 'center' }}>
        <SkyDusk />
        <Tree side="start" width={230} height={500} style={{ bottom: -120, opacity: .95 }} />
        <Tree side="end" width={230} height={500} style={{ bottom: -120, opacity: .95 }} />
        <h2 className="px-head" style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(36px,5.5vw,64px)', lineHeight: 1.02, letterSpacing: '-.035em', margin: 0, color: INK }}>
          {c.h1}<br /><span style={{ color: '#8a6a86' }}>{c.h2}</span>
        </h2>
        <p style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(18px,4.8vw,20px)', lineHeight: 1.7, color: SUB, maxWidth: 520, margin: '22px auto 48px' }}>{c.sub}</p>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18, maxWidth: 1000, margin: '0 auto', textAlign: 'start' }}>
          {c.cards.map(([h, d]) => (
            <div key={h} className="px-card" style={{ background: PAPER, borderRadius: 20, padding: '28px 26px', minHeight: 'clamp(0px,20vw,200px)' }}>
              <h3 style={{ fontSize: 'clamp(22px,5.6vw,25px)', fontWeight: 700, margin: '0 0 10px', letterSpacing: '-.02em', color: INK }}>{h}</h3>
              <p style={{ fontSize: 'clamp(17px,4.4vw,18px)', fontWeight: 400, lineHeight: 1.65, color: SUB, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Painted landscape that wraps the closing CTA and the footer.
export function Scene({ children }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: 'clamp(900px,92vw,1080px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <svg className="px-bg" aria-hidden="true" viewBox="0 0 1440 1080" preserveAspectRatio="xMidYMax slice"
        dangerouslySetInnerHTML={{ __html: SCENE_INNER }} />
      {children}
    </div>
  )
}

export { CREAM }
