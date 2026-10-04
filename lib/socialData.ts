import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type PieceCard = { id: number; name: string; slug: string | null; image: string | null; qty?: number }

const BAD = ["pending", "canceled", "cancelled", "failed", "refunded"]

async function productsByIds(ids: number[]) {
  const map = new Map<number, PieceCard>()
  if (!ids.length) return map
  const { data } = await supabaseAdmin
    .from("products")
    .select("id, name, slug, is_hidden, product_images!product_images_productId_fkey(url, color)")
    .in("id", ids)
  for (const p of (data ?? []) as any[]) {
    if (p.is_hidden) continue
    map.set(Number(p.id), { id: Number(p.id), name: p.name, slug: p.slug ?? null, image: p.product_images?.[0]?.url ?? null })
  }
  return map
}

export async function loadProducts(ids: number[]) {
  return productsByIds(Array.from(new Set(ids)))
}

/* Pièces possédées (commandes payées) */
export async function loadCloset(userId: string): Promise<PieceCard[]> {
  const { data } = await supabaseAdmin.from("orders").select("status, items").eq("user_id", userId)
  const qty = new Map<number, number>()
  for (const o of (data ?? []) as any[]) {
    if (BAD.includes(String(o.status ?? "").toLowerCase())) continue
    let items: any = o.items
    if (typeof items === "string") {
      try {
        items = JSON.parse(items)
      } catch {
        items = []
      }
    }
    if (!Array.isArray(items)) continue
    for (const it of items) {
      const pid = Number(it?.product_id)
      if (!Number.isFinite(pid)) continue
      qty.set(pid, (qty.get(pid) ?? 0) + Math.max(1, Number(it?.quantity) || 1))
    }
  }
  const prods = await productsByIds(Array.from(qty.keys()))
  return Array.from(qty.entries())
    .map(([id, q]) => (prods.has(id) ? { ...prods.get(id)!, qty: q } : null))
    .filter(Boolean) as PieceCard[]
}

export async function loadWishlistCards(userId: string): Promise<PieceCard[]> {
  const { data } = await supabaseAdmin.from("wishlist").select("product_id").eq("user_id", userId)
  const ids = (data ?? []).map((r: any) => Number(r.product_id)).filter(Number.isFinite)
  const prods = await productsByIds(ids)
  return ids.map((i) => prods.get(i)).filter(Boolean) as PieceCard[]
}
