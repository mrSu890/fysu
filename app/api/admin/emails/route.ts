import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { DEFAULT_ORDER_COPY, SAMPLE_ORDER, renderOrderEmail, type OrderCopy } from "@/lib/orderEmail"
import { loadOrderCopy } from "@/lib/orderMailer"
import { resendOne, resendReady } from "@/lib/resend"

export const runtime = "nodejs"

/* ADMIN > MAILS DE COMMANDE : textes du mail de confirmation (FR / EN), aperçu et envoi d'un test. */
const fail = (m: string, s = 500) => NextResponse.json({ error: m }, { status: s })

export async function GET() {
  return NextResponse.json({ copy: await loadOrderCopy(), defaults: DEFAULT_ORDER_COPY, configured: resendReady() })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.copy) return fail("Contenu vide.", 400)
  const { error } = await supabaseAdmin.from("email_templates").upsert({ key: "order_confirmation", data: body.copy, updated_at: new Date().toISOString() })
  if (error) return fail(/relation|does not exist/i.test(error.message) ? "La table email_templates n'existe pas encore (SQL à lancer dans Supabase)." : error.message)
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const lang = body?.lang === "en" ? "en" : "fr"
  const copy = body?.copy as OrderCopy | undefined
  if (!copy) return fail("Contenu vide.", 400)
  const { subject, html, text } = renderOrderEmail(copy, SAMPLE_ORDER, lang)
  if (body.action === "preview") return NextResponse.json({ html })
  if (!resendReady()) return fail("Resend n'est pas encore branché.", 400)
  const to = String(body.to || "").trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail("Adresse de test invalide.", 400)
  try {
    await resendOne({ from: process.env.ORDERS_FROM || process.env.NEWSLETTER_FROM!, to: [to], subject: `[TEST] ${subject}`, html, text })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Envoi impossible")
  }
}
