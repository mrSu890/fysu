import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// Masquer / réafficher un produit sur le site (réservé aux admins par le middleware)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const id = Number(body?.id)
  // archiver : masque le produit du site ET le range hors du catalogue ; restaurer : il revient masqué
  if (Number.isFinite(id) && typeof body?.archived === "boolean") {
    const { error } = await supabaseAdmin.from("products").update({ is_archived: body.archived, is_hidden: true }).eq("id", id)
    if (error) {
      const msg = /is_archived/.test(error.message) ? "L'archivage n'est pas encore activé (SQL à lancer dans Supabase)." : error.message
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }
  if (!Number.isFinite(id) || typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from("products").update({ is_hidden: body.hidden }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
