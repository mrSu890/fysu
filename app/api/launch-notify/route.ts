import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// « Être averti de l'ouverture du site » (page d'attente).
// Les adresses se lisent dans Supabase > Table Editor > launch_subscribers.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Piège anti-robots : ce champ caché doit rester vide
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 8) : null

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("launch_subscribers")
    .upsert({ email, locale }, { onConflict: "email", ignoreDuplicates: true })

  if (error) {
    console.error("launch_subscribers:", error.message)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
