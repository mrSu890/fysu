"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import {
  AdminButton,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatMoney } from "@/lib/adminApi"

type OrderRow = {
  id: string
  status: string
  total: number
  currency: string | null
  email: string | null
  createdAt: string
  customerName: string | null
  trackingNumber: string | null
  itemCount: number
  items: { name: string; image: string | null; quantity: number }[]
}

type Counts = { all: number; paid: number; shipped: number; pending: number; closed: number }

const TABS = [
  { id: "paid", label: "À expédier", key: "paid" },
  { id: "shipped", label: "Expédiées", key: "shipped" },
  { id: "pending", label: "En attente", key: "pending" },
  { id: "closed", label: "Annulées / remboursées", key: "closed" },
  { id: "all", label: "Toutes", key: "all" },
] as const

type TabId = (typeof TABS)[number]["id"]

const PAGE_SIZE = 20

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function OrdersPage() {
  const [tab, setTab] = useState<TabId>("paid")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  // la recherche se lance une fois qu'on a fini de taper
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(
    async (targetPage: number, replace: boolean) => {
      const id = ++requestId.current
      setLoading(true)
      try {
        const params = new URLSearchParams({
          status: tab,
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
        })
        if (search) params.set("q", search)

        const data = await api.get<{ orders: OrderRow[]; totalCount: number; counts: Counts }>(
          `/api/admin/orders?${params.toString()}`
        )
        if (id !== requestId.current) return

        setOrders((cur) => (replace ? data.orders : [...cur, ...data.orders]))
        setTotal(data.totalCount)
        setCounts(data.counts)
        setError(null)
      } catch (e) {
        if (id === requestId.current) setError(errorMessage(e, "Impossible de charger les commandes"))
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [tab, search]
  )

  useEffect(() => {
    setPage(1)
    load(1, true)
  }, [load])

  const hasMore = orders.length < total

  return (
    <div>
      <PageHeader
        eyebrow="Boutique"
        title="Commandes"
        description="Prépare, expédie et suis chaque commande."
      />

      {/* Onglets */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full bg-[#171717]/[0.05] p-1">
          {TABS.map((t) => {
            const n = counts ? counts[t.key] : null
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                  tab === t.id
                    ? "bg-white font-medium text-[#171717] shadow-sm"
                    : "text-[#7a756d] hover:text-[#171717]"
                }`}
              >
                {t.label}
                {n !== null && n > 0 ? ` (${n})` : ""}
              </button>
            )
          })}
        </div>
      </div>

      {/* Recherche */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a948a]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un e-mail ou un nom…"
          className="w-full rounded-2xl border border-[#e0dbd3] bg-white py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-[#b3ada3] focus:ring-2 focus:ring-[#171717]/10"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {error}
        </div>
      )}

      {/* Liste */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune commande ici"}
          description={
            search
              ? "Essaie une autre adresse e-mail ou un autre nom."
              : "Les commandes payées apparaissent ici automatiquement."
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              style={{ color: "inherit" }}
              className="block rounded-3xl border border-[#e9e5df] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-md sm:p-5"
            >
              <div className="flex items-start gap-4">
                {/* Miniatures */}
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it, i) =>
                    it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={it.image}
                        alt=""
                        className="h-14 w-11 rounded-xl border-2 border-white object-cover"
                      />
                    ) : (
                      <div
                        key={i}
                        className="h-14 w-11 rounded-xl border-2 border-white bg-[#f0ece5]"
                      />
                    )
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {o.customerName || o.email || "Client inconnu"}
                    </p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#7a756d]">
                    {o.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                    {o.itemCount > o.items.reduce((s, it) => s + it.quantity, 0) ? "…" : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#9a948a]">
                    #{o.id.slice(0, 8)} · {formatDateTime(o.createdAt)}
                    {o.trackingNumber ? ` · Suivi ${o.trackingNumber}` : ""}
                  </p>
                </div>

                <p className="whitespace-nowrap text-sm font-semibold">
                  {formatMoney(o.total, o.currency ?? "EUR")}
                </p>
              </div>
            </Link>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <AdminButton
                disabled={loading}
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  load(next, false)
                }}
              >
                {loading ? "Chargement…" : `Voir plus (${total - orders.length})`}
              </AdminButton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
