// Email alerts for the WhatsApp lead agent — Bar wants to know the moment
// someone starts talking to the bot, without watching the dashboard.
//
// Reuses the same Resend setup as api/contact.js. Never fatal: a failed alert
// must not stop the webhook from answering the lead.

const ALERT_TO = 'bar.gershenzon@gmail.com'

/**
 * Fire-and-forget email the moment a brand-new lead sends their first
 * message. Swallows every failure — logged, never thrown.
 *
 * @param {{ phone: string, firstName?: string|null }} args
 */
export async function sendNewLeadAlert({ phone, firstName }) {
  if (!process.env.RESEND_API_KEY) {
    console.error('new-lead alert skipped: RESEND_API_KEY is not set')
    return
  }

  const who = firstName ? `${firstName} (${phone})` : phone
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#0f172a;margin:0 0 24px">💬 שיחה חדשה בוואטסאפ — Celox AI</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 0;color:#64748b;font-size:13px;width:100px">מספר טלפון</td>
            <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600">${phone}</td></tr>
        ${firstName ? `<tr><td style="padding:10px 0;color:#64748b;font-size:13px">שם</td>
            <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600">${firstName}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;color:#334155;font-size:14px">הבוט התחיל לענות אוטומטית. אפשר לעקוב אחרי השיחה בדשבורד.</p>
      <p style="margin-top:8px"><a href="https://wab.celoxai.com" style="color:#4f46e5;font-size:14px">wab.celoxai.com</a></p>
    </div>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Celox AI <noreply@celoxai.com>',
        to: ALERT_TO,
        subject: `💬 שיחה חדשה בוואטסאפ — ${who}`,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      console.error('new-lead alert send failed', r.status, body.slice(0, 200))
    }
  } catch (err) {
    console.error('new-lead alert threw', err instanceof Error ? err.message : 'unknown')
  }
}
