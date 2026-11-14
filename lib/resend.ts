/* Envoi via Resend (variables Vercel : RESEND_API_KEY, NEWSLETTER_FROM ex. « FYSU <news@f-y-s-u.com> », ORDERS_FROM facultatif) */

export type Mail = {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
  reply_to?: string
  headers?: Record<string, string>
}

export const resendReady = () => !!process.env.RESEND_API_KEY && !!process.env.NEWSLETTER_FROM

export async function resendBatch(mails: Mail[]) {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(mails),
  })
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Resend ${res.status}`)
}

export async function resendOne(mail: Mail) {
  await resendBatch([mail])
}
