import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const BUCKETS = ["story-covers", "story-media"]

/* Envoi d'un fichier léger (photo allégée, < 4 Mo) : même chemin que les autres envois de l'admin. */
export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const bucket = String(form.get("bucket") || "")
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 })
    if (!BUCKETS.includes(bucket)) return NextResponse.json({ error: "Bucket inconnu" }, { status: 400 })

    const dot = file.name.lastIndexOf(".")
    const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : ""
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, { contentType: file.type || undefined, upsert: false })
    if (error && /not found|bucket/i.test(error.message)) {
      await supabaseAdmin.storage.createBucket(bucket, { public: true })
      ;({ error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, { contentType: file.type || undefined, upsert: false }))
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Envoi impossible" }, { status: 500 })
  }
}
