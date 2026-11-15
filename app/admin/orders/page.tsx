"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Check, Copy, MousePointerClick, Printer, Search, Truck, Undo2, X } from "lucide-react"
import {
  AdminButton,
  EmptyState,
  OrderStatusBadge,
  PageHeader,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatMoney, notify } from "@/lib/adminApi"

type OrderRow = {
  id: string
  status: string
  total: number
  currency: string | null
  email: string | null
  createdAt: string
  customerName: string | null
  trackingNumber: string | null
  shipping: { name?: string; phone?: string; address?: { line1?: string; line2?: string | null; city?: string; postal_code?: string; country?: string } } | null
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

const addressOf = (o: OrderRow) => {
  const s = o.shipping
  if (!s?.address) return ""
  return [s.name, s.address.line1, s.address.line2, `${s.address.postal_code ?? ""} ${s.address.city ?? ""}`.trim(), s.address.country].filter(Boolean).join("\n")
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export default function OrdersPage() {
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [acting, setActing] = useState(false)
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
  const chosen = orders.filter((o) => picked.includes(o.id))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const stopSelecting = () => { setSelecting(false); setPicked([]) }

  async function bulk(status: "shipped" | "paid" | "cancelled") {
    const todo = chosen.filter((o) => o.status !== status)
    if (todo.length === 0) return notify.error("Rien à changer pour cette sélection.")
    const what = status === "shipped" ? `Marquer ${todo.length} commande(s) comme expédiée(s) ? Les clients reçoivent le mail d'expédition.` : status === "paid" ? `Remettre ${todo.length} commande(s) à « Payée » ?` : `Annuler ${todo.length} commande(s) ? Les stocks ne sont pas remis automatiquement.`
    if (!window.confirm(what)) return
    setActing(true)
    let ok = 0
    for (const o of todo) {
      try { await fetch(`/api/admin/orders/${o.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => { if (r.ok) ok++ }) } catch {}
    }
    setActing(false)
    notify[ok === todo.length ? "success" : "error"](`${ok} sur ${todo.length} mise(s) à jour`)
    stopSelecting()
    load(1, true)
  }
  async function copyAddresses() {
    const text = chosen.map(addressOf).filter(Boolean).join("\n\n")
    try { await navigator.clipboard.writeText(text); notify.success("Adresses copiées") } catch { window.prompt("Copie les adresses :", text) }
  }
  function printLabels() {
    const w = window.open("", "", "width=700,height=800")
    if (!w) return
    w.document.write(`<html><head><title>Étiquettes</title><style>body{font-family:Arial;padding:24px}.l{border:2px solid #000;padding:16px;width:300px;margin:0 0 16px;page-break-inside:avoid}pre{margin:0;font:14px/1.4 Arial}</style></head><body>${chosen.map((o) => `<div class="l"><pre>${esc(addressOf(o))}</pre></div>`).join("")}</body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Boutique"
        title="Commandes"
        description="Prépare, expédie et suis chaque commande."
        actions={
          <AdminButton icon={selecting ? X : MousePointerClick} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
            {selecting ? "Terminer" : "Sélectionner"}
          </AdminButton>
        }
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
              onClick={(e) => { if (selecting) { e.preventDefault(); toggle(o.id) } }}
              style={{ color: "inherit" }}
              className={`block rounded-3xl border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-md sm:p-5 ${picked.includes(o.id) ? "border-[#171717] ring-1 ring-[#171717]" : "border-[#e9e5df]"}`}
            >
              <div className="flex items-start gap-4">
                {selecting && (
                  <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${picked.includes(o.id) ? "border-[#171717] bg-[#171717] text-white" : "border-[#cfc9be]"}`}>
                    {picked.includes(o.id) && <Check size={14} />}
                  </span>
                )}
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

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e5df] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <button type="button" className="text-sm underline" onClick={() => setPicked(picked.length === orders.length ? [] : orders.map((o) => o.id))}>
              {picked.length === orders.length && orders.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
            <span className="mr-auto text-sm text-[#7a756d]">{picked.length} choisie(s)</span>
            <AdminButton icon={Truck} variant="primary" disabled={!picked.length || acting} onClick={() => bulk("shipped")}>Expédiées</AdminButton>
            <AdminButton icon={Printer} disabled={!picked.length} onClick={printLabels}>Étiquettes</AdminButton>
            <AdminButton icon={Copy} disabled={!picked.length} onClick={copyAddresses}>Adresses</AdminButton>
            <AdminButton icon={Undo2} variant="ghost" disabled={!picked.length || acting} onClick={() => bulk("paid")}>Remettre payées</AdminButton>
            <AdminButton icon={X} variant="danger" disabled={!picked.length || acting} onClick={() => bulk("cancelled")}>Annuler</AdminButton>
          </div>
        </div>
      )}
    </div>
  )
}
