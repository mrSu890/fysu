import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* Prépare un envoi direct vers Supabase (le fichier ne passe plus par Vercel → plus d'erreur 413). */
export async function POST(req: Request) {
  try {
    const { productId, ext } = (await req.json()) as { productId?: string | number; ext?: string }
    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 })

    const safeExt = String(ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin"
    const path = `products/${productId}/info-blocks/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`

    const { data, error } = await supabaseAdmin.storage.from("products").createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: error?.message || "Sign failed" }, { status: 500 })

    const { data: pub } = supabaseAdmin.storage.from("products").getPublicUrl(path)
    return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, url: pub.publicUrl })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Sign failed" }, { status: 500 })
  }
}
