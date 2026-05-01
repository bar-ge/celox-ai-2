import { useState, useEffect } from 'react'

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  dark:   '#04080f',
  dark2:  '#0a1628',
  white:  '#ffffff',
  light:  '#f8fafc',
  light2: '#f1f5f9',
  border: '#e2e8f0',
  text:   '#0f172a',
  sub:    '#475569',
  muted:  '#94a3b8',
  blue:   '#2563eb',
  blueL:  '#3b82f6',
  cyan:   '#0891b2',
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
      badge: 'מה אנחנו עושים',
      h: 'ניהול, מעקב וייעול הפעילות הלוגיסטית שלך',
      sub: 'ניהול, מעקב וייעול הפעילות הלוגיסטית שלך — הכל בזמן אמת.',
      cards: [
        { icon: '🚗', t: 'מעקב בזמן אמת',  d: 'ניהול מלא של כל הרכבים, הסטטוס, השיוך והמשימות — בזמן אמת' },
        { icon: '📊', t: 'דוחות וניתוח',   d: 'דוחות מפורטים של עלויות, תקציב ותחזוקה לכל רכב ולכל הצי' },
        { icon: '🔔', t: 'התראות חכמות',   d: 'קבל התראות על תחזוקה, פקיעת רישיונות ומסמכים — לפני שיאוחר' },
      ],
    },
    features: {
      badge: 'יתרונות',
      h: 'כל מה שאתה צריך, במקום אחד',
      items: [
        { e: '🚙', t: 'ניהול רכבים',       d: 'הוסף, עדכן ומחק רכבים. מעקב אחרי מצב וסטטוס בזמן אמת' },
        { e: '👤', t: 'ניהול נהגים',       d: 'פרופילי נהגים מלאים, מעקב רישיונות ושיוך לרכבים' },
        { e: '💰', t: 'ניהול עלויות',      d: 'עקוב אחרי כל ההוצאות עם קטגוריות ותקציב חודשי' },
        { e: '📎', t: 'מסמכים בענן',      d: 'שמור ביטוחים, רישיונות ומסמכים — נגישים מכל מכשיר' },
        { e: '🔧', t: 'תחזוקה מתוזמנת',   d: 'תזמן ועקוב אחרי טיפולים מונעים לכל הצי' },
        { e: '📱', t: 'נגיש מכל מכשיר',   d: 'ממשק מותאם לנייד, טאבלט ומחשב — גישה מכל מקום' },
      ],
    },
    cta: {
      badge: 'מוכן להתחיל?',
      h: 'קח את ניהול הצי שלך לרמה הבאה',
      sub: 'הצטרף לעסקים שכבר משתמשים ב‑Celox AI',
      btn: 'כניסה למערכת',
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
      badge: 'What We Do',
      h: 'Manage, track and optimize your logistics',
      sub: 'Manage, track and optimize your logistics operations — all in real time.',
      cards: [
        { icon: '🚗', t: 'Real-Time Tracking',  d: 'Full management of all vehicles, status, assignments and tasks — in real time' },
        { icon: '📊', t: 'Reports & Analytics',  d: 'Detailed cost, budget and maintenance reports per vehicle and fleet-wide' },
        { icon: '🔔', t: 'Smart Alerts',         d: 'Get alerts for maintenance, license and document expirations — before it\'s too late' },
      ],
    },
    features: {
      badge: 'Features',
      h: 'Everything You Need, All in One Place',
      items: [
        { e: '🚙', t: 'Vehicle Management',    d: 'Add, update and remove vehicles. Real-time status and condition tracking' },
        { e: '👤', t: 'Driver Management',     d: 'Full driver profiles, license tracking and vehicle assignments' },
        { e: '💰', t: 'Cost Management',       d: 'Track all expenses with categories and monthly budget summaries' },
        { e: '📎', t: 'Cloud Documents',       d: 'Store insurance, licenses and documents — accessible from any device' },
        { e: '🔧', t: 'Scheduled Maintenance', d: 'Plan and track preventive service for your entire fleet' },
        { e: '📱', t: 'Any Device Access',     d: 'Fully responsive UI for mobile, tablet and desktop' },
      ],
    },
    cta: {
      badge: 'Ready to Start?',
      h: 'Take Your Fleet Management to the Next Level',
      sub: 'Join businesses already using Celox AI',
      btn: 'Enter System',
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

  .lp-reveal { opacity:0; transform:translateY(24px); transition:opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1) }
  .lp-visible { opacity:1 !important; transform:translateY(0) !important }
  .lp-d1{transition-delay:.04s}.lp-d2{transition-delay:.1s}.lp-d3{transition-delay:.16s}
  .lp-d4{transition-delay:.22s}.lp-d5{transition-delay:.28s}.lp-d6{transition-delay:.34s}

  .lp-nav-link { transition:color .18s; cursor:pointer }
  .lp-nav-link:hover { color:#2563eb !important }

  .lp-btn-primary { transition:transform .22s ease, box-shadow .22s ease !important }
  .lp-btn-primary:hover { transform:translateY(-2px) !important; box-shadow:0 16px 44px rgba(37,99,235,.45) !important }

  .lp-btn-ghost { transition:background .2s, border-color .2s, color .2s !important }
  .lp-btn-ghost:hover { background:rgba(37,99,235,.06) !important; border-color:#2563eb !important; color:#2563eb !important }

  .lp-feat-card { transition:transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .3s }
  .lp-feat-card:hover { transform:translateY(-6px) !important; box-shadow:0 20px 48px rgba(0,0,0,.09) !important; border-color:#bfdbfe !important }

  .lp-pillar { transition:transform .3s ease, box-shadow .3s }
  .lp-pillar:hover { transform:translateY(-4px) !important; box-shadow:0 12px 36px rgba(0,0,0,.08) !important }

  .lp-lang-btn { transition:background .18s, border-color .18s, color .18s }
  .lp-lang-btn:hover { background:#f1f5f9 !important; border-color:#94a3b8 !important }

  .lp-hamburger { display:none }

  @media (max-width:768px) {
    .lp-hero-h1  { font-size:52px !important }
    .lp-feat-grid{ grid-template-columns:1fr 1fr !important }
    .lp-stats-grid{ grid-template-columns:1fr 1fr !important }
    .lp-pillar-grid{ grid-template-columns:1fr !important }
    .lp-nav-links{ display:none !important }
    .lp-hamburger{ display:flex !important }
  }
  @media (max-width:520px) {
    .lp-hero-h1  { font-size:38px !important }
    .lp-feat-grid{ grid-template-columns:1fr !important }
    .lp-hero-ctas{ flex-direction:column !important }
    .lp-hero-ctas a,.lp-hero-ctas span{ width:100% !important; text-align:center !important }
  }

  ::-webkit-scrollbar { width:5px }
  ::-webkit-scrollbar-track { background:#f8fafc }
  ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }
  ::-webkit-scrollbar-thumb:hover { background:#2563eb }
`

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ t, lang, setLang, solid, mobileOpen, setMobileOpen, scrollTo }) {
  const nav = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 48px', height: 66,
    background: solid ? 'rgba(255,255,255,.96)' : 'transparent',
    backdropFilter: solid ? 'blur(20px)' : 'none',
    borderBottom: solid ? `1px solid ${P.border}` : 'none',
    transition: 'background .35s, border-color .35s, backdrop-filter .35s',
    direction: t.dir,
  }
  const linkColor = solid ? P.sub : 'rgba(255,255,255,.75)'
  const linkStyle = { fontSize: 14, fontWeight: 500, color: linkColor, textDecoration: 'none', padding: '4px 0' }

  return (
    <>
      <nav style={nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🚗</div>
          <span style={{ fontSize: 17, fontWeight: 800, color: solid ? P.text : '#fff', letterSpacing: -.3 }}>
            Celox <span style={{ color: P.blue }}>AI</span>
          </span>
        </div>

        <div className="lp-nav-links" style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <span key={id} className="lp-nav-link" style={linkStyle} onClick={() => scrollTo(id)}>{t.nav[k]}</span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="lp-lang-btn" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            style={{ background: 'transparent', border: `1px solid ${solid ? P.border : 'rgba(255,255,255,.25)'}`, color: solid ? P.sub : 'rgba(255,255,255,.75)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: .5 }}>
            {t.langBtn}
          </button>
          <a href="/app" className="lp-btn-primary"
            style={{ background: P.blue, color: '#fff', textDecoration: 'none', padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(37,99,235,.3)', whiteSpace: 'nowrap' }}>
            {t.nav.enter}
          </a>
          <button className="lp-hamburger" onClick={() => setMobileOpen(p => !p)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, flexDirection: 'column', gap: 5, color: solid ? P.text : '#fff' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 22, height: 2, background: 'currentColor', borderRadius: 2, transition: 'all .25s',
                transform: mobileOpen ? (i===0?'rotate(45deg) translateY(7px)':i===2?'rotate(-45deg) translateY(-7px)':'none') : 'none',
                opacity: mobileOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div style={{ position: 'fixed', top: 66, left: 0, right: 0, zIndex: 999, background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${P.border}`, padding: '16px 24px 24px', direction: t.dir }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <div key={id} onClick={() => scrollTo(id)}
              style={{ padding: '13px 0', borderBottom: `1px solid ${P.border}`, fontSize: 15, fontWeight: 600, color: P.text, cursor: 'pointer' }}>
              {t.nav[k]}
            </div>
          ))}
          <a href="/app" style={{ display: 'block', marginTop: 18, background: P.blue, color: '#fff', textDecoration: 'none', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>
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

      {/* Base */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg,#050d20 0%,#020810 55%,#04091a 100%)' }} />

      {/* Subtle photo layer */}
      <div style={{ position: 'absolute', inset: '-8%', backgroundImage: 'url(https://picsum.photos/seed/road-night/1920/1080)', backgroundSize: 'cover', backgroundPosition: 'center 55%', transform: `translateY(${py(.22)})`, opacity: .07, filter: 'blur(2px)' }} />

      {/* Two glow orbs — subtle */}
      <div style={{ position: 'absolute', top: '15%', left: '12%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.22) 0%,transparent 65%)', filter: 'blur(55px)', animation: 'lp-drift 16s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '8%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(8,145,178,.14) 0%,transparent 65%)', filter: 'blur(60px)', animation: 'lp-drift 20s ease-in-out infinite 4s' }} />

      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.06) 1px,transparent 1px)', backgroundSize: '48px 48px', opacity: .5, transform: `translateY(${py(.06)})` }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '0 24px', maxWidth: 780, direction: t.dir }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 30, padding: '6px 18px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.65)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 28, animation: 'lp-up .7s .1s both' }}>
          {t.hero.badge}
        </div>

        <h1 className="lp-hero-h1" style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.05, marginBottom: 24, animation: 'lp-up .8s .25s both', letterSpacing: -2 }}>
          <span style={{ display: 'block', color: '#fff' }}>{t.hero.h1}</span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#60a5fa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t.hero.h2}</span>
        </h1>

        <p style={{ fontSize: 18, color: 'rgba(255,255,255,.55)', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px', animation: 'lp-up .8s .4s both' }}>
          {t.hero.sub}
        </p>

        <div className="lp-hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'lp-up .8s .55s both' }}>
          <a href="/app" className="lp-btn-primary"
            style={{ display: 'inline-block', background: P.blue, color: '#fff', textDecoration: 'none', padding: '15px 42px', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 28px rgba(37,99,235,.4)', letterSpacing: -.1 }}>
            {t.hero.cta1}
          </a>
          <span className="lp-btn-ghost" onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-block', color: 'rgba(255,255,255,.6)', padding: '15px 36px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer' }}>
            {t.hero.cta2} ↓
          </span>
        </div>
      </div>

      {/* Bottom fade to white */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top,#ffffff,transparent)', zIndex: 6 }} />

      <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 8, color: 'rgba(255,255,255,.3)' }}>
        <svg style={{ animation: 'lp-scroll 2s ease-in-out infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </section>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats({ t }) {
  return (
    <div style={{ background: P.white, borderBottom: `1px solid ${P.border}`, padding: '0 48px', direction: t.dir }}>
      <div className="lp-stats-grid lp-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        {t.stats.map((s, i) => (
          <div key={i} className={`lp-d${i+1}`} style={{ padding: '40px 16px', borderRight: i < 3 ? `1px solid ${P.border}` : 'none' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: P.blue, lineHeight: 1, marginBottom: 8, letterSpacing: -1 }}>{s.n}</div>
            <div style={{ fontSize: 13, color: P.sub, fontWeight: 500 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── About ─────────────────────────────────────────────────────────────────────
function About({ t }) {
  return (
    <section id="about" style={{ background: P.white, padding: '110px 48px', direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
          <Chip>{t.about.badge}</Chip>
          <h2 style={{ fontSize: 52, fontWeight: 900, color: P.text, lineHeight: 1.1, marginBottom: 16, letterSpacing: -1.5 }}>{t.about.h}</h2>
          <p style={{ fontSize: 17, color: P.sub, maxWidth: 520, margin: '0 auto', lineHeight: 1.75 }}>{t.about.sub}</p>
        </div>

        <div className="lp-pillar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {t.about.cards.map((c, i) => (
            <div key={i} className={`lp-pillar lp-reveal lp-d${i+1}`}
              style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 20, padding: '36px 32px', textAlign: t.dir === 'rtl' ? 'right' : 'left' }}>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{c.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: P.text, marginBottom: 10, letterSpacing: -.3 }}>{c.t}</div>
              <div style={{ fontSize: 15, color: P.sub, lineHeight: 1.7 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features({ t }) {
  const accents = ['#2563eb','#7c3aed','#059669','#d97706','#0891b2','#dc2626']
  return (
    <section id="features" style={{ background: P.light, padding: '110px 48px', direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <Chip>{t.features.badge}</Chip>
          <h2 style={{ fontSize: 52, fontWeight: 900, color: P.text, lineHeight: 1.1, letterSpacing: -1.5 }}>{t.features.h}</h2>
        </div>

        <div className="lp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {t.features.items.map((f, i) => (
            <div key={i} className={`lp-feat-card lp-reveal lp-d${(i%3)+1}`}
              style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 18, padding: '32px 28px', textAlign: t.dir === 'rtl' ? 'right' : 'left' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${accents[i]}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>{f.e}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: P.text, marginBottom: 8, letterSpacing: -.2 }}>{f.t}</div>
              <div style={{ fontSize: 14, color: P.sub, lineHeight: 1.7 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection({ t }) {
  return (
    <section id="contact" style={{ background: P.dark, padding: '130px 48px', position: 'relative', overflow: 'hidden', direction: t.dir }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.2) 0%,transparent 65%)', filter: 'blur(70px)', animation: 'lp-pulse 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

      <div className="lp-reveal" style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <Chip light>{t.cta.badge}</Chip>
        <h2 style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20, marginTop: 6, letterSpacing: -1.5 }}>{t.cta.h}</h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', lineHeight: 1.75, marginBottom: 44 }}>{t.cta.sub}</p>
        <a href="/app" className="lp-btn-primary"
          style={{ display: 'inline-block', background: P.blue, color: '#fff', textDecoration: 'none', padding: '17px 54px', borderRadius: 14, fontSize: 17, fontWeight: 800, boxShadow: '0 10px 36px rgba(37,99,235,.45)', letterSpacing: -.2 }}>
          {t.cta.btn} →
        </a>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
          {['🔒 מאובטח', '☁️ ענן', '📱 כל מכשיר', '⚡ 24/7'].map((x,i) => (
            <span key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>{x}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ t }) {
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <footer style={{ background: P.white, borderTop: `1px solid ${P.border}`, padding: '32px 48px', direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#2563eb,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🚗</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: P.text }}>Celox <span style={{ color: P.blue }}>AI</span></span>
        </div>
        <div style={{ fontSize: 13, color: P.muted }}>{t.footer}</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['what','about'],['features','features'],['contact','contact']].map(([k,id]) => (
            <span key={id} onClick={() => scrollTo(id)} className="lp-nav-link"
              style={{ fontSize: 13, color: P.muted, cursor: 'pointer' }}>{t.nav[k]}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Chip label ────────────────────────────────────────────────────────────────
function Chip({ children, light }) {
  return (
    <div style={{ display: 'inline-block', background: light ? 'rgba(255,255,255,.08)' : '#eff6ff', border: `1px solid ${light ? 'rgba(255,255,255,.15)' : '#bfdbfe'}`, borderRadius: 30, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: light ? '#93c5fd' : P.blue, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang]         = useState('he')
  const [scrollY, setScrollY]   = useState(0)
  const [navSolid, setNavSolid] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = T[lang]

  useEffect(() => {
    const style = Object.assign(document.createElement('style'), { id: 'lp-css', textContent: CSS })
    document.head.appendChild(style)
    document.body.style.cssText = 'background:#fff;overflow-x:hidden;margin:0'
    return () => { document.getElementById('lp-css')?.remove(); document.body.style.cssText = '' }
  }, [])

  useEffect(() => {
    let tick = false
    const onScroll = () => { if (!tick) { requestAnimationFrame(() => { setScrollY(window.scrollY); setNavSolid(window.scrollY > 60); tick = false }); tick = true } }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [lang])

  const scrollTo = id => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false) }

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: t.dir, background: P.white, color: P.text, overflowX: 'hidden' }}>
      <Nav t={t} lang={lang} setLang={setLang} solid={navSolid} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} scrollTo={scrollTo} />
      <Hero t={t} scrollY={scrollY} />
      <Stats t={t} />
      <About t={t} />
      <Features t={t} />
      <CTASection t={t} />
      <Footer t={t} />
    </div>
  )
}
