import Stripe from "stripe"

/* ====================================================================
   CODES PROMO (lus dans Stripe)
   Un code peut donner une réduction, la livraison offerte, ou les deux.
   « Livraison offerte » est repéré par une étiquette (metadata) que l'admin ajoute à la création du code.
   ==================================================================== */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
})

export type PromoInfo = {
  id: string // identifiant du code promo dans Stripe
  code: string
  freeShipping: boolean
  shippingOnly: boolean // livraison offerte sans réduction sur les articles
  discountLabel: string // « −10 % », « −20.00 € » ou vide
}

export async function findPromo(raw: unknown): Promise<PromoInfo | null> {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
  if (!code || code.length > 30) return null

  try {
    const list = await (stripe.promotionCodes as any).list({ code, active: true, limit: 1 })
    const p = list.data?.[0]
    if (!p || !p.active) return null
    if (p.expires_at && p.expires_at * 1000 < Date.now()) return null
    if (p.max_redemptions && (p.times_redeemed ?? 0) >= p.max_redemptions) return null

    // le coupon (réduction) lié au code, selon la version de l'API Stripe
    const ref = p.coupon ?? p.promotion?.coupon
    let coupon: any = null
    try {
      coupon = ref && typeof ref === "object" ? ref : ref ? await stripe.coupons.retrieve(ref) : null
    } catch {
      coupon = null
    }

    const meta = { ...(coupon?.metadata ?? {}), ...(p.metadata ?? {}) } as Record<string, string>
    const freeShipping = meta.free_shipping === "1"
    const shippingOnly = meta.shipping_only === "1"

    let discountLabel = ""
    if (!shippingOnly) {
      if (coupon?.percent_off != null) discountLabel = `−${coupon.percent_off} %`
      else if (coupon?.amount_off != null) discountLabel = `−${(coupon.amount_off / 100).toFixed(2)} €`
    }

    return { id: String(p.id), code: String(p.code), freeShipping, shippingOnly, discountLabel }
  } catch (e) {
    console.error("Promo lookup error:", e)
    return null
  }
}
