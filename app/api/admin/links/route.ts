import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL } from "@/lib/emailBlocks"

export const runtime = "nodejs"

/* Les pages du site vers lesquelles un bouton ou un lien d'e-mail peut mener (pour les choisir au lieu de les taper). */
const RESERVED = new Set(["thewave", "kiban-collector", "fygrances"])

export async function GET() {
  const u = (path: string) => `${SITE_URL}${path}`
  const [pages, collections, products] = await Promise.all([
    supabaseAdmin.from("pages").select("*"),
    supabaseAdmin.from("collectionPages").select("*"),
    supabaseAdmin.from("products").select("slug, name").eq("is_hidden", false).order("createdAt", { ascending: false }).limit(200),
  ])
  const nice = (r: any) => String(r.title ?? r.name ?? r.slug)
  const ok = (r: any) => r.slug && r.visible !== false

  return NextResponse.json({
    groups: [
      {
        group: "Pages",
        items: [
          { label: "Accueil", url: u("") },
          { label: "TheWave", url: u("/thewave") },
          { label: "Kiban Collector", url: u("/kiban-collector") },
          { label: "FY'grances", url: u("/fygrances") },
          { label: "Musique", url: u("/music") },
          { label: "Jeux", url: u("/games") },
          { label: "À propos", url: u("/about") },
          { label: "FAQ", url: u("/legal/faq") },
        ],
      },
      { group: "Rayons", items: ((pages.data ?? []) as any[]).filter((r) => ok(r) && !RESERVED.has(r.slug)).map((r) => ({ label: nice(r), url: u(`/${r.slug}`) })) },
      { group: "Collections", items: ((collections.data ?? []) as any[]).filter((r) => ok(r) && !RESERVED.has(r.slug)).map((r) => ({ label: nice(r), url: u(`/collections/${r.slug}`) })) },
      { group: "Produits", items: ((products.data ?? []) as any[]).filter((r) => r.slug).map((r) => ({ label: r.name, url: u(`/product/${r.slug}`) })) },
    ].filter((g) => g.items.length > 0),
  })
}
