"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Clapperboard,
  Images,
  Layers,
  PackageCheck,
  Plus,
  ScrollText,
  Scale,
  Shirt,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  AdminButton,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  Panel,
  Skeleton,
  StatCard,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatDate, formatMoney } from "@/lib/adminApi"

type Stats = {
  toShip: number
  revenue7: number
  revenue30: number
  orders7: number
  orders30: number
  products: number
  lowStockThreshold: number
  lowStock: { id: string; productId: number; name: string; size: string; stock: number }[]
  recent: {
    id: string
    status: string
    total: number
    currency: string | null
    email: string | null
    createdAt: string
  }[]
}

const SHORTCUTS = [
  { label: "Accueil (hero)", href: "/admin/home-images", icon: Images },
  { label: "Collections & pages", href: "/admin/pages", icon: Layers },
  { label: "Stories", href: "/admin/stories", icon: Clapperboard },
  { label: "About", href: "/admin/about", icon: ScrollText },
  { label: "Légal", href: "/admin/legal", icon: Scale },
]

export default function AdminHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Stats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(errorMessage(e, "Impossible de charger les chiffres")))
  }, [])

  const loading = !stats && !error

  return (
    <>
      <PageHeader
        eyebrow="Aperçu"
        title="Bonjour 👋"
        description="Ce qui demande ton attention aujourd'hui."
        actions={
          <AdminButton href="/admin/catalog" variant="primary" icon={Plus}>
            Nouveau produit
          </AdminButton>
        }
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {error}
        </div>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="À expédier"
          value={stats?.toShip ?? 0}
          hint="commandes payées"
          icon={PackageCheck}
          href="/admin/orders"
          loading={loading}
        />
        <StatCard
          label="Ventes, 7 jours"
          value={formatMoney(stats?.revenue7)}
          hint={`${stats?.orders7 ?? 0} commande(s)`}
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          label="Ventes, 30 jours"
          value={formatMoney(stats?.revenue30)}
          hint={`${stats?.orders30 ?? 0} commande(s)`}
          icon={Wallet}
          loading={loading}
        />
        <StatCard
          label="Produits"
          value={stats?.products ?? 0}
          hint="dans le catalogue"
          icon={Shirt}
          href="/admin/catalog"
          loading={loading}
        />
      </div>

      {/* Listes */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Dernières commandes"
          action={
            <Link href="/admin/orders" style={{ color: "#3d3a35" }} className="text-xs underline">
              Tout voir
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats && stats.recent.length > 0 ? (
            <ul className="divide-y divide-[#f0ece5]">
              {stats.recent.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.email ?? "Client inconnu"}</p>
                    <p className="text-xs text-[#9a948a]">{formatDate(o.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <p className="w-20 text-right text-sm font-medium">
                    {formatMoney(o.total, o.currency ?? "EUR")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucune commande pour l'instant" />
          )}
        </Panel>

        <Panel
          title="Stock à surveiller"
          description={`Tailles actives avec ${stats?.lowStockThreshold ?? 3} pièces ou moins`}
          action={
            <Link href="/admin/catalog" style={{ color: "#3d3a35" }} className="text-xs underline">
              Catalogue
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats && stats.lowStock.length > 0 ? (
            <ul className="divide-y divide-[#f0ece5]">
              {stats.lowStock.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[#9a948a]">Taille {s.size}</p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      s.stock <= 0
                        ? "bg-[#f8d9d9] text-[#7a1f1f]"
                        : "bg-[#fbe6c8] text-[#7a4a0a]",
                    ].join(" ")}
                  >
                    {s.stock <= 0 ? "Épuisé" : `${s.stock} restant(s)`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Tout est bien approvisionné" description="Aucune taille en stock bas." />
          )}
        </Panel>
      </div>

      {/* Raccourcis contenu */}
      <Panel title="Contenu du site" description="Accès rapide aux panneaux de contenu" className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SHORTCUTS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              style={{ color: "#171717" }}
              className="flex flex-col gap-3 rounded-2xl border border-[#eee9e1] bg-[#faf8f5] p-4 text-sm transition hover:bg-white hover:shadow-sm"
            >
              <Icon size={18} strokeWidth={1.6} />
              {label}
            </Link>
          ))}
        </div>
      </Panel>
    </>
  )
}
