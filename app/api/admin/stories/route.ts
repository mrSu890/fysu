import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

/* ====================================================================
   ADMIN > STORIES  (réservé aux admins par le middleware)
   GET     : toutes les stories (ordre d'affichage), avec diapos et pages choisies
   POST    : créer         PUT : modifier
   PATCH   : { order: [id, id…] } réordonner   ou   { id, is_active } activer / désactiver
   DELETE  : ?id=…
   Les produits « Shop now » d'une diapo sont dans story_items.product_ids (liste d'identifiants).
   Si cette colonne n'existe pas encore (SQL pas lancé), tout marche quand même, sans les produits.
   ==================================================================== */

const fail = (message: string, status = 500) => NextResponse.json({ error: message }, { status })

type ItemIn = { type?: string; media_url?: string; duration?: number; product_ids?: (string | number)[] }
type TargetIn = { type: string; id: string | number }

function cleanItems(items: ItemIn[]) {
  return (items ?? [])
    .filter((it) => it?.media_url)
    .map((it, index) => ({
      type: it.type === "video" ? "video" : "image",
      media_url: it.media_url,
      duration: Number(it.duration) > 0 ? Number(it.duration) : it.type === "video" ? 8 : 5,
      order_index: index,
      product_ids: Array.isArray(it.product_ids) ? it.product_ids.map((x) => Number(x)).filter((x) => Number.isFinite(x)) : [],
    }))
}

async function writeItems(storyId: string | number, items: ItemIn[]) {
  const rows = cleanItems(items).map((r) => ({ ...r, story_id: storyId }))
  if (rows.length === 0) return null
  let { error } = await supabaseAdmin.from("story_items").insert(rows)
  if (error && /product_ids/i.test(error.message)) {
    // la colonne n'existe pas encore : on enregistre sans les produits
    ;({ error } = await supabaseAdmin.from("story_items").insert(rows.map(({ product_ids, ...rest }) => rest)))
  }
  return error
}

async function writeTargets(storyId: string | number, targets: TargetIn[]) {
  const rows = (targets ?? [])
    .map((t) =>
      t.type === "page"
        ? { story_id: storyId, page_id: t.id }
        : t.type === "collection"
          ? { story_id: storyId, collection_page_id: t.id }
          : null
    )
    .filter(Boolean)
  if (rows.length === 0) return null
  const { error } = await supabaseAdmin.from("story_page_links").insert(rows as any[])
  return error
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from("stories").select("*, story_items(*), story_page_links(*)")
  if (error) return fail(error.message)

  const stories = (data ?? [])
    .map((s: any) => ({
      ...s,
      story_items: [...(s.story_items ?? [])].sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    }))
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0) || String(a.created_at).localeCompare(String(b.created_at)))
  return NextResponse.json(stories)
}

export async function POST(req: Request) {
  try {
    const { title, cover_url, is_active = true, items = [], targets = [], link_url = null } = await req.json()
    if (!title || !cover_url) return fail("Titre et couverture obligatoires", 400)

    const { data: last } = await supabaseAdmin.from("stories").select("order_index").order("order_index", { ascending: false }).limit(1)
    const next = Number(last?.[0]?.order_index ?? -1) + 1

    let { data: story, error } = await supabaseAdmin
      .from("stories")
      .insert({ title, cover_url, is_active, order_index: next, link_url: link_url || null })
      .select()
      .single()
    if (error && /link_url/i.test(error.message)) {
      // colonne pas encore créée (SQL pas lancé) : on enregistre sans le lien direct
      ;({ data: story, error } = await supabaseAdmin
        .from("stories")
        .insert({ title, cover_url, is_active, order_index: next })
        .select()
        .single())
    }
    if (error || !story) return fail(error?.message || "Création impossible")

    const e1 = await writeItems(story.id, items)
    if (e1) return fail("Diapos : " + e1.message)
    const e2 = await writeTargets(story.id, targets)
    if (e2) return fail("Pages : " + e2.message)

    return NextResponse.json({ success: true, id: story.id })
  } catch (e) {
    console.error("POST stories", e)
    return fail("Erreur serveur")
  }
}

export async function PUT(req: Request) {
  try {
    const { id, title, cover_url, is_active, items = [], targets = [], link_url = null } = await req.json()
    if (!id) return fail("Story manquante", 400)
    if (!title || !cover_url) return fail("Titre et couverture obligatoires", 400)

    let { error } = await supabaseAdmin.from("stories").update({ title, cover_url, is_active, link_url: link_url || null }).eq("id", id)
    if (error && /link_url/i.test(error.message)) {
      ;({ error } = await supabaseAdmin.from("stories").update({ title, cover_url, is_active }).eq("id", id))
    }
    if (error) return fail(error.message)

    await supabaseAdmin.from("story_items").delete().eq("story_id", id)
    const e1 = await writeItems(id, items)
    if (e1) return fail("Diapos : " + e1.message)

    await supabaseAdmin.from("story_page_links").delete().eq("story_id", id)
    const e2 = await writeTargets(id, targets)
    if (e2) return fail("Pages : " + e2.message)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("PUT stories", e)
    return fail("Erreur serveur")
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()

    if (Array.isArray(body.order)) {
      const results = await Promise.all(
        (body.order as (string | number)[]).map((id, index) =>
          supabaseAdmin.from("stories").update({ order_index: index }).eq("id", id)
        )
      )
      const bad = results.find((r) => r.error)
      if (bad?.error) return fail(bad.error.message)
      return NextResponse.json({ success: true })
    }

    if (body.id !== undefined && typeof body.is_active === "boolean") {
      const { error } = await supabaseAdmin.from("stories").update({ is_active: body.is_active }).eq("id", body.id)
      if (error) return fail(error.message)
      return NextResponse.json({ success: true })
    }

    return fail("Requête inconnue", 400)
  } catch (e) {
    console.error("PATCH stories", e)
    return fail("Erreur serveur")
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return fail("Missing id", 400)
    await supabaseAdmin.from("story_items").delete().eq("story_id", id)
    await supabaseAdmin.from("story_page_links").delete().eq("story_id", id)
    const { error } = await supabaseAdmin.from("stories").delete().eq("id", id)
    if (error) return fail(error.message)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE stories", e)
    return fail("Erreur serveur")
  }
}
