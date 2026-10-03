import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ====================================================================
   MUSIQUE (public)
   GET /api/music?collection=thewave  -> albums visibles liés à cette collection
   GET /api/music?slug=mon-album      -> un album avec tous ses titres
   ==================================================================== */

// Retrouve la page de chaque collection liée à l'album (pour les liens « Retour à … »)
async function resolveCollections(slugs: string[]) {
  const fixed: Record<string, { href: string; title: string }> = {
    thewave: { href: "/thewave", title: "The Wave" },
    "kiban-collector": { href: "/kiban-collector", title: "Kiban Collector" },
  }
  const out: { slug: string; href: string; title: string }[] = []

  for (const slug of slugs) {
    if (fixed[slug]) {
      out.push({ slug, ...fixed[slug] })
      continue
    }
    try {
      const { data: cp } = await supabaseAdmin
        .from("collectionPages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle()
      if (cp) {
        out.push({ slug, href: `/collections/${slug}`, title: (cp as any).title ?? (cp as any).name ?? slug })
        continue
      }
      const { data: pg } = await supabaseAdmin
        .from("pages")
        .select("title, slug")
        .eq("slug", slug)
        .maybeSingle()
      if (pg) {
        out.push({ slug, href: `/${slug}`, title: (pg as any).title ?? slug })
        continue
      }
    } catch {
      /* on ignore : lien non affiché */
    }
    out.push({ slug, href: `/${slug}`, title: slug.replace(/-/g, " ") })
  }
  return out
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const slug = params.get("slug")
  const collection = params.get("collection")

  // ----- un album -----
  if (slug) {
    const { data, error } = await supabaseAdmin
      .from("music_albums")
      .select(
        "id, slug, title, artist, description, cover_url, brand, wave_bg, collection_slugs, visible, display_order, music_tracks(*)"
      )
      .eq("slug", slug)
      .eq("visible", true)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Album not found" }, { status: 404 })

    const { music_tracks, ...album } = data as any
    const tracks = [...(music_tracks ?? [])]
      .sort((a: any, b: any) => a.display_order - b.display_order || a.id - b.id)
      .map(({ audio_path, ...t }: any) => t)

    const collections = await resolveCollections((album as any).collection_slugs ?? [])

    return NextResponse.json({ ...album, tracks, collections })
  }

  // ----- la liste -----
  let query = supabaseAdmin
    .from("music_albums")
    .select("id, slug, title, artist, cover_url, brand, collection_slugs, display_order, music_tracks(id)")
    .eq("visible", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (collection) query = query.contains("collection_slugs", [collection])

  const { data, error } = await query
  if (error) {
    console.error("music list:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const albums = (data ?? [])
    .filter((a: any) => (a.music_tracks ?? []).length > 0)
    .map(({ music_tracks, ...album }: any) => ({ ...album, track_count: music_tracks.length }))

  // Pour chaque album : les pages / collections auxquelles il appartient (page « Tous les albums »)
  const allSlugs = [...new Set(albums.flatMap((a: any) => a.collection_slugs ?? []))] as string[]
  const resolved = await resolveCollections(allSlugs)
  const byslug = new Map(resolved.map((c) => [c.slug, c]))
  const withCollections = albums.map((a: any) => ({
    ...a,
    collections: (a.collection_slugs ?? [])
      .map((s: string) => byslug.get(s))
      .filter(Boolean),
  }))

  return NextResponse.json(withCollections)
}
