import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { localizeTo } from "@/lib/translate"
import { getEffectiveAvailability, type AvailabilityId } from "@/lib/availability"
import { SITE, SITE_NAME } from "@/lib/seo"

/* ====================================================================
   CATALOGUE PUBLIC : https://www.f-y-s-u.com/catalog.json
   Lecture seule. Liste chaque produit visible sur le site :
   nom (jamais traduit), lien, prix en euros, statut, collections, description en anglais.
   Aucune donnée privée : ni stock exact, ni coûts, ni clients, ni produits masqués.
   ==================================================================== */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const STATUS: Record<AvailabilityId, string> = {
  available: "in_stock",
  preorder: "preorder",
  notify: "notify_me",
  quote: "on_request",
  coming_soon: "coming_soon",
  sold_out: "sold_out",
}

const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
  "access-control-allow-origin": "*",
}

type Link = { title: string; slug: string; url: string }

export async function GET() {
  try {
    const [products, pages, sections, sectionPages, sectionProducts, collectionPages] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, slug, price, description, availability, product_sizes(stock, is_active)")
        .eq("is_hidden", false)
        .order("id", { ascending: true }),
      supabaseAdmin.from("pages").select("id, title, slug, visible"),
      supabaseAdmin.from("sections").select("id, is_active"),
      supabaseAdmin.from("section_pages").select("page_id, section_id"),
      supabaseAdmin.from("section_products").select("section_id, product_id"),
      supabaseAdmin.from("collectionPages").select("*"),
    ])

    if (products.error) throw new Error(products.error.message)

    // sections actives -> pages visibles (For him, For her, FY'grances…)
    const activeSections = new Set((sections.data ?? []).filter((s: any) => s.is_active).map((s: any) => s.id))
    const pageById = new Map<any, Link>()
    for (const p of (pages.data ?? []) as any[]) {
      if (p.visible !== false && p.slug) pageById.set(p.id, { title: String(p.title ?? p.slug), slug: p.slug, url: `${SITE}/${p.slug}` })
    }
    const pagesOfSection = new Map<any, Link[]>()
    for (const sp of (sectionPages.data ?? []) as any[]) {
      const page = pageById.get(sp.page_id)
      if (!page || !activeSections.has(sp.section_id)) continue
      pagesOfSection.set(sp.section_id, [...(pagesOfSection.get(sp.section_id) ?? []), page])
    }

    const collectionsOf = new Map<number, Map<string, Link>>()
    const add = (productId: number, link: Link) => {
      if (!collectionsOf.has(productId)) collectionsOf.set(productId, new Map())
      collectionsOf.get(productId)!.set(link.slug, link)
    }
    for (const row of (sectionProducts.data ?? []) as any[]) {
      for (const link of pagesOfSection.get(row.section_id) ?? []) add(Number(row.product_id), link)
    }
    // pages de marque / collections (TheWave, Kiban Collector, /collections/…)
    for (const c of (collectionPages.data ?? []) as any[]) {
      if (c.visible === false || !c.slug || !Array.isArray(c.products)) continue
      const link: Link = {
        title: String(c.title ?? c.name ?? c.slug),
        slug: c.slug,
        url: c.slug === "thewave" || c.slug === "kiban-collector" ? `${SITE}/${c.slug}` : `${SITE}/collections/${c.slug}`,
      }
      for (const id of c.products) add(Number(id), link)
    }

    // descriptions en anglais (les noms ne passent jamais par la traduction)
    const descriptions = await localizeTo(
      (products.data ?? []).map((p: any) => ({ description: String(p.description ?? "").replace(/\s+/g, " ").trim() })),
      "en"
    )

    const items = (products.data ?? []).map((p: any, i: number) => ({
      name: String(p.name),
      slug: String(p.slug),
      url: `${SITE}/product/${p.slug}`,
      price: Number(p.price),
      currency: "EUR",
      status: STATUS[getEffectiveAvailability({ availability: p.availability, product_sizes: p.product_sizes })],
      collections: [...(collectionsOf.get(Number(p.id))?.values() ?? [])].map(({ title, slug, url }) => ({ title, slug, url })),
      description: descriptions[i]?.description ?? "",
    }))

    return new Response(
      JSON.stringify({ site: SITE, brand: SITE_NAME, currency: "EUR", count: items.length, products: items }, null, 2),
      { headers: HEADERS }
    )
  } catch (err) {
    console.error("catalog.json:", err)
    return new Response(JSON.stringify({ error: "Catalog unavailable" }), {
      status: 500,
      headers: { ...HEADERS, "cache-control": "no-store" },
    })
  }
}
