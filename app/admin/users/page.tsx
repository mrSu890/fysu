"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, Copy, Crown, MousePointerClick, X, Heart, Mail, MailX, Search, Sparkles, TrendingDown, UserPlus, type LucideIcon } from "lucide-react"
import { AdminButton, Badge, EmptyState, IconTile, PageHeader, Panel, Skeleton, OrderStatusBadge, type TileTone } from "@/components/Admin/ui/kit"
import { api, errorMessage, formatDate, formatMoney, notify } from "@/lib/adminApi"

type Segment = "vip" | "loyal" | "new" | "risk" | "prospect"
type Customer = {
  email: string
  name: string | null
  hasAccount: boolean
  subscribed: boolean
  orders: { id: string; status: string; total: number; createdAt: string }[]
  spent: number
  paidCount: number
  lastOrderAt: string | null
  firstSeen: string | null
  segment: Segment
}

// Une icône + une couleur par groupe (les mêmes partout dans l'admin)
const SEG: Record<Segment, { label: string; hint: string; icon: LucideIcon; tone: TileTone }> = {
  vip: { label: "VIP", hint: "300 € dépensés ou 3 commandes et plus", icon: Crown, tone: "purple" },
  loyal: { label: "Fidèles", hint: "2 commandes", icon: Heart, tone: "pink" },
  new: { label: "Nouveaux", hint: "1 commande", icon: Sparkles, tone: "green" },
  risk: { label: "À relancer", hint: "Plus de commande depuis 90 jours", icon: TrendingDown, tone: "orange" },
  prospect: { label: "Sans achat", hint: "Inscrit ou compte, jamais commandé", icon: UserPlus, tone: "blue" },
}
const ORDER: Segment[] = ["vip", "loyal", "new", "risk", "prospect"]

export default function CustomersPage() {
  const [list, setList] = useState<Customer[] | null>(null)
  const [err, setErr] = useState("")
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState<Segment | "all">("all")
  const [open, setOpen] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    api.get<{ customers: Customer[] }>("/api/admin/customers").then((r) => setList(r.customers)).catch((e) => setErr(errorMessage(e)))
  }, [])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of list ?? []) m[c.segment] = (m[c.segment] ?? 0) + 1
    return m
  }, [list])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (list ?? []).filter((c) => (seg === "all" || c.segment === seg) && (!s || c.email.includes(s) || (c.name ?? "").toLowerCase().includes(s)))
  }, [list, q, seg])

  return (
    <>
      <PageHeader title="Clients" actions={<AdminButton icon={selecting ? X : MousePointerClick} onClick={() => { setSelecting((v) => !v); setPicked([]) }}>{selecting ? "Terminer" : "Sélectionner"}</AdminButton>} />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER.map((k) => {
          const s = SEG[k]
          const on = seg === k
          return (
            <button key={k} type="button" title={s.hint} onClick={() => setSeg(on ? "all" : k)} className={`flex items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 transition ${on ? "ring-2 ring-[#171717]" : "ring-[#e9e5df] hover:ring-[#171717]/40"}`}>
              <IconTile icon={s.icon} tone={s.tone} size={34} />
              <span>
                <span className="block text-lg font-semibold leading-none">{list ? counts[k] ?? 0 : "–"}</span>
                <span className="text-xs text-[#7a756d]">{s.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a948a]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom ou un e-mail" className="w-full rounded-xl bg-white py-2.5 pl-10 pr-3 text-[15px] ring-1 ring-[#e0dbd3] outline-none focus:ring-[#171717]" />
      </div>

      <Panel padded={false}>
        {!list ? (
          <div className="space-y-3 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : shown.length === 0 ? (
          <div className="p-4"><EmptyState title="Aucun client" /></div>
        ) : (
          <ul className="divide-y divide-[#f0ece5]">
            {shown.map((c) => {
              const s = SEG[c.segment]
              const isOpen = open === c.email
              return (
                <li key={c.email}>
                  <button type="button" onClick={() => (selecting ? setPicked((l) => (l.includes(c.email) ? l.filter((x) => x !== c.email) : [...l, c.email])) : setOpen(isOpen ? null : c.email))} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    {selecting && <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${picked.includes(c.email) ? "border-[#171717] bg-[#171717] text-white" : "border-[#cfc9be] text-transparent"}`}><Check size={14} /></span>}
                    <IconTile icon={s.icon} tone={s.tone} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name ?? c.email}</span>
                      {c.name && <span className="block truncate text-xs text-[#9a948a]">{c.email}</span>}
                    </span>
                    {c.subscribed ? <Mail size={15} className="text-[#34c759]" aria-label="Inscrit à la newsletter" /> : <MailX size={15} className="text-[#c9c4ba]" aria-label="Pas inscrit" />}
                    <span className="w-20 text-right text-sm font-medium">{c.spent ? formatMoney(c.spent) : "–"}</span>
                    <ChevronDown size={16} className={`text-[#9a948a] transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 bg-[#faf8f5] px-4 pb-4 pt-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6b6760]">
                        <Badge tone="neutral">{s.label}</Badge>
                        <span>{c.paidCount} commande(s)</span>
                        {c.lastOrderAt && <span>· dernière le {formatDate(c.lastOrderAt)}</span>}
                        {c.hasAccount && <span>· a un compte</span>}
                        <a href={`mailto:${c.email}`} style={{ color: "#171717" }} className="ml-auto underline">Écrire</a>
                      </div>
                      {c.orders.length > 0 ? (
                        <ul className="divide-y divide-[#ece7df] rounded-xl bg-white ring-1 ring-[#ece7df]">
                          {c.orders.map((o) => (
                            <li key={o.id}>
                              <Link href={`/admin/orders/${o.id}`} style={{ color: "inherit" }} className="flex items-center gap-3 px-3 py-2.5">
                                <span className="flex-1 text-xs text-[#7a756d]">{formatDate(o.createdAt)}</span>
                                <OrderStatusBadge status={o.status} />
                                <span className="w-20 text-right text-sm">{formatMoney(o.total)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#9a948a]">Aucune commande.</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <p className="mt-3 text-xs text-[#9a948a]">{shown.length} client(s) · Touche un groupe pour filtrer.</p>

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e5df] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <button type="button" className="text-sm underline" onClick={() => setPicked(picked.length === shown.length ? [] : shown.map((c) => c.email))}>{picked.length === shown.length && shown.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}</button>
            <span className="mr-auto text-sm text-[#7a756d]">{picked.length} choisi(s)</span>
            <AdminButton icon={Copy} variant="primary" disabled={!picked.length} onClick={async () => { const t = picked.join(", "); try { await navigator.clipboard.writeText(t); notify.success("E-mails copiés") } catch { window.prompt("Copie les e-mails :", t) } }}>Copier les e-mails</AdminButton>
          </div>
        </div>
      )}
    </>
  )
}
