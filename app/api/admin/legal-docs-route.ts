import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getLegalDoc, isLegalSlug } from "@/lib/legalDocs"
import { cleanLegalDoc } from "@/lib/legalStore"

export const runtime = "nodejs"

const isLang = (v: unknown): v is "fr" | "en" => v === "fr" || v === "en"

// Textes d'origine + textes modifiés d'une page légale (réservé aux admins par le middleware)
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") ?? ""
  if (!isLegalSlug(slug)) return NextResponse.json({ error: "Page inconnue" }, { status: 400 })

  const { data, error } = await supabaseAdmin.from("legal_docs").select("locale, content").eq("slug", slug)

  // table pas encore créée : on affiche quand même les textes d'origine
  const tableMissing = !!error
  const overrides: Record<string, unknown> = {}
  for (const row of data ?? []) {
    const c = cleanLegalDoc((row as any).content)
    if (c) overrides[(row as any).locale] = c
  }

  return NextResponse.json({
    defaults: { fr: getLegalDoc(slug, "fr"), en: getLegalDoc(slug, "en") },
    overrides,
    tableMissing,
  })
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null)
  const slug = String(body?.slug ?? "")
  if (!isLegalSlug(slug) || !isLang(body?.locale)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }
  const content = cleanLegalDoc(body?.content)
  if (!content) return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("legal_docs")
    .upsert({ slug, locale: body.locale, content, updated_at: new Date().toISOString() }, { onConflict: "slug,locale" })
  if (error) {
    return NextResponse.json(
      { error: "Enregistrement impossible. La table « legal_docs » existe-t-elle dans Supabase ? (" + error.message + ")" },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}

// Revenir au texte d'origine
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null)
  const slug = String(body?.slug ?? "")
  if (!isLegalSlug(slug) || !isLang(body?.locale)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from("legal_docs").delete().eq("slug", slug).eq("locale", body.locale)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
