import { NextResponse } from "next/server"
import Stripe from "stripe"
import { randomBytes } from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Codes promo FYSU : créés et suivis dans Stripe (réservé aux admins par le middleware). */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
})

type Row = {
  id: string
  code: string
  active: boolean
  percentOff: number | null
  amountOff: number | null // en euros
  timesRedeemed: number
  maxRedemptions: number | null
  expiresAt: number | null // secondes
  minAmount: number | null // en euros
  createdAt: number
}

export async function GET() {
  try {
    const promo = stripe.promotionCodes as any
    const list = await promo.list({ limit: 100 })

    const couponCache = new Map<string, any>()
    const getCoupon = async (c: any) => {
      if (!c) return null
      if (typeof c === "object") return c
      if (!couponCache.has(c)) couponCache.set(c, await stripe.coupons.retrieve(c).catch(() => null))
      return couponCache.get(c)
    }

    const rows: Row[] = []
    for (const p of list.data as any[]) {
      const coupon = await getCoupon(p.coupon ?? p.promotion?.coupon)
      rows.push({
        id: p.id,
        code: p.code,
        active: !!p.active,
        percentOff: coupon?.percent_off ?? null,
        amountOff: coupon?.amount_off != null ? coupon.amount_off / 100 : null,
        timesRedeemed: p.times_redeemed ?? 0,
        maxRedemptions: p.max_redemptions ?? null,
        expiresAt: p.expires_at ?? null,
        minAmount: p.restrictions?.minimum_amount != null ? p.restrictions.minimum_amount / 100 : null,
        createdAt: p.created,
      })
    }
    return NextResponse.json({ codes: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur Stripe" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide" }, { status: 400 })

  const promo = stripe.promotionCodes as any

  // activer / désactiver un code existant
  if (typeof body.id === "string" && typeof body.active === "boolean") {
    try {
      await promo.update(body.id, { active: body.active })
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Erreur Stripe" }, { status: 500 })
    }
  }

  // création
  const kind = body.kind === "amount" ? "amount" : "percent"
  const value = Number(String(body.value).replace(",", "."))
  if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: "La valeur de la réduction est invalide" }, { status: 400 })
  if (kind === "percent" && value > 100) return NextResponse.json({ error: "Une réduction ne peut pas dépasser 100 %" }, { status: 400 })

  let code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")
  if (code.length > 30) return NextResponse.json({ error: "Code trop long (30 caractères maximum)" }, { status: 400 })
  if (!code) code = `FYSU-${randomBytes(3).toString("hex").toUpperCase()}`

  const max = body.maxRedemptions === "" || body.maxRedemptions == null ? null : Math.floor(Number(body.maxRedemptions))
  if (max !== null && (!Number.isFinite(max) || max < 1)) return NextResponse.json({ error: "Nombre d'utilisations invalide" }, { status: 400 })

  let expires: number | null = null
  if (body.expiresAt) {
    const d = new Date(`${String(body.expiresAt)}T23:59:59`)
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return NextResponse.json({ error: "La date d'expiration doit être dans le futur" }, { status: 400 })
    expires = Math.floor(d.getTime() / 1000)
  }

  const minRaw = body.minAmount === "" || body.minAmount == null ? null : Number(String(body.minAmount).replace(",", "."))
  if (minRaw !== null && (!Number.isFinite(minRaw) || minRaw < 0)) return NextResponse.json({ error: "Montant minimum invalide" }, { status: 400 })

  try {
    const coupon = await stripe.coupons.create({
      ...(kind === "percent"
        ? { percent_off: value }
        : { amount_off: Math.round(value * 100), currency: "eur" }),
      duration: "once",
      name: code,
    })

    const extra: Record<string, unknown> = {
      code,
      ...(max !== null ? { max_redemptions: max } : {}),
      ...(expires ? { expires_at: expires } : {}),
      ...(minRaw ? { restrictions: { minimum_amount: Math.round(minRaw * 100), minimum_amount_currency: "eur" } } : {}),
    }

    try {
      await promo.create({ promotion: { type: "coupon", coupon: coupon.id }, ...extra })
    } catch {
      // ancienne forme de l'API Stripe
      await promo.create({ coupon: coupon.id, ...extra })
    }
    return NextResponse.json({ ok: true, code })
  } catch (e: any) {
    const msg = String(e?.message ?? "")
    return NextResponse.json(
      { error: msg.includes("already exists") ? "Ce code existe déjà. Choisis-en un autre." : msg || "Erreur Stripe" },
      { status: 500 }
    )
  }
}
