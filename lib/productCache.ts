import type { ProductType } from "@/types/product"

/* Fiche produit chargée d'avance : dès que le doigt se pose sur une carte, on demande la fiche.
   Quand la page s'ouvre, les données sont déjà là. Garde 45 secondes (le stock reste à jour). */

const TTL = 45_000
const cache = new Map<string, { t: number; p: Promise<ProductType> }>()

export function fetchProductCached(slug: string): Promise<ProductType> {
  const hit = cache.get(slug)
  if (hit && Date.now() - hit.t < TTL) return hit.p
  const p = fetch(`/api/products/${slug}`).then((res) => {
    if (!res.ok) throw new Error("Product not found")
    return res.json() as Promise<ProductType>
  })
  cache.set(slug, { t: Date.now(), p })
  p.catch(() => cache.delete(slug))
  return p
}

export function prefetchProduct(slug: string) {
  fetchProductCached(slug).catch(() => {})
}
