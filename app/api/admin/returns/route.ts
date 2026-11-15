import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { autoSend } from "@/lib/emailScenarios"
import { langForCountry } from "@/lib/orderEmail"
import { BUSINESS } from "@/lib/business"
import { notifyRestock } from "@/lib/restock"

export const runtime = "nodejs"

/* ADMIN > RETOURS
   GET   : toutes les demandes
   PATCH : { ids: string[], status: approved | received | refunded | rejected, note? }
   « Remboursé » remet les pièces en stock et passe la commande en « remboursée » si tout est retourné.
   L'argent lui-même se rembourse dans Stripe (Paiements > le paiement > Rembourser). */
const STATUSES = ["requested", "approved", "received", "refunded", "rejected"]

export async function GET() {
  const { data, error } = await supabaseAdmin.from("return_requests").select("*").order("created_at", { ascending: false }).limit(300)
  if (error) return NextResponse.json({ returns: [], missing: /relation|does not exist/i.test(error.message) })
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.order_id)))
  const { data: orders } = ids.length ? await supabaseAdmin.from("orders").select("id, total").in("id", ids) : { data: [] as any[] }
  const total = new Map<string, number>((orders ?? []).map((o: any) => [String(o.id), Number(o.total ?? 0)]))
  return NextResponse.json({ missing: false, returns: (data ?? []).map((r: any) => ({ id: r.id, orderId: r.order_id, email: r.email, name: r.name, items: r.items ?? [], reason: r.reason, comment: r.comment, status: r.status, note: r.admin_note, createdAt: r.created_at, orderTotal: total.get(String(r.order_id)) ?? null })) })
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 100) : []
  const status = String(b?.status ?? "")
  if (!ids.length || !STATUSES.includes(status)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  const { data: rows } = await supabaseAdmin.from("return_requests").select("*").in("id", ids)
  let done = 0
  for (const r of (rows ?? []) as any[]) {
    if (r.status === status) continue
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (typeof b.note === "string") patch.admin_note = b.note
    const { error } = await supabaseAdmin.from("return_requests").update(patch).eq("id", r.id)
    if (error) continue
    done++
    const { data: o } = await supabaseAdmin.from("orders").select("id, shipping_data, restocked_at").eq("id", r.order_id).maybeSingle()
    const vars = { prenom: String(r.name ?? "").trim().split(/\s+/)[0] ?? "", commande: String(r.order_id).slice(0, 8), adresse: `${BUSINESS.name}\n${BUSINESS.street}\n${BUSINESS.postalCode} ${BUSINESS.city}\n${BUSINESS.country}` }
    const to = { email: r.email, lang: langForCountry(o?.shipping_data?.address?.country), locale: r.locale, vars }
    if (status === "approved") await autoSend("return_approved", to)
    if (status === "rejected") await autoSend("return_rejected", to)
    if (status === "refunded") {
      for (const it of (Array.isArray(r.items) ? r.items : []) as any[]) {
        if (!it?.size_id) continue
        const { data: row } = await supabaseAdmin.from("product_sizes").select("stock").eq("id", it.size_id).maybeSingle()
        if (row) await supabaseAdmin.from("product_sizes").update({ stock: Number(row.stock) + (Number(it.quantity) || 0) }).eq("id", it.size_id)
      }
      if (r.all_items) await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", r.order_id)
      await notifyRestock().catch(() => {})
      await autoSend("refund", to)
    }
  }
  return NextResponse.json({ ok: true, updated: done })
}
