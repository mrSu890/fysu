"use client"

import { useEffect, useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, formatMoney } from "@/lib/adminApi"

type D = {
  days: number
  cur: { revenue: number; orders: number; basket: number }
  prev: { revenue: number; orders: number; basket: number }
  buyers: number
  returning: number
  countries: { country: string; revenue: number }[]
  products: { id: number; name: string; sold: number }[]
  newSubs: number
  lost: number
}

function Delta({ a, b }: { a: number; b: number }) {
  if (!b) return <span className="text-xs text-[#9a948a]">–</span>
  const p = Math.round(((a - b) / b) * 100)
  const up = p >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: up ? "#1f9d4a" : "#c0392b" }}><Icon size={13} />{up ? "+" : ""}{p}%</span>
}

function Kpi({ label, value, a, b }: { label: string; value: string; a?: number; b?: number }) {
  return (
    <div className="rounded-3xl border border-[#e9e5df] bg-white p-5">
      <p className="text-xs text-[#7a756d]">{label}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 min-h-[18px]">{a !== undefined && b !== undefined && <Delta a={a} b={b} />}</div>
    </div>
  )
}

function Bars({ rows }: { rows: { label: string; value: number; text: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="truncate pr-3">{r.label}</span><span className="text-[#6b6760]">{r.text}</span></div>
          <div className="h-1.5 rounded-full bg-[#f0ece5]"><div className="h-1.5 rounded-full bg-[#171717]" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<D | null>(null)
  const [err, setErr] = useState("")
  useEffect(() => {
    setD(null)
    api.get<D>(`/api/admin/analytics?days=${days}`).then(setD).catch((e) => setErr(errorMessage(e)))
  }, [days])

  const rate = d && d.buyers ? Math.round((d.returning / d.buyers) * 100) : 0
  return (
    <>
      <PageHeader title="Analyses" actions={
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-[#e0dbd3]">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" onClick={() => setDays(n)} className={`rounded-full px-3.5 py-1.5 text-sm ${days === n ? "bg-[#171717] text-white" : ""}`}>{n} j</button>
          ))}
        </div>
      } />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
      {!d ? (
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label="Ventes" value={formatMoney(d.cur.revenue)} a={d.cur.revenue} b={d.prev.revenue} />
            <Kpi label="Commandes" value={String(d.cur.orders)} a={d.cur.orders} b={d.prev.orders} />
            <Kpi label="Panier moyen" value={formatMoney(d.cur.basket)} a={d.cur.basket} b={d.prev.basket} />
            <Kpi label="Clients qui reviennent" value={`${rate} %`} />
          </div>
          <p className="mt-2 text-xs text-[#9a948a]">Évolution comparée aux {d.days} jours précédents.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel title="Produits les plus vendus">
              {d.products.length ? <Bars rows={d.products.map((p) => ({ label: p.name, value: p.sold, text: `${p.sold}` }))} /> : <EmptyState title="Pas encore de ventes" />}
            </Panel>
            <Panel title="Ventes par pays">
              {d.countries.length ? <Bars rows={d.countries.map((c) => ({ label: c.country === "?" ? "Inconnu" : c.country, value: c.revenue, text: formatMoney(c.revenue) }))} /> : <EmptyState title="Pas encore de ventes" />}
            </Panel>
          </div>
          <Panel title="Newsletter" className="mt-4">
            <div className="flex gap-10 text-sm">
              <div><p className="text-2xl font-semibold">+{d.newSubs}</p><p className="text-xs text-[#7a756d]">inscrits</p></div>
              <div><p className="text-2xl font-semibold">−{d.lost}</p><p className="text-xs text-[#7a756d]">désinscrits</p></div>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
