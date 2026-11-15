import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/emailBlocks"
import { DEFAULT_EXTRAS, DEFAULT_ORDER_COPY, langForCountry, renderOrderEmail, type OrderCopy, type OrderData, type OrderExtras } from "@/lib/orderEmail"
import { latestProducts } from "@/lib/emailProducts"
import type { ProductPick } from "@/lib/emailBlocks"
import { resendOne, resendReady } from "@/lib/resend"

export async function loadOrderSettings(): Promise<{ copy: Record<"fr" | "en", OrderCopy>; extras: OrderExtras }> {
  try {
    const { data } = await supabaseAdmin.from("email_templates").select("data").eq("key", "order_confirmation").maybeSingle()
    const d = data?.data as (Partial<Record<"fr" | "en", Partial<OrderCopy>>> & { shared?: Partial<OrderExtras> }) | undefined
    return {
      copy: { fr: { ...DEFAULT_ORDER_COPY.fr, ...(d?.fr ?? {}) }, en: { ...DEFAULT_ORDER_COPY.en, ...(d?.en ?? {}) } },
      extras: { ...DEFAULT_EXTRAS, ...(d?.shared ?? {}) },
    }
  } catch {
    return { copy: DEFAULT_ORDER_COPY, extras: DEFAULT_EXTRAS }
  }
}

/** produits de la section « à découvrir » selon le réglage (auto : les 2 derniers, hors ceux achetés) */
export async function pickDiscover(extras: OrderExtras, exclude: number[]): Promise<ProductPick[]> {
  if (extras.discoverMode === "off") return []
  if (extras.discoverMode === "manual") return (extras.discoverItems ?? []).filter((p) => !exclude.includes(p.id)).slice(0, 4)
  return latestProducts(exclude, 2)
}

/* Envoyé juste après l'enregistrement de la commande. Ne fait JAMAIS échouer le paiement : tout est protégé. */
export async function sendOrderConfirmation(order: { id: string; email: string | null; total: number; currency: string; shipping_data: any; items: any[] }) {
  try {
    if (!resendReady() || !order.email) return
    const ids = Array.from(new Set((order.items ?? []).map((i) => Number(i.product_id)).filter(Boolean)))
    const { data: prods } = await supabaseAdmin.from("products").select("id, name, price, slug, product_images (url, color, is_hover)").in("id", ids)
    const byId = new Map<number, any>((prods ?? []).map((p: any) => [p.id, p]))

    const lines = (order.items ?? []).map((i) => {
      const p = byId.get(Number(i.product_id))
      const imgs = p?.product_images ?? []
      const img = imgs.find((m: any) => !m.is_hover && i.color_name && m.color === i.color_name) ?? imgs.find((m: any) => !m.is_hover) ?? imgs[0]
      return {
        name: p?.name ?? "FYSU",
        detail: String(i.size_label ?? ""),
        quantity: Number(i.quantity) || 1,
        unit: p ? Number(p.price) : undefined,
        imageUrl: img?.url,
        url: p ? `${SITE_URL}/product/${p.slug}` : undefined,
      }
    })
    const a = order.shipping_data?.address ?? {}
    const shipTo = [
      order.shipping_data?.name,
      a.line1,
      a.line2,
      [a.postal_code, a.city].filter(Boolean).join(" "),
      a.country,
    ].filter(Boolean) as string[]
    const firstName = String(order.shipping_data?.name ?? "").trim().split(/\s+/)[0] ?? ""
    const data: OrderData = { id: order.id, firstName, lines, total: (order.total ?? 0) / 100, currency: order.currency || "eur", shipTo }
    const lang = langForCountry(a.country)
    const settings = await loadOrderSettings()
    const discover = await pickDiscover(settings.extras, ids)
    const { subject, html, text } = renderOrderEmail(settings.copy[lang], data, lang, settings.extras, discover)
    await resendOne({
      from: process.env.ORDERS_FROM || process.env.NEWSLETTER_FROM!,
      to: [order.email],
      subject,
      html,
      text,
      reply_to: process.env.NEWSLETTER_REPLY_TO || BUSINESS.email,
    })
  } catch (e) {
    console.error("order email:", e)
  }
}
