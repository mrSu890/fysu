"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Check, Copy, ExternalLink, Mail, Printer, Truck } from "lucide-react"
import {
  AdminButton,
  OrderStatusBadge,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/Admin/ui/kit"
import { api, errorMessage, formatMoney, notify } from "@/lib/adminApi"

type Item = {
  productId: number
  name: string
  slug: string | null
  size: string | null
  colorName: string | null
  colorHex: string | null
  quantity: number
  image: string | null
}

type OrderDetail = {
  id: string
  status: string
  total: number
  currency: string | null
  email: string | null
  createdAt: string
  shippedAt: string | null
  trackingNumber: string | null
  adminNote: string
  restockedAt: string | null
  stripePaymentIntent: string | null
  shipping: {
    name?: string
    email?: string
    phone?: string
    address?: {
      line1?: string
      line2?: string | null
      city?: string
      postal_code?: string
      country?: string
    }
  } | null
  items: Item[]
}

const INPUT =
  "w-full rounded-2xl border border-[#e0dbd3] bg-white px-4 py-2.5 text-sm text-[#171717] outline-none placeholder:text-[#b3ada3] focus:ring-2 focus:ring-[#171717]/10"

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

function addressText(order: OrderDetail) {
  const s = order.shipping
  if (!s?.address) return ""
  return [
    s.name,
    s.address.line1,
    s.address.line2,
    `${s.address.postal_code ?? ""} ${s.address.city ?? ""}`.trim(),
    s.address.country,
    s.phone ? `Tél : ${s.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tracking, setTracking] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await api.get<OrderDetail>(`/api/admin/orders/${id}`)
      setOrder(data)
      setTracking(data.trackingNumber ?? "")
      setNote(data.adminNote ?? "")
      setError(null)
    } catch (e) {
      setError(errorMessage(e, "Commande introuvable"))
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function patch(body: Record<string, unknown>, success: string) {
    setBusy(true)

    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`)
      notify.success(success)
      await load()
    } catch (e) {
      notify.error(errorMessage(e, "Erreur lors de l'enregistrement"))
    } finally {
      setBusy(false)
    }
  }

  function markShipped() {
    patch({ status: "shipped", trackingNumber: tracking }, "Commande marquée comme expédiée")
  }

  function closeOrder(status: "cancelled" | "refunded") {
    if (!order) return
    const label = status === "cancelled" ? "annulée" : "remboursée"
    if (!confirm(`Marquer cette commande comme ${label} ?`)) return

    let restock = false
    if (!order.restockedAt) {
      restock = confirm("Remettre les articles en stock ?\n\nOK = oui, Annuler = non")
    }

    patch(
      { status, restock },
      restock ? `Commande ${label}, articles remis en stock` : `Commande ${label}`
    )
  }

  async function copyAddress() {
    if (!order) return
    try {
      await navigator.clipboard.writeText(addressText(order))
      notify.success("Adresse copiée")
    } catch {
      window.prompt("Copie l'adresse :", addressText(order))
    }
  }

  function printLabel() {
    if (!order) return
    const w = window.open("", "", "width=600,height=600")
    if (!w) return
    w.document.write(`<html><head><title>Étiquette</title>
      <style>body{font-family:Arial;padding:40px}.label{border:2px solid #000;padding:20px;width:320px;white-space:pre-line;font-size:16px;line-height:1.5}</style>
      </head><body><div class="label">${escapeHtml(addressText(order))}</div></body></html>`)
    w.document.close()
    w.print()
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#f3c9c9] bg-[#fdeeee] px-4 py-3 text-sm text-[#7a1f1f]">
          {error}
        </div>
        <AdminButton href="/admin/orders" icon={ArrowLeft}>
          Retour aux commandes
        </AdminButton>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  const address = addressText(order)
  const dirtyNote = note !== (order.adminNote ?? "")
  const dirtyTracking = tracking.trim() !== (order.trackingNumber ?? "")
  const closed = order.status === "cancelled" || order.status === "refunded"
  const stripeId = order.stripePaymentIntent

  return (
    <div>
      <AdminButton href="/admin/orders" variant="ghost" icon={ArrowLeft}>
        Commandes
      </AdminButton>

      <div className="mt-4">
        <PageHeader
          eyebrow={`Commande #${order.id.slice(0, 8)}`}
          title={order.shipping?.name || order.email || "Client inconnu"}
          description={formatDateTime(order.createdAt)}
          actions={<OrderStatusBadge status={order.status} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {/* Articles */}
          <Panel title="Articles à préparer">
            <ul className="divide-y divide-[#f0ece5]">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" className="h-20 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="h-20 w-16 rounded-xl bg-[#f0ece5]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#3d3a35]">
                      {it.size && (
                        <span className="rounded-full bg-[#171717]/[0.06] px-2.5 py-1">{it.size}</span>
                      )}
                      {it.colorName && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171717]/[0.06] px-2.5 py-1">
                          {it.colorHex && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: it.colorHex }}
                            />
                          )}
                          {it.colorName}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-semibold">×{it.quantity}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[#f0ece5] pt-4 text-sm">
              <span className="text-[#7a756d]">Total payé (livraison incluse)</span>
              <span className="text-base font-semibold">
                {formatMoney(order.total, order.currency ?? "EUR")}
              </span>
            </div>
          </Panel>

          {/* Note interne */}
          <Panel title="Note interne" description="Visible seulement dans l'admin.">
            <textarea
              rows={3}
              className={INPUT}
              placeholder="Ex : client prévenu du retard, colis emballé cadeau…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {dirtyNote && (
              <div className="mt-3">
                <AdminButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => patch({ adminNote: note }, "Note enregistrée")}
                >
                  Enregistrer la note
                </AdminButton>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {/* Expédition */}
          <Panel title="Expédition">
            {order.status === "shipped" && (
              <p className="mb-3 flex items-center gap-2 rounded-xl bg-[#dbe7f7] px-3 py-2 text-xs text-[#1f3f73]">
                <Truck size={14} />
                Expédiée{order.shippedAt ? ` le ${formatDateTime(order.shippedAt)}` : ""}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#3d3a35]">
                Numéro de suivi (facultatif)
              </span>
              <input
                className={INPUT}
                placeholder="Ex : 3SABC1234567"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {order.status !== "shipped" && !closed && (
                <AdminButton variant="primary" icon={Check} disabled={busy} onClick={markShipped}>
                  Marquer expédiée
                </AdminButton>
              )}
              {order.status === "shipped" && dirtyTracking && (
                <AdminButton
                  variant="primary"
                  disabled={busy}
                  onClick={() => patch({ trackingNumber: tracking }, "Suivi enregistré")}
                >
                  Enregistrer le suivi
                </AdminButton>
              )}
              {order.status === "shipped" && (
                <AdminButton
                  disabled={busy}
                  onClick={() => patch({ status: "paid" }, "Remise à « Payée »")}
                >
                  Repasser en payée
                </AdminButton>
              )}
              {closed && (
                <AdminButton
                  disabled={busy}
                  onClick={() => patch({ status: "paid" }, "Remise à « Payée »")}
                >
                  Rouvrir la commande
                </AdminButton>
              )}
            </div>

            {order.email && order.status !== "pending" && (
              <p className="mt-4 text-xs text-[#7a756d]">
                Le client n'est pas prévenu automatiquement. Tu peux lui écrire :
              </p>
            )}
            {order.email && (
              <div className="mt-2">
                <AdminButton
                  icon={Mail}
                  href={`mailto:${order.email}?subject=${encodeURIComponent(
                    `Votre commande fysu #${order.id.slice(0, 8)}`
                  )}${
                    order.trackingNumber
                      ? `&body=${encodeURIComponent(
                          `Bonjour,\n\nVotre commande est expédiée. Numéro de suivi : ${order.trackingNumber}\n\nMerci !`
                        )}`
                      : ""
                  }`}
                >
                  Écrire au client
                </AdminButton>
              </div>
            )}
          </Panel>

          {/* Livraison */}
          <Panel title="Adresse de livraison">
            {address ? (
              <>
                <pre className="whitespace-pre-wrap rounded-2xl bg-[#faf8f5] p-4 font-sans text-sm leading-relaxed ring-1 ring-[#eee9e1]">
                  {address}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton icon={Copy} onClick={copyAddress}>
                    Copier
                  </AdminButton>
                  <AdminButton icon={Printer} onClick={printLabel}>
                    Étiquette
                  </AdminButton>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#7a756d]">Adresse indisponible.</p>
            )}
            {order.email && <p className="mt-3 break-all text-xs text-[#7a756d]">{order.email}</p>}
          </Panel>

          {/* Paiement et clôture */}
          <Panel title="Paiement">
            <div className="flex flex-wrap gap-2">
              {stripeId && (
                <>
                  <AdminButton
                    icon={ExternalLink}
                    href={`https://dashboard.stripe.com/payments/${stripeId}`}
                  >
                    Ouvrir dans Stripe
                  </AdminButton>
                  <AdminButton
                    variant="ghost"
                    href={`https://dashboard.stripe.com/test/payments/${stripeId}`}
                  >
                    (mode test)
                  </AdminButton>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-[#7a756d]">
              Le remboursement d'argent se fait dans Stripe. Ici, tu marques la commande.
            </p>

            {!closed && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f0ece5] pt-4">
                <AdminButton variant="danger" disabled={busy} onClick={() => closeOrder("cancelled")}>
                  Annuler la commande
                </AdminButton>
                <AdminButton variant="danger" disabled={busy} onClick={() => closeOrder("refunded")}>
                  Marquer remboursée
                </AdminButton>
              </div>
            )}

            {order.restockedAt && (
              <p className="mt-3 text-xs text-[#2c4a26]">Articles déjà remis en stock.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
