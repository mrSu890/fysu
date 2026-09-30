import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// En dessous de ce nombre de pièces, une taille est signalée dans "Stock à surveiller"
const LOW_STOCK_THRESHOLD = 3

// Chiffres du tableau de bord (la route est réservée aux admins par le middleware)
export async function GET() {
  const now = Date.now()
  const since7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString()
  const since30 = new Date(now - 30 * 24 * 3600 * 1000).toISOString()

  const [toShipRes, paidRes, recentRes, productsRes, sizesRes] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid"),
    supabaseAdmin
      .from("orders")
      .select("total, createdAt")
      .in("status", ["paid", "shipped"])
      .gte("createdAt", since30),
    supabaseAdmin
      .from("orders")
      .select("id, status, total, currency, email, createdAt")
      .order("createdAt", { ascending: false })
      .limit(6),
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("product_sizes")
      .select("id, product_id, size, stock, is_active")
      .eq("is_active", true)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(8),
  ])

  // Chiffre d'affaires (les montants sont en centimes)
  let revenue7 = 0
  let revenue30 = 0
  let orders7 = 0
  let orders30 = 0
  for (const o of (paidRes.data ?? []) as { total: number | null; createdAt: string }[]) {
    const total = Number(o.total ?? 0)
    revenue30 += total
    orders30 += 1
    if (o.createdAt >= since7) {
      revenue7 += total
      orders7 += 1
    }
  }

  // Noms des produits dont le stock est bas
  const sizes = (sizesRes.data ?? []) as {
    id: string
    product_id: number
    size: string
    stock: number
  }[]
  const productIds = Array.from(new Set(sizes.map((s) => s.product_id)))
  const namesById: Record<number, { name: string; slug: string }> = {}

  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, slug")
      .in("id", productIds)
    for (const p of (products ?? []) as { id: number; name: string; slug: string }[]) {
      namesById[p.id] = { name: p.name, slug: p.slug }
    }
  }

  const lowStock = sizes.map((s) => ({
    id: s.id,
    productId: s.product_id,
    name: namesById[s.product_id]?.name ?? `Produit #${s.product_id}`,
    size: s.size,
    stock: s.stock,
  }))

  return NextResponse.json({
    toShip: toShipRes.count ?? 0,
    revenue7,
    revenue30,
    orders7,
    orders30,
    products: productsRes.count ?? 0,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStock,
    recent: recentRes.data ?? [],
  })
}
