import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
const DAY = 24 * 3600 * 1000

type O = { total: number | null; createdAt: string; email: string | null; items: any; shipping_data: any }

function summarize(rows: O[]) {
  const revenue = rows.reduce((s, o) => s + Number(o.total ?? 0), 0)
  return { revenue, orders: rows.length, basket: rows.length ? Math.round(revenue / rows.length) : 0 }
}

export async function GET(req: Request) {
  const days = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 30
  const now = Date.now()
  const since = new Date(now - days * DAY).toISOString()
  const prevSince = new Date(now - 2 * days * DAY).toISOString()

  const [{ data }, subs] = await Promise.all([
    supabaseAdmin.from("orders").select("total, createdAt, email, items, shipping_data").in("status", ["paid", "shipped"]).gte("createdAt", prevSince).limit(10000),
    supabaseAdmin.from("newsletter_subscribers").select("subscribed_at, unsubscribed_at").limit(20000),
  ])
  const all = (data ?? []) as O[]
  const cur = all.filter((o) => o.createdAt >= since)
  const prev = all.filter((o) => o.createdAt < since)

  // clients qui reviennent : parmi les acheteurs de la période, ceux qui ont une commande plus ancienne
  const { data: older } = await supabaseAdmin.from("orders").select("email").in("status", ["paid", "shipped"]).lt("createdAt", since).limit(10000)
  const oldEmails = new Set((older ?? []).map((o: any) => String(o.email ?? "").toLowerCase()))
  const buyers = new Set(cur.map((o) => String(o.email ?? "").toLowerCase()).filter(Boolean))
  let returning = 0
  buyers.forEach((e) => { if (oldEmails.has(e)) returning++ })

  const byCountry = new Map<string, number>()
  const byProduct = new Map<number, number>()
  const byDay = new Map<string, number>()
  for (const o of cur) {
    const c = o.shipping_data?.address?.country ?? "?"
    byCountry.set(c, (byCountry.get(c) ?? 0) + Number(o.total ?? 0))
    byDay.set(o.createdAt.slice(0, 10), (byDay.get(o.createdAt.slice(0, 10)) ?? 0) + Number(o.total ?? 0))
    for (const it of Array.isArray(o.items) ? o.items : []) {
      const pid = Number(it?.product_id), q = Number(it?.quantity) || 0
      if (Number.isFinite(pid) && q > 0) byProduct.set(pid, (byProduct.get(pid) ?? 0) + q)
    }
  }
  const topIds = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const names = new Map<number, string>()
  if (topIds.length) {
    const { data: ps } = await supabaseAdmin.from("products").select("id, name").in("id", topIds.map(([id]) => id))
    for (const p of (ps ?? []) as any[]) names.set(p.id, p.name)
  }

  const subRows = (subs.data ?? []) as any[]
  const newSubs = subRows.filter((s) => s.subscribed_at >= since).length
  const lost = subRows.filter((s) => s.unsubscribed_at && s.unsubscribed_at >= since).length

  return NextResponse.json({
    days,
    cur: summarize(cur),
    prev: summarize(prev),
    buyers: buyers.size,
    returning,
    countries: [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([country, revenue]) => ({ country, revenue })),
    products: topIds.map(([id, sold]) => ({ id, name: names.get(id) ?? `Produit #${id}`, sold })),
    newSubs,
    lost,
  })
}
