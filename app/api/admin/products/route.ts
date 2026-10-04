import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// Seuil "stock bas" (par taille active)
const LOW_STOCK = 3

// Liste légère des produits pour le catalogue admin (réservée aux admins par le middleware)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, name, slug, price, gender, product_type, category_id, createdAt, is_hidden, product_images(url), product_sizes(stock, is_active)"
    )
    .order("createdAt", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const products = (data ?? []).map((p: any) => {
    const sizes = ((p.product_sizes ?? []) as { stock: number | null; is_active: boolean }[]).filter(
      (s) => s.is_active
    )
    const totalStock = sizes.reduce((sum, s) => sum + Math.max(0, Number(s.stock ?? 0)), 0)
    const soldOutSizes = sizes.filter((s) => Number(s.stock ?? 0) <= 0).length
    const lowSizes = sizes.filter(
      (s) => Number(s.stock ?? 0) > 0 && Number(s.stock ?? 0) <= LOW_STOCK
    ).length

    let stockState: "none" | "out" | "low" | "ok" = "ok"
    if (sizes.length === 0) stockState = "none"
    else if (totalStock === 0) stockState = "out"
    else if (soldOutSizes > 0 || lowSizes > 0) stockState = "low"

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price ?? 0),
      gender: p.gender ?? "",
      product_type: p.product_type ?? "clothing",
      category_id: p.category_id ?? null,
      createdAt: p.createdAt,
      is_hidden: !!p.is_hidden,
      thumbnail: p.product_images?.[0]?.url ?? null,
      totalStock,
      sizeCount: sizes.length,
      stockState,
    }
  })

  return NextResponse.json({ products, lowStockThreshold: LOW_STOCK })
}
