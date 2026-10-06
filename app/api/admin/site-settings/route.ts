import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Réglages simples du site (réservé aux admins par le middleware).
   Table Supabase « site_settings » : key (texte) + value (json). */

// nettoie la liste des slides du carrousel de l'accueil
function cleanSlides(input: any) {
  if (!Array.isArray(input)) return null
  return input
    .map((s: any, i: number) => ({
      id: String(s?.id || "s" + i),
      label: String(s?.label || "").slice(0, 80),
      kind: String(s?.kind || "").slice(0, 40),
      href: String(s?.href || "/").slice(0, 300),
      image: String(s?.image || "").slice(0, 600),
    }))
    .filter((s) => s.image)
    .slice(0, 20)
}

// pastille Arcade : visible par défaut
// (?carousel=1 : les slides du carrousel de l'accueil)
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("carousel")) {
    const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", "home_carousel").maybeSingle()
    return NextResponse.json({ slides: error ? null : cleanSlides(data?.value), tableMissing: !!error })
  }
  const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", "arcade_visible").maybeSingle()
  return NextResponse.json({ arcade: error ? true : (data?.value as any) !== false, tableMissing: !!error })
}

export async function POST(req: Request) {
  // envoi d'une photo ou d'une vidéo pour le carrousel de l'accueil (max ~4 Mo : limite de Vercel)
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    try {
      const form = await req.formData()
      const file = form.get("file") as File | null
      if (!file) return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 })
      if (!/^(image|video)\//.test(file.type)) return NextResponse.json({ error: "Format non accepté (photo ou vidéo seulement)" }, { status: 400 })
      if (file.size > 4.4 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop lourd (4 Mo maximum)" }, { status: 413 })
      const ext = (file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "")
      const path = `carousel/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error } = await supabaseAdmin.storage.from("hero-images").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
      if (error) return NextResponse.json({ error: "Envoi impossible (" + error.message + ")" }, { status: 500 })
      const { data } = supabaseAdmin.storage.from("hero-images").getPublicUrl(path)
      return NextResponse.json({ url: data.publicUrl })
    } catch (err: any) {
      return NextResponse.json({ error: "Envoi impossible (" + (err?.message || "erreur") + ")" }, { status: 500 })
    }
  }

  const body = await req.json().catch(() => null)

  if (body && "carousel" in body) {
    const slides = cleanSlides(body.carousel)
    if (!slides) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
    const { error } = await supabaseAdmin.from("site_settings").upsert({ key: "home_carousel", value: slides }, { onConflict: "key" })
    if (error) return NextResponse.json({ error: "Enregistrement impossible (" + error.message + ")" }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

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
