import type { ProductType } from "@/types/product"

/* ====================================================================
   UN PRODUIT À PLUSIEURS COULEURS = UNE CARTE PAR COULEUR
   Dans les rangées et les grilles (For Him, For Her, collections), un vêtement qui existe en
   3 couleurs s'affiche 3 fois, chaque carte avec les photos de sa couleur.
   Un toucher sur la carte ouvre la fiche avec cette couleur déjà choisie (?color=).
   ==================================================================== */

// Une seule carte par produit : les couleurs se changent directement sur la carte (pastilles, voir components/Product.tsx)
export function expandByColor(products: ProductType[]): ProductType[] {
  return products
}

export const variantKey = (p: ProductType) => `${p.id}-${p.variant_color ?? ""}`
