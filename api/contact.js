export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set')
    return res.status(500).json({ ok: false, reason: 'no_api_key' })
  }

  const { name, company, phone, email, message } = req.body ?? {}
  if (!name || !phone || !email) return res.status(400).json({ ok: false, reason: 'missing_fields' })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#0f172a;margin:0 0 24px">פנייה חדשה — Celox AI</h2>
      <table style="width:100%;border-collapse:collapse">
        ${[['שם','name',name],['חברה','company',company||'—'],['טלפון','phone',phone],['אימייל','email',email]].map(([l,,v])=>`
        <tr><td style="padding:10px 0;color:#64748b;font-size:13px;width:100px">${l}</td>
            <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600">${v}</td></tr>`).join('')}
      </table>
      ${message ? `<div style="margin-top:20px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0"><p style="margin:0;color:#334155;font-size:14px;line-height:1.7">${message}</p></div>` : ''}
    </div>`

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Celox AI <noreply@celoxai.com>',
      to: 'bar.gershenzon@gmail.com',
      reply_to: email,
      subject: `📬 פנייה חדשה מ־${name}${company ? ` (${company})` : ''}`,
      html,
    }),
  })

  const body = await r.text()
  if (!r.ok) {
    console.error('Resend error', r.status, body)
    return res.status(500).json({ ok: false, reason: body })
  }
  res.status(200).json({ ok: true })
}
