import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const revalidate = 3600

/* Icône de l'onglet : la pochette de l'album « When the flowers bloom – Vol.1 »
   (prise dans Admin > Musique, donc si vous changez la pochette, l'icône suit) */

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from("music_albums")
      .select("cover_url, title")
      .ilike("title", "%flowers bloom%")
      .not("cover_url", "is", null)
      .order("title", { ascending: true })
      .limit(5)

    const vol1 = (data ?? []).find((a: any) => /vol\.?\s*1/i.test(a.title)) ?? data?.[0]
    if (vol1?.cover_url) {
      const img = await fetch(vol1.cover_url)
      if (img.ok) {
        return new Response(await img.arrayBuffer(), {
          headers: {
            "Content-Type": img.headers.get("content-type") || "image/jpeg",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        })
      }
    }
  } catch {}
  return new Response(null, { status: 404 })
}
