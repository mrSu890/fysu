import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { notifyRestock } from "@/lib/restock"
import { autoSend } from "@/lib/emailScenarios"

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
      await autoSend("cart", { email: a.email, lang: String(a.locale ?? "fr").startsWith("fr") ? "fr" : "en", vars: { produits: list } })
      carts++
    }
  } catch (e) {
    console.error("cron carts:", e)
  }
  return NextResponse.json({ restock, carts })
}
