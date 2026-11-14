import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { renderEmail, SITE_URL, type Campaign } from "@/lib/newsletter"

export const runtime = "nodejs"
export const maxDuration = 60

/* ADMIN > NEWSLETTER (réservé aux admins par le middleware)
   GET  : nombre d'inscrits actifs
   POST : { action: "test", to, campaign }  ou  { action: "send", campaign }
   Envoi via Resend (variables Vercel : RESEND_API_KEY, NEWSLETTER_FROM ex. « FYSU <news@f-y-s-u.com> »). */

const fail = (message: string, status = 500) => NextResponse.json({ error: message }, { status })

export async function GET() {
  const { count, error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .is("unsubscribed_at", null)
  if (error) return fail(/relation|does not exist/i.test(error.message) ? "La table newsletter_subscribers n'existe pas encore (SQL à lancer dans Supabase)." : error.message)
  return NextResponse.json({ active: count ?? 0, configured: !!process.env.RESEND_API_KEY && !!process.env.NEWSLETTER_FROM })
}

type Mail = { from: string; to: string[]; subject: string; html: string; text: string; headers?: Record<string, string> }

async function resendBatch(mails: Mail[]) {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(mails),
  })
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Resend ${res.status}`)
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY || !process.env.NEWSLETTER_FROM) return fail("Resend n'est pas encore branché (clé et adresse d'envoi manquantes dans Vercel).", 400)
  const body = await req.json().catch(() => null)
  const c = body?.campaign as Campaign | undefined
  if (!c || !c.subject?.trim() || !c.title?.trim()) return fail("Objet et titre obligatoires.", 400)
  const from = process.env.NEWSLETTER_FROM!

  try {
    if (body.action === "test") {
      const to = String(body.to || "").trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail("Adresse de test invalide.", 400)
      const { html, text } = renderEmail(c, `${SITE_URL}/api/newsletter/unsubscribe?t=test`)
      await resendBatch([{ from, to: [to], subject: `[TEST] ${c.subject}`, html, text }])
      return NextResponse.json({ ok: true, sent: 1 })
    }

    if (body.action === "send") {
      const { data, error } = await supabaseAdmin.from("newsletter_subscribers").select("email, token").is("unsubscribed_at", null)
      if (error) return fail(error.message)
      const subs = data ?? []
      if (subs.length === 0) return fail("Aucun inscrit.", 400)
      let sent = 0
      for (let i = 0; i < subs.length; i += 100) {
        const chunk = subs.slice(i, i + 100)
        await resendBatch(
          chunk.map((s) => {
            const url = `${SITE_URL}/api/newsletter/unsubscribe?t=${s.token}`
            const { html, text } = renderEmail(c, url)
            return {
              from,
              to: [s.email],
              subject: c.subject,
              html,
              text,
              headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
            }
          })
        )
        sent += chunk.length
      }
      return NextResponse.json({ ok: true, sent })
    }
    return fail("Action inconnue.", 400)
  } catch (e) {
    console.error("newsletter:", e)
    return fail(e instanceof Error ? e.message : "Envoi impossible")
  }
}
