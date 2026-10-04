import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getLegalDoc, type LegalDoc, type LegalSlug } from "@/lib/legalDocs"

/* ====================================================================
   TEXTES LÉGAUX MODIFIÉS DANS L'ADMIN
   Table Supabase "legal_docs" (slug + langue). Si aucun texte n'a été
   modifié dans l'admin, le texte d'origine (lib/legalDocs.ts) s'affiche.
   ==================================================================== */

export type LegalLang = "fr" | "en"

export function cleanLegalDoc(input: any): LegalDoc | null {
  if (!input || typeof input !== "object") return null
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
  const title = str(input.title, 200)
  if (!title) return null
  const sections = (Array.isArray(input.sections) ? input.sections : [])
    .slice(0, 40)
    .map((s: any) => ({
      h: str(s?.h, 200),
      p: (Array.isArray(s?.p) ? s.p : [])
        .slice(0, 40)
        .map((x: unknown) => str(x, 6000))
        .filter(Boolean),
    }))
    .filter((s: { h: string; p: string[] }) => s.h || s.p.length)
  const intro = str(input.intro, 2000)
  return { title, ...(intro ? { intro } : {}), sections }
}

export async function getLegalOverride(slug: LegalSlug, lang: LegalLang): Promise<LegalDoc | null> {
  try {
    const { data } = await supabaseAdmin
      .from("legal_docs")
      .select("content")
      .eq("slug", slug)
      .eq("locale", lang)
      .maybeSingle()
    return cleanLegalDoc(data?.content)
  } catch {
    return null
  }
}

export async function getLegalDocResolved(slug: LegalSlug, lang: LegalLang): Promise<LegalDoc> {
  return (await getLegalOverride(slug, lang)) ?? getLegalDoc(slug, lang)
}
