import { NextResponse } from "next/server"
import Stripe from "stripe"
import { randomBytes } from "crypto"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { readGameToken } from "@/lib/gameToken"
import { GAMES, REWARD_DAYS, REWARD_PERCENT, REWARD_SCORE } from "@/lib/games"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
})

/* Temps minimum réaliste pour FYSU Bird : le 1er tuyau arrive après ~3,9 s,
   puis un tuyau toutes les ~1,8 s. On laisse 10 % de marge. */
const minSeconds = (score: number) => (score <= 0 ? 0 : (3.8 + (score - 1) * 1.78) * 0.9)

async function createCode(userId: string) {
  const redeemBy = Math.floor(Date.now() / 1000) + REWARD_DAYS * 24 * 3600
  const coupon = await stripe.coupons.create({
    percent_off: REWARD_PERCENT,
    duration: "once",
    max_redemptions: 1,
    redeem_by: redeemBy,
    name: `FYSU Bird −${REWARD_PERCENT} %`,
    metadata: { userId, game: "fysu-bird" },
  })

  const code = `BIRD-${randomBytes(4).toString("hex").toUpperCase()}`
  const promo = stripe.promotionCodes as any
  try {
    await promo.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      max_redemptions: 1,
      expires_at: redeemBy,
    })
  } catch {
    // ancienne forme de l'API Stripe
    await promo.create({ coupon: coupon.id, code, max_redemptions: 1, expires_at: redeemBy })
  }
  return code
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const game = String(body?.game ?? "")
  const score = Math.floor(Number(body?.score))

  if (!GAMES.some((g) => g.slug === game) || !Number.isFinite(score) || score < 0 || score > 5000) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const session = readGameToken(body?.token, user.id, game)
  if (!session) return NextResponse.json({ error: "Jeton invalide" }, { status: 400 })

  // une partie = un jeton, utilisable une seule fois
  const { error: dupError } = await supabaseAdmin
    .from("game_scores")
    .insert({ user_id: user.id, game, score: 0, session_nonce: session.nonce })
  if (dupError) return NextResponse.json({ error: "Partie déjà enregistrée" }, { status: 409 })

  const elapsed = (Date.now() - session.startedAt) / 1000
  const valid = elapsed >= minSeconds(score) && elapsed < 6 * 3600

  if (!valid) {
    return NextResponse.json({ ok: true, accepted: false })
  }

  await supabaseAdmin
    .from("game_scores")
    .update({ score })
    .eq("session_nonce", session.nonce)

  // déjà un code ?
  const { data: existing } = await supabaseAdmin
    .from("game_rewards")
    .select("code, percent")
    .eq("user_id", user.id)
    .eq("game", game)
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, accepted: true, reward: existing, already: true })

  if (score < REWARD_SCORE) return NextResponse.json({ ok: true, accepted: true, reward: null })

  try {
    const code = await createCode(user.id)
    const { error } = await supabaseAdmin
      .from("game_rewards")
      .insert({ user_id: user.id, game, score, code, percent: REWARD_PERCENT })
    if (error) {
      // créé en même temps par une autre partie : on renvoie celui qui existe
      const { data: again } = await supabaseAdmin
        .from("game_rewards")
        .select("code, percent")
        .eq("user_id", user.id)
        .eq("game", game)
        .maybeSingle()
      return NextResponse.json({ ok: true, accepted: true, reward: again ?? null })
    }
    return NextResponse.json({ ok: true, accepted: true, reward: { code, percent: REWARD_PERCENT } })
  } catch (err) {
    console.error("game reward:", err)
    return NextResponse.json({ ok: true, accepted: true, reward: null, rewardError: true })
  }
}
