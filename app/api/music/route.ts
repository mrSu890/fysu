import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ====================================================================
   MUSIQUE (public)
   GET /api/music?collection=thewave  -> albums visibles liés à cette collection
   GET /api/music?slug=mon-album      -> un album avec tous ses titres
   ==================================================================== */

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const slug = params.get("slug")
  const collection = params.get("collection")

  // ----- un album -----
  if (slug) {
    const { data, error } = await supabaseAdmin
      .from("music_albums")
      .select(
        "id, slug, title, artist, description, cover_url, brand, collection_slugs, visible, display_order, music_tracks(*)"
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

    return NextResponse.json({ ...album, tracks })
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

  return NextResponse.json(albums)
}
