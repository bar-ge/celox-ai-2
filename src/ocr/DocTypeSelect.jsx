// "What kind of document is this?" — the switch that decides whether an upload
// is read automatically. Deliberately opt-in per upload: an ordinary file
// (an insurance policy, an accident photo) never leaves the app, and the person
// uploading is told, before they press upload, that a license goes to a
// third-party reading service.

import { KIND_FOR_ENTITY } from './ocrMapping'

const LABEL = {
  driver_license:  { he: 'רישיון נהיגה — מילוי אוטומטי של הפרטים', en: 'Driver license — auto-fill the details' },
  vehicle_license: { he: 'רישיון רכב — מילוי אוטומטי של הפרטים',   en: 'Vehicle license — auto-fill the details' },
}

export default function DocTypeSelect({ entityType, value, onChange, disabled, rtl = true, colors }) {
  const kind = KIND_FOR_ENTITY[entityType]
  if (!kind) return null
  const C = colors
  const T = (he, en) => (rtl ? he : en)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="doc-type-select" style={{ fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>{T('סוג מסמך', 'Document type')}</label>
        <select id="doc-type-select" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, outline: 'none', background: C.surface, color: C.textPrimary }}>
          <option value="">{T('מסמך כללי', 'General document')}</option>
          <option value={kind}>{LABEL[kind][rtl ? 'he' : 'en']}</option>
        </select>
      </div>
      {value && (
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
          {T('הקובץ יישלח לשירות קריאה חיצוני. תראו את מה שנקרא ותאשרו לפני שמשהו נשמר.',
             'The file will be sent to an external reading service. You will see what was read and confirm before anything is saved.')}
        </div>
      )}
    </div>
  )
}
