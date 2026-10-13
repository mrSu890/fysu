import { NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { GATE_COOKIE, gateToken, sitePassword } from "@/lib/preLaunch"

export const runtime = "nodejs"

const sha = (value: string) => createHash("sha256").update(value).digest()

// Mot de passe de la page d'attente : vérifié ici, côté serveur (il n'est jamais envoyé au navigateur)
export async function POST(req: Request) {
  const expected = sitePassword()
  const token = await gateToken()
  if (!expected || !token) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const given = typeof body?.password === "string" ? body.password.slice(0, 200) : ""

  if (!timingSafeEqual(sha(given), sha(expected))) {
    // petite pause : rend les essais en rafale beaucoup plus lents
    await new Promise((resolve) => setTimeout(resolve, 600))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
