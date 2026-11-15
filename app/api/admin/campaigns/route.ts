import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const DAY = 24 * 3600 * 1000

/* Résultats des campagnes : ouvertures, clics, et ventes des personnes qui ont cliqué (commande dans les 7 jours après l'envoi). */
export async function GET() {
  const { data: camps, error } = await supabaseAdmin.from("email_campaigns").select("*").order("sent_at", { ascending: false }).limit(30)
  if (error) return NextResponse.json({ campaigns: [], missing: /relation|does not exist/i.test(error.message) })
  const ids = (camps ?? []).map((c: any) => c.id)
  if (ids.length === 0) return NextResponse.json({ campaigns: [], missing: false })
  const { data: ev } = await supabaseAdmin.from("email_events").select("campaign_id, email, type, variant, url").in("campaign_id", ids).limit(50000)
  const { data: orders } = await supabaseAdmin.from("orders").select("email, total, status, createdAt").in("status", ["paid", "shipped"]).gte("createdAt", (camps![camps!.length - 1] as any).sent_at).limit(5000)

  const out = (camps ?? []).map((c: any) => {
    const mine = (ev ?? []).filter((e: any) => e.campaign_id === c.id)
    const uniq = (type: string, v?: string) => new Set(mine.filter((e: any) => e.type === type && (!v || e.variant === v)).map((e: any) => e.email)).size
    const clickers = new Set(mine.filter((e: any) => e.type === "click").map((e: any) => String(e.email).toLowerCase()))
    const t0 = new Date(c.sent_at).getTime()
    const sales = (orders ?? []).filter((o: any) => o.email && clickers.has(String(o.email).toLowerCase()) && new Date(o.createdAt).getTime() >= t0 && new Date(o.createdAt).getTime() <= t0 + 7 * DAY)
    const links = new Map<string, number>()
    for (const e of mine) if (e.type === "click" && e.url) links.set(e.url, (links.get(e.url) ?? 0) + 1)
    const half = Math.ceil((c.recipients ?? 0) / 2)
    return {
      id: c.id, subject: c.subject, subjectB: c.subject_b, segment: c.segment, recipients: c.recipients, sentAt: c.sent_at,
      opens: uniq("open"), clicks: uniq("click"), orders: sales.length, revenue: sales.reduce((a: number, o: any) => a + Number(o.total ?? 0), 0),
      ab: c.subject_b ? { a: { n: half, opens: uniq("open", "A"), clicks: uniq("click", "A") }, b: { n: (c.recipients ?? 0) - half, opens: uniq("open", "B"), clicks: uniq("click", "B") } } : null,
      top: [...links.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([url, n]) => ({ url, n })),
    }
  })
  return NextResponse.json({ campaigns: out, missing: false })
}
