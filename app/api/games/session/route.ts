import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { makeGameToken } from "@/lib/gameToken"
import { GAMES } from "@/lib/games"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Début d'une partie : renvoie un jeton + le code déjà gagné (si le joueur est connecté) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const game = String(body?.game ?? "")
  if (!GAMES.some((g) => g.slug === game)) {
    return NextResponse.json({ error: "Jeu inconnu" }, { status: 400 })
  }

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ loggedIn: false })

  const { token } = makeGameToken(user.id, game)

  const { data: reward } = await supabaseAdmin
    .from("game_rewards")
    .select("code, percent")
    .eq("user_id", user.id)
    .eq("game", game)
    .maybeSingle()

  return NextResponse.json({ loggedIn: true, token, reward: reward ?? null })
}
