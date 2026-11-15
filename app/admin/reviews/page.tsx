"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Star, Trash2, X } from "lucide-react"
import { AdminButton, Badge, EmptyState, PageHeader, Skeleton } from "@/components/Admin/ui/kit"
import { adminFetch, api, errorMessage, notify } from "@/lib/adminApi"

type Rev = { id: string; product: string; name: string; rating: number; text: string; status: string; createdAt: string }
const TONE = { pending: "orange", approved: "green", rejected: "red" } as const
const LABEL: Record<string, string> = { pending: "À valider", approved: "Publié", rejected: "Masqué" }
const FILTERS = [["pending", "À valider"], ["approved", "Publiés"], ["all", "Tous"]] as const

export default function ReviewsPage() {
  const [rows, setRows] = useState<Rev[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("pending")
  const [sel, setSel] = useState<Set<string>>(new Set())
  const load = useCallback(() => { api.get<{ reviews: Rev[]; missing: boolean }>("/api/admin/reviews").then((r) => { setRows(r.reviews); setMissing(r.missing) }).catch((e) => notify.error(errorMessage(e))) }, [])
  useEffect(load, [load])
  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "all" || r.status === filter), [rows, filter])
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function act(method: "PATCH" | "DELETE", status?: string, ids = [...sel]) {
    if (!ids.length) return
    if (method === "DELETE" && !window.confirm(`Supprimer ${ids.length} avis ?`)) return
    try { await adminFetch("/api/admin/reviews", { method, body: JSON.stringify({ ids, status }) }); setSel(new Set()); load() } catch (e) { notify.error(errorMessage(e)) }
  }

  return (
    <>
      <PageHeader title="Avis clients" />
      {missing && <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Les avis ne sont pas encore activés : le SQL « avis » est à lancer dans Supabase.</p>}
      <div className="mb-4 flex gap-1 rounded-full bg-white p-1 ring-1 ring-[#e0dbd3] sm:w-fit">
        {FILTERS.map(([id, l]) => <button key={id} type="button" onClick={() => { setFilter(id); setSel(new Set()) }} className={`rounded-full px-3.5 py-1.5 text-sm ${filter === id ? "bg-[#171717] text-white" : ""}`}>{l}</button>)}
      </div>
      {!rows ? <Skeleton className="h-40 w-full" /> : shown.length === 0 ? <EmptyState title="Aucun avis" description="Les avis arrivent ici avant d'être publiés sur la fiche produit." /> : (
        <div className="space-y-3 pb-28">
          {shown.map((r) => (
            <div key={r.id} className={`rounded-3xl border bg-white p-4 ${sel.has(r.id) ? "border-[#171717]" : "border-[#e9e5df]"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label="Sélectionner" checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="mt-1 h-5 w-5 accent-[#171717]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[r.status as keyof typeof TONE]}>{LABEL[r.status] ?? r.status}</Badge>
                    <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={r.rating >= n ? "fill-current" : "opacity-25"} />)}</span>
                    <span className="truncate text-sm font-medium">{r.product}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#9a948a]">{r.name} · {new Date(r.createdAt).toLocaleDateString("fr-BE", { day: "numeric", month: "short" })}</p>
                  {r.text && <p className="mt-2 text-sm">{r.text}</p>}
                  {r.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <AdminButton variant="primary" icon={Check} onClick={() => act("PATCH", "approved", [r.id])}>Publier</AdminButton>
                      <AdminButton variant="danger" icon={X} onClick={() => act("PATCH", "rejected", [r.id])}>Masquer</AdminButton>
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
          <AdminButton icon={Check} onClick={() => act("PATCH", "approved")}>Publier</AdminButton>
          <AdminButton icon={X} onClick={() => act("PATCH", "rejected")}>Masquer</AdminButton>
          <AdminButton icon={Trash2} variant="danger" onClick={() => act("DELETE")}>Supprimer</AdminButton>
        </div>
      )}
    </>
  )
}
