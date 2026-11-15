import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* ADMIN > AVIS : GET la liste ; PATCH { ids, status: approved | rejected } ; DELETE { ids } */
export async function GET() {
  const { data, error } = await supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false }).limit(300)
  if (error) return NextResponse.json({ reviews: [], missing: /relation|does not exist/i.test(error.message) })
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.product_id)))
  const { data: prods } = ids.length ? await supabaseAdmin.from("products").select("id, name").in("id", ids) : { data: [] as any[] }
  const name = new Map<number, string>((prods ?? []).map((p: any) => [p.id, p.name]))
  return NextResponse.json({ missing: false, reviews: (data ?? []).map((r: any) => ({ id: r.id, product: name.get(r.product_id) ?? "Produit", name: r.name, rating: r.rating, text: r.text, status: r.status, createdAt: r.created_at })) })
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 200) : []
  if (!ids.length || !["approved", "rejected", "pending"].includes(b?.status)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  const { error } = await supabaseAdmin.from("reviews").update({ status: b.status }).in("id", ids)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String).slice(0, 200) : []
  if (!ids.length) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  const { error } = await supabaseAdmin.from("reviews").delete().in("id", ids)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true })
}
