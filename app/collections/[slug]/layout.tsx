import type { Metadata } from "next"
import { HOME_DESCRIPTION, pageMeta } from "@/lib/seo"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// Titre, description et image de chaque collection, lus depuis la page de la collection
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data } = await supabaseAdmin
      .from("pages")
      .select("*")
      .eq("slug", slug)
      .eq("visible", true)
      .maybeSingle()
    if (!data) return {}
    const row = data as Record<string, unknown>
    const name = String(row.title ?? slug)
    const raw = typeof row.description === "string" ? row.description.replace(/\s+/g, " ").trim() : ""
    const description = raw ? (raw.length > 155 ? `${raw.slice(0, 152)}…` : raw) : `${name}, a FYSU collection. ${HOME_DESCRIPTION}`
    const image = typeof row.hero_image === "string" && row.hero_image ? row.hero_image : null
    return pageMeta({ title: `${name} — FYSU`, description, path: `/collections/${slug}`, image })
  } catch {
    return {}
  }
}

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
