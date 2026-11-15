import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { autoSend } from "@/lib/emailScenarios"
import { langForCountry } from "@/lib/orderEmail"

export const runtime = "nodejs"

/* RETOURS EN LIBRE-SERVICE (client connecté)
   GET  : ses demandes de retour
   POST : { orderId, indexes: number[], reason, comment }  — commande expédiée depuis moins de 21 jours (14 jours légaux après réception + transport) */
const WINDOW_DAYS = 21
const REASONS = ["size_small", "size_big", "not_liked", "defect", "other"]

async function who() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await who()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const { data: orders } = await supabase.from("orders").select("id").eq("user_id", user.id)
  const ids = (orders ?? []).map((o: { id: string }) => String(o.id))
  if (!ids.length) return NextResponse.json({ requests: [] })
  const { data } = await supabaseAdmin.from("return_requests").select("id, order_id, status, created_at").in("order_id", ids)
  return NextResponse.json({ requests: data ?? [] })
}

export async function POST(req: Request) {
  const { supabase, user } = await who()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  const b = await req.json().catch(() => null)
  const orderId = String(b?.orderId ?? "")
  const indexes: number[] = Array.isArray(b?.indexes) ? b.indexes.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0) : []
  const reason = REASONS.includes(b?.reason) ? b.reason : "other"
  const comment = String(b?.comment ?? "").slice(0, 600)
  if (!orderId || indexes.length === 0) return NextResponse.json({ error: "Choisis au moins un article." }, { status: 400 })

  const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).eq("user_id", user.id).maybeSingle()
  if (!o) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 })
  if (o.status !== "shipped") return NextResponse.json({ error: "Le retour est possible une fois la commande expédiée." }, { status: 400 })
  const since = new Date(o.shipped_at ?? o.createdAt).getTime()
  if (Date.now() - since > WINDOW_DAYS * 24 * 3600 * 1000) return NextResponse.json({ error: "Le délai de retour est dépassé." }, { status: 400 })

  const { data: open } = await supabaseAdmin.from("return_requests").select("id").eq("order_id", String(o.id)).neq("status", "rejected").limit(1)
  if (open?.length) return NextResponse.json({ error: "Une demande existe déjà pour cette commande." }, { status: 409 })

  const all = (Array.isArray(o.items) ? o.items : []) as any[]
  const pick = indexes.filter((i) => i < all.length).map((i) => all[i])
  if (!pick.length) return NextResponse.json({ error: "Articles invalides." }, { status: 400 })
  const ids = Array.from(new Set(pick.map((i) => Number(i.product_id)).filter(Boolean)))
  const { data: prods } = ids.length ? await supabaseAdmin.from("products").select("id, name").in("id", ids) : { data: [] as any[] }
  const nameOf = new Map<number, string>((prods ?? []).map((p: any) => [p.id, p.name]))
  const items = pick.map((i) => ({ product_id: i.product_id, name: nameOf.get(Number(i.product_id)) ?? "Produit", size_id: i.size_id ?? null, size_label: i.size_label ?? null, color_name: i.color_name ?? null, quantity: Number(i.quantity) || 1 }))
  const locale = /NEXT_LOCALE=([a-z-]+)/i.exec(req.headers.get("cookie") ?? "")?.[1] ?? null
  const email = String(o.email ?? user.email ?? "")

  const { error } = await supabaseAdmin.from("return_requests").insert({ order_id: String(o.id), email, name: o.shipping_data?.name ?? null, items, reason, comment, locale, all_items: items.length === all.length })
  if (error) return NextResponse.json({ error: /relation|does not exist/i.test(error.message) ? "Les retours ne sont pas encore activés." : "Impossible d'enregistrer la demande." }, { status: 500 })

  if (email) await autoSend("return_requested", { email, lang: langForCountry(o.shipping_data?.address?.country), locale, vars: { prenom: String(o.shipping_data?.name ?? "").trim().split(/\s+/)[0] ?? "", commande: String(o.id).slice(0, 8) } })
  return NextResponse.json({ ok: true })
}
