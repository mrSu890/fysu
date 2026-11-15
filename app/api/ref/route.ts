import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { REF_COOKIE } from "@/lib/referral"

export const runtime = "nodejs"

/* Lien d'un parrain (…/api/ref?c=CODE) : on retient le code 30 jours, puis on ouvre le site. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const c = (url.searchParams.get("c") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)
  const res = NextResponse.redirect(new URL("/", url.origin))
  if (c) {
    const { data } = await supabaseAdmin.from("referral_codes").select("code").eq("code", c).maybeSingle()
    if (data) res.cookies.set(REF_COOKIE, c, { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 })
  }
  return res
}
