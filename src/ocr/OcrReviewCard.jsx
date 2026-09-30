import { formatDate, expiryState, FUEL_LABEL } from './ocrMapping'

// The confirmation step after a license is read. Sits above the file list, in
// place, inside whichever surface the upload happened in.
//
// Palette copied 1:1 from `const C` in fleet-manager.jsx (same convention the
// avatar's tokens.css uses) — that constant is not exported, and importing the
// 12k-line component from here would be circular.
const C = {
  primary: '#2563eb', surface: '#ffffff', bg: '#F4F3EF', bgSubtle: '#F8F7F4', border: '#E5E1D8',
  textPrimary: '#2B2630', textSecondary: '#5A5460', textMuted: '#8F8A94',
  success: '#10b981', successText: '#047857', danger: '#ef4444', warning: '#f59e0b', warningText: '#92400e',
}

const KIND_NAME = {
  driver_license:  { he: 'רישיון הנהיגה', en: 'the driver license' },
  vehicle_license: { he: 'רישיון הרכב',   en: 'the vehicle license' },
}

const FAIL = {
  not_configured:  { he: 'שירות הקריאה האוטומטית עדיין לא מוגדר בשרת.',                       en: 'Automatic reading is not configured on the server yet.' },
  no_session:      { he: 'ההתחברות פגה. התחברו מחדש ונסו שוב.',                                 en: 'Your session expired. Sign in again and retry.' },
  invalid_token:   { he: 'ההתחברות פגה. התחברו מחדש ונסו שוב.',                                 en: 'Your session expired. Sign in again and retry.' },
  forbidden:       { he: 'אין הרשאה לקרוא את המסמך הזה.',                                        en: 'You do not have permission to read this document.' },
  too_large:       { he: 'הקובץ גדול מדי לקריאה אוטומטית (עד 8MB).',                            en: 'The file is too large to read automatically (8 MB max).' },
  unsupported_type:{ he: 'קריאה אוטומטית עובדת על תמונות (JPG, PNG, WebP) ועל PDF בלבד.',      en: 'Automatic reading works on images (JPG, PNG, WebP) and PDF only.' },
  rate_limited:    { he: 'יותר מדי קריאות ברצף. נסו שוב בעוד כמה דקות.',                        en: 'Too many reads in a row. Try again in a few minutes.' },
}
const FAIL_DEFAULT = { he: 'לא הצלחנו לקרוא את המסמך כרגע.', en: 'We could not read the document right now.' }

const NOTICE = {
  wrong_document:  k => ({ he: `זה לא נראה כמו ${KIND_NAME[k].he}. ודאו שהעליתם את המסמך הנכון.`, en: `This does not look like ${KIND_NAME[k].en}. Check you uploaded the right document.` }),
  unreadable:      () => ({ he: 'התמונה לא ברורה מספיק. צלמו שוב באור טוב, ישר מלמעלה ובלי השתקפויות.', en: 'The image is not clear enough. Retake it in good light, straight on, without glare.' }),
  nothing_found:   () => ({ he: 'לא נמצאו במסמך שדות לקריאה.', en: 'No readable fields were found in the document.' }),
  already_current: () => ({ he: 'כל הפרטים במסמך כבר תואמים למה ששמור. אין מה לעדכן.', en: 'Everything on the document already matches what is stored. Nothing to update.' }),
}

const DOUBT = {
  id_checksum:      { he: 'ספרת הביקורת לא תקינה — כנראה שגיאת קריאה', en: 'Check digit is invalid — probably a misread' },
  format:           { he: 'הפורמט לא נראה תקין',                        en: 'The format does not look right' },
  implausible_date: { he: 'התאריך נראה לא הגיוני',                      en: 'This date looks implausible' },
}

const box = { background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }
const btn = { border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }

function show(row, v, rtl) {
  if (v === null || v === undefined || v === '') return '—'
  if (row.type === 'levels') return (v || []).join(', ')
  if (row.type === 'date' || row.type === 'expiry') return formatDate(v)
  if (row.type === 'fuel') return FUEL_LABEL[v]?.[rtl ? 'he' : 'en'] || v
  return String(v)
}

function Chip({ state, rtl }) {
  if (state === 'expired') return <span style={{ background: C.danger + '18', color: C.danger, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{rtl ? 'פג תוקף' : 'Expired'}</span>
  if (state === 'soon')    return <span style={{ background: C.warning + '22', color: C.warningText, borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{rtl ? 'יפוג בקרוב' : 'Expires soon'}</span>
  return null
}

export default function OcrReviewCard({ ocr, onToggle, onApply, onRetry, onDismiss, rtl = true }) {
  const { state } = ocr
  if (state.phase === 'idle') return null
  const T = (he, en) => (rtl ? he : en)
  const kindName = KIND_NAME[state.kind]?.[rtl ? 'he' : 'en']

  if (state.phase === 'reading') {
    return (
      <div role="status" aria-live="polite" style={box}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>⏳ {T(`קורא את ${kindName}…`, `Reading ${kindName}…`)}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          {T('הקובץ נשלח לשירות קריאה חיצוני (Google Gemini) לצורך חילוץ הנתונים.', 'The file is sent to an external reading service (Google Gemini) to extract the data.')}
        </div>
      </div>
    )
  }

  if (state.phase === 'failed') {
    const m = FAIL[state.reason] || FAIL_DEFAULT
    const retryable = !['not_configured', 'forbidden', 'too_large', 'unsupported_type'].includes(state.reason)
    return (
      <div role="alert" style={{ ...box, borderColor: C.danger + '55', background: C.danger + '0d' }}>
        <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{T(m.he, m.en)}</div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>{T('הקובץ נשמר. אפשר למלא את הפרטים ידנית.', 'The file was saved. You can fill the details in by hand.')}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {retryable && <button onClick={onRetry} style={{ ...btn, background: C.primary, color: '#fff' }}>{T('נסו שוב', 'Try again')}</button>}
          <button onClick={onDismiss} style={{ ...btn, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}` }}>{T('סגירה', 'Close')}</button>
        </div>
      </div>
    )
  }

  if (state.phase === 'notice') {
    const w = state.warnings[0]
    const m = (NOTICE[w] || NOTICE.nothing_found)(state.kind)
    return (
      <div role="status" style={{ ...box, borderColor: C.warning + '66', background: C.warning + '12' }}>
        <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>{T(m.he, m.en)}</div>
        <button onClick={onDismiss} style={{ ...btn, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, marginTop: 10 }}>{T('הבנתי', 'OK')}</button>
      </div>
    )
  }

  if (state.phase === 'applied') {
    return (
      <div role="status" style={{ ...box, borderColor: C.success + '66', background: C.success + '12' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.successText }}>✓ {T(`עודכנו ${state.count} שדות`, `${state.count} field${state.count === 1 ? '' : 's'} updated`)}</div>
        {state.expiryUpdated && <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 3 }}>{T('תאריך התוקף נקבע גם לקובץ שהועלה.', 'The uploaded file\'s expiry date was set too.')}</div>}
        <button onClick={onDismiss} style={{ ...btn, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}`, marginTop: 10 }}>{T('סגירה', 'Close')}</button>
      </div>
    )
  }

  // ready | applying
  const busy = state.phase === 'applying'
  const ticked = state.rows.filter(r => r.checked).length
  return (
    <div style={{ ...box, background: C.surface, borderColor: C.primary + '55' }} aria-busy={busy}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{T(`קראנו את ${kindName}`, `We read ${kindName}`)}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2, marginBottom: 10 }}>
        {T('בדקו מול המסמך לפני שמירה. שום דבר לא נשמר עד שתלחצו ״עדכון״.', 'Check against the document before saving. Nothing is saved until you press Apply.')}
      </div>

      {state.banner?.type === 'plate_mismatch' && (
        <div role="alert" style={{ background: C.danger + '12', border: `1px solid ${C.danger}55`, borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: C.textPrimary }}>
          <strong style={{ color: C.danger }}>{T('מספר הרכב לא תואם.', 'Plate number does not match.')}</strong>{' '}
          {/* label + number stay together: a plate that wraps away from its label reads as a different plate */}
          <span style={{ whiteSpace: 'nowrap' }}>{T('במסמך', 'Document')}: <bdi>{state.banner.read}</bdi></span>
          {' · '}
          <span style={{ whiteSpace: 'nowrap' }}>{T('ברכב זה', 'this vehicle')}: <bdi>{state.banner.current}</bdi></span>
          {'. '}
          {T('כנראה הועלה מסמך של רכב אחר, ולכן לא סימנו אף שדה.', "It is probably another vehicle's document, so nothing is ticked.")}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {state.rows.map(r => {
          const label = rtl ? r.he : r.en
          const chip = r.type === 'expiry' ? expiryState(r.next) : null
          return (
            <label key={r.key} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', cursor: busy ? 'default' : 'pointer',
              padding: '7px 8px', borderRadius: 7, background: r.checked ? C.primary + '0d' : 'transparent',
              border: `1px solid ${r.checked ? C.primary + '40' : C.border}`,
            }}>
              <input type="checkbox" checked={r.checked} disabled={busy} onChange={() => onToggle(r.key)} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>{label}</div>
                <div style={{ fontSize: 13, color: C.textPrimary, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', wordBreak: 'break-word' }}>
                  {r.replaces && (
                    <>
                      <span style={{ color: C.textMuted, textDecoration: 'line-through', direction: 'ltr' }}>{show(r, r.current, rtl)}</span>
                      <span aria-hidden="true" style={{ color: C.textMuted }}>{rtl ? '←' : '→'}</span>
                    </>
                  )}
                  <strong style={{ direction: r.type === 'text' && /[א-ת]/.test(String(r.next)) ? 'rtl' : 'ltr' }}>{show(r, r.next, rtl)}</strong>
                  <Chip state={chip} rtl={rtl} />
                </div>
                {r.doubt && <div style={{ fontSize: 11, color: C.warningText, fontWeight: 600, marginTop: 2 }}>⚠ {T(DOUBT[r.doubt].he, DOUBT[r.doubt].en)}</div>}
              </div>
            </label>
          )
        })}
      </div>

      {state.unchanged > 0 && (
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
          {T(`${state.unchanged} פרטים נוספים במסמך כבר תואמים למה ששמור.`, `${state.unchanged} more detail${state.unchanged === 1 ? '' : 's'} already match what is stored.`)}
        </div>
      )}
      {state.error && <div role="alert" style={{ fontSize: 12, color: C.danger, marginTop: 8 }}>{state.error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onApply} disabled={busy || ticked === 0}
          style={{ ...btn, flex: 1, background: C.primary, color: '#fff', opacity: busy || ticked === 0 ? 0.55 : 1, cursor: busy || ticked === 0 ? 'not-allowed' : 'pointer' }}>
          {busy ? '…' : T(`עדכון (${ticked})`, `Apply (${ticked})`)}
        </button>
        <button onClick={onDismiss} disabled={busy} style={{ ...btn, background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}` }}>{T('דילוג', 'Skip')}</button>
      </div>
    </div>
  )
}
