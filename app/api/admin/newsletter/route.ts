import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { renderEmail, SITE_URL, type Campaign, type Footer } from "@/lib/newsletter"
import { FOOTER, stripKeep } from "@/lib/emailBlocks"
import { trackHtml } from "@/lib/tracking"
import { earlyKey } from "@/lib/preLaunch"
import { audienceCounts, isAudience, loadAudience } from "@/lib/audience"
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
  let counts
  try { counts = await audienceCounts() } catch (e) {
    const m = e instanceof Error ? e.message : "Erreur"
    return fail(/relation|does not exist/i.test(m) ? "La table newsletter_subscribers n'existe pas encore (SQL à lancer dans Supabase)." : m)
  }
  const { data: d } = await supabaseAdmin.from("email_templates").select("data").eq("key", "newsletter_draft").maybeSingle()
  return NextResponse.json({ earlyUrl: (await earlyKey()) ? `${SITE_URL}/api/early?k=${await earlyKey()}` : null, active: counts.all, counts, configured: resendReady(), draft: d?.data ?? null })
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
      const subs = await loadAudience(isAudience(body.segment) ? body.segment : "all")
      if (subs.length === 0) return fail("Aucun inscrit.", 400)
      // la campagne est écrite en français : chaque langue du site est traduite une seule fois, l'anglais aussi
      const langs = Array.from(new Set(subs.map((s) => baseLocale(s.locale)).filter((l) => l && l !== "fr" && isTranslated(l) || l === "en")))
      const versions = new Map<string, { c: Campaign; footer: Footer; lang: string }>()
      await Promise.all(langs.map(async (l) => {
        const t = await translateDeep({ c, footer: FOOTER.fr }, "fr", l)
        if (t) versions.set(l, { c: t.c, footer: t.footer, lang: l })
      }))
      const orig = { c, footer: FOOTER.fr, lang: "fr" }
      // fiche de la campagne (pour le suivi) ; si la table n'existe pas encore, l'envoi se fait quand même, sans suivi
      const ab = !!c.subjectB?.trim()
      const ins = await supabaseAdmin.from("email_campaigns").insert({ subject: c.subject, subject_b: ab ? c.subjectB : null, segment: isAudience(body.segment) ? body.segment : "all", recipients: subs.length }).select("id").single()
      const cid: string | null = ins.error ? null : (ins.data as { id: string }).id
      let sent = 0
      for (let i = 0; i < subs.length; i += 100) {
        const chunk = subs.slice(i, i + 100)
        const mails: Mail[] = chunk.map((s, k) => {
          const url = `${SITE_URL}/api/newsletter/unsubscribe?t=${s.token}`
          const v = versions.get(baseLocale(s.locale)) ?? orig
          const mine = fillDeep(v.c, { prenom: s.first_name ?? "" })
          const variant = ab && (i + k) % 2 === 1 ? "B" : "A"
          const rendered = renderEmail(mine, url, v.lang, v.footer)
          const html = cid ? trackHtml(rendered.html, { campaign: cid, email: s.email, variant }) : rendered.html
          const text = rendered.text
          return { from, to: [s.email], subject: stripKeep(variant === "B" && mine.subjectB?.trim() ? mine.subjectB : mine.subject), html, text, reply_to: replyTo, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }
        })
        await resendBatch(mails)
        sent += chunk.length
      }
      return NextResponse.json({ ok: true, sent, tracked: !!cid })
    }
    return fail("Action inconnue.", 400)
  } catch (e) {
    console.error("newsletter:", e)
    return fail(e instanceof Error ? e.message : "Envoi impossible")
  }
}
