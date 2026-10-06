import type { Metadata } from "next"
import { pageMeta } from "@/lib/seo"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// Titre, description et pochette de chaque album
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data } = await supabaseAdmin
      .from("music_albums")
      .select("title, artist, description, cover_url")
      .eq("slug", slug)
      .eq("visible", true)
      .maybeSingle()
    if (!data) return {}
    const a = data as { title: string; artist: string | null; description: string | null; cover_url: string | null }
    const raw = (a.description ?? "").replace(/\s+/g, " ").trim()
    const description = raw
      ? raw.length > 155 ? `${raw.slice(0, 152)}…` : raw
      : `${a.title}${a.artist ? ` by ${a.artist}` : ""}. A FYSU album to listen to on the site.`
    return pageMeta({ title: `${a.title}${a.artist ? ` — ${a.artist}` : ""} | FYSU Music`, description, path: `/music/${slug}`, image: a.cover_url })
  } catch {
    return {}
  }
}

export default function AlbumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
