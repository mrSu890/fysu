import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL, type ProductPick } from "@/lib/emailBlocks"

/* Les derniers produits visibles de la boutique (pour « À découvrir »), hors ceux à exclure. */
export async function latestProducts(exclude: number[] = [], n = 2): Promise<ProductPick[]> {
  try {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id, name, price, slug, availability, product_images (url, is_hover)")
      .eq("is_hidden", false)
      .order("createdAt", { ascending: false })
      .limit(40)
    return (data ?? [])
      .filter((p: any) => !exclude.includes(p.id) && (p.availability ?? "available") !== "sold_out")
      .map((p: any) => {
        const imgs = p.product_images ?? []
        const img = imgs.find((i: any) => !i.is_hover) ?? imgs[0]
        return { id: p.id, name: p.name, price: Number(p.price), imageUrl: img?.url ?? "", url: `${SITE_URL}/product/${p.slug}` }
      })
      .filter((p: ProductPick) => p.imageUrl)
      .slice(0, n)
  } catch {
    return []
  }
}
