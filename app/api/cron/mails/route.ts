import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { notifyRestock } from "@/lib/restock"
import { autoSend } from "@/lib/emailScenarios"
import { loadCustomers } from "@/lib/customers"
import { SITE_URL } from "@/lib/emailBlocks"

export const runtime = "nodejs"
export const maxDuration = 60

/* Tâche quotidienne (vercel.json) : retours en stock + paniers abandonnés. Sans danger si elle tourne plusieurs fois. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const restock = await notifyRestock()

  let carts = 0
  try {
    const now = Date.now()
    const { data } = await supabaseAdmin
      .from("checkout_attempts")
      .select("id, email, locale, lines, created_at")
      .is("reminded_at", null)
      .lte("created_at", new Date(now - 2 * 3600e3).toISOString())
      .gte("created_at", new Date(now - 72 * 3600e3).toISOString())
      .limit(200)
    const seen = new Set<string>()
    for (const a of (data ?? []) as any[]) {
      if (!a.email || seen.has(a.email)) { await supabaseAdmin.from("checkout_attempts").update({ reminded_at: new Date().toISOString() }).eq("id", a.id); continue }
      seen.add(a.email)
      await supabaseAdmin.from("checkout_attempts").update({ reminded_at: new Date().toISOString() }).eq("id", a.id)
      // a-t-il fini par payer ?
      const { count } = await supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("email", a.email).gte("createdAt", a.created_at)
      if (count) continue
      const list = (Array.isArray(a.lines) ? a.lines : []).map((l: any) => `· ${l.name}${l.size ? ` (${l.size})` : ""}${l.quantity > 1 ? ` × ${l.quantity}` : ""}`).join("\n")
      await autoSend("cart", { email: a.email, lang: String(a.locale ?? "fr").startsWith("fr") ? "fr" : "en", locale: a.locale, vars: { produits: list } })
      carts++
    }
  } catch (e) {
    console.error("cron carts:", e)
  }

  // clients inactifs (90 jours) : un mail, au plus une fois tous les 6 mois, 30 par jour maximum, seulement aux inscrits à la newsletter
  let winback = 0
  try {
    const { data: logRow } = await supabaseAdmin.from("email_templates").select("data").eq("key", "winback_sent").maybeSingle()
    const log: Record<string, string> = (logRow?.data as Record<string, string>) ?? {}
    const cutoff = Date.now() - 180 * 24 * 3600e3
    const risk = (await loadCustomers()).filter((c) => c.segment === "risk" && c.subscribed && !(log[c.email] && Date.parse(log[c.email]) > cutoff)).slice(0, 30)
    if (risk.length) {
      const { data: subs } = await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale").in("email", risk.map((c) => c.email)).is("unsubscribed_at", null)
      const by = new Map((subs ?? []).map((x: any) => [String(x.email).toLowerCase(), x]))
      for (const c of risk) {
        const sub: any = by.get(c.email)
        if (!sub) continue
        log[c.email] = new Date().toISOString()
        await autoSend("winback", { email: c.email, lang: String(sub.locale ?? "fr").startsWith("fr") ? "fr" : "en", locale: sub.locale, vars: { prenom: String(c.name ?? "").trim().split(/\s+/)[0] ?? "", url: SITE_URL }, unsubUrl: `${SITE_URL}/api/newsletter/unsubscribe?t=${sub.token}` })
        winback++
      }
      await supabaseAdmin.from("email_templates").upsert({ key: "winback_sent", data: log, updated_at: new Date().toISOString() })
    }
  } catch (e) {
    console.error("cron winback:", e)
  }
  return NextResponse.json({ restock, carts, winback })
}
