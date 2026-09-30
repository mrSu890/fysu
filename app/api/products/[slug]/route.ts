import { localize } from "@/lib/translate"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!slug) {
    return NextResponse.json(
      { error: "Invalid slug" },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      product_images (
        id,
        url,
        color
      ),
      product_sizes (
        id,
        size,
        stock,
        is_active,
        display_order,
        color_id
      ),
      product_colors!product_colors_product_id_fkey (
        id,
        product_id,
        name,
        hex,
        display_order
      ),
      product_info_blocks (
        id,
        image_url,
        title,
        subtitle,
        content,
        display_order
      ),
      product_suggestions!product_suggestions_product_id_fkey (
        display_order,
        suggested:products!product_suggestions_suggested_product_id_fkey (
          id,
          name,
          slug,
          price,
          availability,
          release_date,
          product_sizes (
            stock,
            is_active
          ),
          product_images (
            id,
            url,
            color
          )
        )
      )
    `)
    .eq("slug", slug)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    )
  }

  const product = data as any

  /* ================= FORMAT INFO BLOCKS ================= */

  const info_blocks =
    product.product_info_blocks
      ?.sort((a: any, b: any) => a.display_order - b.display_order) ?? []


  // Tri des tailles
  const sizes =
      product.product_sizes
        ?.sort((a: any, b: any) => a.display_order - b.display_order) ?? []

  // Tri des couleurs
  const colors =
    product.product_colors
      ?.sort((a: any, b: any) => a.display_order - b.display_order) ?? []

  /* ================= FORMAT SUGGESTIONS ================= */

  const suggested_products =
    product.product_suggestions
      ?.sort((a: any, b: any) => a.display_order - b.display_order)
      .map((s: any) => s.suggested) ?? []

  /* ================= MARQUE ================= */

  // Un produit rangé dans la page The Wave / Kiban Collector prend automatiquement son style,
  // sauf si une marque a été choisie à la main dans la fiche produit
  let brand: string = product.brand ?? "fysu"

  if (brand === "fysu") {
    const { data: brandPages } = await supabaseAdmin
      .from("collectionPages")
      .select("slug, products")
      .in("slug", ["thewave", "kiban-collector"])

    for (const page of (brandPages ?? []) as { slug: string; products: unknown }[]) {
      const ids = Array.isArray(page.products) ? page.products.map((x) => Number(x)) : []
      if (ids.includes(Number(product.id))) {
        brand = page.slug === "thewave" ? "thewave" : "kiban"
        break
      }
    }
  }

  /* ================= RESPONSE ================= */

  return NextResponse.json(
    await localize({
      ...product,
      brand,
      product_sizes: sizes,
      product_colors: colors,
      product_info_blocks: info_blocks,
      product_suggestions: suggested_products
    }),
    { status: 200 }
  )
}
