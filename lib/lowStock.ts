import type { ProductType } from "@/types/product"

/* Stock bas : « Plus que 2 » quand il reste très peu de pièces (toutes tailles actives confondues).
   Réglage : LOW_STOCK_MAX. Renvoie null s'il n'y a rien à afficher. */
export const LOW_STOCK_MAX = 3

export function lowStockCount(product: Pick<ProductType, "product_sizes">): number | null {
  const sizes = (product.product_sizes ?? []).filter((s) => s.is_active)
  if (sizes.length === 0) return null
  const total = sizes.reduce((sum, s) => sum + Math.max(0, Number(s.stock) || 0), 0)
  return total >= 1 && total <= LOW_STOCK_MAX ? total : null
}

export function lowStockText(n: number, locale: string): string {
  if (locale.startsWith("fr")) return n === 1 ? "Dernière pièce" : `Plus que ${n}`
  if (locale.startsWith("nl")) return n === 1 ? "Laatste stuk" : `Nog maar ${n}`
  if (locale.startsWith("ja")) return n === 1 ? "残り1点" : `残り${n}点`
  return n === 1 ? "Last piece" : `Only ${n} left`
}
