import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// En dessous de ce nombre de pièces, une taille est signalée dans "Stock à surveiller"
const LOW_STOCK_THRESHOLD = 3
const TZ = "Europe/Brussels"

// Jour (AAAA-MM-JJ) d'une date, à l'heure de Bruxelles
const dayKey = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ })

// Chiffres du tableau de bord (la route est réservée aux admins par le middleware)
export async function GET() {
  const now = Date.now()
  const since7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString()
  const since30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString()

  const [toShipRes, paidRes, recentRes, productsRes, sizesRes, requestsRes] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    supabaseAdmin
      .from("orders")
      .select("total, createdAt, items")
      .in("status", ["paid", "shipped"])
      .gte("createdAt", since30)
      .limit(5000),
    supabaseAdmin
      .from("orders")
      .select("id, status, total, currency, email, createdAt, shipping_data")
      .order("createdAt", { ascending: false })
      .limit(6),
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("product_sizes")
      .select("id, product_id, color_id, size, stock, is_active")
      .eq("is_active", true)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(8),
    supabaseAdmin
      .from("product_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ])

  /* ---------- Chiffre d'affaires (montants en centimes) ---------- */

  let revenue7 = 0
  let revenue30 = 0
  let orders7 = 0
  let orders30 = 0

  // une case par jour sur 30 jours, du plus ancien au plus récent
  const days: { date: string; revenue: number; orders: number }[] = []
  const dayIndex = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(new Date(now - i * 24 * 3600 * 1000))
    dayIndex.set(key, days.length)
    days.push({ date: key, revenue: 0, orders: 0 })
  }

  const soldByProduct = new Map<number, number>()

  for (const o of (paidRes.data ?? []) as {
    total: number | null
    createdAt: string
    items: any
  }[]) {
    const total = Number(o.total ?? 0)
    revenue30 += total
    orders30 += 1
    if (o.createdAt >= since7) {
      revenue7 += total
      orders7 += 1
    }

    const idx = dayIndex.get(dayKey(o.createdAt))
    if (idx !== undefined) {
      days[idx].revenue += total
      days[idx].orders += 1
    }

    for (const it of Array.isArray(o.items) ? o.items : []) {
      const pid = Number(it?.product_id)
      const qty = Number(it?.quantity) || 0
      if (Number.isFinite(pid) && qty > 0) soldByProduct.set(pid, (soldByProduct.get(pid) ?? 0) + qty)
    }
  }

  /* ---------- Produits les plus vendus (30 jours) ---------- */

  const topIds = Array.from(soldByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const topNames = new Map<number, { name: string; image: string | null }>()
  if (topIds.length) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id, name, product_images(url)")
      .in(
        "id",
        topIds.map(([id]) => id)
      )
    for (const p of (data ?? []) as any[]) {
      topNames.set(Number(p.id), { name: p.name, image: p.product_images?.[0]?.url ?? null })
    }
  }

  const topProducts = topIds.map(([id, sold]) => ({
    productId: id,
    name: topNames.get(id)?.name ?? `Produit #${id}`,
    image: topNames.get(id)?.image ?? null,
    sold,
  }))

  /* ---------- Stock bas (avec la couleur) ---------- */

  const sizes = (sizesRes.data ?? []) as {
    id: string
    product_id: number
    color_id: string | null
    size: string
    stock: number
  }[]

  const productIds = Array.from(new Set(sizes.map((s) => s.product_id)))
  const colorIds = Array.from(new Set(sizes.map((s) => s.color_id).filter(Boolean))) as string[]

  const namesById: Record<number, string> = {}
  const colorsById: Record<string, { name: string; count: number }> = {}

  if (productIds.length > 0) {
    const [productsData, colorsData, colorCounts] = await Promise.all([
      supabaseAdmin.from("products").select("id, name").in("id", productIds),
      colorIds.length
        ? supabaseAdmin.from("product_colors").select("id, name").in("id", colorIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("product_colors").select("product_id").in("product_id", productIds),
    ])

    for (const p of (productsData.data ?? []) as { id: number; name: string }[]) {
      namesById[p.id] = p.name
    }

    const countByProduct: Record<number, number> = {}
    for (const c of (colorCounts.data ?? []) as { product_id: number }[]) {
      countByProduct[c.product_id] = (countByProduct[c.product_id] ?? 0) + 1
    }

    for (const c of (colorsData.data ?? []) as { id: string; name: string }[]) {
      colorsById[c.id] = { name: c.name, count: 0 }
    }

    // on n'affiche la couleur que pour les produits qui en ont plusieurs
    for (const s of sizes) {
      if (s.color_id && colorsById[s.color_id]) {
        colorsById[s.color_id].count = countByProduct[s.product_id] ?? 0
      }
    }
  }

  const lowStock = sizes.map((s) => {
    const color = s.color_id ? colorsById[s.color_id] : undefined
    return {
      id: s.id,
      productId: s.product_id,
      name: namesById[s.product_id] ?? `Produit #${s.product_id}`,
      color: color && color.count > 1 ? color.name : null,
      size: s.size,
      stock: s.stock,
    }
  })

  return NextResponse.json({
    toShip: toShipRes.count ?? 0,
    revenue7,
    revenue30,
    orders7,
    orders30,
    averageBasket: orders30 > 0 ? Math.round(revenue30 / orders30) : 0,
    products: productsRes.count ?? 0,
    newRequests: requestsRes.count ?? 0,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStock,
    topProducts,
    days,
    recent: (recentRes.data ?? []).map((o: any) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      currency: o.currency,
      email: o.email,
      name: o.shipping_data?.name ?? null,
      createdAt: o.createdAt,
    })),
  })
}
