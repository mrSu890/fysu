import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { autoSend } from "@/lib/emailScenarios"
import { notifyRestock } from "@/lib/restock"
import { langForCountry } from "@/lib/orderEmail"

export const runtime = "nodejs"

/* Fiche commande (réservée aux admins par le middleware)
   GET   : détail
   PATCH : { status?, trackingNumber?, adminNote?, restock? } */
const fail = (m: string, s = 500) => NextResponse.json({ error: m }, { status: s })

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: o, error } = await supabaseAdmin.from("orders").select("*").eq("id", id).maybeSingle()
  if (error) return fail(error.message)
  if (!o) return fail("Commande introuvable.", 404)

  const items = Array.isArray(o.items) ? (o.items as any[]) : []
  const ids = Array.from(new Set(items.map((i) => Number(i.product_id)).filter(Boolean)))
  const { data: prods } = ids.length ? await supabaseAdmin.from("products").select("id, name, slug, product_images(url)").in("id", ids) : { data: [] as any[] }
  const byId = new Map<number, any>((prods ?? []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    id: o.id,
    status: o.status,
    total: o.total,
    currency: o.currency ?? null,
    email: o.email ?? null,
    createdAt: o.createdAt,
    shippedAt: o.shipped_at ?? null,
    trackingNumber: o.tracking_number ?? null,
    adminNote: o.admin_note ?? "",
    restockedAt: o.restocked_at ?? null,
    stripePaymentIntent: o.stripe_payment_intent ?? null,
    shipping: o.shipping_data ?? null,
    items: items.map((i) => {
      const p = byId.get(Number(i.product_id))
      return {
        productId: Number(i.product_id),
        name: p?.name ?? "Produit",
        slug: p?.slug ?? null,
        size: i.size_label ?? null,
        colorName: i.color_name ?? null,
        colorHex: null,
        quantity: Number(i.quantity) || 1,
        image: p?.product_images?.[0]?.url ?? null,
      }
    }),
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return fail("Requête invalide.", 400)

  const { data: o } = await supabaseAdmin.from("orders").select("*").eq("id", id).maybeSingle()
  if (!o) return fail("Commande introuvable.", 404)

  const patch: Record<string, unknown> = {}
  if (typeof body.trackingNumber === "string") patch.tracking_number = body.trackingNumber.trim() || null
  if (typeof body.adminNote === "string") patch.admin_note = body.adminNote
  const statuses = ["pending", "paid", "shipped", "cancelled", "refunded"]
  if (typeof body.status === "string") {
    if (!statuses.includes(body.status)) return fail("Statut inconnu.", 400)
    patch.status = body.status
    if (body.status === "shipped") patch.shipped_at = new Date().toISOString()
  }

  // remise en stock des articles (une seule fois)
  if (body.restock && !o.restocked_at) {
    for (const it of (Array.isArray(o.items) ? o.items : []) as any[]) {
      if (!it?.size_id) continue
      const { data: row } = await supabaseAdmin.from("product_sizes").select("stock").eq("id", it.size_id).maybeSingle()
      if (row) await supabaseAdmin.from("product_sizes").update({ stock: Number(row.stock) + (Number(it.quantity) || 0) }).eq("id", it.size_id)
    }
    patch.restocked_at = new Date().toISOString()
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })
  const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", id)
  if (error) return fail(error.message)

  if (patch.restocked_at) await notifyRestock().catch(() => {})

  // mail d'expédition automatique (seulement au passage à « expédiée »)
  if (body.status === "shipped" && o.status !== "shipped" && o.email) {
    const a = o.shipping_data?.address ?? {}
    await autoSend("shipped", {
      email: o.email,
      lang: langForCountry(a.country),
      vars: {
        prenom: String(o.shipping_data?.name ?? "").trim().split(/\s+/)[0] ?? "",
        commande: String(o.id).slice(0, 8),
        suivi: (patch.tracking_number as string) ?? o.tracking_number ?? "",
      },
    })
  }
  return NextResponse.json({ ok: true })
}
