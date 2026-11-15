import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { renderEmail, SITE_URL, type Campaign, type Footer } from "@/lib/newsletter"
import { FOOTER, stripKeep } from "@/lib/emailBlocks"
import { fillDeep } from "@/lib/emailScenarios"
import { baseLocale, isTranslated, translateDeep } from "@/lib/mailTranslate"
import { resendBatch, resendReady, type Mail } from "@/lib/resend"

export const runtime = "nodejs"
export const maxDuration = 60

/* ADMIN > NEWSLETTER (réservé aux admins par le middleware)
   GET  : inscrits actifs + brouillon enregistré
   PUT  : enregistre le brouillon { campaign }
   POST : { action: "test", to, campaign }  ou  { action: "send", campaign }
   Brouillon : table email_templates (clé « newsletter_draft »). */

const fail = (message: string, status = 500) => NextResponse.json({ error: message }, { status })

export async function GET() {
  const { count, error } = await supabaseAdmin.from("newsletter_subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null)
  if (error) return fail(/relation|does not exist/i.test(error.message) ? "La table newsletter_subscribers n'existe pas encore (SQL à lancer dans Supabase)." : error.message)
  const { data: d } = await supabaseAdmin.from("email_templates").select("data").eq("key", "newsletter_draft").maybeSingle()
  return NextResponse.json({ active: count ?? 0, configured: resendReady(), draft: d?.data ?? null })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.campaign) return fail("Brouillon vide.", 400)
  const { error } = await supabaseAdmin.from("email_templates").upsert({ key: "newsletter_draft", data: body.campaign, updated_at: new Date().toISOString() })
  if (error) return fail(/relation|does not exist/i.test(error.message) ? "La table email_templates n'existe pas encore (SQL à lancer dans Supabase)." : error.message)
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  if (!resendReady()) return fail("Resend n'est pas encore branché (clé et adresse d'envoi manquantes dans Vercel).", 400)
  const body = await req.json().catch(() => null)
  const c = body?.campaign as Campaign | undefined
  if (!c || !c.subject?.trim() || !Array.isArray(c.blocks) || c.blocks.length === 0) return fail("Objet et au moins un bloc sont obligatoires.", 400)
  const from = process.env.NEWSLETTER_FROM!
  const replyTo = process.env.NEWSLETTER_REPLY_TO || "fysu.contact@gmail.com"

  try {
    if (body.action === "test") {
      const to = String(body.to || "").trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail("Adresse de test invalide.", 400)
      const tc = fillDeep(c, { prenom: "Camille" })
      const { html, text } = renderEmail(tc, `${SITE_URL}/api/newsletter/unsubscribe?t=test`)
      await resendBatch([{ from, to: [to], subject: `[TEST] ${stripKeep(c.subject)}`, html, text, reply_to: replyTo }])
      return NextResponse.json({ ok: true, sent: 1 })
    }

    if (body.action === "send") {
      let q = await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale, first_name").is("unsubscribed_at", null)
      if (q.error && /first_name/i.test(q.error.message)) q = (await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale").is("unsubscribed_at", null)) as typeof q
      if (q.error) return fail(q.error.message)
      const subs = (q.data ?? []) as { email: string; token: string; locale: string | null; first_name?: string | null }[]
      if (subs.length === 0) return fail("Aucun inscrit.", 400)
      // la campagne est écrite en français : chaque langue du site est traduite une seule fois, l'anglais aussi
      const langs = Array.from(new Set(subs.map((s) => baseLocale(s.locale)).filter((l) => l && l !== "fr" && isTranslated(l) || l === "en")))
      const versions = new Map<string, { c: Campaign; footer: Footer; lang: string }>()
      await Promise.all(langs.map(async (l) => {
        const t = await translateDeep({ c, footer: FOOTER.fr }, "fr", l)
        if (t) versions.set(l, { c: t.c, footer: t.footer, lang: l })
      }))
      const orig = { c, footer: FOOTER.fr, lang: "fr" }
      let sent = 0
      for (let i = 0; i < subs.length; i += 100) {
        const chunk = subs.slice(i, i + 100)
        const mails: Mail[] = chunk.map((s) => {
          const url = `${SITE_URL}/api/newsletter/unsubscribe?t=${s.token}`
          const v = versions.get(baseLocale(s.locale)) ?? orig
          const mine = fillDeep(v.c, { prenom: s.first_name ?? "" })
          const { html, text } = renderEmail(mine, url, v.lang, v.footer)
          return { from, to: [s.email], subject: stripKeep(mine.subject), html, text, reply_to: replyTo, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        })
        await resendBatch(mails)
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
