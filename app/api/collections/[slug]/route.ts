import { localize } from "@/lib/translate"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Charger la page collection
  const { data: pages, error: pageError } = await supabaseAdmin
    .from("collectionPages")
    .select("*")
    .eq("slug", slug)
    .eq("visible", true)
    .limit(1)

  if (pageError || !pages || pages.length === 0) {
    return NextResponse.json(
      { error: "Collection not found" },
      { status: 404 }
    )
  }

  const page = pages[0]

  // Aucun produit
  if (!Array.isArray(page.products) || page.products.length === 0) {
    return NextResponse.json(await localize({ page, products: [] }))
  }

  // Produits + images
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select(`
      *,
      categories (
        id,
        name,
        slug
      ),
      product_images (
        id,
        url,
        color,
        productId
      ),
      product_sizes (
        stock,
        is_active
      )
    `)
    .in("id", page.products)
    .eq("is_hidden", false)

  if (productsError) {
    console.error(productsError)
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    )
  }

  // Respecter l’ordre + choisir une image principale
  const orderedProducts = page.products
    .map((id: number) => products.find(p => p.id === id))
    .filter(Boolean)
    .map((product: any) => ({
      ...product,
      category: product?.categories?.name ?? null,
      main_image:
        product.product_images?.[0]?.url ?? null,
    }))

  return NextResponse.json(
    await localize({
      page,
      products: orderedProducts,
    })
  )
}
