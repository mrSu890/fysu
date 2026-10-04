import { NextResponse } from "next/server"
import { localize } from "@/lib/translate"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ====================================================================
   PAGE FY'GRANCES (public)
   - la page « fygrances » (image du haut)
   - tous les produits placés dans ses rangées (Admin > Collections & pages)
   - les chapitres (Admin > FY'grances) : image, titre, texte
   ==================================================================== */

export async function GET() {
  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("*")
    .eq("slug", "fygrances")
    .eq("visible", true)
    .maybeSingle()

  let products: any[] = []

  if (page) {
    const { data: links, error } = await supabaseAdmin
      .from("section_pages")
      .select(`
        section:sections (
          id,
          is_active,
          display_order,
          section_products (
            display_order,
            product:products (
              id,
              is_hidden,
              name,
              slug,
              price,
              gender,
              createdAt,
              product_type,
              olfactive_family,
              evocation,
              availability,
              release_date,
              product_images:product_images!product_images_productId_fkey (
                id,
                url,
                color
              ),
              product_sizes (
                stock,
                is_active
              )
            )
          )
        )
      `)
      .eq("page_id", page.id)

    if (error) console.error("fygrances:", error.message)

    const sections = (links ?? [])
      .map((l: any) => l.section)
      .filter((s: any) => s?.is_active)
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))

    const seen = new Set<number>()
    for (const section of sections) {
      const rows = [...(section.section_products ?? [])].sort(
        (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
      )
      for (const row of rows) {
        const p = row.product
        if (!p || p.is_hidden || seen.has(p.id)) continue
        seen.add(p.id)
        products.push(p)
      }
    }
  }

  const { data: chapters } = await supabaseAdmin
    .from("fygrances_chapters")
    .select("*")
    .order("display_order", { ascending: true })

  return NextResponse.json(
    await localize({ page: page ?? null, products, chapters: chapters ?? [] })
  )
}
