"use client"

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  ExternalLink,
  Image as ImageIcon,
  Images,
  Inbox,
  Layers,
  LayoutDashboard,
  Menu,
  ScrollText,
  Scale,
  Shirt,
  ShoppingBag,
  Clapperboard,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"

/* ====================================================================
   MENU DE L'ADMIN (facile à modifier)
   ==================================================================== */

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavGroup = { label: string | null; items: NavItem[] }

export const ADMIN_NAV: NavGroup[] = [
  {
    label: null,
    items: [{ label: "Aperçu", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Boutique",
    items: [
      { label: "Produits", href: "/admin/catalog", icon: Shirt },
      { label: "Commandes", href: "/admin/orders", icon: ShoppingBag },
      { label: "Demandes", href: "/admin/requests", icon: Inbox },
      { label: "Clients", href: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Contenu du site",
    items: [
      { label: "Accueil (hero)", href: "/admin/home-images", icon: Images },
      { label: "Images de garde", href: "/admin/heroes", icon: ImageIcon },
      { label: "Collections & pages", href: "/admin/pages", icon: Layers },
      { label: "Stories", href: "/admin/stories", icon: Clapperboard },
      { label: "About", href: "/admin/about", icon: ScrollText },
      { label: "Légal", href: "/admin/legal", icon: Scale },
    ],
  },
]

const ALL_ITEMS = ADMIN_NAV.flatMap((g) => g.items)

// L'entrée du menu qui correspond à la page en cours (la plus précise gagne)
function findActive(pathname: string): NavItem | null {
  let best: NavItem | null = null
  for (const item of ALL_ITEMS) {
    const match =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(item.href + "/")
    if (match && (!best || item.href.length > best.href.length)) best = item
  }
  return best
}

/* ====================================================================
   COQUE DE L'ADMIN : menu latéral + barre du haut
   ==================================================================== */

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  const active = findActive(pathname)

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/fysu-dark.png" alt="FYSU" className="h-6 w-auto" />
        <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">
          Admin
        </span>
      </div>

      {/* Liens */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {ADMIN_NAV.map((group, gi) => (
          <div key={gi} className="mb-5">
            {group.label && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#9a948a]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active?.href === item.href
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      // couleur en ligne : les liens du site sont bleus par défaut
                      style={{ color: isActive ? "#ffffff" : "#3d3a35" }}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-[#171717] shadow-sm"
                          : "hover:bg-[#171717]/[0.05]",
                      ].join(" ")}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bas du menu */}
      <div className="border-t border-[#e9e5df] p-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          style={{ color: "#3d3a35" }}
          className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm hover:bg-[#171717]/[0.05]"
        >
          Voir le site
          <ExternalLink size={15} strokeWidth={1.75} />
        </a>
      </div>
    </div>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawer, setDrawer] = useState(false)
  const active = useMemo(() => findActive(pathname), [pathname])

  // L'admin est toujours en mode clair (le mode sombre du site ne s'applique pas ici)
  useLayoutEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains("dark")
    html.classList.remove("dark")
    return () => {
      if (hadDark) html.classList.add("dark")
    }
  }, [])

  // Ferme le menu mobile quand on change de page
  useEffect(() => setDrawer(false), [pathname])

  // Bloque le scroll de la page derrière le menu mobile
  useEffect(() => {
    if (!drawer) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = prev
    }
  }, [drawer])

  return (
    <div className="admin-root min-h-screen bg-[#f6f4f0] text-[#171717] lg:pl-64">
      {/* Compatibilité : les anciens panneaux affichent encore la nav bar / le footer du site
          et des décalages. On les neutralise ici, panneau après panneau ils disparaîtront. */}
      <style>{`
        .admin-root .navbar-root { display: none !important; }
        .admin-root footer { display: none !important; }
        .admin-root div:has(> .flower-light) { display: none !important; }
        .admin-root .top-24,
        .admin-root .top-36,
        .admin-root .top-72 { top: 0 !important; }
        .admin-root .w-screen { width: 100% !important; }
      `}</style>

      {/* Menu latéral (grands écrans) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#e9e5df] bg-white/80 backdrop-blur-xl lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Menu mobile / iPad portrait */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Fermer le menu"
                className="absolute right-4 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#171717]/[0.06]"
              >
                <X size={16} />
              </button>
              <SidebarContent pathname={pathname} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Barre du haut */}
      <header className="sticky top-0 z-30 border-b border-[#e9e5df] bg-[#f6f4f0]/75 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-8">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e9e5df] lg:hidden"
          >
            <Menu size={17} />
          </button>

          <p className="text-sm text-[#7a756d]">
            Admin
            {active && active.href !== "/admin" && (
              <>
                <span className="mx-2 text-[#c9c3b9]">/</span>
                <span className="text-[#171717]">{active.label}</span>
              </>
            )}
          </p>

          <div className="ml-auto">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#3d3a35" }}
              className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs shadow-sm ring-1 ring-[#e9e5df] sm:inline-flex"
            >
              Voir le site
              <ExternalLink size={13} strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="admin-content mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  )
}
