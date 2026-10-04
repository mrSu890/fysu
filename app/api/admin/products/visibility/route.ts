import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// Masquer / réafficher un produit sur le site (réservé aux admins par le middleware)
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const id = Number(body?.id)
  if (!Number.isFinite(id) || typeof body?.hidden !== "boolean") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from("products").update({ is_hidden: body.hidden }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
