import { useState, useEffect, useRef } from 'react'

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg:     '#03070f',
  bg2:    '#060d1a',
  card:   'rgba(255,255,255,0.03)',
  blue:   '#2563eb',
  blueL:  '#3b82f6',
  cyan:   '#06b6d4',
  purple: '#7c3aed',
  gold:   '#f59e0b',
  border: 'rgba(255,255,255,0.07)',
  sub:    '#94a3b8',
  muted:  '#475569',
}

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  he: {
    dir: 'rtl', langBtn: 'EN', align: 'right',
    nav: { what: 'מה אנחנו עושים', features: 'יתרונות', contact: 'צור קשר', enter: 'כניסה למערכת' },
    hero: {
      badge: 'מערכת ניהול צי מתקדמת',
      h1: 'ניהול צי רכבים',
      h2: 'חכם, יעיל ומהיר',
      sub: 'כל מה שאתה צריך לנהל את הצי שלך — רכבים, נהגים, עלויות ומסמכים — במקום אחד.',
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
      h: 'שליטה מלאה על כל הצי שלך',
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
      sub: 'הצטרף לעסקים שכבר משתמשים ב‑Celox AI ומנהלים את הצי שלהם בחכמה ויעילות',
      btn: 'כניסה למערכת',
    },
    footer: '© 2025 Celox AI · כל הזכויות שמורות',
  },
  en: {
    dir: 'ltr', langBtn: 'עב', align: 'left',
    nav: { what: 'What We Do', features: 'Features', contact: 'Contact', enter: 'Enter System' },
    hero: {
      badge: 'Advanced Fleet Management Platform',
      h1: 'Fleet Management',
      h2: 'Smart, Efficient & Fast',
      sub: 'Everything you need to manage your fleet — vehicles, drivers, costs and documents — all in one place.',
      cta1: 'Enter System', cta2: 'Discover More',
    },
    stats: [
      { n: '500+', l: 'Vehicles Managed' },
      { n: '100%', l: 'System Uptime' },
      { n: '30%',  l: 'Cost Savings' },
      { n: '24/7', l: 'Monitoring & Support' },
    ],
    about: {
      badge: 'What We Do',
      h: 'Full Control Over Your Entire Fleet',
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
      sub: 'Join businesses already using Celox AI to manage their fleet smarter and more efficiently',
      btn: 'Enter System',
    },
    footer: '© 2025 Celox AI · All rights reserved',
  },
}

// ── Injected CSS ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes lp-fadeUp   { from { opacity:0; transform:translateY(36px) } to { opacity:1; transform:translateY(0) } }
  @keyframes lp-float    { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-18px) } }
  @keyframes lp-pulse    { 0%,100% { opacity:.55; transform:scale(1) } 50% { opacity:1; transform:scale(1.06) } }
  @keyframes lp-drift    { 0% { transform:translateX(0) translateY(0) } 33% { transform:translateX(18px) translateY(-12px) } 66% { transform:translateX(-14px) translateY(8px) } 100% { transform:translateX(0) translateY(0) } }
  @keyframes lp-spin     { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
  @keyframes lp-shimmer  { 0% { background-position:-400% center } 100% { background-position:400% center } }
  @keyframes lp-scroll   { 0%,100% { opacity:1; transform:translateY(0) } 50% { opacity:.3; transform:translateY(8px) } }
  @keyframes lp-particle { 0% { transform:translateY(0) scale(1); opacity:.7 } 100% { transform:translateY(-120px) scale(0); opacity:0 } }

  .lp-reveal { opacity:0; transform:translateY(28px); transition:opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1) }
  .lp-reveal.lp-visible { opacity:1; transform:translateY(0) }
  .lp-d1{transition-delay:.05s} .lp-d2{transition-delay:.12s} .lp-d3{transition-delay:.19s}
  .lp-d4{transition-delay:.26s} .lp-d5{transition-delay:.33s} .lp-d6{transition-delay:.40s}

  .lp-nav-link { transition:color .2s ease; cursor:pointer }
  .lp-nav-link:hover { color:#60a5fa !important }

  .lp-cta-btn { transition:transform .25s ease, box-shadow .25s ease !important }
  .lp-cta-btn:hover { transform:translateY(-3px) !important; box-shadow:0 20px 52px rgba(37,99,235,.55) !important }

  .lp-ghost-btn { transition:background .25s, border-color .25s !important }
  .lp-ghost-btn:hover { background:rgba(255,255,255,.09) !important; border-color:rgba(255,255,255,.28) !important }

  .lp-feat-card { transition:transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s, border-color .35s }
  .lp-feat-card:hover { transform:translateY(-10px) scale(1.01) !important; box-shadow:0 28px 64px rgba(37,99,235,.2) !important; border-color:rgba(37,99,235,.38) !important }

  .lp-pillar { transition:transform .3s ease, box-shadow .3s ease }
  .lp-pillar:hover { transform:translateY(-6px) !important; box-shadow:0 18px 50px rgba(37,99,235,.14) !important }

  .lp-img-frame { transition:transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s ease }
  .lp-img-frame:hover { transform:perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1.02) !important; box-shadow:0 48px 100px rgba(0,0,0,.7), 0 0 60px rgba(37,99,235,.25) !important }

  .lp-lang-btn { transition:background .2s, color .2s, border-color .2s }
  .lp-lang-btn:hover { background:rgba(255,255,255,.1) !important; border-color:rgba(255,255,255,.25) !important }

  @media (max-width:1024px) {
    .lp-about-grid { grid-template-columns:1fr !important }
    .lp-about-img  { display:none !important }
  }
  @media (max-width:768px) {
    .lp-hero-h1   { font-size:50px !important; line-height:1.15 !important }
    .lp-feat-grid { grid-template-columns:1fr 1fr !important }
    .lp-stats-grid{ grid-template-columns:1fr 1fr !important }
    .lp-pillar-grid{ grid-template-columns:1fr !important }
    .lp-nav-links { display:none !important }
    .lp-hamburger { display:flex !important }
  }
  @media (max-width:520px) {
    .lp-hero-h1  { font-size:36px !important }
    .lp-hero-sub { font-size:15px !important }
    .lp-feat-grid{ grid-template-columns:1fr !important }
    .lp-hero-ctas{ flex-direction:column !important }
    .lp-hero-ctas a { width:100% !important; text-align:center !important }
  }

  ::-webkit-scrollbar { width:5px }
  ::-webkit-scrollbar-track { background:#03070f }
  ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:3px }
  ::-webkit-scrollbar-thumb:hover { background:#2563eb }
`

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({ t, lang, setLang, solid, mobileOpen, setMobileOpen, scrollTo }) {
  const isRtl = t.dir === 'rtl'
  const nav = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 40px', height: 68,
    background: solid ? 'rgba(3,7,15,.92)' : 'transparent',
    backdropFilter: solid ? 'blur(20px)' : 'none',
    borderBottom: solid ? '1px solid rgba(255,255,255,.06)' : 'none',
    transition: 'background .4s ease, backdrop-filter .4s ease, border-color .4s ease',
    direction: t.dir,
  }
  const linkStyle = { fontSize: 14, fontWeight: 500, color: '#cbd5e1', textDecoration: 'none', padding: '6px 4px' }

  return (
    <>
      <nav style={nav}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚗</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -.3 }}>Celox <span style={{ color: '#3b82f6' }}>AI</span></span>
        </div>

        {/* Desktop links */}
        <div className="lp-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {[['what', 'about'], ['features', 'features'], ['contact', 'contact']].map(([key, id]) => (
            <span key={id} className="lp-nav-link" style={linkStyle} onClick={() => scrollTo(id)}>{t.nav[key]}</span>
          ))}
        </div>

        {/* Right side: lang + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="lp-lang-btn" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.15)', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {t.langBtn}
          </button>
          <a href="/app" className="lp-cta-btn"
            style={{ background: 'linear-gradient(135deg,#2563eb,#0891b2)', color: '#fff', textDecoration: 'none', padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 6px 24px rgba(37,99,235,.35)', whiteSpace: 'nowrap' }}>
            {t.nav.enter}
          </a>
          {/* Hamburger */}
          <button className="lp-hamburger" onClick={() => setMobileOpen(p => !p)}
            style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, flexDirection: 'column', gap: 5 }}>
            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .3s', transform: mobileOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .3s', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2, transition: 'all .3s', transform: mobileOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', top: 68, left: 0, right: 0, zIndex: 999, background: 'rgba(3,7,15,.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '20px 24px 28px', direction: t.dir }}>
          {[['what', 'about'], ['features', 'features'], ['contact', 'contact']].map(([key, id]) => (
            <div key={id} onClick={() => scrollTo(id)}
              style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 16, fontWeight: 600, color: '#cbd5e1', cursor: 'pointer' }}>
              {t.nav[key]}
            </div>
          ))}
          <a href="/app" style={{ display: 'block', marginTop: 20, background: 'linear-gradient(135deg,#2563eb,#0891b2)', color: '#fff', textDecoration: 'none', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }}>
            {t.nav.enter}
          </a>
        </div>
      )}
    </>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ t, scrollY }) {
  const py = (f) => `${scrollY * f}px`
  return (
    <section style={{ position: 'relative', height: '100vh', minHeight: 700, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* Layer 0: base gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #06102a 0%, #030b1a 45%, #020709 100%)' }} />

      {/* Layer 1: atmospheric photo (slowest) */}
      <div style={{
        position: 'absolute', inset: '-10%',
        backgroundImage: 'url(https://picsum.photos/seed/nightroad/1920/1200)',
        backgroundSize: 'cover', backgroundPosition: 'center 60%',
        transform: `translateY(${py(.25)})`,
        opacity: .09, filter: 'saturate(.4) blur(1px)',
      }} />

      {/* Layer 2: glow orbs (mid) */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${py(.12)})` }}>
        <div style={{ position: 'absolute', top: '8%', left: '8%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,.28) 0%, transparent 68%)', filter: 'blur(50px)', animation: 'lp-drift 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '35%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,.18) 0%, transparent 65%)', filter: 'blur(60px)', animation: 'lp-drift 18s ease-in-out infinite 3s' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '38%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,.14) 0%, transparent 68%)', filter: 'blur(55px)', animation: 'lp-pulse 8s ease-in-out infinite 1s' }} />
      </div>

      {/* Layer 3: dot grid (very subtle) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(37,99,235,.18) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        transform: `translateY(${py(.08)})`,
        opacity: .55,
      }} />

      {/* Layer 4: foreground road silhouette (fastest) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
        backgroundImage: 'url(https://picsum.photos/seed/highway-fg/1920/640)',
        backgroundSize: 'cover', backgroundPosition: 'center top',
        transform: `translateY(${py(.55)})`,
        opacity: .06,
        maskImage: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 24px', maxWidth: 820, direction: t.dir }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.3)', borderRadius: 30, padding: '7px 20px', fontSize: 13, color: '#93c5fd', letterSpacing: .8, marginBottom: 28, animation: 'lp-fadeUp .8s .15s both' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'lp-pulse 2s ease-in-out infinite' }} />
          {t.hero.badge}
        </div>

        {/* H1 */}
        <h1 className="lp-hero-h1" style={{ fontSize: 80, fontWeight: 900, lineHeight: 1.1, marginBottom: 22, animation: 'lp-fadeUp .85s .3s both' }}>
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#fff 0%,#cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t.hero.h1}
          </span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#3b82f6 0%,#06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {t.hero.h2}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="lp-hero-sub" style={{ fontSize: 18, color: P.sub, lineHeight: 1.75, maxWidth: 580, margin: '0 auto 44px', animation: 'lp-fadeUp .85s .5s both' }}>
          {t.hero.sub}
        </p>

        {/* CTAs */}
        <div className="lp-hero-ctas" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'lp-fadeUp .85s .68s both' }}>
          <a href="/app" className="lp-cta-btn"
            style={{ display: 'inline-block', background: 'linear-gradient(135deg,#2563eb,#0891b2)', color: '#fff', textDecoration: 'none', padding: '16px 44px', borderRadius: 14, fontSize: 16, fontWeight: 700, boxShadow: '0 10px 36px rgba(37,99,235,.4)', letterSpacing: -.1 }}>
            {t.hero.cta1}
          </a>
          <span className="lp-ghost-btn"
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ display: 'inline-block', color: '#94a3b8', padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 600, border: '1px solid rgba(148,163,184,.2)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            {t.hero.cta2} ↓
          </span>
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: `linear-gradient(to top, ${P.bg}, transparent)`, zIndex: 6 }} />

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 10, opacity: .45 }}>
        <svg style={{ animation: 'lp-scroll 2.2s ease-in-out infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </section>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats({ t }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.025)', borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '36px 40px', direction: t.dir }}>
      <div className="lp-stats-grid lp-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        {t.stats.map((s, i) => (
          <div key={i} className={`lp-d${i + 1}`} style={{ padding: '12px 24px', borderRight: i < 3 ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
            <div style={{ fontSize: 38, fontWeight: 900, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1, marginBottom: 6 }}>{s.n}</div>
            <div style={{ fontSize: 13, color: P.sub, fontWeight: 500 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── About ─────────────────────────────────────────────────────────────────────
function About({ t }) {
  const isRtl = t.dir === 'rtl'
  return (
    <section id="about" style={{ padding: '120px 40px', background: P.bg, direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
          <Badge>{t.about.badge}</Badge>
          <h2 style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 18 }}>{t.about.h}</h2>
          <p style={{ fontSize: 17, color: P.sub, maxWidth: 580, margin: '0 auto', lineHeight: 1.75 }}>{t.about.sub}</p>
        </div>

        {/* 2-col: image + cards */}
        <div className="lp-about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

          {/* Image frame — hidden on mobile via CSS */}
          <div className={`lp-about-img lp-reveal lp-d2 lp-img-frame`}
            style={{
              order: isRtl ? 2 : 1,
              position: 'relative',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 40px 90px rgba(0,0,0,.65), 0 0 0 1px rgba(37,99,235,.18)',
              transform: `perspective(1200px) rotateY(${isRtl ? '6deg' : '-6deg'}) rotateX(3deg)`,
            }}>
            <img src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=700&q=80" alt="fleet vehicles"
              style={{ display: 'block', width: '100%', filter: 'brightness(.82) saturate(.75)' }} />
            {/* Gradient overlay on image */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(37,99,235,.12), rgba(6,182,212,.08))' }} />
            {/* Floating badge on image */}
            <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, background: 'rgba(3,7,15,.82)', backdropFilter: 'blur(16px)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🚗</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Celox AI Fleet</div>
                <div style={{ fontSize: 11, color: P.sub, marginTop: 1 }}>{isRtl ? 'מערכת ניהול צי בזמן אמת' : 'Real-time fleet management'}</div>
              </div>
              <div style={{ marginRight: 'auto', marginLeft: 'auto' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,.1)', padding: '3px 10px', borderRadius: 20 }}>● LIVE</div>
            </div>
          </div>

          {/* Pillar cards */}
          <div style={{ order: isRtl ? 1 : 2, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {t.about.cards.map((c, i) => (
              <div key={i} className={`lp-pillar lp-reveal lp-d${i + 2}`}
                style={{ display: 'flex', gap: 18, alignItems: 'flex-start', background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: '22px 24px', backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(37,99,235,.22), rgba(6,182,212,.15))', border: '1px solid rgba(37,99,235,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{c.t}</div>
                  <div style={{ fontSize: 14, color: P.sub, lineHeight: 1.65 }}>{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features({ t }) {
  const gradients = [
    'linear-gradient(135deg,#1d4ed8,#0891b2)',
    'linear-gradient(135deg,#7c3aed,#2563eb)',
    'linear-gradient(135deg,#059669,#0891b2)',
    'linear-gradient(135deg,#d97706,#dc2626)',
    'linear-gradient(135deg,#0891b2,#7c3aed)',
    'linear-gradient(135deg,#2563eb,#059669)',
  ]
  return (
    <section id="features" style={{ padding: '120px 40px', background: `linear-gradient(180deg,${P.bg} 0%,${P.bg2} 100%)`, direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <Badge>{t.features.badge}</Badge>
          <h2 style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1.15 }}>{t.features.h}</h2>
        </div>
        <div className="lp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {t.features.items.map((f, i) => (
            <div key={i} className={`lp-feat-card lp-reveal lp-d${(i % 3) + 1}`}
              style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: '28px 26px', backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' }}>
              {/* Subtle glow on card top */}
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 1, background: `linear-gradient(90deg, transparent, rgba(37,99,235,.4), transparent)` }} />
              <div style={{ width: 52, height: 52, borderRadius: 16, background: gradients[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18, boxShadow: '0 8px 24px rgba(0,0,0,.35)' }}>{f.e}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{f.t}</div>
              <div style={{ fontSize: 14, color: P.sub, lineHeight: 1.7 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTASection({ t }) {
  return (
    <section id="contact" style={{ padding: '140px 40px', position: 'relative', overflow: 'hidden', direction: t.dir }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#060e22 0%,#030a16 100%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(37,99,235,.18) 0%,transparent 65%)', filter: 'blur(60px)', animation: 'lp-pulse 7s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '30%', right: '10%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.1) 0%,transparent 65%)', filter: 'blur(50px)' }} />

      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(37,99,235,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.04) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="lp-reveal" style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <Badge gold>{t.cta.badge}</Badge>
        <h2 style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20, marginTop: 8 }}>{t.cta.h}</h2>
        <p style={{ fontSize: 17, color: P.sub, lineHeight: 1.75, marginBottom: 44 }}>{t.cta.sub}</p>
        <a href="/app" className="lp-cta-btn"
          style={{ display: 'inline-block', background: 'linear-gradient(135deg,#2563eb,#0891b2)', color: '#fff', textDecoration: 'none', padding: '18px 56px', borderRadius: 16, fontSize: 18, fontWeight: 800, boxShadow: '0 12px 40px rgba(37,99,235,.45)', letterSpacing: -.2 }}>
          {t.cta.btn} →
        </a>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 48, flexWrap: 'wrap' }}>
          {['🔒 אבטחה מלאה', '☁️ ענן מאובטח', '📱 כל מכשיר', '⚡ זמין 24/7'].map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: P.muted, fontWeight: 500 }}>{item}</div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer({ t }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '36px 40px', background: P.bg, direction: t.dir }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#2563eb,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🚗</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Celox <span style={{ color: '#3b82f6' }}>AI</span></span>
        </div>
        <div style={{ fontSize: 13, color: P.muted }}>{t.footer}</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['what', 'about'], ['features', 'features'], ['contact', 'contact']].map(([key, id]) => (
            <span key={id} onClick={() => scrollTo(id)} style={{ fontSize: 13, color: P.muted, cursor: 'pointer', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = '#94a3b8'} onMouseLeave={e => e.target.style.color = P.muted}>
              {t.nav[key]}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Badge helper ──────────────────────────────────────────────────────────────
function Badge({ children, gold }) {
  return (
    <div style={{ display: 'inline-block', background: gold ? 'rgba(245,158,11,.1)' : 'rgba(37,99,235,.1)', border: `1px solid ${gold ? 'rgba(245,158,11,.3)' : 'rgba(37,99,235,.28)'}`, borderRadius: 30, padding: '6px 18px', fontSize: 12, fontWeight: 700, color: gold ? '#fbbf24' : '#93c5fd', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 18 }}>
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang]         = useState('he')
  const [scrollY, setScrollY]   = useState(0)
  const [navSolid, setNavSolid] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = T[lang]

  // Inject font + global CSS
  useEffect(() => {
    const font = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap' })
    document.head.appendChild(font)
    const style = Object.assign(document.createElement('style'), { id: 'lp-css', textContent: GLOBAL_CSS })
    document.head.appendChild(style)
    const prev = document.body.style.cssText
    document.body.style.background = P.bg
    document.body.style.overflowX = 'hidden'
    return () => {
      document.head.removeChild(font)
      document.getElementById('lp-css')?.remove()
      document.body.style.cssText = prev
    }
  }, [])

  // Scroll → parallax + nav
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          setNavSolid(window.scrollY > 72)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Intersection Observer for reveals
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('lp-visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [lang])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: t.dir, background: P.bg, color: '#fff', overflowX: 'hidden', minHeight: '100vh' }}>
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
