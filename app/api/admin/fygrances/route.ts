import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Chapitres de la page FY'grances (la protection admin est faite par le middleware) */

const IDS = ["parfums", "soins", "maison"] as const

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("fygrances_chapters")
    .select("*")
    .order("display_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  // les 3 chapitres existent toujours (même vides)
  const list = IDS.map((id, i) => {
    const row = rows.find((r: any) => r.id === id)
    return row ?? { id, title: "", body: "", image_url: null, display_order: i + 1 }
  })

  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  if (!IDS.includes(id)) {
    return NextResponse.json({ error: "Chapitre inconnu" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from("fygrances_chapters").upsert({
    id,
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    image_url: body.image_url ? String(body.image_url) : null,
    display_order: IDS.indexOf(id) + 1,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
