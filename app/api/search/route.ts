import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ====================================================================
   RECHERCHE (public)
   GET /api/search?q=gig  ->  produits, pages, collections et albums qui correspondent
   Sans texte : quelques suggestions (nouveautés, pages, collections, albums)
   Les noms propres (produits, pages, albums) ne sont jamais traduits.
   ==================================================================== */

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("q") ?? ""
  // on retire les caractères qui ont un sens dans les filtres Supabase
  const q = raw.replace(/[,()%*"'\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60)
  const has = q.length > 0
  const like = `%${q}%`

  try {
    // ----- produits -----
    let productsQuery = supabaseAdmin
      .from("products")
      .select(
        "id, name, slug, price, product_type, product_images:product_images!product_images_productId_fkey(url)"
      )
      .eq("is_hidden", false)
      .limit(has ? 6 : 4)

    productsQuery = has
      ? productsQuery.or(`name.ilike.${like},description.ilike.${like},evocation.ilike.${like}`)
      : productsQuery.order("createdAt", { ascending: false })

    // ----- pages -----
    let pagesQuery = supabaseAdmin
      .from("pages")
      .select("title, slug")
      .eq("visible", true)
      .order("created_at", { ascending: true })
      .limit(8)
    if (has) pagesQuery = pagesQuery.ilike("title", like)

    // ----- collections -----
    let collectionsQuery = supabaseAdmin
      .from("collectionPages")
      .select("title, slug")
      .order("created_at", { ascending: false })
      .limit(6)
    if (has) collectionsQuery = collectionsQuery.ilike("title", like)

    // ----- albums -----
    let albumsQuery = supabaseAdmin
      .from("music_albums")
      .select("title, slug, artist, cover_url")
      .eq("visible", true)
      .order("display_order", { ascending: true })
      .limit(5)
    if (has) albumsQuery = albumsQuery.or(`title.ilike.${like},artist.ilike.${like}`)

    const [products, pages, collections, albums] = await Promise.all([
      productsQuery,
      pagesQuery,
      collectionsQuery,
      albumsQuery,
    ])

    const hidden = ["kiban-collector", "thewave"]

    return NextResponse.json({
      products: (products.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.product_images?.[0]?.url ?? null,
      })),
      pages: pages.data ?? [],
      collections: (collections.data ?? []).filter((c: any) => !hidden.includes(c.slug)),
      albums: albums.data ?? [],
    })
  } catch (err) {
    console.error("search:", err)
    return NextResponse.json({ products: [], pages: [], collections: [], albums: [] })
  }
}
