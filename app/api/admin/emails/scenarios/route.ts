import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL } from "@/lib/emailBlocks"
import { langForCountry } from "@/lib/orderEmail"
import { loadCustomers, type Segment } from "@/lib/customers"
import { SCENARIOS, isEnabled, loadScenarioSettings, renderScenario, resolveCopy, sendScenario, type Copy, type Lang, type Recipient, type Settings } from "@/lib/emailScenarios"
import { resendReady } from "@/lib/resend"

export const runtime = "nodejs"
export const maxDuration = 60

const fail = (m: string, s = 500) => NextResponse.json({ error: m }, { status: s })
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET() {
  const st = await loadScenarioSettings()
  const { count } = await supabaseAdmin.from("newsletter_subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null)
  return NextResponse.json({
    configured: resendReady(),
    subscribers: count ?? 0,
    scenarios: SCENARIOS.map((s) => ({ promo: st[s.id]?.promo ?? null, id: s.id, kind: s.kind, label: s.label, when: s.when, enabled: isEnabled(s, st), fr: resolveCopy(s, st, "fr"), en: resolveCopy(s, st, "en"), defaults: s.copy })),
  })
}

export async function PUT(req: Request) {
  const b = await req.json().catch(() => null)
  const s = SCENARIOS.find((x) => x.id === b?.id)
  if (!s) return fail("Scénario inconnu.", 400)
  const st = await loadScenarioSettings()
  const cur = st[s.id] ?? {}
  const next: Settings = { ...st, [s.id]: { ...cur, ...(typeof b.enabled === "boolean" ? { enabled: b.enabled } : {}), ...(b.fr ? { fr: b.fr } : {}), ...(b.en ? { en: b.en } : {}), ...(b.promo === null ? { promo: undefined } : b.promo ? { promo: { percent: Math.min(100, Math.max(1, Math.round(Number(b.promo.percent) || 10))), days: Math.min(365, Math.max(1, Math.round(Number(b.promo.days) || 30))) } } : {}) } }
  const { error } = await supabaseAdmin.from("email_templates").upsert({ key: "scenarios", data: next, updated_at: new Date().toISOString() })
  if (error) return fail(/relation|does not exist/i.test(error.message) ? "La table email_templates n'existe pas encore (SQL à lancer dans Supabase)." : error.message)
  return NextResponse.json({ ok: true })
}

type Audience = { type: "orders"; ids: string[] } | { type: "subscribers" } | { type: "segment"; segment: Segment } | { type: "email"; email: string }

async function resolve(a: Audience): Promise<Recipient[]> {
  const first = (n?: string | null) => String(n ?? "").trim().split(/\s+/)[0] ?? ""
  if (a.type === "orders") {
    const { data } = await supabaseAdmin.from("orders").select("id, email, tracking_number, shipping_data").in("id", a.ids.slice(0, 500))
    const seen = new Set<string>()
    return ((data ?? []) as any[]).filter((o) => o.email && !seen.has(o.id)).map((o) => ({ email: o.email, lang: langForCountry(o.shipping_data?.address?.country), vars: { prenom: first(o.shipping_data?.name), commande: String(o.id).slice(0, 8), suivi: o.tracking_number ?? "" } }))
  }
  if (a.type === "subscribers") {
    const { data } = await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale").is("unsubscribed_at", null)
    return ((data ?? []) as any[]).map((s) => ({ email: s.email, lang: (String(s.locale ?? "").startsWith("fr") ? "fr" : "en") as Lang, vars: {}, unsubUrl: `${SITE_URL}/api/newsletter/unsubscribe?t=${s.token}` }))
  }
  if (a.type === "segment") {
    return (await loadCustomers()).filter((c) => c.segment === a.segment).map((c) => ({ email: c.email, lang: "fr" as Lang, vars: { prenom: first(c.name) } }))
  }
  return EMAIL.test(a.email) ? [{ email: a.email, lang: "fr", vars: {} }] : []
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  const s = SCENARIOS.find((x) => x.id === b?.id)
  if (!s || !b) return fail("Requête invalide.", 400)
  const copies = { fr: b.fr as Copy, en: b.en as Copy }
  const sample = { prenom: "Camille", commande: "A1B2C3D4", suivi: "XX123456789BE", ...(b.promo ? { code: "FYSU-A1B2C3" } : {}) }

  if (b.action === "preview") {
    const lang: Lang = b.lang === "en" ? "en" : "fr"
    return NextResponse.json({ html: renderScenario(copies[lang], sample, "#").html })
  }
  if (!resendReady()) return fail("Resend n'est pas encore branché.", 400)
  try {
    if (b.action === "test") {
      const to = String(b.to || "").trim()
      if (!EMAIL.test(to)) return fail("Adresse de test invalide.", 400)
      await sendScenario((l) => copies[l], [{ email: to, lang: b.lang === "en" ? "en" : "fr", vars: sample }], "[TEST] ")
      return NextResponse.json({ ok: true, sent: 1 })
    }
    if (b.action === "send") {
      const rs = await resolve(b.audience as Audience)
      if (rs.length === 0) return fail("Aucun destinataire.", 400)
      const n = await sendScenario((l) => copies[l], rs)
      return NextResponse.json({ ok: true, sent: n })
    }
  } catch (e) {
    console.error("scenario send:", e)
    return fail(e instanceof Error ? e.message : "Envoi impossible")
  }
  return fail("Action inconnue.", 400)
}
