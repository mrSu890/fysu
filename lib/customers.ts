import { supabaseAdmin } from "@/lib/supabaseAdmin"

export type Segment = "vip" | "loyal" | "new" | "risk" | "prospect"

const DAY = 24 * 3600 * 1000

// Un client = une adresse e-mail, regroupée depuis les commandes, les comptes et la newsletter
export async function loadCustomers() {
  const [ordersRes, usersRes, subsRes] = await Promise.all([
    supabaseAdmin.from("orders").select("id, status, total, currency, email, createdAt, shipping_data").order("createdAt", { ascending: false }).limit(10000),
    supabaseAdmin.from("User").select("email, name, image, createdAt").limit(10000),
    supabaseAdmin.from("newsletter_subscribers").select("email, unsubscribed_at").limit(10000),
  ])

  type C = {
    email: string
    name: string | null
    image: string | null
    hasAccount: boolean
    subscribed: boolean
    orders: { id: string; status: string; total: number; createdAt: string }[]
    spent: number
    paidCount: number
    lastOrderAt: string | null
    firstSeen: string | null
    segment: Segment
  }
  const map = new Map<string, C>()
  const get = (raw: string) => {
    const email = raw.trim().toLowerCase()
    let c = map.get(email)
    if (!c) {
      c = { email, name: null, image: null, hasAccount: false, subscribed: false, orders: [], spent: 0, paidCount: 0, lastOrderAt: null, firstSeen: null, segment: "prospect" }
      map.set(email, c)
    }
    return c
  }
  const seen = (c: C, d?: string | null) => {
    if (d && (!c.firstSeen || d < c.firstSeen)) c.firstSeen = d
  }

  for (const u of (usersRes.data ?? []) as any[]) {
    if (!u.email) continue
    const c = get(u.email)
    c.hasAccount = true
    c.name = c.name ?? u.name ?? null
    c.image = u.image ?? null
    seen(c, u.createdAt)
  }
  for (const s of (subsRes.data ?? []) as any[]) {
    if (!s.email) continue
    const c = get(s.email)
    c.subscribed = !s.unsubscribed_at
  }
  for (const o of (ordersRes.data ?? []) as any[]) {
    if (!o.email) continue
    const c = get(o.email)
    c.name = c.name ?? o.shipping_data?.name ?? null
    c.orders.push({ id: o.id, status: o.status, total: Number(o.total ?? 0), createdAt: o.createdAt })
    seen(c, o.createdAt)
    if (o.status === "paid" || o.status === "shipped") {
      c.spent += Number(o.total ?? 0)
      c.paidCount += 1
      if (!c.lastOrderAt || o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt
    }
  }

  const now = Date.now()
  for (const c of map.values()) {
    if (c.paidCount === 0) c.segment = "prospect"
    else if (c.spent >= 30000 || c.paidCount >= 3) c.segment = "vip"
    else if (now - new Date(c.lastOrderAt!).getTime() > 90 * DAY) c.segment = "risk"
    else if (c.paidCount >= 2) c.segment = "loyal"
    else c.segment = "new"
  }

  const customers = [...map.values()].sort((a, b) => (b.lastOrderAt ?? b.firstSeen ?? "").localeCompare(a.lastOrderAt ?? a.firstSeen ?? ""))
  return customers
}
