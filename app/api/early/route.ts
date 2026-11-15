import { NextResponse } from "next/server"
import { GATE_COOKIE, earlyKey, gateToken } from "@/lib/preLaunch"

export const runtime = "nodejs"

/* ACCÈS ANTICIPÉ : le lien privé envoyé par mail (…/api/early?k=…) ouvre le site avant la date d'ouverture.
   Le lien dépend du mot de passe du site : si tu le changes dans Vercel, les anciens liens ne marchent plus. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = await earlyKey()
  const token = await gateToken()
  const to = url.searchParams.get("to") || "/"
  const dest = new URL(to.startsWith("/") && !to.startsWith("//") ? to : "/", url.origin)
  if (!key || !token || url.searchParams.get("k") !== key) return NextResponse.redirect(new URL("/", url.origin))
  const res = NextResponse.redirect(dest)
  res.cookies.set(GATE_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 })
  return res
}
