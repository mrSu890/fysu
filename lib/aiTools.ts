import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { loadCustomers } from "@/lib/customers"

/* Outils en LECTURE SEULE donnés à l'assistant : il peut regarder, jamais modifier ni envoyer. */
const DAY = 24 * 3600 * 1000
const eur = (c: number) => Math.round(c) / 100

export const TOOLS = [
  { name: "sales_summary", description: "Ventes sur les N derniers jours (commandes payées ou expédiées) : chiffre d'affaires en euros, nombre de commandes, panier moyen, et la période d'avant pour comparer.", input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 } }, required: ["days"] } },
  { name: "top_products", description: "Produits les plus vendus (quantités) sur les N derniers jours.", input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 } }, required: ["days"] } },
  { name: "orders_list", description: "Dernières commandes. status : paid (à expédier), shipped, pending, cancelled, refunded ou all.", input_schema: { type: "object", properties: { status: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["status"] } },
  { name: "customers", description: "Clients avec total dépensé, nombre de commandes, dernière commande, inscription newsletter. segment : vip, loyal, new, risk (plus de commande depuis 90 jours), prospect (jamais acheté) ou all.", input_schema: { type: "object", properties: { segment: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["segment"] } },
  { name: "low_stock", description: "Tailles actives dont le stock est de 3 ou moins.", input_schema: { type: "object", properties: {} } },
] as const

async function paidSince(since: string, until?: string) {
  let q = supabaseAdmin.from("orders").select("total, createdAt, items, email").in("status", ["paid", "shipped"]).gte("createdAt", since).limit(5000)
  if (until) q = q.lt("createdAt", until)
  return ((await q).data ?? []) as { total: number | null; createdAt: string; items: any; email: string | null }[]
}

export async function runTool(name: string, input: any): Promise<unknown> {
  const now = Date.now()
  if (name === "sales_summary") {
    const d = Math.min(365, Math.max(1, Number(input?.days) || 30))
    const cur = await paidSince(new Date(now - d * DAY).toISOString())
    const prev = await paidSince(new Date(now - 2 * d * DAY).toISOString(), new Date(now - d * DAY).toISOString())
    const sum = (r: typeof cur) => { const t = r.reduce((s, o) => s + Number(o.total ?? 0), 0); return { revenue_eur: eur(t), orders: r.length, basket_eur: r.length ? eur(t / r.length) : 0 } }
    return { days: d, current: sum(cur), previous_period: sum(prev) }
  }
  if (name === "top_products") {
    const d = Math.min(365, Math.max(1, Number(input?.days) || 30))
    const rows = await paidSince(new Date(now - d * DAY).toISOString())
    const by = new Map<number, number>()
    for (const o of rows) for (const it of Array.isArray(o.items) ? o.items : []) { const id = Number(it?.product_id), q = Number(it?.quantity) || 0; if (id && q) by.set(id, (by.get(id) ?? 0) + q) }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    const { data } = top.length ? await supabaseAdmin.from("products").select("id, name").in("id", top.map(([i]) => i)) : { data: [] as any[] }
    const names = new Map<number, string>((data ?? []).map((p: any) => [p.id, p.name]))
    return top.map(([id, sold]) => ({ product: names.get(id) ?? `#${id}`, sold }))
  }
  if (name === "orders_list") {
    const st = String(input?.status || "all")
    let q = supabaseAdmin.from("orders").select("id, status, total, email, createdAt, shipping_data").order("createdAt", { ascending: false }).limit(Math.min(30, Number(input?.limit) || 10))
    if (st !== "all") q = q.eq("status", st)
    return ((await q).data ?? []).map((o: any) => ({ id: String(o.id).slice(0, 8), status: o.status, total_eur: eur(o.total ?? 0), customer: o.shipping_data?.name ?? o.email, country: o.shipping_data?.address?.country, date: String(o.createdAt).slice(0, 10) }))
  }
  if (name === "customers") {
    const seg = String(input?.segment || "all")
    const all = await loadCustomers()
    return all.filter((c) => seg === "all" || c.segment === seg).sort((a, b) => b.spent - a.spent).slice(0, Math.min(30, Number(input?.limit) || 10))
      .map((c) => ({ name: c.name, email: c.email, segment: c.segment, spent_eur: eur(c.spent), orders: c.paidCount, last_order: c.lastOrderAt?.slice(0, 10) ?? null, newsletter: c.subscribed }))
  }
  if (name === "low_stock") {
    const { data } = await supabaseAdmin.from("product_sizes").select("product_id, size, stock").eq("is_active", true).lte("stock", 3).limit(30)
    const ids = Array.from(new Set((data ?? []).map((s: any) => s.product_id)))
    const { data: ps } = ids.length ? await supabaseAdmin.from("products").select("id, name").in("id", ids) : { data: [] as any[] }
    const names = new Map<number, string>((ps ?? []).map((p: any) => [p.id, p.name]))
    return (data ?? []).map((s: any) => ({ product: names.get(s.product_id) ?? `#${s.product_id}`, size: s.size, stock: s.stock }))
  }
  return { error: "outil inconnu" }
}
