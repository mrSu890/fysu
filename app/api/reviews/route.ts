import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { reviewToken } from "@/lib/reviews"

export const runtime = "nodejs"

/* AVIS CLIENTS
   GET ?productId=12      : avis validés d'un produit (public)
   GET ?o=ORDER&t=TOKEN   : les articles de la commande à noter (lien du mail)
   POST { orderId, t, reviews: [{ productId, rating, text }] } : envoie les avis (ils attendent ta validation dans Admin > Avis) */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const pid = Number(q.get("productId"))
  if (pid) {
    const { data, error } = await supabaseAdmin.from("reviews").select("name, rating, text, created_at").eq("product_id", pid).eq("status", "approved").order("created_at", { ascending: false }).limit(30)
    if (error) return NextResponse.json({ reviews: [], average: 0, count: 0 })
    const list = data ?? []
    const avg = list.length ? list.reduce((a: number, r: any) => a + r.rating, 0) / list.length : 0
    return NextResponse.json({ reviews: list, average: Math.round(avg * 10) / 10, count: list.length })
  }
  const o = q.get("o") ?? ""
  if (!o || q.get("t") !== reviewToken(o)) return NextResponse.json({ error: "Lien invalide." }, { status: 403 })
  const { data: order } = await supabaseAdmin.from("orders").select("id, items").eq("id", o).maybeSingle()
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 })
  const ids = Array.from(new Set(((order.items ?? []) as any[]).map((i) => Number(i.product_id)).filter(Boolean)))
  const [{ data: prods }, { data: done }] = await Promise.all([
    ids.length ? supabaseAdmin.from("products").select("id, name, product_images(url)").in("id", ids) : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin.from("reviews").select("product_id").eq("order_id", o),
  ])
  const reviewed = new Set((done ?? []).map((d: any) => d.product_id))
  return NextResponse.json({ items: (prods ?? []).map((p: any) => ({ id: p.id, name: p.name, image: p.product_images?.[0]?.url ?? null, done: reviewed.has(p.id) })) })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  const o = String(b?.orderId ?? "")
  if (!o || b?.t !== reviewToken(o)) return NextResponse.json({ error: "Lien invalide." }, { status: 403 })
  const { data: order } = await supabaseAdmin.from("orders").select("id, email, shipping_data, items").eq("id", o).maybeSingle()
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 })
  const own = new Set(((order.items ?? []) as any[]).map((i) => Number(i.product_id)))
  const first = String(order.shipping_data?.name ?? "").trim().split(/\s+/)
  const name = first[0] ? `${first[0]}${first.length > 1 ? " " + first[first.length - 1][0] + "." : ""}` : "Client FYSU"
  const rows = (Array.isArray(b.reviews) ? b.reviews : [])
    .map((r: any) => ({ product_id: Number(r?.productId), rating: Math.round(Number(r?.rating)), text: String(r?.text ?? "").trim().slice(0, 800) }))
    .filter((r: any) => own.has(r.product_id) && r.rating >= 1 && r.rating <= 5)
    .map((r: any) => ({ ...r, order_id: o, email: order.email, name, status: "pending" }))
  if (!rows.length) return NextResponse.json({ error: "Donne au moins une note." }, { status: 400 })
  const { error } = await supabaseAdmin.from("reviews").upsert(rows, { onConflict: "order_id,product_id" })
  if (error) return NextResponse.json({ error: "Impossible d'enregistrer l'avis." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
