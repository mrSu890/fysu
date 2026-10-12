import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* Quels produits appartiennent à Kiban Collector ou à The Wave ?
   - ceux rangés dans la page Kiban Collector / The Wave (admin > Pages)
   - ceux dont la marque est choisie à la main dans la fiche produit
   Sert à afficher le petit logo de la marque sur les cartes produit des autres pages. */
export async function GET() {
  const kiban = new Set<number>()
  const thewave = new Set<number>()

  const { data: pages } = await supabaseAdmin
    .from("collectionPages")
    .select("slug, products")
    .in("slug", ["thewave", "kiban-collector"])

  for (const page of (pages ?? []) as { slug: string; products: unknown }[]) {
    const ids = Array.isArray(page.products) ? page.products.map((x) => Number(x)) : []
    ids.forEach((id) => (page.slug === "thewave" ? thewave : kiban).add(id))
  }

  const { data: branded } = await supabaseAdmin.from("products").select("id, brand").in("brand", ["thewave", "kiban"])
  for (const p of (branded ?? []) as { id: number; brand: string }[]) {
    ;(p.brand === "thewave" ? thewave : kiban).add(Number(p.id))
  }

  return NextResponse.json(
    { kiban: Array.from(kiban), thewave: Array.from(thewave) },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  )
}
