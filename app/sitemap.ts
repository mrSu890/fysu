import type { MetadataRoute } from "next"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "")

// Plan du site pour Google : pages fixes + produits, collections, pages de marque et albums publiés.
// Se met à jour tout seul (au plus une fois par heure).
export const revalidate = 3600

type Row = { slug: string | null; visible?: boolean | null }

async function slugs(table: string, columns: string): Promise<string[]> {
  try {
    let query = supabaseAdmin.from(table).select(columns)
    // les produits masqués n'apparaissent pas dans le plan du site
    if (table === "products") query = query.eq("is_hidden", false)
    const { data, error } = await query
    if (error || !data) return []
    return (data as unknown as Row[])
      .filter((r) => r.slug && r.visible !== false)
      .map((r) => r.slug as string)
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const fixed = ["", "/thewave", "/kiban-collector", "/fygrances", "/music", "/games", "/about", "/privacy"]

  const [products, collections, brandPages, albums] = await Promise.all([
    slugs("products", "slug"),
    slugs("pages", "slug, visible"),
    slugs("collectionPages", "slug, visible"),
    slugs("music_albums", "slug, visible"),
  ])

  const reserved = new Set(["thewave", "kiban-collector", "fygrances"])
  const urls = [
    ...fixed.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...brandPages.filter((s) => !reserved.has(s)).map((s) => ({ url: `${SITE}/${s}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...collections.map((s) => ({ url: `${SITE}/collections/${s}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((s) => ({ url: `${SITE}/product/${s}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...albums.map((s) => ({ url: `${SITE}/music/${s}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ]

  return urls.map((u) => ({ ...u, lastModified: now }))
}
