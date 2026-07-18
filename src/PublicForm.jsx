import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Public-form client: custom fetch forces the anon key on every request so a
// stale authenticated session stored in Safari/localStorage can never cause 401.
const _ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  _ANON,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options = {}) => {
        const headers = new Headers(options.headers || {})
        headers.set('apikey', _ANON)
        headers.set('Authorization', `Bearer ${_ANON}`)
        return fetch(url, { ...options, headers })
      },
    },
  }
)
import { isEmpty, isIsraeliPlate, isIsraeliPhone, isMinLen, isDriverLicense, isYear, isPositive } from './validators'

function checkClientRateLimit(key, max, windowMs = 3_600_000) {
  try {
    const now    = Date.now()
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (stored && now - stored.t < windowMs) {
      if (stored.n >= max) return false
      localStorage.setItem(key, JSON.stringify({ t: stored.t, n: stored.n + 1 }))
    } else {
      localStorage.setItem(key, JSON.stringify({ t: now, n: 1 }))
    }
  } catch { /* localStorage unavailable */ }
  return true
}

const C = {
  navBg: '#0f172a', primary: '#2563eb', bg: '#f1f5f9', surface: '#ffffff',
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
  accident_report:  { icon: '🚨', title: 'דוח תאונה', en: 'Accident Report' },
  custom:           { icon: '📝', title: 'טופס מותאם אישית', en: 'Custom Form' },
  license_agreement: { icon: '📄', title: 'הסכם רישיון שימוש', en: 'License Agreement' },
  periodic_inspection: { icon: '🔍', title: 'בדיקת רכב תקופתית', en: 'Periodic Vehicle Inspection' },
}

// ── File upload helper ────────────────────────────────────────────────────────
async function uploadFiles(files, companyId, formLinkId) {
  const uploaded = []
  const failed = []
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const path = `form-submissions/${companyId}/${formLinkId}/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('fleet-documents').upload(path, file)
    if (error) { console.error('[upload]', file.name, error); failed.push(file.name); continue }
    const { data } = await supabase.storage.from('fleet-documents').createSignedUrl(path, 60 * 60 * 24 * 365)
    uploaded.push({ name: file.name, url: data?.signedUrl || path, path })
  }
  // Surface failures loudly — never let the form report success with silently dropped files.
  if (failed.length) {
    const err = new Error(`נכשלה העלאת ${failed.length} קבצים (${failed.join(', ')}). בדוק את החיבור ונסה שוב.`)
    err.uploaded = uploaded
    throw err
  }
  return uploaded
}

// ── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef()
  const drawing   = useRef(false)
  const lastPos   = useRef(null)

  function getPos(e) {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const touch  = e.touches?.[0] || e
    return {
      x: (touch.clientX - rect.left)  * (canvas.width  / rect.width),
      y: (touch.clientY - rect.top)   * (canvas.height / rect.height),
    }
  }
  function startDraw(e) { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e) }
  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    onChange(canvasRef.current.toDataURL('image/png'))
  }
  function endDraw() { drawing.current = false; lastPos.current = null }
  function clear() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div style={field}>
      <label style={lbl}>חתימה דיגיטלית</label>
      <div style={{ position: 'relative', border: `2px solid ${value ? C.primary : C.border}`, borderRadius: 8, overflow: 'hidden', background: '#fafafa', transition: 'border-color 0.2s' }}>
        <canvas
          ref={canvasRef} width={560} height={120}
          style={{ width: '100%', height: 120, cursor: 'crosshair', display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        <button type="button" onClick={clear} style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: C.textSub }}>
          נקה
        </button>
        {!value && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: C.textMuted, fontSize: 13 }}>
            ✍️ חתום כאן
          </div>
        )}
      </div>
    </div>
  )
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
  const [formError, setFormError] = useState('')
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
    setFormError('')
    if (!isMinLen(form.submitter_name, 2)) { setFormError('נא להזין שם מלא (לפחות 2 תווים)'); return }
    if (isEmpty(form.plate)) { setFormError('נא להזין מספר לוחית רישוי'); return }
    if (!isIsraeliPlate(form.plate)) { setFormError('לוחית רישוי לא תקינה (7–8 ספרות)'); return }
    if (form.year && !isYear(form.year)) { setFormError('שנת ייצור לא תקינה (1900–2099)'); return }
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
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

      {formError && <div role="alert" style={{ margin: '8px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: C.danger }}>{formError}</div>}

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#2563eb,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '✅ שלח טופס'}
      </button>
    </form>
  )
}

// ── Driver Car Check Form ─────────────────────────────────────────────────────
const EQUIPMENT_ITEMS = [
  { key: 'lights',     label: '💡 תאורה (פנסים, בלמים, חיווי)' },
  { key: 'brakes',     label: '🛑 בלמים (תקינות פדל)' },
  { key: 'tires',      label: '🔘 צמיגים (לחץ ומצב)' },
  { key: 'extinguisher', label: '🧯 מטף כיבוי אש' },
  { key: 'triangles',  label: '⚠️ משולשי אזהרה (2 יחידות)' },
  { key: 'first_aid',  label: '🩹 ערכת עזרה ראשונה' },
  { key: 'documents',  label: '📄 מסמכי רכב (רישיון, ביטוח)' },
  { key: 'wipers',     label: '🌧️ מגבי שמשה קדמיים ואחוריים' },
]

// Tachograph daily checks — traffic regulation 364d. Shown only for vehicles the
// fleet manager flagged as tachograph-obligated (cars.tachograph_required).
// Each of these is a separate 750₪ + 8-point offence if missed.
const TACHOGRAPH_ITEMS = [
  { key: 'disc_replaced',   label: '⏱️ הדיסקה הוחלפה ב‑24 השעות האחרונות' },
  { key: 'disc_details',    label: '✍️ פרטי הנהג, שעת התחלה ומד האוץ מולאו על הדיסקה' },
  { key: 'disc_spare',      label: '🗂️ קיימת דיסקה רזרבית ברכב' },
  { key: 'disc_clean',      label: '🧼 הדיסקה נקייה ותקינה (ללא קרעים/לכלוך)' },
  { key: 'device_working',  label: '⚙️ הטכוגרף תקין ופועל' },
  { key: 'calibration_cert', label: '📜 אישור כיול בתוקף נמצא ברכב' },
]

function DriverCarCheckForm({ link, onSubmit, submitting }) {
  const car    = link.car    || {}
  const driver = link.driver || {}
  const needsTacho = !!car.tachograph_required
  const [form, setForm] = useState({
    submitter_name:  driver.name || '',
    plate:           car.plate   || '',
    handover_type:   'taking',
    mileage_before:  '', mileage_after: '',
    fuel_level:      '',
    exterior_damage: '', damage_desc: '',
    interior_ok:     '',
    equipment:       {},
    // Seeded with every key false so an unticked item is recorded as an explicit
    // "no" rather than vanishing from the submission — the whole point is proving
    // what was checked on a given day.
    tachograph:      needsTacho ? Object.fromEntries(TACHOGRAPH_ITEMS.map(i => [i.key, false])) : {},
    notes:           '',
    signature:       '',
  })
  const [files, setFiles] = useState([])
  const [formError, setFormError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setEquip = (k, v) => setForm(f => ({ ...f, equipment: { ...f.equipment, [k]: v } }))
  const setTacho = (k, v) => setForm(f => ({ ...f, tachograph: { ...f.tachograph, [k]: v } }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!isMinLen(form.submitter_name, 2)) { setFormError('נא להזין שם מלא (לפחות 2 תווים)'); return }
    if (isEmpty(form.plate)) { setFormError('נא להזין מספר לוחית רישוי'); return }
    if (!isIsraeliPlate(form.plate)) { setFormError('לוחית רישוי לא תקינה (7–8 ספרות)'); return }
    const km = form.handover_type === 'taking' ? form.mileage_before : form.mileage_after
    if (km && !isPositive(km)) { setFormError('קילומטראז׳ חייב להיות מספר חיובי'); return }
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
    onSubmit({ ...form, attachments })
  }

  const isTaking   = form.handover_type === 'taking'
  const isReturning = form.handover_type === 'returning'

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
        <div style={sectionTitle}>🔄 סוג מסירה</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[['taking', '📥 קבלת רכב'], ['returning', '📤 החזרת רכב']].map(([v, l]) => (
            <label key={v} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 16px', borderRadius: 10, border: `2px solid ${form.handover_type === v ? C.primary : C.border}`, background: form.handover_type === v ? C.primary + '10' : C.surface, fontSize: 14, fontWeight: 700 }}>
              <input type="radio" name="handover_type" value={v} checked={form.handover_type === v} onChange={() => set('handover_type', v)} style={{ accentColor: C.primary }} />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🚗 פרטי הרכב</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>לוחית רישוי *</label>
            <input style={inp} required value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="123-45-678" />
          </div>
          {isTaking && (
            <div style={field}>
              <label style={lbl}>קילומטראז' בקבלה</label>
              <input style={inp} type="number" min="0" value={form.mileage_before} onChange={e => set('mileage_before', e.target.value)} placeholder="50000" />
            </div>
          )}
          {isReturning && (
            <div style={field}>
              <label style={lbl}>קילומטראז' בהחזרה</label>
              <input style={inp} type="number" min="0" value={form.mileage_after} onChange={e => set('mileage_after', e.target.value)} placeholder="51000" />
            </div>
          )}
        </div>
        <div style={field}>
          <label style={lbl}>רמת דלק</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ריק', 'רבע', 'חצי', '¾', 'מלא'].map(v => (
              <label key={v} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, border: `2px solid ${form.fuel_level === v ? C.primary : C.border}`, background: form.fuel_level === v ? C.primary + '10' : C.surface, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: form.fuel_level === v ? C.primary : C.textSub }}>
                <input type="radio" name="fuel_level" value={v} checked={form.fuel_level === v} onChange={() => set('fuel_level', v)} style={{ display: 'none' }} />
                {v}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>✅ בדיקת ציוד ומערכות</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {EQUIPMENT_ITEMS.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${form.equipment[key] ? C.success + '60' : C.border}`, background: form.equipment[key] ? C.success + '08' : 'transparent', cursor: 'pointer' }}
              onClick={() => setEquip(key, !form.equipment[key])}>
              <input type="checkbox" checked={!!form.equipment[key]} onChange={() => setEquip(key, !form.equipment[key])} style={{ accentColor: C.success, width: 17, height: 17, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.text, userSelect: 'none' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {needsTacho && (
        <div style={section}>
          <div style={sectionTitle}>⏱️ טכוגרף (תקנה 364ד)</div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12, lineHeight: 1.6 }}>
            כל פריט שאינו מסומן הוא עבירה נפרדת — 750₪ ו‑8 נקודות.
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {TACHOGRAPH_ITEMS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${form.tachograph[key] ? C.success + '60' : C.border}`, background: form.tachograph[key] ? C.success + '08' : 'transparent', cursor: 'pointer' }}
                onClick={() => setTacho(key, !form.tachograph[key])}>
                <input type="checkbox" checked={!!form.tachograph[key]} onChange={() => setTacho(key, !form.tachograph[key])} style={{ accentColor: C.success, width: 17, height: 17, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.text, userSelect: 'none' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div style={section}>
        <div style={sectionTitle}>✍️ חתימת הנהג</div>
        <SignaturePad value={form.signature} onChange={v => set('signature', v)} />
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      {formError && (
        <div style={{ padding: '10px 14px', background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, color: C.danger, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          ⚠ {formError}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#2563eb,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : isTaking ? '✅ אשר קבלת רכב' : '✅ אשר החזרת רכב'}
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
    trainer_name: '', topics: [], other_topic: '', confirmed: false, signature: '',
  })
  const [files, setFiles] = useState([])
  const [formError, setFormError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleTopic(t) {
    setForm(f => ({
      ...f,
      topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!isMinLen(form.submitter_name, 2)) { setFormError('נא להזין שם מלא (לפחות 2 תווים)'); return }
    if (form.driver_license && !isDriverLicense(form.driver_license)) { setFormError('מספר רישיון נהיגה לא תקין'); return }
    if (isEmpty(form.training_date)) { setFormError('נא לבחור תאריך הכשרה'); return }
    if (!form.confirmed) { setFormError('יש לאשר קריאת ההצהרה לפני השליחה'); return }
    if (!form.signature) { setFormError('יש להוסיף חתימה דיגיטלית לפני השליחה'); return }
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
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

      <div style={section}>
        <div style={sectionTitle}>✍️ חתימה דיגיטלית</div>
        <SignaturePad value={form.signature} onChange={v => set('signature', v)} />
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      {formError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 8, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
          ⚠ {formError}
        </div>
      )}
      <button type="submit" disabled={submitting || !form.confirmed} style={{ width: '100%', background: form.confirmed ? 'linear-gradient(135deg,#2563eb,#6366f1)' : C.border, color: form.confirmed ? '#fff' : C.textMuted, border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: (!submitting && form.confirmed) ? 'pointer' : 'not-allowed', marginTop: 4, transition: 'all 0.2s' }}>
        {submitting ? '…שולח' : '✅ אשר וחתום'}
      </button>
    </form>
  )
}

// ── Custom Form (dynamic field renderer) ─────────────────────────────────────
function CustomForm({ link, onSubmit, submitting }) {
  const fields = link.fields || []
  const [values, setValues] = useState(() => {
    const init = {}
    fields.forEach(f => {
      const key = f.type === 'preset' ? f.preset : f.id
      init[key] = f.type === 'checkbox' || (f.type === 'preset' && f.preset === 'signature') ? false : ''
    })
    return init
  })
  const [files, setFiles] = useState([])
  const [formError, setFormError] = useState('')
  const set = (key, v) => setValues(p => ({ ...p, [key]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    for (const f of fields) {
      const key = f.type === 'preset' ? f.preset : f.id
      const val = values[key]
      if (f.required && (val === '' || val === false || val == null)) {
        setFormError(`שדה "${f.label}" הוא חובה`)
        return
      }
    }
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
    const data = {}
    fields.forEach(f => {
      const key = f.type === 'preset' ? f.preset : f.id
      const storageKey = f.type === 'preset' ? f.preset : f.label
      data[storageKey] = values[key]
    })
    data.attachments = attachments
    onSubmit({ ...data, submitter_name: data.submitter_name || data['שם הממלא'] || data['Full Name'] || '' })
  }

  function renderInput(f) {
    const key = f.type === 'preset' ? f.preset : f.id
    const val = values[key]

    if (f.type === 'preset') {
      switch (f.preset) {
        case 'submitter_name': return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} placeholder="ישראל ישראלי" />
        case 'plate':          return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} placeholder="123-456-78" dir="ltr" />
        case 'driver_license': return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} placeholder="1234567" />
        case 'phone':          return <input style={{ ...inp, direction: 'ltr' }} type="tel" value={val} onChange={e => set(key, e.target.value)} required={f.required} placeholder="050-1234567" />
        case 'mileage':        return <input style={inp} type="number" value={val} onChange={e => set(key, e.target.value)} required={f.required} placeholder="0" min="0" />
        case 'date':           return <input style={inp} type="date" value={val} onChange={e => set(key, e.target.value)} required={f.required} />
        case 'fuel_level':
          return (
            <select style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required}>
              <option value="">— בחר —</option>
              {['ריק','רבע','חצי','שלושה רבעים','מלא'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )
        case 'notes':
          return <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={val} onChange={e => set(key, e.target.value)} />
        case 'signature':
          return (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
              <input type="checkbox" checked={!!val} onChange={e => set(key, e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: C.primary, flexShrink: 0 }} required={f.required} />
              <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{f.label}</span>
            </label>
          )
        default: return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} />
      }
    }

    switch (f.type) {
      case 'text':     return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} />
      case 'textarea': return <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={val} onChange={e => set(key, e.target.value)} required={f.required} />
      case 'number':   return <input style={inp} type="number" value={val} onChange={e => set(key, e.target.value)} required={f.required} />
      case 'date':     return <input style={inp} type="date" value={val} onChange={e => set(key, e.target.value)} required={f.required} />
      case 'select':
        return (
          <select style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required}>
            <option value="">— בחר —</option>
            {(f.options || []).filter(Boolean).map((o, i) => <option key={i} value={o}>{o}</option>)}
          </select>
        )
      case 'yesno':
        return (
          <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
            {['כן', 'לא'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name={`field_${key}`} value={opt} checked={val === opt} onChange={() => set(key, opt)} required={f.required} style={{ accentColor: C.primary, width: 16, height: 16 }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>{opt}</span>
              </label>
            ))}
          </div>
        )
      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
            <input type="checkbox" checked={!!val} onChange={e => set(key, e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: C.primary, flexShrink: 0 }} required={f.required} />
            <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{f.label}</span>
          </label>
        )
      default: return <input style={inp} value={val} onChange={e => set(key, e.target.value)} required={f.required} />
    }
  }

  if (!fields.length) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.textMuted }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>הטופס אינו מכיל שדות</div>
    </div>
  )

  const isCheckboxLike = f => (f.type === 'checkbox') || (f.type === 'preset' && f.preset === 'signature')

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        {fields.map(f => (
          <div key={f.id} style={isCheckboxLike(f) ? { marginBottom: 10, paddingTop: 4 } : field}>
            {!isCheckboxLike(f) && (
              <label style={lbl}>{f.label}{f.required ? ' *' : ''}</label>
            )}
            {renderInput(f)}
          </div>
        ))}
      </div>

      <FileAttachments files={files} onAdd={picked => setFiles(p => [...p, ...picked])} onRemove={i => setFiles(p => p.filter((_, j) => j !== i))} />

      {formError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 8, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
          ⚠ {formError}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#2563eb,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '✅ שלח טופס'}
      </button>
    </form>
  )
}

// ── Accident Report Form (driver at scene) ───────────────────────────────────
function AccidentReportPublicForm({ link, onSubmit, submitting }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    submitter_name: '', my_plate: '', my_make: '', my_model: '',
    incident_date: today, incident_location: '', description: '',
    other_plate: '', other_make: '', other_model: '',
    other_driver_name: '', other_driver_phone: '',
    police_report: '', called_ambulance: '',
  })
  const [files, setFiles] = useState([])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
    onSubmit({ ...form, attachments })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        <div style={sectionTitle}>👤 פרטי הנהג המדווח</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ ...field, gridColumn: '1 / -1' }}>
            <label style={lbl}>שם מלא *</label>
            <input style={inp} required value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="ישראל ישראלי" />
          </div>
          <div style={field}>
            <label style={lbl}>לוחית רישוי שלי *</label>
            <input style={{ ...inp, direction: 'ltr' }} required value={form.my_plate} onChange={e => set('my_plate', e.target.value)} placeholder="123-45-678" />
          </div>
          <div style={field}>
            <label style={lbl}>תאריך האירוע</label>
            <input style={inp} type="date" value={form.incident_date} onChange={e => set('incident_date', e.target.value)} />
          </div>
          <div style={field}>
            <label style={lbl}>יצרן הרכב שלי</label>
            <input style={inp} value={form.my_make} onChange={e => set('my_make', e.target.value)} placeholder="טויוטה" />
          </div>
          <div style={field}>
            <label style={lbl}>דגם הרכב שלי</label>
            <input style={inp} value={form.my_model} onChange={e => set('my_model', e.target.value)} placeholder="קורולה" />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🚨 פרטי האירוע</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
          <div style={field}>
            <label style={lbl}>האם הוגשה תלונה במשטרה?</label>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              {[['yes', '✅ כן'], ['no', '❌ לא']].map(([v, l]) => (
                <label key={v} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', borderRadius: 8, border: `2px solid ${form.police_report === v ? (v === 'yes' ? C.success : C.danger) : C.border}`, cursor: 'pointer', background: form.police_report === v ? (v === 'yes' ? C.success + '15' : C.danger + '12') : C.bg, transition: 'all 0.15s', fontSize: 13, fontWeight: 700 }}>
                  <input type="radio" name="police_report" value={v} checked={form.police_report === v} onChange={() => set('police_report', v)} style={{ display: 'none' }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div style={field}>
            <label style={lbl}>האם הוזמנה אמבולנס?</label>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              {[['yes', '✅ כן'], ['no', '❌ לא']].map(([v, l]) => (
                <label key={v} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 8px', borderRadius: 8, border: `2px solid ${form.called_ambulance === v ? (v === 'yes' ? C.success : C.danger) : C.border}`, cursor: 'pointer', background: form.called_ambulance === v ? (v === 'yes' ? C.success + '15' : C.danger + '12') : C.bg, transition: 'all 0.15s', fontSize: 13, fontWeight: 700 }}>
                  <input type="radio" name="called_ambulance" value={v} checked={form.called_ambulance === v} onChange={() => set('called_ambulance', v)} style={{ display: 'none' }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={field}>
          <label style={lbl}>מיקום התאונה</label>
          <input style={inp} value={form.incident_location} onChange={e => set('incident_location', e.target.value)} placeholder="כביש 1 ליד צומת..." />
        </div>
        <div style={field}>
          <label style={lbl}>תיאור מה קרה *</label>
          <textarea
            style={{ ...inp, minHeight: 100, resize: 'vertical' }}
            required
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="תאר את האירוע — מה קרה, כיצד, נזקים..."
          />
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>🚘 פרטי הצד השני</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>לוחית רישוי צד שני</label>
            <input style={{ ...inp, direction: 'ltr' }} value={form.other_plate} onChange={e => set('other_plate', e.target.value)} placeholder="987-65-432" />
          </div>
          <div style={field}>
            <label style={lbl}>יצרן</label>
            <input style={inp} value={form.other_make} onChange={e => set('other_make', e.target.value)} placeholder="הונדה" />
          </div>
          <div style={field}>
            <label style={lbl}>דגם</label>
            <input style={inp} value={form.other_model} onChange={e => set('other_model', e.target.value)} placeholder="סיוויק" />
          </div>
          <div style={field}>
            <label style={lbl}>שם הנהג</label>
            <input style={inp} value={form.other_driver_name} onChange={e => set('other_driver_name', e.target.value)} placeholder="שם הנהג השני" />
          </div>
          <div style={{ ...field, gridColumn: '1 / -1' }}>
            <label style={lbl}>טלפון הנהג</label>
            <input style={{ ...inp, direction: 'ltr' }} type="tel" value={form.other_driver_phone} onChange={e => set('other_driver_phone', e.target.value)} placeholder="050-1234567" />
          </div>
        </div>
      </div>

      <FileAttachments
        files={files}
        onAdd={picked => setFiles(p => [...p, ...picked])}
        onRemove={i => setFiles(p => p.filter((_, j) => j !== i))}
      />

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#ef4444,#f59e0b)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '🚨 שלח דוח תאונה'}
      </button>
    </form>
  )
}

// ── License Agreement Form ────────────────────────────────────────────────────
function LicenseAgreementForm({ link, onSubmit, submitting }) {
  const [form, setForm] = useState({
    company_name: '',
    signatory_name: '',
    signatory_role: '',
    id_number: '',
    phone: '',
    email: '',
    sign_date: new Date().toISOString().slice(0, 10),
  })
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed]       = useState(false)
  const [error, setError]         = useState('')

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  function validate() {
    if (!form.company_name.trim())   return 'נא להזין שם חברה / עסק.'
    if (!form.signatory_name.trim()) return 'נא להזין שם מלא של מורשה החתימה.'
    if (!form.id_number.trim())      return 'נא להזין מספר ח.פ. / ת.ז.'
    if (!agreed)                     return 'יש לסמן את תיבת האישור לפני החתימה.'
    if (!signature)                  return 'נא לחתום בשדה החתימה הדיגיטלית.'
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    onSubmit({
      submitter_name: form.signatory_name,
      ...form,
      signature,
      agreed: true,
      signed_at: new Date().toISOString(),
    })
  }

  const AGREEMENT_CLAUSES = [
    { n: '1', t: 'הענקת רישיון', b: 'ניתן רישיון שימוש מוגבל, אישי, בלתי-בלעדי ובלתי-ניתן להעברה לגישה למערכת Celox AI Fleet Manager לצרכים העסקיים הפנימיים של הלקוח בלבד, לתקופת הרישיון שנרכשה.' },
    { n: '2', t: 'בעלות', b: 'המערכת כולה — קוד מקור, עיצוב, אלגוריתמים ומסדי נתונים — היא קניינו הבלעדי של ספק השירות. הסכם זה אינו מעביר כל זכות בעלות ללקוח.' },
    { n: '3', t: 'הגבלות', b: 'אסור לבצע הנדסה לאחור, מכירה, השכרה, מתן רישיון משנה, בניית מוצר מתחרה, גישה לא מורשית לשרתים, או שיתוף גישה עם גורמים בלתי מורשים.' },
    { n: '4', t: 'שירות ענן', b: 'המערכת ניתנת כ-SaaS. הספק אחראי לתחזוקת שרתים, אבטחה ועדכונים. הספק שואף לזמינות של 99% לפחות.' },
    { n: '5', t: 'תשלום', b: 'דמי השימוש ישולמו מראש ואינם ניתנים להחזר אלא אם הוסכם בכתב. אי-תשלום עלול לגרור השעיית גישה לאחר 7 ימי הודעה.' },
    { n: '6', t: 'פרטיות', b: 'הספק מתחייב לפעול בהתאם לחוק הגנת הפרטיות התשמ"א-1981. נתוני הלקוח לא יועברו לצד שלישי אלא לצורך מתן השירות.' },
    { n: '7', t: 'הגבלת אחריות', b: 'המערכת מסופקת "כמות שהיא". הספק לא יישא בנזקים עקיפים או תוצאתיים. האחריות המרבית לא תעלה על 6 חודשי דמי מנוי.' },
    { n: '8', t: 'ביטול', b: 'הספק רשאי לסיים רישיון לאלתר עקב הפרה מהותית, שימוש בלתי חוקי, או אי-תשלום שלא תוקן תוך 14 ימים.' },
    { n: '9', t: 'דין חל', b: 'הסכם זה כפוף לדיני מדינת ישראל. סמכות שיפוט בלעדית לבתי המשפט בתל-אביב-יפו.' },
  ]

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Signatory details */}
      <div style={section}>
        <div style={sectionTitle}>🏢 פרטי הלקוח החותם</div>

        <div style={field}>
          <label style={lbl}>שם חברה / עסק <span style={{ color: '#ef4444' }}>*</span></label>
          <input style={inp} value={form.company_name} onChange={set('company_name')} placeholder="שם החברה או העסק" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>שם מלא מורשה חתימה <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inp} value={form.signatory_name} onChange={set('signatory_name')} placeholder="שם פרטי + שם משפחה" required />
          </div>
          <div style={field}>
            <label style={lbl}>תפקיד</label>
            <input style={inp} value={form.signatory_role} onChange={set('signatory_role')} placeholder="מנכ&quot;ל / מנהל רכש..." />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>מספר ח.פ. / ת.ז. <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inp} value={form.id_number} onChange={set('id_number')} placeholder="000000000" required />
          </div>
          <div style={field}>
            <label style={lbl}>תאריך חתימה</label>
            <div style={{ ...inp, background: '#f8fafc', color: '#64748b', cursor: 'default' }}>
              {form.sign_date ? new Date(form.sign_date + 'T00:00:00').toLocaleDateString('he-IL') : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>טלפון</label>
            <input style={inp} value={form.phone} onChange={set('phone')} placeholder="05X-XXXXXXX" type="tel" />
          </div>
          <div style={field}>
            <label style={lbl}>דואר אלקטרוני</label>
            <input style={inp} value={form.email} onChange={set('email')} placeholder="you@company.com" type="email" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      {(() => {
        const numCars       = link.fields?.num_cars       || 0
        const perCar        = link.fields?.price_per_car  ?? 0
        const freeStorage   = link.fields?.free_storage_gb ?? 10
        const priceExtraGb  = link.fields?.price_extra_gb  ?? 0
        const systemFee     = 100
        const carsTotal     = perCar * numCars
        const monthly       = systemFee + carsTotal
        const storageLabel = freeStorage > 0
          ? `${freeStorage} GB חינם`
          : null
        const storageExtra = priceExtraGb > 0
          ? `₪${priceExtraGb} / GB נוסף`
          : null
        // [label, value, direction]
        const rows = [
          ['עלות מערכת קבועה', `₪${systemFee} / חודש`, 'ltr'],
          perCar > 0
            ? [`רכבים (${numCars} × ₪${perCar})`, `₪${carsTotal.toLocaleString()} / חודש`, 'ltr']
            : [`רכבים`, `${numCars}`, 'ltr'],
          ['הקמה', '₪0', 'ltr'],
          ['תחזוקה', '₪0', 'ltr'],
          ['אפליקציה למובייל', '₪0', 'ltr'],
          ['אחסון', null, 'rtl'],
        ]
        return (
          <div style={section}>
            <div style={sectionTitle}>💰 מחירון</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {rows.map(([label, value, dir], i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '9px 4px', color: C.textSub }}>{label}</td>
                    <td style={{ padding: '9px 4px', textAlign: dir === 'ltr' ? 'left' : 'right', fontWeight: 600, color: C.text, direction: dir }}>
                      {label === 'אחסון'
                        ? <span>
                            {storageLabel && <span style={{ marginInlineEnd: storageExtra ? 8 : 0 }}>{storageLabel}</span>}
                            {storageExtra && <span style={{ color: C.textMuted, fontWeight: 500, fontSize: 12 }}>· {storageExtra}</span>}
                            {!storageLabel && !storageExtra && 'ללא'}
                          </span>
                        : value}
                    </td>
                  </tr>
                ))}
                {perCar > 0 && (
                  <tr style={{ background: '#f0fdf4' }}>
                    <td style={{ padding: '11px 4px', fontWeight: 800, color: C.text, fontSize: 14 }}>סה"כ חודשי</td>
                    <td style={{ padding: '11px 4px', textAlign: 'left', fontWeight: 900, color: '#047857', fontSize: 16, direction: 'ltr' }}>₪{monthly.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {link.fields?.notes && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                <strong>הערות: </strong>{link.fields.notes}
              </div>
            )}
          </div>
        )
      })()}

      {/* Agreement text */}
      <div style={section}>
        <div style={sectionTitle}>📜 תנאי הסכם רישיון — Celox AI Fleet Manager</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
          קרא את עיקרי ההסכם בטרם חתימה. הנוסח המלא זמין בכתובת:{' '}
          <a href="https://celoxai.com/license-agreement.html" target="_blank" rel="noreferrer" style={{ color: C.primary }}>celoxai.com/license-agreement.html</a>
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 2px' }}>
          {AGREEMENT_CLAUSES.map(cl => (
            <div key={cl.n} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                <span style={{ display: 'inline-block', background: C.primary, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 10, marginLeft: 6, fontWeight: 800 }}>{cl.n}</span>
                {cl.t}
              </div>
              <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.65, paddingRight: 8 }}>{cl.b}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            גרסה 1.0 · מאי 2025 · celoxai.com · bar.gershenzon@gmail.com
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div style={{ background: C.surface, borderRadius: 12, padding: '16px 20px', marginBottom: 16, border: `1px solid ${agreed ? C.primary : C.border}`, transition: 'border-color 0.2s' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 2, width: 18, height: 18, flexShrink: 0, accentColor: C.primary, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            קראתי ואני מסכים/ה לכל תנאי הסכם הרישיון של Celox AI Fleet Manager המפורטים לעיל ובנוסח המלא באתר.
            אני מאשר/ת כי הפרטים שמסרתי נכונים וכי הנני מורשה/ת לחתום בשם הגוף/חברה המצוינים.
          </span>
        </label>
      </div>

      {/* Digital signature */}
      <div style={section}>
        <div style={sectionTitle}>✍️ חתימה דיגיטלית</div>
        <SignaturePad value={signature} onChange={setSignature} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
          ⚠ {error}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '📄 אני מסכים/ה וחותם/ת על ההסכם'}
      </button>
    </form>
  )
}

// ── Periodic Inspection Form ──────────────────────────────────────────────────
const INSPECTION_ITEMS = [
  { key: 'tires',       label: '🔘 צמיגים (לחץ ומצב)' },
  { key: 'brakes',      label: '🛑 בלמים' },
  { key: 'lights',      label: '💡 תאורה (פנסים, בלמים, חיווי)' },
  { key: 'oil',         label: '🛢️ שמן מנוע (רמה ומצב)' },
  { key: 'wipers',      label: '🌧️ מגבי שמשה' },
  { key: 'extinguisher',label: '🧯 מטף כיבוי אש' },
  { key: 'first_aid',   label: '🩹 ערכת עזרה ראשונה' },
  { key: 'triangles',   label: '⚠️ משולשי אזהרה (2 יחידות)' },
  { key: 'battery',     label: '🔋 מצבר' },
  { key: 'documents',   label: '📄 מסמכי רכב (רישיון, ביטוח)' },
  { key: 'coolant',     label: '🌡️ מים/קירור מנוע' },
  { key: 'mirrors',     label: '🔲 מראות' },
]

function PeriodicInspectionForm({ link, onSubmit, submitting }) {
  const car    = link.car    || {}
  const driver = link.driver || {}
  const [form, setForm] = useState({
    submitter_name: driver.name || '',
    plate:          car.plate   || '',
    mileage:        '',
    inspection_date: new Date().toISOString().slice(0, 10),
    items: {},
    notes: '',
    signature: '',
  })
  const [files, setFiles]       = useState([])
  const [formError, setFormError] = useState('')
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (k, v) => setForm(f => ({ ...f, items: { ...f.items, [k]: v } }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.submitter_name?.trim()) { setFormError('נא להזין שם מלא'); return }
    if (!form.plate?.trim())          { setFormError('נא להזין לוחית רישוי'); return }
    if (!form.signature)              { setFormError('נא לחתום לפני השליחה'); return }
    let attachments
    try { attachments = await uploadFiles(files, link.company_id, link.id) }
    catch (err) { setFormError(err.message); return }
    onSubmit({ ...form, attachments })
  }

  const allPassed = INSPECTION_ITEMS.every(i => form.items[i.key] === 'ok')

  return (
    <form onSubmit={handleSubmit}>
      <div style={section}>
        <div style={sectionTitle}>👤 פרטי הממלא</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={field}>
            <label style={lbl}>שם מלא *</label>
            <input style={inp} required value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="ישראל ישראלי" />
          </div>
          <div style={field}>
            <label style={lbl}>תאריך בדיקה</label>
            <input style={inp} type="date" value={form.inspection_date} onChange={e => set('inspection_date', e.target.value)} />
          </div>
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
            <label style={lbl}>קילומטראז'</label>
            <input style={inp} type="number" min="0" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="50000" />
          </div>
        </div>
      </div>

      <div style={section}>
        <div style={sectionTitle}>✅ רשימת בדיקה ({INSPECTION_ITEMS.filter(i => form.items[i.key] === 'ok').length}/{INSPECTION_ITEMS.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {INSPECTION_ITEMS.map(({ key, label }) => {
            const val = form.items[key]
            return (
              <div key={key} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${val === 'ok' ? C.success + '60' : val === 'fail' ? C.danger + '60' : C.border}`, background: val === 'ok' ? C.success + '08' : val === 'fail' ? C.danger + '08' : 'transparent' }}>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['ok', '✅ תקין', C.success], ['fail', '❌ לא תקין', C.danger]].map(([v, l, clr]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, fontWeight: val === v ? 700 : 400, color: val === v ? clr : C.textMuted }}>
                      <input type="radio" name={`item_${key}`} value={v} checked={val === v} onChange={() => setItem(key, v)} style={{ accentColor: clr }} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {allPassed && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.success + '14', borderRadius: 8, fontSize: 13, fontWeight: 700, color: C.success, textAlign: 'center' }}>
            ✅ כל הפריטים תקינים!
          </div>
        )}
      </div>

      <div style={section}>
        <div style={sectionTitle}>📝 הערות</div>
        <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערות על מצב הרכב..." />
      </div>

      <div style={section}>
        <div style={sectionTitle}>✍️ חתימת הבודק</div>
        <SignaturePad value={form.signature} onChange={v => set('signature', v)} />
      </div>

      <FileAttachments files={files} onAdd={picked => setFiles(p => [...p, ...picked])} onRemove={i => setFiles(p => p.filter((_, j) => j !== i))} />

      {formError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 8, color: '#dc2626', fontSize: 14, fontWeight: 600 }}>
          ⚠ {formError}
        </div>
      )}
      <button type="submit" disabled={submitting} style={{ width: '100%', background: 'linear-gradient(135deg,#2563eb,#6366f1)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, marginTop: 4 }}>
        {submitting ? '…שולח' : '🔍 שלח טופס בדיקה'}
      </button>
    </form>
  )
}

// ── Public Form Page (root) ───────────────────────────────────────────────────
export default function PublicForm({ token }) {
  const [link,        setLink]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .rpc('get_active_form_link', { p_token: token })
      if (error || !data) { setError('הטופס לא נמצא או שאינו פעיל.'); setLoading(false); return }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('תוקף הטופס פג.'); setLoading(false); return
      }
      if (data.single_use && data.sub_count > 0) {
        setError('הטופס כבר מולא ואינו זמין למילוי חוזר.'); setLoading(false); return
      }
      setLink(data)
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSubmit(data) {
    if (!checkClientRateLimit(`celox_pubform_rl_${token}`, 5)) {
      setSubmitError('שלחת יותר מדי טפסים. נסה שוב מאוחר יותר.')
      return
    }
    setSubmitting(true)
    const submissionId = crypto.randomUUID()
    const { error } = await supabase.from('form_submissions').insert({
      id: submissionId,
      form_link_id: link.id,
      company_id: link.company_id,
      type: link.type,
      submitter_name: data.submitter_name || '',
      data,
    })
    if (error) { console.error('[form_submit]', error); setSubmitError('שגיאה בשליחה. נסה שוב.'); setSubmitting(false); return }

    // Auto-create cost records for insurance / toll from car checklist
    if (link.type === 'car_checklist' && link.car_id) {
      await supabase.rpc('create_costs_from_checklist', { p_submission_id: submissionId })
    }

    // Advance the vehicle odometer from any mileage the driver reported
    // (forward-only, typo-guarded server-side). Fire-and-forget.
    if (link.car_id && ['car_checklist', 'driver_car_check', 'periodic_inspection'].includes(link.type)) {
      supabase.rpc('update_car_mileage_from_submission', { p_submission_id: submissionId })
        .then(({ error }) => { if (error) console.error('[mileage_sync]', error.message) })
    }

    // Mirror accident report submissions into the accident_reports table
    if (link.type === 'accident_report') {
      const descParts = [data.description || '']
      if (data.incident_location) descParts.push(`מיקום: ${data.incident_location}`)
      if (data.my_plate) descParts.push(`רכב מדווח: ${[data.my_plate, data.my_make, data.my_model].filter(Boolean).join(' ')}`)
      await supabase.from('accident_reports').insert({
        company_id: link.company_id,
        other_plate: data.other_plate || null,
        other_make: data.other_make || null,
        other_model: data.other_model || null,
        other_driver_name: data.other_driver_name || null,
        other_driver_phone: data.other_driver_phone || null,
        incident_date: data.incident_date || null,
        description: descParts.join('\n'),
        file_paths: (data.attachments || []).map(a => ({ name: a.name, path: a.path })),
        police_report: data.police_report === 'yes' ? true : data.police_report === 'no' ? false : null,
        called_ambulance: data.called_ambulance === 'yes' ? true : data.called_ambulance === 'no' ? false : null,
        status: 'open',
      })
    }

    // Push notification to admin devices (fire-and-forget)
    supabase.functions.invoke('push-notify', {
      body: {
        company_id: link.company_id,
        title: 'טופס חדש נשלח',
        body: `${data.submitter_name || 'נהג'} — ${link.title || link.type}`,
        url: '/',
      },
    }).catch(() => {})

    // Notify admin of new submission (fire-and-forget) — strip attachments from email payload
    const { attachments: _att, ...formDataForEmail } = data
    supabase.functions.invoke('send-notification', {
      body: {
        type: 'form_submitted',
        payload: {
          company_id: link.company_id,
          form_title: link.title,
          submitter_name: data.submitter_name || 'לא ידוע',
          form_type: link.type,
          form_data: formDataForEmail,
        },
      },
    }).catch(() => {})

    // License agreement signed: send copy to master email with full details
    if (link.type === 'license_agreement') {
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'license_signed',
          payload: {
            company_name:    data.company_name    || '',
            signatory_name:  data.signatory_name  || '',
            signatory_role:  data.signatory_role  || '',
            id_number:       data.id_number       || '',
            phone:           data.phone           || '',
            email:           data.email           || '',
            sign_date:       data.sign_date       || '',
            notes:           link.fields?.notes   || '',
            num_cars:        link.fields?.num_cars        ?? null,
            price_per_car:   link.fields?.price_per_car   ?? null,
            free_storage_gb: link.fields?.free_storage_gb ?? 10,
            price_extra_gb:  link.fields?.price_extra_gb  ?? null,
          },
        },
      }).catch(() => {})
    }

    setDone(true)
    setSubmitting(false)
  }

  const meta = link ? FORM_META[link.type] : null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ background: C.navBg, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ fontSize: 56, marginBottom: 16 }}>{link?.type === 'license_agreement' ? '📄' : '✅'}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.success, marginBottom: 8 }}>
              {link?.type === 'license_agreement' ? 'ההסכם נחתם בהצלחה!' : 'הטופס נשלח בהצלחה!'}
            </div>
            <div style={{ fontSize: 14, color: C.textSub }}>
              {link?.type === 'license_agreement'
                ? 'תודה על חתימתך. ההסכם נשמר ויישלח אליך בדואר אלקטרוני.'
                : 'תודה על מילוי הטופס. הנתונים נקלטו במערכת.'}
            </div>
          </div>
        )}

        {!loading && link && !done && !error && (
          <>
            {/* Form header */}
            <div style={{ background: C.surface, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{meta?.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 12 }}>{link.title || meta?.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                🔒 המידע שתמסור בטופס זה נשמר ומעובד בהתאם לחוק הגנת הפרטיות, התשמ״א-1981 ותקנותיו.
                המידע ישמש לצרכי ניהול הצי בלבד ולא יועבר לצד שלישי ללא הסכמתך, אלא אם נדרש לפי דין.
                לשאלות: <a href="mailto:support@celoxai.com" style={{ color: C.textMuted }}>support@celoxai.com</a>
              </div>
            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 12, color: '#dc2626', fontSize: 14, fontWeight: 600, textAlign: 'right' }}>
                ⚠ {submitError}
              </div>
            )}
            {link.type === 'car_checklist'    && <CarChecklistForm         link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'driver_car_check' && <DriverCarCheckForm        link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'yearly_training'  && <YearlyTrainingForm        link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'accident_report'  && <AccidentReportPublicForm  link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'custom'           && <CustomForm                link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'license_agreement' && <LicenseAgreementForm     link={link} onSubmit={handleSubmit} submitting={submitting} />}
            {link.type === 'periodic_inspection' && <PeriodicInspectionForm link={link} onSubmit={handleSubmit} submitting={submitting} />}
          </>
        )}
      </div>
    </div>
  )
}
