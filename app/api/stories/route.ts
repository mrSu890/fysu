import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* ====================================================================
   STORIES D'UNE PAGE : une seule requête côté serveur (clé admin → aucune règle de sécurité qui bloque),
   mise en cache 30 s par Vercel. Utilisée par components/Stories/StoryBar.tsx
   GET /api/stories?page=mon-slug   ou   /api/stories?collection=mon-slug
   ==================================================================== */

const VIDEO = /\.(mp4|mov|m4v|webm)(\?|$)/i
const num = (v: unknown) => (Number(v) > 0 ? Number(v) : 0)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const pageSlug = searchParams.get("page")
    const collectionSlug = searchParams.get("collection")
    if (!pageSlug && !collectionSlug) return NextResponse.json({ stories: [] })

    let column: "page_id" | "collection_page_id"
    let targetId: string | number | null = null

    if (pageSlug) {
      column = "page_id"
      const { data } = await supabaseAdmin.from("pages").select("id").eq("slug", pageSlug).maybeSingle()
      targetId = data?.id ?? null
    } else {
      column = "collection_page_id"
      const { data } = await supabaseAdmin.from("collectionPages").select("id").eq("slug", collectionSlug!).maybeSingle()
      targetId = data?.id ?? null
    }
    if (targetId === null) return NextResponse.json({ stories: [] }, { headers: cache() })

    const { data: links } = await supabaseAdmin
      .from("story_page_links")
      .select("story_id, priority")
      .eq(column, targetId)
    if (!links?.length) return NextResponse.json({ stories: [] }, { headers: cache() })

    const priority = new Map<string, number>()
    links.forEach((l: any) => priority.set(String(l.story_id), Number(l.priority) || 0))

    const { data: rows, error } = await supabaseAdmin
      .from("stories")
      .select("id, title, cover_url, order_index, is_active, story_items(*)")
      .in("id", links.map((l: any) => l.story_id))
      .eq("is_active", true)
    if (error) throw error

    // produits « Shop now » des diapos (une seule requête pour tous)
    const wanted = new Set<number>()
    ;(rows ?? []).forEach((s: any) =>
      (s.story_items ?? []).forEach((it: any) =>
        (Array.isArray(it.product_ids) ? it.product_ids : []).forEach((x: any) => Number.isFinite(Number(x)) && wanted.add(Number(x)))
      )
    )
    const productMap = new Map<number, any>()
    if (wanted.size > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, name, slug, price, is_hidden, product_images(url, is_hover)")
        .in("id", [...wanted])
      ;(prods ?? []).forEach((p: any) => {
        if (p.is_hidden) return
        const imgs = (p.product_images ?? []) as { url: string; is_hover?: boolean }[]
        const img = imgs.find((i) => !i.is_hover) ?? imgs[0]
        productMap.set(Number(p.id), { id: p.id, name: p.name, slug: p.slug, price: Number(p.price ?? 0), image: img?.url ?? null })
      })
    }

    const stories = (rows ?? [])
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        cover_url: s.cover_url,
        order_index: s.order_index ?? 0,
        story_items: [...(s.story_items ?? [])]
          .filter((it: any) => it.media_url)
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((it: any) => {
            const video = it.type === "video" || VIDEO.test(String(it.media_url))
            return {
              id: it.id,
              type: video ? "video" : "image",
              media_url: it.media_url,
              // jamais 0 ou vide : l'ancien système fermait la story tout de suite quand la durée manquait
              duration: num(it.duration) || (video ? 8 : 5),
              products: (Array.isArray(it.product_ids) ? it.product_ids : [])
                .map((x: any) => productMap.get(Number(x)))
                .filter(Boolean),
            }
          }),
      }))
      .filter((s: any) => s.story_items.length > 0)
      .sort(
        (a: any, b: any) =>
          (priority.get(String(b.id)) ?? 0) - (priority.get(String(a.id)) ?? 0) || a.order_index - b.order_index
      )

    return NextResponse.json({ stories }, { headers: cache() })
  } catch (e) {
    console.error("GET /api/stories", e)
    return NextResponse.json({ stories: [] }, { status: 200 })
  }
}

function cache() {
  return { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" }
}
