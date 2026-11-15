import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL } from "@/lib/emailBlocks"
import { REF_FRIEND_PERCENT, REF_REWARD_PERCENT } from "@/lib/referral"

export const runtime = "nodejs"

/* Lien de parrainage du client connecté (créé la première fois). */
export async function GET(req: Request) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const email = user.email.toLowerCase()
  const locale = /NEXT_LOCALE=([a-z-]+)/i.exec(req.headers.get("cookie") ?? "")?.[1] ?? null

  let { data: row, error } = await supabaseAdmin.from("referral_codes").select("code").eq("email", email).maybeSingle()
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 })
  if (!row) {
    const code = `R${randomBytes(3).toString("hex").toUpperCase()}`
    const ins = await supabaseAdmin.from("referral_codes").insert({ code, email, locale }).select("code").single()
    if (ins.error) return NextResponse.json({ error: "unavailable" }, { status: 503 })
    row = ins.data
  }
  const { count } = await supabaseAdmin.from("referrals").select("session_id", { count: "exact", head: true }).eq("referrer_email", email)
  return NextResponse.json({ code: row!.code, link: `${SITE_URL}/api/ref?c=${row!.code}`, friendPercent: REF_FRIEND_PERCENT, rewardPercent: REF_REWARD_PERCENT, count: count ?? 0 })
}
