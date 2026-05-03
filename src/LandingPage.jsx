import { useState, useEffect, useRef } from 'react'
import { CeloxIcon } from './LogoIcon'
import { validateField, isEmail, isIsraeliPhone, isEmpty } from './validators'

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  dark:   'oklch(8% 0.015 260)',
  dark2:  'oklch(14% 0.025 260)',
  white:  'oklch(99% 0.004 260)',
  light:  'oklch(97% 0.006 260)',
  light2: 'oklch(95% 0.008 260)',
  border: 'oklch(91% 0.008 260)',
  text:   'oklch(18% 0.02 260)',
  sub:    'oklch(45% 0.025 260)',
  muted:  'oklch(62% 0.015 260)',
  blue:   'oklch(52% 0.22 260)',
  blueL:  'oklch(60% 0.20 260)',
  cyan:   'oklch(56% 0.15 220)',
}

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl', langBtn: 'EN',
    nav: { what: 'מה אנחנו עושים', features: 'יתרונות', contact: 'צור קשר', enter: 'כניסה למערכת' },
    hero: {
      badge: 'ניהול צי רכבים',
      h1: 'שליטה מלאה',
      h2: 'על כל הצי שלך',
      sub: 'כל מה שאתה צריך לנהל רכבים, נהגים, עלויות ומסמכים — במקום אחד.',
      cta1: 'כניסה למערכת', cta2: 'גלה עוד',
    },
    stats: [
      { n: '500+', l: 'רכבים מנוהלים' },
      { n: '100%', l: 'זמינות מערכת' },
      { n: '30%',  l: 'חיסכון בעלויות' },
      { n: '24/7', l: 'מעקב ותמיכה' },
    ],
    about: {
      h: 'ניהול, מעקב וייעול הפעילות הלוגיסטית שלך',
      sub: 'מהרכב הראשון ועד ציים גדולים — אנחנו כאן לתת לך שקט נפשי ושליטה מלאה.',
      cards: [
        { t: 'מעקב בזמן אמת',  d: 'ניהול מלא של כל הרכבים, הסטטוס, השיוך והמשימות — בזמן אמת' },
        { t: 'דוחות וניתוח',   d: 'דוחות מפורטים של עלויות, תקציב ותחזוקה לכל רכב ולכל הצי' },
        { t: 'התראות חכמות',   d: 'קבל התראות על תחזוקה, פקיעת רישיונות ומסמכים — לפני שיאוחר' },
      ],
    },
    features: {
      h: 'כל מה שאתה צריך, במקום אחד',
      items: [
        { t: 'ניהול רכבים',       d: 'הוסף, עדכן ומחק רכבים. מעקב אחרי מצב וסטטוס בזמן אמת' },
        { t: 'ניהול נהגים',       d: 'פרופילי נהגים מלאים, מעקב רישיונות ושיוך לרכבים' },
        { t: 'ניהול עלויות',      d: 'עקוב אחרי כל ההוצאות עם קטגוריות ותקציב חודשי' },
        { t: 'מסמכים בענן',      d: 'שמור ביטוחים, רישיונות ומסמכים — נגישים מכל מכשיר' },
        { t: 'תחזוקה מתוזמנת',   d: 'תזמן ועקוב אחרי טיפולים מונעים לכל הצי' },
        { t: 'נגיש מכל מכשיר',   d: 'ממשק מותאם לנייד, טאבלט ומחשב — גישה מכל מקום' },
      ],
    },
    cta: {
      badge: 'מוכן להתחיל?',
      h: 'קח את ניהול הצי שלך לרמה הבאה',
      sub: 'הצטרף לעסקים שכבר משתמשים ב‑Celox AI',
      btn: 'כניסה למערכת',
      trust: ['🔒 מאובטח', '☁️ ענן', '📱 כל מכשיר', '⚡ 24/7'],
    },
    contact: {
      h: 'נשמח לשמוע ממך',
      sub: 'מלא את הטופס ונחזור אליך בהקדם האפשרי',
      name: 'שם מלא', namePh: 'ישראל ישראלי',
      company: 'שם חברה', companyPh: 'אופציונלי',
      phone: 'טלפון', phonePh: '050-0000000',
      email: 'אימייל', emailPh: 'you@example.com',
      message: 'הערות', messagePh: 'ספר לנו על הצי שלך...',
      send: 'שלח הודעה',
      sending: 'שולח...',
      success: '✓ ההודעה נשלחה! נחזור אליך בקרוב.',
      error: 'אירעה שגיאה. נסה שוב.',
    },
    footer: '© 2025 Celox AI · כל הזכויות שמורות',
  },
  en: {
    dir: 'ltr', langBtn: 'עב',
    nav: { what: 'What We Do', features: 'Features', contact: 'Contact', enter: 'Enter System' },
    hero: {
      badge: 'Fleet Management',
      h1: 'Full Control',
      h2: 'Over Your Fleet',
      sub: 'Everything you need to manage vehicles, drivers, costs and documents — all in one place.',
      cta1: 'Enter System', cta2: 'Learn More',
    },
    stats: [
      { n: '500+', l: 'Vehicles Managed' },
      { n: '100%', l: 'System Uptime' },
      { n: '30%',  l: 'Cost Savings' },
      { n: '24/7', l: 'Monitoring & Support' },
    ],
    about: {
      h: 'Manage, track and optimize your logistics',
      sub: 'From the first vehicle to a full fleet — built for businesses that need clarity and control.',
      cards: [
        { t: 'Real-Time Tracking',  d: 'Full management of all vehicles, status, assignments and tasks — in real time' },
        { t: 'Reports & Analytics',  d: 'Detailed cost, budget and maintenance reports per vehicle and fleet-wide' },
        { t: 'Smart Alerts',         d: "Get alerts for maintenance, license and document expirations — before it's too late" },
      ],
    },
    features: {
      h: 'Everything You Need, All in One Place',
      items: [
        { t: 'Vehicle Management',    d: 'Add, update and remove vehicles. Real-time status and condition tracking' },
        { t: 'Driver Management',     d: 'Full driver profiles, license tracking and vehicle assignments' },
        { t: 'Cost Management',       d: 'Track all expenses with categories and monthly budget summaries' },
        { t: 'Cloud Documents',       d: 'Store insurance, licenses and documents — accessible from any device' },
        { t: 'Scheduled Maintenance', d: 'Plan and track preventive service for your entire fleet' },
        { t: 'Any Device Access',     d: 'Fully responsive UI for mobile, tablet and desktop' },
      ],
    },
    cta: {
      badge: 'Ready to Start?',
      h: 'Take Your Fleet Management to the Next Level',
      sub: 'Join businesses already using Celox AI',
      btn: 'Enter System',
      trust: ['🔒 Secure', '☁️ Cloud', '📱 Any Device', '⚡ 24/7'],
    },
    contact: {
      h: "We'd love to hear from you",
      sub: "Fill in the form and we'll get back to you as soon as possible",
      name: 'Full Name', namePh: 'John Smith',
      company: 'Company Name', companyPh: 'Optional',
      phone: 'Phone', phonePh: '+1 555 000 0000',
      email: 'Email', emailPh: 'you@example.com',
      message: 'Comments', messagePh: 'Tell us about your fleet...',
      send: 'Send Message',
      sending: 'Sending...',
      success: "✓ Message sent! We'll be in touch soon.",
      error: 'Something went wrong. Please try again.',
    },
    footer: '© 2025 Celox AI · All rights reserved',
  },
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes lp-up    { from { opacity:0; transform:translateY(32px) } to { opacity:1; transform:translateY(0) } }
  @keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes lp-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
  @keyframes lp-drift { 0%{transform:translate(0,0)} 33%{transform:translate(20px,-14px)} 66%{transform:translate(-16px,10px)} 100%{transform:translate(0,0)} }
  @keyframes lp-scroll{ 0%,100%{opacity:1;transform:translateY(0)} 50%{opacity:.3;transform:translateY(8px)} }

  /* ── Reveal system ── */
  .lp-r, .lp-rl, .lp-rr, .lp-rs {
    transition: opacity .72s cubic-bezier(.22,1,.36,1), transform .72s cubic-bezier(.22,1,.36,1);
  }
  .lp-r  { opacity:0; transform:translateY(48px) }
  .lp-rl { opacity:0; transform:translateX(-52px) }
  .lp-rr { opacity:0; transform:translateX(52px) }
  .lp-rs { opacity:0; transform:scale(.88) }
  .lp-visible { opacity:1 !important; transform:none !important }

  .lp-d0{transition-delay:0s}
  .lp-d1{transition-delay:.07s}
  .lp-d2{transition-delay:.15s}
  .lp-d3{transition-delay:.23s}
  .lp-d4{transition-delay:.31s}
  .lp-d5{transition-delay:.39s}
  .lp-d6{transition-delay:.47s}
  .lp-d7{transition-delay:.55s}
  .lp-d8{transition-delay:.63s}

  /* ── Nav ── */
  .lp-nav-link { transition:color .18s, opacity .18s; cursor:pointer }
  .lp-nav-link:hover { opacity:1 !important; color:#60a5fa !important }

  .lp-nav-pill { transition:background .4s, box-shadow .4s, border-color .4s }

  /* ── Buttons ── */
  .lp-btn-primary { transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s !important }
  .lp-btn-primary:hover { transform:translateY(-3px) scale(1.025) !important; box-shadow:0 20px 52px oklch(52% 0.22 260 / 0.52) !important }

  .lp-btn-ghost { transition:background .2s, border-color .2s, color .2s !important }
  .lp-btn-ghost:hover { background:oklch(52% 0.22 260 / 0.07) !important; border-color:oklch(52% 0.22 260) !important; color:oklch(52% 0.22 260) !important }

  /* ── Lang btn ── */
  .lp-lang-btn { transition:color .18s }
  .lp-lang-btn:hover { color:rgba(255,255,255,.9) !important }

  /* ── Stat counter ── */
  .lp-stat-item { transition:transform .38s cubic-bezier(.22,1,.36,1) }
  .lp-stat-item:hover { transform:translateY(-4px) }

  /* ── Divider line reveal ── */
  .lp-line-reveal {
    display:block; height:2px; border-radius:2px;
    background: oklch(52% 0.22 260);
    transform:scaleX(0); transform-origin:center;
    transition:transform .9s cubic-bezier(.22,1,.36,1);
  }
  .lp-line-visible { transform:scaleX(1) !important }

  .lp-hamburger { display:none }

  /* ── About & Features list grids ── */
  .lp-about-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 80px; align-items:start }
  .lp-feat-list  { display:grid; grid-template-columns:1fr 1fr; gap:0 80px }

  @media (max-width:768px) {
    .lp-hero-h1   { font-size:52px !important }
    .lp-about-grid{ grid-template-columns:1fr !important; gap:48px 0 !important }
    .lp-feat-list { grid-template-columns:1fr !important }
    .lp-stats-grid{ grid-template-columns:1fr 1fr !important }
    .lp-nav-links { display:none !important }
    .lp-hamburger { display:flex !important }
  }
  @media (max-width:520px) {
    .lp-hero-h1  { font-size:38px !important }
    .lp-hero-ctas{ flex-direction:column !important }
    .lp-hero-ctas a,.lp-hero-ctas span{ width:100% !important; text-align:center !important }
  }

  /* ── Contact form ── */
  .lp-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px }

  @media (max-width:600px) {
    .lp-form-grid { grid-template-columns:1fr !important }
    .lp-contact-card { padding:28px 20px !important }
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-r, .lp-rl, .lp-rr, .lp-rs { transition:opacity .3s linear !important; transform:none !important }
    .lp-line-reveal { transition:transform .3s linear !important }
    * { animation-duration:.01ms !important; animation-iteration-count:1 !important }
  }

  .lp-input {
    width:100%; box-sizing:border-box;
    background:#fff; border:1.5px solid oklch(91% 0.008 260); border-radius:12px;
    padding:13px 16px; font-size:14px; color:oklch(18% 0.02 260);
    outline:none; transition:border-color .2s, box-shadow .2s;
    font-family:inherit;
  }
  .lp-input::placeholder { color:oklch(62% 0.015 260) }
  .lp-input:focus { border-color:oklch(52% 0.22 260); box-shadow:0 0 0 3px oklch(52% 0.22 260 / 0.1) }
  .lp-input:hover:not(:focus) { border-color:oklch(62% 0.015 260) }
  textarea.lp-input { resize:vertical; min-height:120px; line-height:1.6 }

  html, body { margin:0; padding:0; overflow-x:hidden; width:100% }

  ::-webkit-scrollbar { width:6px }
  ::-webkit-scrollbar-track { background:transparent }
  ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }
  ::-webkit-scrollbar-thumb:hover { background:oklch(52% 0.22 260) }
  * { scrollbar-width:thin; scrollbar-color:#cbd5e1 transparent }
`

// ── CountUp stat item ─────────────────────────────────────────────────────────
function StatItem({ stat, index }) {
  const ref = useRef(null)

  const parsed = (() => {
    const m = stat.n.match(/^(\d+)(.*)$/)
    return m ? { num: parseInt(m[1]), suffix: m[2] } : null
  })()

  const [display, setDisplay] = useState(parsed ? '0' : stat.n)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      if (!parsed) { setDisplay(stat.n); return }
      const duration = 1500
      const start = Date.now()
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        const cur = Math.round(parsed.num * eased)
        setDisplay(`${cur}${parsed.suffix}`)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [stat.n])

  return (
    <div ref={ref} className={`lp-stat-item lp-r lp-d${index + 1}`}
      style={{ padding: '48px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 44, fontWeight: 900, color: P.blue, lineHeight: 1, marginBottom: 8, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </div>
      <div style={{ fontSize: 13, color: P.sub, fontWeight: 500, letterSpacing: .2 }}>{stat.l}</div>
    </div>
  )
}

// ── SectionHead ───────────────────────────────────────────────────────────────
function SectionHead({ chip, h, sub, light, dir, align = 'center' }) {
  const isStart = align === 'start'
  return (
    <div style={{ textAlign: isStart ? 'start' : 'center', marginBottom: 64 }}>
      {chip && <div className="lp-rs lp-d0"><Chip light={light}>{chip}</Chip></div>}
      <h2 className="lp-r lp-d1" style={{ fontSize: 52, fontWeight: 900, color: light ? '#fff' : P.text, lineHeight: 1.1, margin: chip ? '0 0 16px' : '0 0 16px', letterSpacing: -1.5 }}>
        {h}
      </h2>
      {sub && <p className="lp-r lp-d2" style={{ fontSize: 17, color: light ? 'rgba(255,255,255,.5)' : P.sub, maxWidth: 560, margin: isStart ? '16px 0 0' : '16px auto 0', lineHeight: 1.75 }}>{sub}</p>}
      <span className="lp-line-reveal lp-d2" style={{
        width: 52,
        marginTop: 20,
        marginInlineStart: isStart ? 0 : 'auto',
        marginInlineEnd: 'auto',
      }} />
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ t, lang, setLang, solid, mobileOpen, setMobileOpen, scrollTo }) {
  const sep = <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
  const linkStyle = { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.65)', cursor: 'pointer', padding: '4px 2px', letterSpacing: .1 }

  return (
    <>
      <nav role="navigation" aria-label="Main navigation" className="lp-nav-pill" style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', alignItems: 'center', gap: 20,
        padding: '0 8px 0 20px',
        height: 50,
        background: solid ? 'rgba(8,14,28,.88)' : 'rgba(8,14,28,.6)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 100,
        boxShadow: solid ? '0 8px 40px rgba(0,0,0,.35)' : '0 4px 24px rgba(0,0,0,.2)',
        direction: t.dir,
        whiteSpace: 'nowrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <CeloxIcon size={28} dark />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: -.3 }}>
            Celox <span style={{ color: '#60a5fa' }}>AI</span>
          </span>
        </div>

        {sep}

        <div className="lp-nav-links" style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <span key={id} className="lp-nav-link" style={linkStyle} onClick={() => scrollTo(id)}>{t.nav[k]}</span>
          ))}
        </div>

        {sep}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="lp-lang-btn" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: .8, padding: '4px 8px' }}>
            {t.langBtn}
          </button>
          <a href="/app" className="lp-btn-primary"
            style={{ display: 'inline-block', background: '#2563eb', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: 100, fontSize: 12, fontWeight: 700, boxShadow: '0 2px 14px rgba(37,99,235,.4)', letterSpacing: .1 }}>
            {t.nav.enter}
          </a>
          <button className="lp-hamburger" onClick={() => setMobileOpen(p => !p)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', flexDirection: 'column', gap: 5, color: '#fff' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 20, height: 1.5, background: 'currentColor', borderRadius: 2, transition: 'all .25s',
                transform: mobileOpen ? (i===0?'rotate(45deg) translateY(6.5px)':i===2?'rotate(-45deg) translateY(-6.5px)':'none') : 'none',
                opacity: mobileOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, width: 'calc(100vw - 40px)', maxWidth: 400,
          background: 'rgba(8,14,28,.95)', backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 20,
          padding: '12px 20px 20px', direction: t.dir,
          boxShadow: '0 12px 48px rgba(0,0,0,.4)',
        }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <div key={id} onClick={() => scrollTo(id)}
              style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.07)', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.8)', cursor: 'pointer' }}>
              {t.nav[k]}
            </div>
          ))}
          <a href="/app" style={{ display: 'block', marginTop: 16, background: '#2563eb', color: '#fff', textDecoration: 'none', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>
            {t.nav.enter}
          </a>
        </div>
      )}
    </>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ t, scrollY }) {
  const py = f => `${scrollY * f}px`
  return (
    <section style={{ position: 'relative', height: '100vh', minHeight: 680, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg,#050d20 0%,#020810 55%,#04091a 100%)' }} />
      <div style={{ position: 'absolute', inset: '-8%', backgroundImage: 'url(https://picsum.photos/seed/road-night/1920/1080)', backgroundSize: 'cover', backgroundPosition: 'center 55%', transform: `translateY(${py(.22)})`, opacity: .07, filter: 'blur(2px)', willChange: 'transform' }} />
      <div style={{ position: 'absolute', top: '15%', left: '12%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.22) 0%,transparent 65%)', filter: 'blur(55px)', animation: 'lp-drift 16s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '8%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(8,145,178,.14) 0%,transparent 65%)', filter: 'blur(60px)', animation: 'lp-drift 20s ease-in-out infinite 4s' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.06) 1px,transparent 1px)', backgroundSize: '48px 48px', opacity: .5, transform: `translateY(${py(.06)})`, willChange: 'transform' }} />

      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '0 24px', maxWidth: 780, direction: t.dir, transform: `translateY(${py(-.08)})`, willChange: 'transform' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 30, padding: '6px 18px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.65)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28, animation: 'lp-up .65s .05s both' }}>
          {t.hero.badge}
        </div>

        <h1 className="lp-hero-h1" style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: -2 }}>
          <span style={{ display: 'block', color: '#fff', animation: 'lp-up .75s .2s both' }}>{t.hero.h1}</span>
          <span style={{ display: 'block', color: 'oklch(89% 0.05 260)', animation: 'lp-up .75s .32s both' }}>{t.hero.h2}</span>
        </h1>

        <p style={{ fontSize: 18, color: 'rgba(255,255,255,.72)', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px', animation: 'lp-up .75s .46s both' }}>
          {t.hero.sub}
        </p>

        <div className="lp-hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'lp-up .75s .6s both' }}>
          <a href="/app" className="lp-btn-primary"
            style={{ display: 'inline-block', background: '#2563eb', color: '#fff', textDecoration: 'none', padding: '15px 42px', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 28px rgba(37,99,235,.4)', letterSpacing: -.1 }}>
            {t.hero.cta1}
          </a>
          <span className="lp-btn-ghost" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-block', color: 'rgba(255,255,255,.6)', padding: '15px 36px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer' }}>
            {t.hero.cta2} ↓
          </span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: `linear-gradient(to top,${P.white},transparent)`, zIndex: 6 }} />
    </section>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats({ t }) {
  return (
    <div style={{ background: P.white, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}`, padding: '0 64px', direction: t.dir }}>
      <div className="lp-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', maxWidth: 1400, margin: '0 auto' }}>
        {t.stats.map((s, i) => <StatItem key={i} stat={s} index={i} />)}
      </div>
    </div>
  )
}

// ── About ─────────────────────────────────────────────────────────────────────
function About({ t, scrollY }) {
  const sectionRef = useRef(null)
  const sectionTopRef = useRef(0)
  useEffect(() => { if (sectionRef.current) sectionTopRef.current = sectionRef.current.offsetTop }, [])
  const rel = scrollY - sectionTopRef.current

  return (
    <section ref={sectionRef} id="about" style={{ background: P.white, padding: '120px 64px', direction: t.dir, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '15%', insetInlineEnd: '-140px', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.07) 0%,transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', transform: `translateY(${rel * .22}px)`, willChange: 'transform' }} />
      <div style={{ position: 'absolute', bottom: '10%', insetInlineStart: '-100px', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(8,145,178,.06) 0%,transparent 65%)', filter: 'blur(70px)', pointerEvents: 'none', transform: `translateY(${rel * -.14}px)`, willChange: 'transform' }} />

      <div className="lp-about-grid" style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Column 1 — heading block */}
        <div className="lp-rl lp-d0">
          <h2 style={{ fontSize: 52, fontWeight: 900, color: P.text, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: -1.5 }}>
            {t.about.h}
          </h2>
          <p style={{ fontSize: 17, color: P.sub, lineHeight: 1.8, margin: 0, maxWidth: 480 }}>
            {t.about.sub}
          </p>
          <span className="lp-line-reveal lp-d1" style={{ width: 52, marginTop: 28, marginInlineStart: 0, marginInlineEnd: 'auto' }} />
        </div>

        {/* Column 2 — numbered list */}
        <div>
          {t.about.cards.map((c, i) => (
            <div key={i} className={`lp-r lp-d${i + 1}`} style={{
              paddingTop: i === 0 ? 0 : 28,
              paddingBottom: 28,
              borderBottom: `1px solid ${P.border}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.blue, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: P.text, marginBottom: 8, letterSpacing: -0.3 }}>
                {c.t}
              </div>
              <div style={{ fontSize: 15, color: P.sub, lineHeight: 1.75 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features({ t, scrollY }) {
  const sectionRef = useRef(null)
  const sectionTopRef = useRef(0)
  useEffect(() => { if (sectionRef.current) sectionTopRef.current = sectionRef.current.offsetTop }, [])
  const rel = scrollY - sectionTopRef.current
  const half = Math.ceil(t.features.items.length / 2)
  const cols = [t.features.items.slice(0, half), t.features.items.slice(half)]

  return (
    <section ref={sectionRef} id="features" style={{ background: P.light, padding: '120px 64px', direction: t.dir, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '25%', insetInlineStart: '-120px', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,.07) 0%,transparent 65%)', filter: 'blur(90px)', pointerEvents: 'none', transform: `translateY(${rel * .18}px)`, willChange: 'transform' }} />
      <div style={{ position: 'absolute', bottom: '20%', insetInlineEnd: '-80px', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.06) 0%,transparent 65%)', filter: 'blur(65px)', pointerEvents: 'none', transform: `translateY(${rel * -.11}px)`, willChange: 'transform' }} />

      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <SectionHead align="start" h={t.features.h} dir={t.dir} />

        <div className="lp-feat-list">
          {cols.map((col, ci) => (
            <div key={ci} style={{ borderTop: `1px solid ${P.border}` }}>
              {col.map((f, i) => (
                <div key={i} className={`lp-r lp-d${ci * half + i + 1}`} style={{
                  padding: '28px 0',
                  borderBottom: `1px solid ${P.border}`,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: P.text, marginBottom: 8, letterSpacing: -0.2 }}>{f.t}</div>
                  <div style={{ fontSize: 14, color: P.sub, lineHeight: 1.75 }}>{f.d}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection({ t, scrollY }) {
  const sectionRef = useRef(null)
  const sectionTopRef = useRef(0)
  useEffect(() => { if (sectionRef.current) sectionTopRef.current = sectionRef.current.offsetTop }, [])
  const rel = scrollY - sectionTopRef.current
  return (
    <section ref={sectionRef} style={{ background: P.dark, padding: '120px 64px', position: 'relative', overflow: 'hidden', direction: t.dir }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, calc(-50% + ${rel * .2}px))`, willChange: 'transform' }}>
        <div style={{ width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.2) 0%,transparent 65%)', filter: 'blur(70px)', animation: 'lp-pulse 8s ease-in-out infinite' }} />
      </div>
      <div style={{ position: 'absolute', top: '25%', right: '12%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,.14) 0%,transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', transform: `translateY(${rel * -.16}px)`, willChange: 'transform' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div className="lp-rs lp-d0"><Chip light>{t.cta.badge}</Chip></div>
        <h2 className="lp-r lp-d1" style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, marginTop: 6, letterSpacing: -1.5 }}>{t.cta.h}</h2>
        <p className="lp-r lp-d2" style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', lineHeight: 1.75, marginBottom: 44 }}>{t.cta.sub}</p>
        <div className="lp-r lp-d3">
          <a href="/app" className="lp-btn-primary"
            style={{ display: 'inline-block', background: '#2563eb', color: '#fff', textDecoration: 'none', padding: '17px 54px', borderRadius: 12, fontSize: 17, fontWeight: 800, boxShadow: '0 10px 36px rgba(37,99,235,.45)', letterSpacing: -.2 }}>
            {t.cta.btn} →
          </a>
        </div>
        <div className="lp-r lp-d4" style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
          {t.cta.trust.map((x,i) => (
            <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>{x}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact ───────────────────────────────────────────────────────────────────
function ContactSection({ t }) {
  const c    = t.contact
  const lang = t.dir === 'rtl' ? 'he' : 'en'
  const [form, setForm]       = useState({ name: '', company: '', phone: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState(null)
  const [errors, setErrors]   = useState({})
  const [touched, setTouched] = useState({})

  const set = k => e => {
    const v = e.target.value
    setForm(f => ({ ...f, [k]: v }))
    if (touched[k]) setErrors(prev => ({ ...prev, [k]: validateField(k, v, lang) }))
  }

  const touch = k => () => {
    setTouched(prev => ({ ...prev, [k]: true }))
    setErrors(prev => ({ ...prev, [k]: validateField(k, form[k], lang) }))
  }

  const runAll = () => {
    const errs = {}
    const fields = { name: form.name, phone: form.phone, email: form.email }
    for (const [k, v] of Object.entries(fields)) {
      const e = validateField(k, v, lang)
      if (e) errs[k] = e
    }
    setErrors(errs)
    setTouched({ name: true, phone: true, email: true })
    return Object.keys(errs).length === 0
  }

  const submit = async e => {
    e.preventDefault()
    if (!runAll()) return
    setSending(true); setErr(null)
    try {
      const r = await fetch('https://dvjjxwcvxjgqpdcnnmvv.supabase.co/functions/v1/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) setDone(true)
      else setErr(c.error)
    } catch { setErr(c.error) }
    finally { setSending(false) }
  }

  const labelStyle  = { display: 'block', fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 6 }
  const optStyle    = { fontSize: 12, color: P.muted, fontWeight: 400 }
  const errStyle    = k => touched[k] && errors[k] ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,.1)' } : {}
  const ErrMsg      = ({ k }) => touched[k] && errors[k]
    ? <span role="alert" style={{ color: '#ef4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors[k]}</span>
    : null

  const hasErrors = Object.keys(errors).some(k => errors[k])

  return (
    <section id="contact" style={{ background: P.light, padding: '120px 64px 100px', direction: t.dir }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <SectionHead h={c.h} sub={c.sub} dir={t.dir} />

        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {done ? (
            <div className="lp-rs lp-visible" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '32px', textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#15803d' }}>
              {c.success}
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="lp-contact-card" style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 24, padding: '40px 44px', boxShadow: '0 4px 32px rgba(0,0,0,.05)' }}>

                <div className="lp-form-grid">
                  <div>
                    <label htmlFor="cf-name" style={labelStyle}>{c.name}</label>
                    <input id="cf-name" className="lp-input" value={form.name} onChange={set('name')} onBlur={touch('name')} placeholder={c.namePh} autoComplete="name" style={errStyle('name')} />
                    <ErrMsg k="name" />
                  </div>
                  <div>
                    <label htmlFor="cf-company" style={labelStyle}>{c.company} <span style={optStyle}>({c.companyPh})</span></label>
                    <input id="cf-company" className="lp-input" value={form.company} onChange={set('company')} placeholder={c.companyPh} autoComplete="organization" />
                  </div>
                </div>

                <div className="lp-form-grid">
                  <div>
                    <label htmlFor="cf-phone" style={labelStyle}>{c.phone}</label>
                    <input id="cf-phone" className="lp-input" type="tel" value={form.phone} onChange={set('phone')} onBlur={touch('phone')} placeholder={c.phonePh} autoComplete="tel" style={errStyle('phone')} />
                    <ErrMsg k="phone" />
                  </div>
                  <div>
                    <label htmlFor="cf-email" style={labelStyle}>{c.email}</label>
                    <input id="cf-email" className="lp-input" type="email" value={form.email} onChange={set('email')} onBlur={touch('email')} placeholder={c.emailPh} autoComplete="email" style={errStyle('email')} />
                    <ErrMsg k="email" />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="cf-message" style={labelStyle}>{c.message}</label>
                  <textarea id="cf-message" className="lp-input" value={form.message} onChange={set('message')} placeholder={c.messagePh} />
                </div>

                {err && <div role="alert" style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>{err}</div>}

                <button type="submit" disabled={sending} className="lp-btn-primary"
                  style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', padding: '15px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? .7 : 1, boxShadow: '0 8px 28px rgba(37,99,235,.35)', fontFamily: 'inherit' }}>
                  {sending ? c.sending : c.send}
                </button>
                <p style={{ fontSize: 12, color: P.muted, textAlign: 'center', margin: '14px 0 0', lineHeight: 1.6 }}>
                  {t.dir === 'rtl'
                    ? <>{' בלחיצה על שלח, אתה מסכים ל'}<a href="/privacy" style={{ color: P.blue }}>{'מדיניות הפרטיות'}</a>{' שלנו.'}</>
                    : <>{'By clicking Send, you agree to our '}<a href="/privacy" style={{ color: P.blue }}>{'Privacy Policy'}</a>{'.'}</>
                  }
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ t }) {
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <footer style={{ background: P.white, borderTop: `1px solid ${P.border}`, padding: '32px 64px', direction: t.dir }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <CeloxIcon size={28} />
          <span style={{ fontSize: 15, fontWeight: 800, color: P.text }}>Celox <span style={{ color: P.blue }}>AI</span></span>
        </div>
        <div style={{ fontSize: 13, color: P.muted }}>{t.footer}</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <span key={id} onClick={() => scrollTo(id)} className="lp-nav-link"
              style={{ fontSize: 13, color: P.muted, cursor: 'pointer' }}>{t.nav[k]}</span>
          ))}
          <a href="/privacy" style={{ fontSize: 13, color: P.muted, textDecoration: 'none' }} className="lp-nav-link">
            {t.dir === 'rtl' ? 'מדיניות פרטיות' : 'Privacy Policy'}
          </a>
        </div>
      </div>
    </footer>
  )
}

// ── Chip label ────────────────────────────────────────────────────────────────
function Chip({ children, light }) {
  return (
    <div style={{ display: 'inline-block', background: light ? 'rgba(255,255,255,.08)' : '#eff6ff', border: `1px solid ${light ? 'rgba(255,255,255,.15)' : '#bfdbfe'}`, borderRadius: 30, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: light ? '#93c5fd' : '#2563eb', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang]             = useState('he')
  const [scrollY, setScrollY]       = useState(0)
  const [navSolid, setNavSolid]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = T[lang]

  useEffect(() => {
    const style = Object.assign(document.createElement('style'), { id: 'lp-css', textContent: CSS })
    document.head.appendChild(style)
    document.body.style.cssText = 'background:#fff;overflow-x:hidden;margin:0;padding:0;width:100%'
    document.documentElement.style.cssText = 'overflow-x:hidden;width:100%'
    return () => { document.getElementById('lp-css')?.remove(); document.body.style.cssText = ''; document.documentElement.style.cssText = '' }
  }, [])

  useEffect(() => {
    let tick = false
    const onScroll = () => {
      if (!tick) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); setNavSolid(window.scrollY > 60); tick = false })
        tick = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => {
        if (!e.isIntersecting) return
        if (e.target.classList.contains('lp-line-reveal')) {
          e.target.classList.add('lp-line-visible')
        } else {
          e.target.classList.add('lp-visible')
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    )
    document.querySelectorAll('.lp-r,.lp-rl,.lp-rr,.lp-rs,.lp-line-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [lang])

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false) }

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: t.dir, background: P.white, color: P.text, overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>
      <Nav t={t} lang={lang} setLang={setLang} solid={navSolid} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />
      <Hero t={t} scrollY={scrollY} />
      <Stats t={t} />
      <About t={t} scrollY={scrollY} />
      <Features t={t} scrollY={scrollY} />
      <CTASection t={t} scrollY={scrollY} />
      <ContactSection t={t} />
      <Footer t={t} />
    </div>
  )
}
