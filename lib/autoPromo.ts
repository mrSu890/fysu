import Stripe from "stripe"
import { randomBytes } from "crypto"

/* CODES PROMO PERSONNELS créés automatiquement dans Stripe : une seule utilisation, une date de fin.
   Ils apparaissent ensuite dans Codes promo comme les autres. */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" })

export async function createPersonalCode(percent: number, days: number, prefix = "FYSU"): Promise<string> {
  const pct = Math.min(100, Math.max(1, Math.round(percent)))
  const code = `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`
  const coupon = await stripe.coupons.create({ percent_off: pct, duration: "once", name: code })
  const extra = { code, max_redemptions: 1, expires_at: Math.floor(Date.now() / 1000) + Math.max(1, days) * 86400 }
  const promo = stripe.promotionCodes as any
  try {
    await promo.create({ promotion: { type: "coupon", coupon: coupon.id }, ...extra })
  } catch {
    await promo.create({ coupon: coupon.id, ...extra })
  }
  return code
}
