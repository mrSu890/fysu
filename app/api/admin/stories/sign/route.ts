import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const BUCKETS = ["story-covers", "story-media"]

/* Prépare l'envoi direct d'une photo / vidéo de story vers Supabase.
   Passe par la clé admin : aucune règle de sécurité du stockage à régler, et le bucket est créé s'il manque. */
export async function POST(req: Request) {
  try {
    const { bucket, filename } = (await req.json()) as { bucket?: string; filename?: string }
    if (!bucket || !BUCKETS.includes(bucket)) return NextResponse.json({ error: "Bucket inconnu" }, { status: 400 })

    const name = String(filename || "file")
    const dot = name.lastIndexOf(".")
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : ""
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`

    let res = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path)
    if (res.error && /not found|bucket/i.test(res.error.message)) {
      await supabaseAdmin.storage.createBucket(bucket, { public: true })
      res = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path)
    }
    if (res.error || !res.data) return NextResponse.json({ error: res.error?.message || "Sign failed" }, { status: 500 })

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({ path, token: res.data.token, signedUrl: res.data.signedUrl, url: pub.publicUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Sign failed" }, { status: 500 })
  }
}
