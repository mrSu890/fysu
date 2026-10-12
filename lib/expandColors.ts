import type { ProductType } from "@/types/product"

/* ====================================================================
   UN PRODUIT À PLUSIEURS COULEURS = UNE CARTE PAR COULEUR
   Dans les rangées et les grilles (For Him, For Her, collections), un vêtement qui existe en
   3 couleurs s'affiche 3 fois, chaque carte avec les photos de sa couleur.
   Un toucher sur la carte ouvre la fiche avec cette couleur déjà choisie (?color=).
   ==================================================================== */

export function expandByColor(products: ProductType[]): ProductType[] {
  const out: ProductType[] = []
  for (const p of products) {
    const images = p.product_images ?? []
    const colors: string[] = []
    for (const img of images) {
      const c = (img.color ?? "").toLowerCase()
      if (c && c !== "lit" && c !== "swatch" && !colors.includes(c)) colors.push(c)
    }
    if (colors.length <= 1) {
      out.push(p)
      continue
    }
    colors.forEach((hex, i) => {
      const own = images.filter((img) => {
        const c = (img.color ?? "").toLowerCase()
        // les images sans couleur reconnue vont sur la première couleur
        return c === hex || (i === 0 && !colors.includes(c))
      })
      out.push({ ...p, product_images: own, variant_color: hex })
    })
  }
  return out
}

export const variantKey = (p: ProductType) => `${p.id}-${p.variant_color ?? ""}`
