"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, PackageCheck, Undo2, X, Banknote } from "lucide-react"
import { AdminButton, Badge, EmptyState, PageHeader, Skeleton } from "@/components/Admin/ui/kit"
import { adminFetch, api, errorMessage, formatMoney, notify } from "@/lib/adminApi"

type Item = { name: string; size_label: string | null; color_name: string | null; quantity: number }
type Ret = { id: string; orderId: string; email: string; name: string | null; items: Item[]; reason: string; comment: string | null; status: string; createdAt: string; orderTotal: number | null }

const STATUS: Record<string, { label: string; tone: "neutral" | "green" | "orange" | "blue" | "red" }> = {
  requested: { label: "À traiter", tone: "orange" },
  approved: { label: "Accepté", tone: "blue" },
  received: { label: "Reçu", tone: "blue" },
  refunded: { label: "Remboursé", tone: "green" },
  rejected: { label: "Refusé", tone: "red" },
}
const REASON: Record<string, string> = { size_small: "Trop petit", size_big: "Trop grand", not_liked: "Ne plaît pas", defect: "Défaut", other: "Autre" }
const FILTERS = [["open", "À suivre"], ["refunded", "Remboursés"], ["all", "Tous"]] as const

export default function ReturnsPage() {
  const [rows, setRows] = useState<Ret[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("open")
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.get<{ returns: Ret[]; missing: boolean }>("/api/admin/returns").then((r) => { setRows(r.returns); setMissing(r.missing) }).catch((e) => notify.error(errorMessage(e)))
  }, [])
  useEffect(load, [load])

  const shown = useMemo(() => (rows ?? []).filter((r) => (filter === "all" ? true : filter === "refunded" ? r.status === "refunded" || r.status === "rejected" : !["refunded", "rejected"].includes(r.status))), [rows, filter])
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function act(status: string, ids = [...sel]) {
    if (!ids.length) return
    if (status === "refunded" && !window.confirm("Marquer comme remboursé ? Les pièces seront remises en stock et le client prévenu. Pense à rembourser l'argent dans Stripe.")) return
    setBusy(true)
    try { await adminFetch("/api/admin/returns", { method: "PATCH", body: JSON.stringify({ ids, status }) }); notify.success("Fait"); setSel(new Set()); load() } catch (e) { notify.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Retours" />
      {missing && <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Les retours ne sont pas encore activés : le SQL « retours » est à lancer dans Supabase.</p>}
      <div className="mb-4 flex gap-1 rounded-full bg-white p-1 ring-1 ring-[#e0dbd3] sm:w-fit">
        {FILTERS.map(([id, l]) => <button key={id} type="button" onClick={() => { setFilter(id); setSel(new Set()) }} className={`rounded-full px-3.5 py-1.5 text-sm ${filter === id ? "bg-[#171717] text-white" : ""}`}>{l}</button>)}
      </div>
      {!rows ? <Skeleton className="h-40 w-full" /> : shown.length === 0 ? <EmptyState title="Aucun retour" description="Les demandes faites depuis le compte des clients arrivent ici." /> : (
        <div className="space-y-3 pb-28">
          {shown.map((r) => (
            <div key={r.id} className={`rounded-3xl border bg-white p-4 ${sel.has(r.id) ? "border-[#171717]" : "border-[#e9e5df]"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label="Sélectionner" checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="mt-1 h-5 w-5 accent-[#171717]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label ?? r.status}</Badge>
                    <Link href={`/admin/orders/${r.orderId}`} className="text-sm font-medium underline-offset-4 hover:underline">#{r.orderId.slice(0, 8)}</Link>
                    <span className="text-xs text-[#9a948a]">{new Date(r.createdAt).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}</span>
                    {r.orderTotal !== null && <span className="ml-auto text-sm">{formatMoney(r.orderTotal)}</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-[#6b6760]">{r.name ?? r.email}</p>
                  <ul className="mt-2 text-sm">
                    {r.items.map((i, k) => <li key={k}>{i.name}{i.size_label ? ` · ${i.size_label}` : ""}{i.color_name ? ` · ${i.color_name}` : ""}{i.quantity > 1 ? ` ×${i.quantity}` : ""}</li>)}
                  </ul>
                  <p className="mt-2 text-xs text-[#7a756d]">{REASON[r.reason] ?? r.reason}{r.comment ? ` — ${r.comment}` : ""}</p>
                  {r.status === "requested" && (
                    <div className="mt-3 flex gap-2">
                      <AdminButton variant="primary" icon={Check} onClick={() => act("approved", [r.id])} disabled={busy}>Accepter</AdminButton>
                      <AdminButton variant="danger" icon={X} onClick={() => act("rejected", [r.id])} disabled={busy}>Refuser</AdminButton>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {sel.size > 0 && (
        <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-3xl bg-[#171717] p-3 shadow-xl">
          <span className="px-2 text-sm text-white">{sel.size}</span>
          <AdminButton icon={Check} onClick={() => act("approved")} disabled={busy}>Accepter</AdminButton>
          <AdminButton icon={PackageCheck} onClick={() => act("received")} disabled={busy}>Reçu</AdminButton>
          <AdminButton icon={Banknote} onClick={() => act("refunded")} disabled={busy}>Remboursé</AdminButton>
          <AdminButton icon={Undo2} variant="danger" onClick={() => act("rejected")} disabled={busy}>Refuser</AdminButton>
        </div>
      )}
    </>
  )
}
