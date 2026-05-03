import { useState } from 'react'
import { CeloxIcon } from './LogoIcon'

const T = {
  he: {
    dir: 'rtl',
    langBtn: 'EN',
    nav: { home: 'חזרה לדף הבית' },
    hero: {
      badge: 'מסמך משפטי',
      title: 'מדיניות פרטיות',
      updated: 'עדכון אחרון: 1 במאי 2026',
    },
    sections: [
      {
        n: '1', h: 'מבוא',
        body: 'Celox AI בע"מ ("אנחנו", "החברה") מפעילה פלטפורמת SaaS לניהול צי רכבים בכתובת celoxai.com. מדיניות פרטיות זו מסבירה אילו נתונים אישיים אנו אוספים, כיצד אנו משתמשים בהם ומה הזכויות שלך — בהתאם לחוק הגנת הפרטיות (תשמ"א-1981) ותקנות הגנת הפרטיות (אבטחת מידע), תשע"ז-2017.',
      },
      {
        n: '2', h: 'מידע שאנו אוספים',
        items: [
          { t: 'מנהלי צי', d: 'שם, כתובת אימייל, שם חברה. הסיסמה מאוחסנת מוצפנת (bcrypt) ואינה נגישה לנו.' },
          { t: 'נהגים (דרך טפסים ציבוריים)', d: 'שם, מספר רישיון, חתימה דיגיטלית (תמונת PNG), אישורי הדרכה.' },
          { t: 'רכבים', d: 'לוחיות רישוי, דגם, שנת ייצור, קילומטראז\' ורשומות תחזוקה.' },
          { t: 'לוגים ופעילות', d: 'פעולות משתמש עם חותמות זמן, לצרכי אבטחה וביקורת.' },
          { t: 'טופס יצירת קשר', d: 'שם, חברה, טלפון, אימייל והודעה — לצורך מענה לפניות בלבד.' },
          { t: 'הרשמה להתראות', d: 'נקודת קצה של דפדפן לשליחת התראות דחיפה. לא מכיל מידע מזהה.' },
        ],
      },
      {
        n: '3', h: 'מטרות העיבוד',
        items: [
          { t: 'ניהול צי', d: 'הפעלת שירות ניהול הרכבים, הנהגים, העלויות והמסמכים.' },
          { t: 'ציות ותיעוד', d: 'שמירת רשומות הדרכה וחתימות לצרכי רגולציה.' },
          { t: 'אבטחה וביקורת', d: 'זיהוי שימוש לרעה ושמירה על יומן ביקורת.' },
          { t: 'תמיכה', d: 'מענה לפניות שנשלחו דרך טופס יצירת הקשר.' },
          { t: 'התראות', d: 'שליחת התראות על פעילות בצי — בהסכמה בלבד.' },
        ],
      },
      {
        n: '4', h: 'אחסון ואבטחה',
        body: 'המידע מאוחסן ב-Supabase בשרתים הממוקמים בטוקיו, יפן (אזור ap-northeast-1). הנתונים מוצפנים בתעבורה (TLS 1.2+) ובאחסון (AES-256). אנו מיישמים אבטחת שורה ברמת מסד הנתונים (Row Level Security) המגבילה גישה לנתונים לפי חברה.',
      },
      {
        n: '5', h: 'העברת מידע לחוץ לארץ',
        body: 'המידע מועבר ומאוחסן ביפן. יפן קיבלה החלטת נאותות מהאיחוד האירופי (GDPR) בשנת 2019 בגין חוק APPI המתוקן שלה. ההעברה מישראל ליפן מבוססת על הסכם עיבוד נתונים (DPA) עם Supabase הכולל הגנות חוזיות המקבילות לסעיפים חוזיים תקניים. במקרה של שינוי מהותי במדיניות הגנת הפרטיות של יפן, נעדכן הסדרי ההעברה בהתאם.',
      },
      {
        n: '6', h: 'שיתוף מידע עם צדדים שלישיים',
        items: [
          { t: 'Supabase Inc.', d: 'ספק תשתית מסד נתונים ואחסון — DPA חתום. לא מורשה להשתמש בנתונייך לכל מטרה אחרת.' },
          { t: 'Vercel Inc.', d: 'פלטפורמת אירוח האתר — אינה מעבדת נתונים אישיים מעבר ל-IP לצרכי CDN.' },
          { t: 'רשויות', d: 'אם נדרש על פי חוק, צו שיפוטי, או להגנה על זכויות החברה.' },
          { t: 'אחרים', d: 'איננו מוכרים, מעבירים או משתפים נתונים אישיים עם גורמים שלישיים לכל מטרה מסחרית.' },
        ],
      },
      {
        n: '7', h: 'שמירת מידע',
        items: [
          { t: 'נתוני חשבון', d: 'למשך תקופת הפעילות ועד 90 יום לאחר סיום ההתקשרות.' },
          { t: 'הגשות טפסים', d: 'עד שנתיים ממועד ההגשה (ניקוי אוטומטי שבועי).' },
          { t: 'לוג פעילות', d: 'עד שנה (ניקוי אוטומטי שבועי).' },
          { t: 'לוג התראות', d: 'עד 90 יום (ניקוי אוטומטי שבועי).' },
          { t: 'פניות קשר', d: 'עד שנה ממועד הפנייה.' },
        ],
      },
      {
        n: '8', h: 'זכויות נשוא המידע',
        body: 'בהתאם לחוק הגנת הפרטיות הישראלי, עומדות לך הזכויות הבאות:',
        items: [
          { t: 'עיון', d: 'לקבל עותק של המידע האישי המוחזק עלייך.' },
          { t: 'תיקון', d: 'לתקן מידע שגוי או לא מדויק.' },
          { t: 'מחיקה', d: 'לבקש מחיקת המידע האישי שלך, בכפוף לחובות שמירה חוקיות.' },
          { t: 'ביטול הסכמה', d: 'לבטל הסכמה לעיבוד מידע בכל עת (לדוגמה: ביטול הרשמה להתראות).' },
        ],
      },
      {
        n: '9', h: 'שינויים במדיניות',
        body: 'אנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו בדף זה עם עדכון תאריך "עדכון אחרון". המשך השימוש בשירות לאחר הפרסום מהווה הסכמה למדיניות המעודכנת.',
      },
      {
        n: '10', h: 'יצירת קשר',
        body: 'לכל שאלה, פנייה לעיון, תיקון או מחיקת מידע — פנה אלינו:',
        contact: true,
      },
    ],
    deletion: {
      h: 'בקשת מחיקת מידע',
      sub: 'מלא את הפרטים הבאים ונטפל בבקשתך תוך 30 יום',
      name: 'שם מלא',
      email: 'אימייל',
      company: 'שם חברה',
      type: 'סוג הבקשה',
      types: ['מחיקת חשבון ונתונים', 'עיון במידע', 'תיקון מידע', 'אחר'],
      send: 'שלח בקשה',
      note: 'הבקשה תישלח ישירות לצוות הפרטיות שלנו. נאשר קבלה תוך 48 שעות.',
    },
  },
  en: {
    dir: 'ltr',
    langBtn: 'עב',
    nav: { home: 'Back to Home' },
    hero: {
      badge: 'Legal Document',
      title: 'Privacy Policy',
      updated: 'Last updated: May 1, 2026',
    },
    sections: [
      {
        n: '1', h: 'Introduction',
        body: 'Celox AI Ltd. ("we", "Company") operates a SaaS fleet management platform at celoxai.com. This privacy policy explains what personal data we collect, how we use it and your rights — in accordance with the Israeli Privacy Protection Law (1981) and the Privacy Protection Regulations (Data Security) 2017.',
      },
      {
        n: '2', h: 'Data We Collect',
        items: [
          { t: 'Fleet Managers', d: 'Name, email address, company name. Passwords are stored encrypted (bcrypt) and are not accessible to us.' },
          { t: 'Drivers (via public forms)', d: 'Name, license number, digital signature (PNG image), training confirmations.' },
          { t: 'Vehicles', d: 'License plates, model, year, mileage and maintenance records.' },
          { t: 'Logs & Activity', d: 'User actions with timestamps, for security and audit purposes.' },
          { t: 'Contact Form', d: 'Name, company, phone, email and message — for responding to enquiries only.' },
          { t: 'Push Subscriptions', d: 'Browser push endpoint for sending notifications. Contains no personally identifiable information.' },
        ],
      },
      {
        n: '3', h: 'Processing Purposes',
        items: [
          { t: 'Fleet Management', d: 'Operating the vehicle, driver, cost and document management service.' },
          { t: 'Compliance & Records', d: 'Maintaining training records and signatures for regulatory purposes.' },
          { t: 'Security & Audit', d: 'Detecting misuse and maintaining an audit log.' },
          { t: 'Support', d: 'Responding to enquiries submitted via the contact form.' },
          { t: 'Notifications', d: 'Sending fleet activity alerts — with consent only.' },
        ],
      },
      {
        n: '4', h: 'Storage & Security',
        body: 'Data is stored on Supabase servers located in Tokyo, Japan (ap-northeast-1 region). Data is encrypted in transit (TLS 1.2+) and at rest (AES-256). We implement Row Level Security at the database level, restricting data access per company.',
      },
      {
        n: '5', h: 'Cross-Border Data Transfer',
        body: 'Data is transferred to and stored in Japan. Japan received an EU adequacy decision (GDPR) in 2019 for its amended APPI law. The transfer from Israel to Japan is based on a Data Processing Agreement (DPA) with Supabase, which includes contractual protections equivalent to Standard Contractual Clauses. Should Japan\'s privacy framework change materially, we will update transfer arrangements accordingly.',
      },
      {
        n: '6', h: 'Third-Party Data Sharing',
        items: [
          { t: 'Supabase Inc.', d: 'Database and storage infrastructure provider — DPA signed. Not authorised to use your data for any other purpose.' },
          { t: 'Vercel Inc.', d: 'Website hosting platform — does not process personal data beyond IP for CDN purposes.' },
          { t: 'Authorities', d: 'If required by law, court order, or to protect the Company\'s rights.' },
          { t: 'Others', d: 'We do not sell, transfer or share personal data with third parties for any commercial purpose.' },
        ],
      },
      {
        n: '7', h: 'Data Retention',
        items: [
          { t: 'Account data', d: 'For the duration of the subscription and up to 90 days after termination.' },
          { t: 'Form submissions', d: 'Up to two years from submission (weekly automated cleanup).' },
          { t: 'Activity log', d: 'Up to one year (weekly automated cleanup).' },
          { t: 'Alert log', d: 'Up to 90 days (weekly automated cleanup).' },
          { t: 'Contact enquiries', d: 'Up to one year from the enquiry date.' },
        ],
      },
      {
        n: '8', h: 'Data Subject Rights',
        body: 'Under the Israeli Privacy Protection Law, you have the following rights:',
        items: [
          { t: 'Access', d: 'Receive a copy of the personal data held about you.' },
          { t: 'Correction', d: 'Correct inaccurate or incomplete information.' },
          { t: 'Deletion', d: 'Request deletion of your personal data, subject to legal retention obligations.' },
          { t: 'Withdraw Consent', d: 'Withdraw consent to processing at any time (e.g. unsubscribe from notifications).' },
        ],
      },
      {
        n: '9', h: 'Policy Changes',
        body: 'We may update this policy from time to time. Material changes will be published on this page with an updated "Last Updated" date. Continued use of the service after publication constitutes acceptance of the updated policy.',
      },
      {
        n: '10', h: 'Contact Us',
        body: 'For any questions, access, correction or deletion requests — contact us:',
        contact: true,
      },
    ],
    deletion: {
      h: 'Data Deletion Request',
      sub: 'Fill in the details below and we will handle your request within 30 days',
      name: 'Full Name',
      email: 'Email',
      company: 'Company Name',
      type: 'Request Type',
      types: ['Delete account & data', 'Access my data', 'Correct my data', 'Other'],
      send: 'Send Request',
      note: 'Your request will be sent directly to our privacy team. We will confirm receipt within 48 hours.',
    },
  },
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

  html,body { margin:0; padding:0; overflow-x:hidden }

  .pp-nav-link { cursor:pointer; transition:opacity .18s }
  .pp-nav-link:hover { opacity:.7 }

  .pp-section { border-top:1px solid oklch(91% 0.008 260); padding:40px 0 }
  .pp-section:first-child { border-top:none }

  .pp-item { padding:14px 0; border-bottom:1px solid oklch(94% 0.006 260) }
  .pp-item:last-child { border-bottom:none }

  .pp-del-input {
    width:100%; box-sizing:border-box;
    border:1.5px solid oklch(91% 0.008 260); border-radius:10px;
    padding:11px 14px; font-size:14px; font-family:inherit;
    color:oklch(18% 0.02 260); background:#fff;
    outline:none; transition:border-color .2s, box-shadow .2s;
  }
  .pp-del-input:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1) }

  .pp-del-btn {
    background:#2563eb; color:#fff; border:none; border-radius:10px;
    padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer;
    font-family:inherit; transition:opacity .2s;
  }
  .pp-del-btn:hover { opacity:.88 }

  @media(max-width:640px) {
    .pp-content { padding:0 24px !important }
    .pp-hero { padding:80px 24px 48px !important }
  }
`

function Section({ s, dir }) {
  return (
    <div className="pp-section">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, flexShrink: 0, minWidth: 20 }}>
          {s.n}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'oklch(18% 0.02 260)', margin: '0 0 16px', letterSpacing: -0.3 }}>
            {s.h}
          </h2>
          {s.body && (
            <p style={{ fontSize: 15, color: 'oklch(45% 0.025 260)', lineHeight: 1.8, margin: '0 0 16px' }}>{s.body}</p>
          )}
          {s.items && (
            <div>
              {s.items.map((item, i) => (
                <div key={i} className="pp-item">
                  <span style={{ fontWeight: 700, color: 'oklch(18% 0.02 260)', fontSize: 14 }}>{item.t}</span>
                  <span style={{ color: 'oklch(45% 0.025 260)', fontSize: 14 }}> — {item.d}</span>
                </div>
              ))}
            </div>
          )}
          {s.contact && (
            <div style={{ marginTop: 8, fontSize: 15, color: 'oklch(45% 0.025 260)', lineHeight: 2 }}>
              <div>📧 <a href="mailto:privacy@celoxai.com" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>privacy@celoxai.com</a></div>
              <div>🌐 <a href="https://celoxai.com" style={{ color: '#2563eb', textDecoration: 'none' }}>celoxai.com</a></div>
              <div>{dir === 'rtl' ? '📍 Celox AI בע"מ, ישראל' : '📍 Celox AI Ltd., Israel'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeletionForm({ t }) {
  const d = t.deletion
  const [form, setForm] = useState({ name: '', email: '', company: '', type: d.types[0] })
  const [sent, setSent] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = e => {
    e.preventDefault()
    const subject = encodeURIComponent(`[Celox AI Privacy Request] ${form.type} — ${form.name}`)
    const body = encodeURIComponent(
      `Request type: ${form.type}\nName: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\nSubmitted via celoxai.com/privacy`
    )
    window.location.href = `mailto:privacy@celoxai.com?subject=${subject}&body=${body}`
    setSent(true)
  }

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'oklch(18% 0.02 260)', marginBottom: 6 }

  return (
    <div style={{ background: 'oklch(97% 0.006 260)', borderRadius: 20, padding: '40px', marginTop: 48 }} id="deletion-request">
      <h2 style={{ fontSize: 22, fontWeight: 900, color: 'oklch(18% 0.02 260)', margin: '0 0 8px', letterSpacing: -0.5 }}>{d.h}</h2>
      <p style={{ fontSize: 15, color: 'oklch(45% 0.025 260)', margin: '0 0 28px', lineHeight: 1.6 }}>{d.sub}</p>

      {sent ? (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '20px 24px', fontSize: 15, fontWeight: 600, color: '#15803d' }}>
          {t.dir === 'rtl' ? '✓ הבקשה נשלחה. בדוק את תוכנת האימייל שלך לאישור השליחה.' : '✓ Request prepared. Check your email client to confirm sending.'}
        </div>
      ) : (
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>{d.name}</label>
              <input className="pp-del-input" required value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label style={labelStyle}>{d.email}</label>
              <input className="pp-del-input" required type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>{d.company}</label>
              <input className="pp-del-input" value={form.company} onChange={set('company')} />
            </div>
            <div>
              <label style={labelStyle}>{d.type}</label>
              <select className="pp-del-input" value={form.type} onChange={set('type')} style={{ cursor: 'pointer' }}>
                {d.types.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <button type="submit" className="pp-del-btn">{d.send}</button>
            <p style={{ fontSize: 12, color: 'oklch(62% 0.015 260)', margin: 0, flex: 1 }}>{d.note}</p>
          </div>
        </form>
      )}
    </div>
  )
}

export default function PrivacyPage() {
  const [lang, setLang] = useState('he')
  const t = T[lang]

  const style = document.getElementById('pp-css')
  if (!style) {
    const s = document.createElement('style')
    s.id = 'pp-css'
    s.textContent = CSS
    document.head.appendChild(s)
  }

  return (
    <div style={{ fontFamily: "'Heebo', Arial, sans-serif", direction: t.dir, background: 'oklch(99% 0.004 260)', color: 'oklch(18% 0.02 260)', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'oklch(99% 0.004 260)', borderBottom: '1px solid oklch(91% 0.008 260)', padding: '0 48px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <CeloxIcon size={26} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'oklch(18% 0.02 260)', letterSpacing: -0.3 }}>
            Celox <span style={{ color: '#2563eb' }}>AI</span>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/" className="pp-nav-link" style={{ fontSize: 13, fontWeight: 500, color: 'oklch(45% 0.025 260)', textDecoration: 'none' }}>
            {t.nav.home} ←
          </a>
          <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            style={{ background: 'oklch(97% 0.006 260)', border: '1px solid oklch(91% 0.008 260)', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'oklch(45% 0.025 260)', letterSpacing: .8 }}>
            {t.langBtn}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="pp-hero" style={{ background: 'oklch(8% 0.015 260)', padding: '80px 64px 56px', direction: t.dir }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 30, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
            {t.hero.badge}
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: -1.5, lineHeight: 1.1 }}>{t.hero.title}</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: 0 }}>{t.hero.updated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="pp-content" style={{ maxWidth: 800, margin: '0 auto', padding: '0 64px 80px' }}>
        <div style={{ paddingTop: 8 }}>
          {t.sections.map((s, i) => <Section key={i} s={s} dir={t.dir} />)}
        </div>
        <DeletionForm t={t} />
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid oklch(91% 0.008 260)', padding: '24px 64px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'oklch(62% 0.015 260)', margin: 0 }}>
          © 2026 Celox AI · <a href="/" style={{ color: 'oklch(62% 0.015 260)' }}>{t.dir === 'rtl' ? 'דף הבית' : 'Home'}</a>
        </p>
      </footer>
    </div>
  )
}
