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
  if (body.consent !== true) return NextResponse.json({ error: "Consent required" }, { status: 400 })

  // déjà inscrit : on ne change rien ; ancien désinscrit qui se réinscrit : on réactive
  const { data: existing } = await supabaseAdmin.from("newsletter_subscribers").select("id, unsubscribed_at").eq("email", email).maybeSingle()
  if (existing) {
    if (existing.unsubscribed_at) {
      await supabaseAdmin.from("newsletter_subscribers").update({ unsubscribed_at: null, consented_at: new Date().toISOString(), locale }).eq("id", existing.id)
    }
    return NextResponse.json({ ok: true })
  }
  const { error } = await supabaseAdmin.from("newsletter_subscribers").insert({ email, locale, consented_at: new Date().toISOString(), source: "footer" })
  if (error) {
    console.error("newsletter_subscribers:", error.message)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
  await autoSend("welcome", { email, lang: locale?.startsWith("fr") ? "fr" : "en", vars: {} })
  return NextResponse.json({ ok: true })
}
