"use client"

import { useEffect, useState } from "react"
import { Eye, MousePointerClick, ShoppingBag, Trophy, Users } from "lucide-react"
import { EmptyState, PageHeader, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, formatMoney } from "@/lib/adminApi"
import { AUDIENCES } from "@/lib/audience"

type AB = { n: number; opens: number; clicks: number }
type Camp = { id: string; subject: string; subjectB: string | null; segment: string; recipients: number; sentAt: string; opens: number; clicks: number; orders: number; revenue: number; ab: { a: AB; b: AB } | null; top: { url: string; n: number }[] }

const pct = (a: number, n: number) => (n ? `${Math.round((a / n) * 100)} %` : "–")

function Stat({ icon: I, value, sub }: { icon: typeof Eye; value: string; sub: string }) {
  return <div className="rounded-2xl bg-[#faf8f5] p-3"><I size={15} className="text-[#9a948a]" /><p className="mt-2 text-lg font-semibold">{value}</p><p className="text-[11px] text-[#7a756d]">{sub}</p></div>
}

export default function CampaignsPage() {
  const [list, setList] = useState<Camp[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [err, setErr] = useState("")
  useEffect(() => {
    api.get<{ campaigns: Camp[]; missing: boolean }>("/api/admin/campaigns").then((r) => { setList(r.campaigns); setMissing(r.missing) }).catch((e) => setErr(errorMessage(e)))
  }, [])

  return (
    <>
      <PageHeader title="Résultats des campagnes" />
      {err && <p className="mb-4 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#9b1c1c]">{err}</p>}
      {missing && <p className="mb-4 rounded-xl bg-[#fff6e5] p-3 text-sm text-[#7a5200]">Le suivi n'est pas encore activé : le SQL « campagnes » est à lancer dans Supabase.</p>}
      {!list ? <Skeleton className="h-40 w-full" /> : list.length === 0 ? <EmptyState title="Aucune campagne suivie" description="Les résultats apparaissent après ton prochain envoi." /> : (
        <div className="space-y-4">
          {list.map((c) => {
            const win = c.ab ? (c.ab.a.clicks / Math.max(1, c.ab.a.n) >= c.ab.b.clicks / Math.max(1, c.ab.b.n) ? "A" : "B") : null
            return (
              <div key={c.id} className="rounded-3xl border border-[#e9e5df] bg-white p-5">
                <p className="font-medium">{c.subject}</p>
                <p className="mt-0.5 text-xs text-[#9a948a]">{new Date(c.sentAt).toLocaleDateString("fr-BE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} · {AUDIENCES.find((a) => a.id === c.segment)?.label ?? "Tous"}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat icon={Users} value={String(c.recipients)} sub="envoyés" />
                  <Stat icon={Eye} value={pct(c.opens, c.recipients)} sub="ouverts" />
                  <Stat icon={MousePointerClick} value={pct(c.clicks, c.recipients)} sub="ont cliqué" />
                  <Stat icon={ShoppingBag} value={formatMoney(c.revenue)} sub={`${c.orders} commande(s) sous 7 j`} />
                </div>
                {c.ab && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {([["A", c.subject, c.ab.a], ["B", c.subjectB ?? "", c.ab.b]] as const).map(([k, s, v]) => (
                      <div key={k} className={`rounded-2xl p-3 text-sm ring-1 ${win === k ? "bg-[#eaf7ee] ring-[#bfe5c8]" : "bg-white ring-[#e9e5df]"}`}>
                        <p className="flex items-center gap-1.5 font-medium">{win === k && <Trophy size={14} />}{k} · <span className="truncate font-normal">{s}</span></p>
                        <p className="mt-1 text-xs text-[#6b6760]">{pct(v.opens, v.n)} ouverts · {pct(v.clicks, v.n)} cliqués</p>
                      </div>
                    ))}
                  </div>
                )}
                {c.top.length > 0 && <p className="mt-3 truncate text-xs text-[#7a756d]">Lien le plus cliqué : {c.top[0].url.replace(/^https?:\/\/(www\.)?/, "")} ({c.top[0].n})</p>}
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-[#9a948a]">Les ouvertures sont un peu gonflées (Apple Mail ouvre les mails automatiquement) : fie-toi surtout aux clics et aux ventes.</p>
    </>
  )
}
