"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Copy, RotateCcw, Trash2 } from "lucide-react"
import {
  AdminButton,
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, notify } from "@/lib/adminApi"

type RequestRow = {
  id: string
  productId: number
  productName: string
  productSlug: string | null
  kind: "notify" | "quote"
  email: string
  name: string | null
  message: string | null
  locale: string | null
  status: "new" | "done"
  createdAt: string
}

const KIND_FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "notify", label: "Me prévenir" },
  { id: "quote", label: "Devis" },
] as const

const STATUS_FILTERS = [
  { id: "new", label: "À traiter" },
  { id: "done", label: "Traitées" },
  { id: "all", label: "Toutes" },
] as const

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // secours si le presse-papiers est bloqué : on affiche le texte à copier à la main
    window.prompt("Copie les adresses :", text)
    return false
  }
}

export default function RequestsPage() {
  const [rows, setRows] = useState<RequestRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<(typeof KIND_FILTERS)[number]["id"]>("all")
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("new")

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ requests: RequestRow[] }>("/api/admin/requests")
      setRows(data.requests)
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => (kind === "all" || r.kind === kind) && (status === "all" || r.status === status)
      ),
    [rows, kind, status]
  )

  // Personnes en attente d'un produit (« me prévenir » non traités)
  const waiting = useMemo(() => {
    // un groupe par produit ET par taille / couleur demandée (le message contient « Taille : M · Couleur : Noir »)
    const map = new Map<string, { key: string; productId: number; name: string; detail: string; emails: string[] }>()
    for (const r of rows ?? []) {
      if (r.kind !== "notify" || r.status !== "new") continue
      const detail = (r.message ?? "").trim()
      const key = `${r.productId}|${detail}`
      const entry = map.get(key) ?? {
        key,
        productId: r.productId,
        name: r.productName,
        detail,
        emails: [] as string[],
      }
      entry.emails.push(r.email)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.emails.length - a.emails.length)
  }, [rows])

  const newCount = (rows ?? []).filter((r) => r.status === "new").length

  async function setDone(r: RequestRow, next: "new" | "done") {
    try {
      await api.put(`/api/admin/requests/${r.id}`, { status: next })
      setRows((cur) => (cur ?? []).map((x) => (x.id === r.id ? { ...x, status: next } : x)))
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  async function remove(r: RequestRow) {
    if (!window.confirm(`Supprimer la demande de ${r.email} ?`)) return
    try {
      await api.del(`/api/admin/requests/${r.id}`)
      setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id))
      notify.success("Demande supprimée")
    } catch (e) {
      notify.error(errorMessage(e))
    }
  }

  async function markProductDone(productId: number, detail: string) {
    const targets = (rows ?? []).filter(
      (r) =>
        r.productId === productId &&
        r.kind === "notify" &&
        r.status === "new" &&
        (r.message ?? "").trim() === detail
    )
    try {
      await Promise.all(targets.map((r) => api.put(`/api/admin/requests/${r.id}`, { status: "done" })))
      setRows((cur) =>
        (cur ?? []).map((x) => (targets.some((t) => t.id === x.id) ? { ...x, status: "done" } : x))
      )
      notify.success("Marquées comme traitées")
    } catch (e) {
      notify.error(errorMessage(e))
      load()
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Boutique"
        title="Demandes"
        description="Les personnes qui veulent être prévenues d'un produit et les demandes de devis envoyées depuis le site."
      />

      {error && (
        <div className="mb-4 rounded-2xl bg-[#fdeeee] px-4 py-3 text-sm text-[#9b1c1c]">
          {error}
          {/relation|does not exist|schema cache/i.test(error) && (
            <span className="mt-1 block text-xs">
              La table des demandes n'existe pas encore : lance le SQL de l'étape C dans Supabase.
            </span>
          )}
        </div>
      )}

      {/* Personnes en attente par produit */}
      {waiting.length > 0 && (
        <div className="mb-6">
          <Panel
            title="Personnes en attente d'un produit"
            description="Quand le produit est disponible : copie les adresses, écris-leur, puis marque comme traité."
          >
            <div className="space-y-2">
              {waiting.map((w) => (
                <div
                  key={w.key}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#faf8f5] p-3 ring-1 ring-[#eee9e1]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {w.name}
                      {w.detail && <span className="font-normal text-[#7a756d]"> · {w.detail}</span>}
                    </p>
                    <p className="text-xs text-[#7a756d]">
                      {w.emails.length} personne{w.emails.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <AdminButton
                    icon={Copy}
                    onClick={async () => {
                      const ok = await copyText(w.emails.join(", "))
                      if (ok) notify.success("Adresses copiées")
                    }}
                  >
                    Copier les e-mails
                  </AdminButton>
                  <AdminButton icon={Check} onClick={() => markProductDone(w.productId, w.detail)}>
                    Tout marquer traité
                  </AdminButton>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-full bg-[#171717]/[0.05] p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                status === f.id
                  ? "bg-white font-medium text-[#171717] shadow-sm"
                  : "text-[#7a756d] hover:text-[#171717]"
              }`}
            >
              {f.label}
              {f.id === "new" && newCount > 0 ? ` (${newCount})` : ""}
            </button>
          ))}
        </div>
        <div className="inline-flex gap-1 rounded-full bg-[#171717]/[0.05] p-1">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setKind(f.id)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                kind === f.id
                  ? "bg-white font-medium text-[#171717] shadow-sm"
                  : "text-[#7a756d] hover:text-[#171717]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {rows === null && !error ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune demande ici"
          description="Elles apparaissent quand un visiteur clique sur « Me prévenir » ou « Demander un devis » sur une fiche produit."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-3xl border border-[#e9e5df] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.kind === "quote" ? "blue" : "orange"}>
                  {r.kind === "quote" ? "Devis" : "Me prévenir"}
                </Badge>
                {r.status === "done" && <Badge tone="green">Traitée</Badge>}
                <span className="ml-auto text-xs text-[#9a948a]">
                  {formatDateTime(r.createdAt)}
                  {r.locale ? ` · ${r.locale.toUpperCase()}` : ""}
                </span>
              </div>

              <p className="mt-3 text-sm">
                <Link
                  href={`/admin/catalog/${r.productId}`}
                  style={{ color: "#171717" }}
                  className="font-medium underline underline-offset-2"
                >
                  {r.productName}
                </Link>
              </p>

              <p className="mt-1 break-all text-sm">
                {r.name ? `${r.name} · ` : ""}
                <a href={`mailto:${r.email}`} style={{ color: "#1f3f73" }} className="underline">
                  {r.email}
                </a>
              </p>

              {r.message && (
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-[#faf8f5] p-3 text-sm text-[#3d3a35]">
                  {r.message}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "new" ? (
                  <AdminButton icon={Check} onClick={() => setDone(r, "done")}>
                    Marquer traitée
                  </AdminButton>
                ) : (
                  <AdminButton icon={RotateCcw} onClick={() => setDone(r, "new")}>
                    Rouvrir
                  </AdminButton>
                )}
                <AdminButton variant="danger" icon={Trash2} onClick={() => remove(r)}>
                  Supprimer
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
