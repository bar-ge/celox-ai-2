import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

const C = {
  navBg: '#0f172a', primary: '#0891b2', bg: '#f1f5f9', surface: '#ffffff',
  border: '#e2e8f0', text: '#0f172a', textSub: '#475569', textMuted: '#94a3b8',
  danger: '#ef4444', success: '#10b981', warning: '#f59e0b',
}

const inp = {
  width: '100%', padding: '10px 14px', border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  color: C.text, background: '#f8fafc', fontFamily: 'inherit',
}
const lbl = { fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5, display: 'block' }
const field = { marginBottom: 16 }
const section = { background: C.surface, borderRadius: 12, padding: '20px 20px 8px', marginBottom: 16, border: `1px solid ${C.border}` }
const sectionTitle = { fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }
const checkRow = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }

// ── Form type labels ──────────────────────────────────────────────────────────
const FORM_META = {
  car_checklist:    { icon: '📋', title: 'רשימת בדיקה לרכב חדש', en: 'New Company Car Checklist' },
  driver_car_check: { icon: '🚗', title: 'בדיקת רכב על ידי נהג', en: 'Driver Vehicle Check' },
  yearly_training:  { icon: '🎓', title: 'אימות הדרכה שנתית', en: 'Yearly Training Acknowledgment' },
}

// ── File upload helper ────────────────────────────────────────────────────────
async function uploadFiles(files, companyId, formLinkId) {
  const uploaded = []
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const path = `form-submissions/${companyId}/${formLinkId}/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('fleet-documents').upload(path, file)
    if (!error) {
      const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(path, 60 * 60 * 24 * 365)
      uploaded.push({ name: file.name, url: data?.signedUrl || path, path })
    }
  }
  return uploaded
}

// ── File Attachments Component ────────────────────────────────────────────────
function FileAttachments({ files, onAdd, onRemove }) {
  const fileRef = useRef()

  function handlePick(e) {
    const picked = Array.from(e.target.files)
    if (picked.length) onAdd(picked)
    e.target.value = ''
  }

  return (
    <div style={section}>
      <div style={sectionTitle}>📎 קבצים מצורפים</div>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: 'relative', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', width: 84, height: 84, flexShrink: 0 }}>
              {f.type.startsWith('image/')
                ? <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 4 }}>
                    <span style={{ fontSize: 26 }}>{f.type.includes('pdf') ? '📄' : '📎'}</span>
                    <span style={{ fontSize: 9, color: C.textSub, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 6px' }}>{f.name}</span>
                  </div>
                )
              }
              <button
                type="button"
                onClick={() => onRemove(i)}
                style={{ position: 'absolute', top: 3, right: 3, background: C.danger, color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontWeight: 900 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: '18px', textAlign: 'center', cursor: 'pointer', background: C.bg, transition: 'border-color 0.15s' }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
        <div style={{ color: C.textSub, fontSize: 14, fontWeight: 600 }}>לחץ להוספת קבצים</div>
        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>תמונות, PDF, Word, Excel — ניתן לבחור מספר קבצים</div>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={handlePick}
      />
    </div>
  )
}

// ── Car Checklist Form ────────────────────────────────────────────────────────
function CarChecklistForm({ link, onSubmit, submitting }) {
  const car = link.car || {}
  const [form, setForm] = useState({
    plate: car.plate || '',
    make:  car.make  || '',
    model: car.model || '',
    year:  car.year  || '',
    // Insurance
    insurance_provider: '', insurance_policy: '', insurance_expiry: '',
    // Toll
    has_toll: '', toll_providers: [], toll_tag: '',
    // Annual test
    test_date: '', test_next: '', test_passed: '',
    // Registration
    registration_expiry: '',
    // Mileage
    mileage: '',
    // Notes
    notes: '', submitter_name: '',
  })
  const [files, setFiles] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    const attachments = await uploadFiles(files, link.company_id, link.id)
    onSubmit({ ...form, attachments })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        <div style={sectionTitle}>👤 שם הממלא</div>
        <div style={field}>
          <label style={lbl}>שם מלא *</label>
          <input style={inp} required value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="ישראל ישראלי" />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🚗 פרטי הרכב</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>לוחית רישוי *</label>
            <input style={inp} required value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="123-45-678" />
          </div>
          <div style={field}>
            <label style={lbl}>שנה</label>
            <input style={inp} type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
          </div>
          <div style={field}>
            <label style={lbl}>יצרן</label>
            <input style={inp} value={form.make} onChange={e => set('make', e.target.value)} placeholder="טויוטה" />
          </div>
          <div style={field}>
            <label style={lbl}>דגם</label>
            <input style={inp} value={form.model} onChange={e => set('model', e.target.value)} placeholder="קורולה" />
          </div>
        </div>
        <div style={field}>
          <label style={lbl}>קילומטראז' נוכחי</label>
          <input style={inp} type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="50000" />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🛡️ ביטוח</div>
        <div style={field}>
          <label style={lbl}>חברת ביטוח</label>
          <input style={inp} value={form.insurance_provider} onChange={e => set('insurance_provider', e.target.value)} placeholder="מגדל / הפניקס / כלל..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>מספר פוליסה</label>
            <input style={inp} value={form.insurance_policy} onChange={e => set('insurance_policy', e.target.value)} />
          </div>
          <div style={field}>
            <label style={lbl}>תאריך תפוגה</label>
            <input style={inp} type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🛣️ נתיבי תשלום</div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          {[['yes', 'יש חברות'], ['no', 'אין חברות']].map(([v, l]) => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="has_toll" value={v} checked={form.has_toll === v} onChange={() => set('has_toll', v)} />
              {l}
            </label>
          ))}
        </div>
        {form.has_toll === 'yes' && (
          <>
            <div style={{ ...field, marginBottom: 14 }}>
              <label style={lbl}>חברות / כבישים (ניתן לבחור מספר)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                {['כביש 6', 'כביש 6 צפון', 'מנהרות הכרמל', 'נתיב המהיר', 'גשר ירדן', 'מנהרת בית קשת', 'אחר'].map(v => {
                  const checked = form.toll_providers.includes(v)
                  return (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: `2px solid ${checked ? C.primary : C.border}`, cursor: 'pointer', background: checked ? C.primary + '10' : '#f8fafc', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={() => set('toll_providers', checked ? form.toll_providers.filter(x => x !== v) : [...form.toll_providers, v])} style={{ accentColor: C.primary, width: 15, height: 15 }} />
                      <span style={{ fontSize: 13, color: C.text, fontWeight: checked ? 700 : 400 }}>{v}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={field}>
              <label style={lbl}>מספר תג / חשבון</label>
              <input style={inp} value={form.toll_tag} onChange={e => set('toll_tag', e.target.value)} placeholder="12345678" />
            </div>
          </>
        )}
      </div>

      <div style={section}>
        <div style={sectionTitle}>🔧 טסט שנתי</div>
        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
          {[['yes', 'עבר טסט'], ['no', 'לא עבר']].map(([v, l]) => (
            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" name="test_passed" value={v} checked={form.test_passed === v} onChange={() => set('test_passed', v)} />
              {l}
            </label>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>תאריך טסט אחרון</label>
            <input style={inp} type="date" value={form.test_date} onChange={e => set('test_date', e.target.value)} />
          </div>
          <div style={field}>
            <label style={lbl}>טסט הבא</label>
            <input style={inp} type="date" value={form.test_next} onChange={e => set('test_next', e.target.value)} />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📄 רישיון רכב</div>
        <div style={field}>
          <label style={lbl}>תאריך תפוגת רישיון רכב</label>
          <input style={inp} type="date" value={form.registration_expiry} onChange={e => set('registration_expiry', e.target.value)} />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📝 הערות</div>
        <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערות נוספות..." />
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#0891b2,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '✅ שלח טופס'}
      </button>
    </form>
  )
}

// ── Driver Car Check Form ─────────────────────────────────────────────────────
function DriverCarCheckForm({ link, onSubmit, submitting }) {
  const car    = link.car    || {}
  const driver = link.driver || {}
  const [form, setForm] = useState({
    submitter_name: driver.name || '',
    plate:          car.plate   || '',
    mileage: '', fuel_level: '', exterior_damage: '', damage_desc: '',
    interior_ok: '', notes: '',
  })
  const [files, setFiles] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    const attachments = await uploadFiles(files, link.company_id, link.id)
    onSubmit({ ...form, attachments })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        <div style={sectionTitle}>👤 פרטי הנהג</div>
        <div style={field}>
          <label style={lbl}>שם הנהג *</label>
          <input style={inp} required value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="ישראל ישראלי" />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🚗 פרטי הרכב</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>לוחית רישוי *</label>
            <input style={inp} required value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="123-45-678" />
          </div>
          <div style={field}>
            <label style={lbl}>קילומטראז' נוכחי *</label>
            <input style={inp} required type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="50000" />
          </div>
        </div>
        <div style={field}>
          <label style={lbl}>רמת דלק</label>
          <select style={inp} value={form.fuel_level} onChange={e => set('fuel_level', e.target.value)}>
            <option value="">בחר...</option>
            {['ריק', 'רבע', 'חצי', 'שלושה רבעים', 'מלא'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🔍 מצב הרכב</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...lbl, marginBottom: 10 }}>נזקים חיצוניים</label>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['no', 'ללא נזקים'], ['yes', 'יש נזקים']].map(([v, l]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="exterior_damage" value={v} checked={form.exterior_damage === v} onChange={() => set('exterior_damage', v)} />
                {l}
              </label>
            ))}
          </div>
          {form.exterior_damage === 'yes' && (
            <textarea style={{ ...inp, minHeight: 60, marginTop: 10, resize: 'vertical' }}
              value={form.damage_desc} onChange={e => set('damage_desc', e.target.value)}
              placeholder="תאר את הנזקים..." />
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...lbl, marginBottom: 10 }}>מצב הפנים</label>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['ok', 'תקין'], ['dirty', 'מלוכלך'], ['damaged', 'פגום']].map(([v, l]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="radio" name="interior_ok" value={v} checked={form.interior_ok === v} onChange={() => set('interior_ok', v)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📝 הערות</div>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערות נוספות..." />
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#0891b2,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '✅ שלח דוח בדיקה'}
      </button>
    </form>
  )
}

// ── Yearly Training Form ──────────────────────────────────────────────────────
const TRAINING_TOPICS = [
  'נהיגה בטוחה וזהירה',
  'כללי עייפות ומנוחה',
  'חוקי תנועה עדכניים',
  'טיפול בתאונות ואירועים',
  'שימוש נכון ברכב החברה',
  'מדיניות אלכוהול וסמים',
  'בדיקות רכב לפני נסיעה',
  'נהיגה בתנאי מזג אוויר קיצוניים',
]

function YearlyTrainingForm({ link, onSubmit, submitting }) {
  const driver = link.driver || {}
  const [form, setForm] = useState({
    submitter_name: driver.name    || '',
    driver_license: driver.license || '',
    training_date: new Date().toISOString().slice(0, 10),
    trainer_name: '', topics: [], other_topic: '', confirmed: false,
  })
  const [files, setFiles] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleTopic(t) {
    setForm(f => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.confirmed) { alert('יש לאשר קריאת ההצהרה'); return }
    const attachments = await uploadFiles(files, link.company_id, link.id)
    onSubmit({ ...form, attachments })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        <div style={sectionTitle}>👤 פרטי הנהג</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>שם הנהג *</label>
            <input style={inp} required value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="ישראל ישראלי" />
          </div>
          <div style={field}>
            <label style={lbl}>מספר רישיון נהיגה</label>
            <input style={inp} value={form.driver_license} onChange={e => set('driver_license', e.target.value)} placeholder="1234567" />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📅 פרטי ההדרכה</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>תאריך הדרכה *</label>
            <input style={inp} required type="date" value={form.training_date} onChange={e => set('training_date', e.target.value)} />
          </div>
          <div style={field}>
            <label style={lbl}>שם המדריך</label>
            <input style={inp} value={form.trainer_name} onChange={e => set('trainer_name', e.target.value)} placeholder="שם המדריך" />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>📚 נושאים שנלמדו</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {TRAINING_TOPICS.map(t => (
            <label key={t} style={{ ...checkRow, cursor: 'pointer', padding: '6px 8px', borderRadius: 7, background: form.topics.includes(t) ? C.primary + '12' : 'transparent' }}>
              <input type="checkbox" checked={form.topics.includes(t)} onChange={() => toggleTopic(t)}
                style={{ accentColor: C.primary, width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: C.text }}>{t}</span>
            </label>
          ))}
        </div>
        <div style={{ ...field, marginTop: 12 }}>
          <label style={lbl}>נושא נוסף</label>
          <input style={inp} value={form.other_topic} onChange={e => set('other_topic', e.target.value)} placeholder="נושא נוסף שנלמד..." />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>✍️ הצהרה ואישור</div>
        <div style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: C.textSub }}>
          אני מצהיר/ה כי השתתפתי בהדרכה הנ"ל, קראתי והבנתי את כל הנושאים שנסקרו, ואני מתחייב/ת לנהוג בהתאם למדיניות החברה ולכללי הנהיגה הבטוחה.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)}
            style={{ accentColor: C.primary, width: 20, height: 20 }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>אני מאשר/ת את ההצהרה לעיל *</span>
        </label>
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      <button type="submit" disabled={submitting || !form.confirmed} style={{ width: '100%', background: form.confirmed ? 'linear-gradient(135deg,#0891b2,#6366f1)' : C.border, color: form.confirmed ? '#fff' : C.textMuted, border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: (!submitting && form.confirmed) ? 'pointer' : 'not-allowed', marginTop: 4, transition: 'all 0.2s' }}>
        {submitting ? '…שולח' : '✅ אשר וחתום'}
      </button>
    </form>
  )
}

// ── Public Form Page (root) ───────────────────────────────────────────────────
export default function PublicForm({ token }) {
  const [link,       setLink]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .rpc('get_active_form_link', { p_token: token })
      if (error || !data) { setError('הטופס לא נמצא או שאינו פעיל.'); setLoading(false); return }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('תוקף הטופס פג.'); setLoading(false); return
      }
      setLink(data)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSubmit(data) {
    setSubmitting(true)
    const { data: inserted, error } = await supabase.from('form_submissions').insert({
      form_link_id: link.id,
      company_id: link.company_id,
      type: link.type,
      submitter_name: data.submitter_name || '',
      data,
    }).select('id').single()
    if (error) { alert('שגיאה בשליחה: ' + error.message); setSubmitting(false); return }

    // Auto-create cost records for insurance / toll from car checklist
    if (link.type === 'car_checklist' && link.car_id && inserted?.id) {
      await supabase.rpc('create_costs_from_checklist', { p_submission_id: inserted.id })
    }

    setDone(true)
    setSubmitting(false)
  }

  const meta = link ? FORM_META[link.type] : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ background: C.navBg, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0891b2,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 26 26" fill="none"><rect x="2" y="15" width="22" height="7" rx="3.5" fill="white" fillOpacity="0.9"/><rect x="6" y="10" width="14" height="7" rx="2" fill="white"/><circle cx="7.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/><circle cx="18.5" cy="22" r="2.5" fill="white" fillOpacity="0.6"/><rect x="10" y="6" width="6" height="5" rx="1" fill="white" fillOpacity="0.7"/></svg>
        </div>
        <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: 17 }}>Celox AI</span>
      </div>

      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 60px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.textMuted, fontSize: 15 }}>טוען...</div>
        )}

        {!loading && error && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, textAlign: 'center', marginTop: 40, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.danger }}>{error}</div>
          </div>
        )}

        {!loading && done && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 40, textAlign: 'center', marginTop: 40, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.success, marginBottom: 8 }}>הטופס נשלח בהצלחה!</div>
            <div style={{ fontSize: 14, color: C.textSub }}>תודה על מילוי הטופס. הנתונים נקלטו במערכת.</div>
          </div>
        )}

        {!loading && link && !done && !error && (
          <>
            {/* Form header */}
            <div style={{ background: C.surface, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{meta?.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 4 }}>{link.title || meta?.title}</div>
            </div>

            {link.type === 'car_checklist'    && <CarChecklistForm    link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'driver_car_check' && <DriverCarCheckForm  link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'yearly_training'  && <YearlyTrainingForm  link={link} onSubmit={handleSubmit} submitting={submitting} />}
          </>
        )}
      </div>
    </div>
  )
}
