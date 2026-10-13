import type { ProductType } from "@/types/product"

/* Les derniers produits vus, gardés dans le navigateur du visiteur (rien n'est envoyé au serveur). */

const KEY = "fysu-recent-v1"
const MAX = 8

export function rememberProduct(p: ProductType) {
  if (!p?.slug) return
  try {
    const snap = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      evocation: p.evocation ?? null,
      availability: p.availability ?? null,
      release_date: p.release_date ?? null,
      brand: p.brand ?? null,
      product_images: (p.product_images ?? []).slice(0, 8).map((i) => ({
        id: i.id,
        url: i.url,
        color: i.color,
        is_hover: i.is_hover ?? null,
      })),
    }
    const list = readRecent().filter((x) => x.slug !== p.slug)
    list.unshift(snap as unknown as ProductType)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
}

export function readRecent(excludeSlug?: string): ProductType[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as ProductType[]
    return Array.isArray(list) ? list.filter((x) => x && x.slug && x.slug !== excludeSlug) : []
  } catch {
    return []
  }
}
