"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Clapperboard,
  FileText,
  Images,
  Inbox,
  Layers,
  PackageCheck,
  Plus,
  ScrollText,
  Scale,
  ShoppingBasket,
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

type Day = { date: string; revenue: number; orders: number }

type Stats = {
  toShip: number
  revenue7: number
  revenue30: number
  orders7: number
  orders30: number
  averageBasket: number
  products: number
  newRequests: number
  lowStockThreshold: number
  lowStock: {
    id: string
    productId: number
    name: string
    color: string | null
    size: string
    stock: number
  }[]
  topProducts: { productId: number; name: string; image: string | null; sold: number }[]
  days: Day[]
  recent: {
    id: string
    status: string
    total: number
    currency: string | null
    email: string | null
    name: string | null
    createdAt: string
  }[]
}

const SHORTCUTS = [
  { label: "Accueil (hero)", href: "/admin/home-images", icon: Images },
  { label: "Collections & pages", href: "/admin/pages", icon: Layers },
  { label: "Stories", href: "/admin/stories", icon: Clapperboard },
  { label: "About", href: "/admin/about", icon: ScrollText },
  { label: "Confidentialité", href: "/admin/legal", icon: Scale },
  { label: "Pages légales", href: "/admin/legal-pages", icon: FileText },
]

/* ====================================================================
   Graphique : ventes par jour, 30 jours (une seule série, une seule teinte)
   ==================================================================== */

const CHART_W = 640
const CHART_H = 190
const PAD = { top: 12, right: 8, bottom: 26, left: 44 }

// arrondit le maximum à un chiffre « propre » pour l'axe (en euros)
function niceMax(euros: number) {
  if (euros <= 0) return 100
  const pow = Math.pow(10, Math.floor(Math.log10(euros)))
  const n = euros / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

const shortDay = (key: string) => {
  const [, m, d] = key.split("-")
  return `${Number(d)}/${Number(m)}`
}

function SalesChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)

  const max = niceMax(Math.max(...days.map((d) => d.revenue / 100), 0))
  const innerW = CHART_W - PAD.left - PAD.right
  const innerH = CHART_H - PAD.top - PAD.bottom
  const slot = innerW / days.length
  const barW = Math.min(14, slot - 4)

  const ticks = [0, max / 2, max]
  const activeDay = active !== null ? days[active] : null
  const bestDay = days.reduce((best, d) => (d.revenue > best.revenue ? d : best), days[0])

  return (
    <div>
      {/* Lecture de la barre survolée (ou du meilleur jour par défaut) */}
      <p className="mb-3 min-h-[20px] text-xs text-[#7a756d]">
        {activeDay ? (
          <>
            <span className="font-medium text-[#171717]">{shortDay(activeDay.date)}</span> ·{" "}
            {formatMoney(activeDay.revenue)} · {activeDay.orders} commande(s)
          </>
        ) : bestDay.revenue > 0 ? (
          <>
            Meilleur jour : <span className="font-medium text-[#171717]">{shortDay(bestDay.date)}</span> ·{" "}
            {formatMoney(bestDay.revenue)}
          </>
        ) : (
          "Aucune vente sur la période."
        )}
      </p>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Ventes par jour sur les 30 derniers jours"
        onMouseLeave={() => setActive(null)}
      >
        {/* Grille et axe vertical */}
        {ticks.map((t) => {
          const y = PAD.top + innerH - (t / max) * innerH
          return (
            <g key={t}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} stroke="#e9e5df" strokeWidth={1} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#9a948a">
                {t >= 1000 ? `${(t / 1000).toLocaleString("fr-BE")} k€` : `${Math.round(t)} €`}
              </text>
            </g>
          )
        })}

        {/* Barres */}
        {days.map((d, i) => {
          const h = (d.revenue / 100 / max) * innerH
          const x = PAD.left + i * slot + (slot - barW) / 2
          const y = PAD.top + innerH - h
          const r = Math.min(4, h)
          const dim = active !== null && active !== i

          return (
            <g key={d.date}>
              {d.revenue > 0 && (
                // sommet arrondi, pied droit sur la ligne de base
                <path
                  d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${y + h} Z`}
                  fill="#171717"
                  opacity={dim ? 0.3 : 1}
                />
              )}
              {d.revenue === 0 && (
                <rect
                  x={x}
                  y={PAD.top + innerH - 2}
                  width={barW}
                  height={2}
                  fill="#171717"
                  opacity={dim ? 0.1 : 0.2}
                />
              )}
              {/* zone de survol plus large que la barre */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onTouchStart={() => setActive(i)}
                onClick={() => setActive(i)}
              />
            </g>
          )
        })}

        {/* Dates : une sur sept */}
        {days.map((d, i) =>
          i % 7 === days.length % 7 || i === days.length - 1 ? (
            <text
              key={d.date}
              x={PAD.left + i * slot + slot / 2}
              y={CHART_H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#9a948a"
            >
              {shortDay(d.date)}
            </text>
          ) : null
        )}
      </svg>

      <button
        type="button"
        onClick={() => setTable((v) => !v)}
        className="mt-3 cursor-pointer text-xs text-[#7a756d] underline"
      >
        {table ? "Masquer le tableau" : "Voir en tableau"}
      </button>

      {table && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-[#eee9e1]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#faf8f5] text-[#7a756d]">
              <tr>
                <th className="px-3 py-2 font-medium">Jour</th>
                <th className="px-3 py-2 font-medium">Commandes</th>
                <th className="px-3 py-2 text-right font-medium">Ventes</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date} className="border-t border-[#f0ece5]">
                  <td className="px-3 py-2">{shortDay(d.date)}</td>
                  <td className="px-3 py-2">{d.orders}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

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

  // pastille Arcade (accueil + page musique) : visible ou masquée
  const [arcade, setArcade] = useState<boolean | null>(null)
  useEffect(() => {
    api
      .get<{ arcade: boolean }>("/api/admin/site-settings")
      .then((r) => setArcade(r.arcade))
      .catch(() => setArcade(true))
  }, [])
  async function toggleArcade() {
    if (arcade === null) return
    const next = !arcade
    setArcade(next)
    try {
      await api.post("/api/admin/site-settings", { arcade: next })
    } catch (e) {
      setArcade(!next)
      alert(errorMessage(e, "Impossible de changer ce réglage"))
    }
  }

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

      {/* À faire */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="À expédier"
          value={stats?.toShip ?? 0}
          hint="commandes payées"
          icon={PackageCheck}
          href="/admin/orders"
          loading={loading}
        />
        <StatCard
          label="Demandes à traiter"
          value={stats?.newRequests ?? 0}
          hint="me prévenir et devis"
          icon={Inbox}
          href="/admin/requests"
          loading={loading}
        />
      </div>

      {/* Chiffres */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-3">
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
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="Panier moyen, 30 jours"
            value={formatMoney(stats?.averageBasket)}
            hint="par commande"
            icon={ShoppingBasket}
            loading={loading}
          />
        </div>
      </div>

      {/* Graphique */}
      <Panel
        title="Ventes des 30 derniers jours"
        description="Commandes payées et expédiées, par jour"
        className="mt-6"
      >
        {loading ? <Skeleton className="h-48 w-full" /> : stats && <SalesChart days={stats.days} />}
      </Panel>

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
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    style={{ color: "inherit" }}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {o.name ?? o.email ?? "Client inconnu"}
                      </p>
                      <p className="text-xs text-[#9a948a]">{formatDate(o.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <p className="w-20 text-right text-sm font-medium">
                      {formatMoney(o.total, o.currency ?? "EUR")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucune commande pour l'instant" />
          )}
        </Panel>

        <Panel title="Produits les plus vendus" description="Sur les 30 derniers jours">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats && stats.topProducts.length > 0 ? (
            <ul className="divide-y divide-[#f0ece5]">
              {stats.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 py-3">
                  <span className="w-4 text-xs text-[#9a948a]">{i + 1}</span>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-12 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded-lg bg-[#f0ece5]" />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</p>
                  <span className="text-sm text-[#3d3a35]">{p.sold} vendu(s)</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Pas encore de ventes" description="Le classement apparaît après les premières commandes." />
          )}
        </Panel>
      </div>

      <Panel
        title="Stock à surveiller"
        description={`Tailles actives avec ${stats?.lowStockThreshold ?? 3} pièces ou moins`}
        className="mt-4"
        action={
          <Link href="/admin/catalog" style={{ color: "#3d3a35" }} className="text-xs underline">
            Catalogue
          </Link>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stats && stats.lowStock.length > 0 ? (
          <ul className="divide-y divide-[#f0ece5]">
            {stats.lowStock.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/catalog/${s.productId}`}
                  style={{ color: "inherit" }}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-[#9a948a]">
                      {s.color ? `${s.color} · ` : ""}Taille {s.size}
                    </p>
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
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Tout est bien approvisionné" description="Aucune taille en stock bas." />
        )}
      </Panel>

      {/* Interrupteur Arcade */}
      <Panel title="Pastille Arcade" description="Affiche ou masque les jeux d'arcade sur le site (accueil et page musique)" className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-[#3d3a35]">
            {arcade === null ? "Chargement…" : arcade ? "Visible sur le site" : "Masquée sur le site"}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={arcade !== false}
            aria-label="Afficher la pastille Arcade"
            disabled={arcade === null}
            onClick={toggleArcade}
            className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 ${
              arcade === false ? "bg-[#d4cfc6]" : "bg-[#171717]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                arcade === false ? "left-0.5" : "left-[22px]"
              }`}
            />
          </button>
        </div>
      </Panel>

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
