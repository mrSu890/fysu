"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Plus } from "lucide-react"
import { AdminButton, Badge, EmptyState, PageHeader, Panel, Skeleton } from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"

type Code = {
  id: string
  code: string
  active: boolean
  percentOff: number | null
  amountOff: number | null
  timesRedeemed: number
  maxRedemptions: number | null
  expiresAt: number | null
  minAmount: number | null
  createdAt: number
}

const FIELD =
  "h-10 w-full rounded-full border border-[#e0dbd3] bg-white px-4 text-sm text-[#171717] outline-none focus:ring-2 focus:ring-[#171717]/10"

const fmtDate = (s: number) => new Date(s * 1000).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" })

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<Code[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [code, setCode] = useState("")
  const [kind, setKind] = useState<"percent" | "amount">("percent")
  const [value, setValue] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [expires, setExpires] = useState("")
  const [minAmount, setMinAmount] = useState("")

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ codes: Code[] }>("/api/admin/promo-codes")
      setCodes(r.codes)
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Impossible de charger les codes promo"))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const r = await api.post<{ code: string }>("/api/admin/promo-codes", {
        code,
        kind,
        value,
        maxRedemptions: maxUses,
        expiresAt: expires,
        minAmount,
      })
      notify.success(`Code ${r.code} créé`)
      setCode("")
      setValue("")
      setMaxUses("")
      setExpires("")
      setMinAmount("")
      await load()
    } catch (err) {
      notify.error(errorMessage(err, "Impossible de créer le code"))
    } finally {
      setCreating(false)
    }
  }

  async function toggle(c: Code) {
    try {
      await api.post("/api/admin/promo-codes", { id: c.id, active: !c.active })
      setCodes((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)))
    } catch (err) {
      notify.error(errorMessage(err, "Erreur"))
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      notify.success("Code copié")
    } catch {
      notify.error("Copie impossible")
    }
  }

  const label = (c: Code) =>
    c.percentOff != null ? `−${c.percentOff} %` : c.amountOff != null ? `−${c.amountOff.toFixed(2)} €` : "—"

  return (
    <>
      <PageHeader
        eyebrow="Boutique"
        title="Codes promo"
        description="Crée des codes de réduction pour tes clients (lancement, Instagram…). Ils se saisissent au paiement, dans « Ajouter un code promo »."
      />

      <Panel title="Nouveau code" description="Laisse le code vide pour qu'il soit créé automatiquement.">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Code (facultatif)</label>
            <input className={FIELD} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LANCEMENT10" maxLength={30} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Réduction</label>
            <div className="flex gap-2">
              <select className={FIELD + " w-32 shrink-0"} value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amount")}>
                <option value="percent">en %</option>
                <option value="amount">en €</option>
              </select>
              <input className={FIELD} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "percent" ? "10" : "20"} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Nombre d'utilisations max (vide = illimité)</label>
            <input className={FIELD} inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="1" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Valable jusqu'au (vide = sans limite)</label>
            <input className={FIELD} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#7a756d]">Commande minimum en € (facultatif)</label>
            <input className={FIELD} inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="100" />
          </div>
          <div className="flex items-end">
            <AdminButton type="submit" variant="primary" icon={Plus} disabled={creating}>
              {creating ? "Création…" : "Créer le code"}
            </AdminButton>
          </div>
        </form>
        <p className="mt-4 text-xs text-[#9a948a]">
          Un code ne s'applique pas avec le bouton Apple Pay de la fiche produit : le client doit passer par le panier pour l'utiliser.
        </p>
      </Panel>

      <div className="mt-6">
        <Panel title="Tes codes" padded={false}>
          {error ? (
            <p className="p-6 text-sm text-[#9b1c1c]">{error}</p>
          ) : codes === null ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : codes.length === 0 ? (
            <EmptyState title="Aucun code pour l'instant" description="Crée ton premier code ci-dessus." />
          ) : (
            <ul className="divide-y divide-[#eee9e1]">
              {codes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold tracking-wide">
                      {c.code}
                      <Badge tone={c.active ? "green" : "neutral"}>{c.active ? "Actif" : "Désactivé"}</Badge>
                    </p>
                    <p className="mt-0.5 text-xs text-[#7a756d]">
                      {label(c)} · utilisé {c.timesRedeemed}
                      {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""} fois
                      {c.expiresAt ? ` · jusqu'au ${fmtDate(c.expiresAt)}` : ""}
                      {c.minAmount ? ` · dès ${c.minAmount} €` : ""}
                    </p>
                  </div>
                  <AdminButton icon={Copy} onClick={() => copy(c.code)}>
                    Copier
                  </AdminButton>
                  <AdminButton variant={c.active ? "danger" : "secondary"} onClick={() => toggle(c)}>
                    {c.active ? "Désactiver" : "Réactiver"}
                  </AdminButton>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
