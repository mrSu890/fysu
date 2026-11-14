import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL } from "@/lib/emailBlocks"

export const runtime = "nodejs"

/* ADMIN : liste des produits (nom, prix, photo, lien) pour les grilles de la newsletter. ?q= filtre par nom */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase()
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price, slug, is_hidden, product_images (url, is_hover)")
    .eq("is_hidden", false)
    .order("createdAt", { ascending: false })
    .limit(300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data ?? [])
    .filter((p: any) => !q || String(p.name).toLowerCase().includes(q))
    .slice(0, 60)
    .map((p: any) => {
      const imgs = p.product_images ?? []
      const img = imgs.find((i: any) => !i.is_hover) ?? imgs[0]
      return { id: p.id, name: p.name, price: Number(p.price), imageUrl: img?.url ?? "", url: `${SITE_URL}/product/${p.slug}` }
    })
  return NextResponse.json({ items })
}
