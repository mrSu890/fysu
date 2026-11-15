/* Rôles de l'équipe. « admin » garde tous les accès, comme avant.
   Les autres rôles n'ont accès qu'à leurs zones (pages /admin/… et routes /api/admin/…). */

export type Role = "admin" | "manager" | "support" | "content"

export const ROLE_LABEL: Record<Role, { label: string; hint: string }> = {
  admin: { label: "Admin", hint: "Tout, y compris l'équipe" },
  manager: { label: "Gestion", hint: "Commandes, produits, clients, analyses, mails" },
  support: { label: "Support", hint: "Commandes, demandes, clients" },
  content: { label: "Contenu", hint: "Pages du site, stories, newsletter" },
}

const ZONES: Record<Exclude<Role, "admin">, string[]> = {
  manager: ["assistant", "orders", "returns", "catalog", "products", "promo-codes", "requests", "users", "customers", "analytics", "stats", "emails", "newsletter", "campaigns", "stories", "avatars", "categories", "site-settings", "uploadHero"],
  support: ["orders", "returns", "requests", "users", "customers", "stats"],
  content: ["home-images", "hero-images", "heroes", "uploadHero", "pages", "collectionPages", "sections", "stories", "music", "fygrances", "about", "newsletter", "campaigns", "emails", "site-settings", "stats"],
}

export const isRole = (r: unknown): r is Role => r === "admin" || r === "manager" || r === "support" || r === "content"

/** pathname = /admin/... ou /api/admin/... */
export function canAccess(role: string | null | undefined, pathname: string): boolean {
  if (role === "admin") return true
  if (!role || !isRole(role)) return false
  const rest = pathname.replace(/^\/api\/admin\/?/, "").replace(/^\/admin\/?/, "")
  const zone = rest.split("/")[0]
  if (zone === "") return true // l'aperçu
  if (zone === "team") return false
  return ZONES[role as Exclude<Role, "admin">].includes(zone)
}
