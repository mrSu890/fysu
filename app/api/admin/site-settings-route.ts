import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Réglages simples du site (réservé aux admins par le middleware).
   Table Supabase « site_settings » : key (texte) + value (json). */

// pastille Arcade : visible par défaut
export async function GET() {
  const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", "arcade_visible").maybeSingle()
  return NextResponse.json({ arcade: error ? true : (data?.value as any) !== false, tableMissing: !!error })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (typeof body?.arcade !== "boolean") return NextResponse.json({ error: "Requête invalide" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key: "arcade_visible", value: body.arcade }, { onConflict: "key" })
  if (error) {
    return NextResponse.json(
      { error: "Enregistrement impossible. La table « site_settings » existe-t-elle dans Supabase ? (" + error.message + ")" },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
