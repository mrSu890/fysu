/* PARRAINAGE : un client partage son lien ; son ami a une réduction sur sa 1re commande, le parrain reçoit un code quand l'ami a payé. */
export const REF_FRIEND_PERCENT = 10
export const REF_REWARD_PERCENT = 10
export const REF_REWARD_DAYS = 60
export const REF_COOKIE = "fysu_ref"

import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { createPersonalCode } from "@/lib/autoPromo"
import { autoSend } from "@/lib/emailScenarios"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" })

/** coupon de bienvenue de l'ami (créé une fois) */
export async function friendCouponId(): Promise<string> {
  const id = `fysu_referral_friend_${REF_FRIEND_PERCENT}`
  try {
    await stripe.coupons.retrieve(id)
  } catch {
    await stripe.coupons.create({ id, percent_off: REF_FRIEND_PERCENT, duration: "once", name: "Parrainage" })
  }
  return id
}

/** à l'achat : le code du cookie est-il valable pour cet acheteur (1re commande, pas son propre code) ? */
export async function validReferral(code: string | undefined, buyerEmail: string | null | undefined): Promise<string | null> {
  if (!code || !buyerEmail) return null
  try {
    const { data: ref } = await supabaseAdmin.from("referral_codes").select("email").eq("code", code).maybeSingle()
    if (!ref || ref.email === buyerEmail.toLowerCase()) return null
    const { count } = await supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("email", buyerEmail).in("status", ["paid", "shipped"])
    return count ? null : code
  } catch {
    return null
  }
}

/** commande payée avec un parrain : un code pour le parrain (une seule fois par commande) */
export async function rewardReferrer(code: string, friendEmail: string | null, sessionId: string) {
  try {
    const { data: ref } = await supabaseAdmin.from("referral_codes").select("email, locale").eq("code", code).maybeSingle()
    if (!ref) return
    const ins = await supabaseAdmin.from("referrals").insert({ session_id: sessionId, referrer_email: ref.email, friend_email: friendEmail })
    if (ins.error) return // déjà traité
    const reward = await createPersonalCode(REF_REWARD_PERCENT, REF_REWARD_DAYS, "MERCI")
    await supabaseAdmin.from("referrals").update({ reward_code: reward }).eq("session_id", sessionId)
    await autoSend("referral_reward", { email: ref.email, lang: String(ref.locale ?? "fr").startsWith("fr") ? "fr" : "en", locale: ref.locale, vars: { code: reward } })
  } catch (e) {
    console.error("referral reward:", e)
  }
}
