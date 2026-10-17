import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* Pages et collections où une story peut s'afficher (+ les pages déjà choisies pour une story : ?story=ID).
   Lu côté serveur avec la clé admin : plus de liste vide à cause des règles de sécurité. */
export async function GET(req: Request) {
  const storyId = new URL(req.url).searchParams.get("story")

  const [pages, collections, links] = await Promise.all([
    supabaseAdmin.from("pages").select("*"),
    supabaseAdmin.from("collectionPages").select("*"),
    storyId
      ? supabaseAdmin.from("story_page_links").select("*").eq("story_id", storyId)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const label = (r: any) => String(r.title ?? r.name ?? r.slug ?? r.id)

  return NextResponse.json({
    pages: (pages.data ?? []).map((r: any) => ({ id: r.id, label: label(r) })),
    collections: (collections.data ?? []).map((r: any) => ({ id: r.id, label: label(r) })),
    links: links.data ?? [],
    errors: [pages.error?.message, collections.error?.message, (links as any).error?.message].filter(Boolean),
  })
}
