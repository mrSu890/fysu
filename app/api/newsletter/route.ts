import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { autoSend } from "@/lib/emailScenarios"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Inscription à la newsletter (pied de page). Les adresses : Supabase > Table Editor > newsletter_subscribers.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true }) // piège anti-robots

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 8) : null
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  const first = typeof body.firstName === "string" ? body.firstName.replace(/[^\p{L}\p{M}' -]/gu, "").trim().slice(0, 40) : ""
  if (body.consent !== true) return NextResponse.json({ error: "Consent required" }, { status: 400 })

  // déjà inscrit : on ne change rien ; ancien désinscrit qui se réinscrit : on réactive
  const { data: existing } = await supabaseAdmin.from("newsletter_subscribers").select("id, unsubscribed_at").eq("email", email).maybeSingle()
  if (existing) {
    if (existing.unsubscribed_at) {
      await supabaseAdmin.from("newsletter_subscribers").update({ unsubscribed_at: null, consented_at: new Date().toISOString(), locale }).eq("id", existing.id)
    }
    if (first) await supabaseAdmin.from("newsletter_subscribers").update({ first_name: first }).eq("id", existing.id) // colonne absente : sans effet
    return NextResponse.json({ ok: true })
  }
  const row: Record<string, unknown> = { email, locale, consented_at: new Date().toISOString(), source: "footer" }
  let { error } = await supabaseAdmin.from("newsletter_subscribers").insert(first ? { ...row, first_name: first } : row)
  if (error && first && /first_name/i.test(error.message)) ({ error } = await supabaseAdmin.from("newsletter_subscribers").insert(row)) // SQL pas encore lancé
  if (error) {
    console.error("newsletter_subscribers:", error.message)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
  await autoSend("welcome", { email, lang: locale?.startsWith("fr") ? "fr" : "en", locale, vars: { prenom: first } })
  return NextResponse.json({ ok: true })
}
