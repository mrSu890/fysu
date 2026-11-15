import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* CENTRE DE PRÉFÉRENCES (lien « Préférences » en bas des newsletters) : GET ?t=TOKEN, POST { t, prefs } */
const KEYS = ["collections", "private", "events"]
const ok = (t: unknown) => typeof t === "string" && /^[0-9a-f-]{36}$/i.test(t)

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t")
  if (!ok(t)) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const { data, error } = await supabaseAdmin.from("newsletter_subscribers").select("prefs").eq("token", t).maybeSingle()
  if (error || !data) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const p = (data.prefs ?? {}) as Record<string, boolean>
  return NextResponse.json({ prefs: Object.fromEntries(KEYS.map((k) => [k, p[k] !== false])) })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  if (!ok(b?.t)) return NextResponse.json({ error: "invalid" }, { status: 400 })
  const prefs = Object.fromEntries(KEYS.map((k) => [k, b?.prefs?.[k] !== false]))
  const { error } = await supabaseAdmin.from("newsletter_subscribers").update({ prefs }).eq("token", b.t)
  return error ? NextResponse.json({ error: "save" }, { status: 500 }) : NextResponse.json({ ok: true })
}
