import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ====================================================================
   MUSIQUE (admin) — réservé aux admins par middleware.ts
   GET  -> tous les albums avec leurs titres
   POST -> { op: "...", ... } :
     upload-url, album-create, album-update, album-delete,
     track-add, track-update, track-delete, tracks-order
   ==================================================================== */

const BRANDS = ["fysu", "thewave", "kiban"]

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p))
  if (list.length) await supabaseAdmin.storage.from("music").remove(list)
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("music_albums")
    .select("*, music_tracks(*)")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) return fail(error.message, 500)

  const albums = (data ?? []).map(({ music_tracks, ...album }: any) => ({
    ...album,
    tracks: [...(music_tracks ?? [])].sort(
      (a: any, b: any) => a.display_order - b.display_order || a.id - b.id
    ),
  }))

  return NextResponse.json(albums)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  switch (body.op) {
    /* ----- adresse d'envoi direct vers Supabase (gros fichiers audio) ----- */
    case "upload-url": {
      const filename = String(body.filename ?? "")
      if (!filename) return fail("Nom de fichier manquant")

      const folder = body.kind === "cover" ? "covers" : "audio"
      const dot = filename.lastIndexOf(".")
      const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : ""
      const base = (dot >= 0 ? filename.slice(0, dot) : filename)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50)
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base || "file"}${ext ? `.${ext}` : ""}`

      const { data, error } = await supabaseAdmin.storage.from("music").createSignedUploadUrl(path)
      if (error || !data) return fail(error?.message ?? "Envoi impossible", 500)

      const { data: pub } = supabaseAdmin.storage.from("music").getPublicUrl(path)
      return NextResponse.json({ path, token: data.token, publicUrl: pub.publicUrl })
    }

    /* ----- albums ----- */
    case "album-create": {
      const title = String(body.title ?? "").trim()
      const slug = String(body.slug ?? "").trim()
      if (!title || !slug) return fail("Titre et lien obligatoires")

      const { data, error } = await supabaseAdmin
        .from("music_albums")
        .insert({
          title,
          slug,
          artist: body.artist?.trim() || null,
          description: body.description?.trim() || null,
          cover_url: body.cover_url || null,
          cover_path: body.cover_path || null,
          brand: BRANDS.includes(body.brand) ? body.brand : "fysu",
          collection_slugs: Array.isArray(body.collection_slugs) ? body.collection_slugs : [],
          visible: body.visible !== false,
        })
        .select()
        .single()

      if (error) {
        return fail(error.code === "23505" ? "Ce lien est déjà utilisé par un autre album" : error.message)
      }
      return NextResponse.json(data)
    }

    case "album-update": {
      const id = Number(body.id)
      if (!id) return fail("Album inconnu")

      const update: Record<string, unknown> = {}
      if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim()
      if ("artist" in body) update.artist = body.artist?.trim() || null
      if ("description" in body) update.description = body.description?.trim() || null
      if ("brand" in body && BRANDS.includes(body.brand)) update.brand = body.brand
      if (Array.isArray(body.collection_slugs)) update.collection_slugs = body.collection_slugs
      if (typeof body.visible === "boolean") update.visible = body.visible
      if ("cover_url" in body) {
        update.cover_url = body.cover_url || null
        update.cover_path = body.cover_path || null
      }
      if (!Object.keys(update).length) return fail("Rien à modifier")

      let oldCover: string | null = null
      if ("cover_url" in update) {
        const { data: current } = await supabaseAdmin
          .from("music_albums")
          .select("cover_path")
          .eq("id", id)
          .maybeSingle()
        oldCover = current?.cover_path ?? null
      }

      const { data, error } = await supabaseAdmin
        .from("music_albums")
        .update(update)
        .eq("id", id)
        .select()
        .single()
      if (error) return fail(error.message)

      if (oldCover && oldCover !== update.cover_path) await removeFiles([oldCover])
      return NextResponse.json(data)
    }

    case "album-delete": {
      const id = Number(body.id)
      if (!id) return fail("Album inconnu")

      const { data: album } = await supabaseAdmin
        .from("music_albums")
        .select("cover_path, music_tracks(audio_path)")
        .eq("id", id)
        .maybeSingle()

      const { error } = await supabaseAdmin.from("music_albums").delete().eq("id", id)
      if (error) return fail(error.message)

      if (album) {
        await removeFiles([
          (album as any).cover_path,
          ...((album as any).music_tracks ?? []).map((t: any) => t.audio_path),
        ])
      }
      return NextResponse.json({ ok: true })
    }

    /* ----- titres ----- */
    case "track-add": {
      const album_id = Number(body.album_id)
      const title = String(body.title ?? "").trim()
      if (!album_id || !title || !body.audio_url) return fail("Informations manquantes")

      const { data: last } = await supabaseAdmin
        .from("music_tracks")
        .select("display_order")
        .eq("album_id", album_id)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data, error } = await supabaseAdmin
        .from("music_tracks")
        .insert({
          album_id,
          title,
          artist: body.artist?.trim() || null,
          info: body.info?.trim() || null,
          audio_url: body.audio_url,
          audio_path: body.audio_path || null,
          duration_seconds: Number.isFinite(Number(body.duration_seconds)) ? Number(body.duration_seconds) : null,
          display_order: (last?.display_order ?? 0) + 1,
        })
        .select()
        .single()

      if (error) return fail(error.message)
      return NextResponse.json(data)
    }

    case "track-update": {
      const id = Number(body.id)
      if (!id) return fail("Titre inconnu")

      const update: Record<string, unknown> = {}
      if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim()
      if ("artist" in body) update.artist = body.artist?.trim() || null
      if ("info" in body) update.info = body.info?.trim() || null
      if (!Object.keys(update).length) return fail("Rien à modifier")

      const { data, error } = await supabaseAdmin
        .from("music_tracks")
        .update(update)
        .eq("id", id)
        .select()
        .single()
      if (error) return fail(error.message)
      return NextResponse.json(data)
    }

    case "track-delete": {
      const id = Number(body.id)
      if (!id) return fail("Titre inconnu")

      const { data: track } = await supabaseAdmin
        .from("music_tracks")
        .select("audio_path")
        .eq("id", id)
        .maybeSingle()

      const { error } = await supabaseAdmin.from("music_tracks").delete().eq("id", id)
      if (error) return fail(error.message)

      await removeFiles([track?.audio_path])
      return NextResponse.json({ ok: true })
    }

    case "tracks-order": {
      const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : []
      if (!ids.length) return fail("Liste vide")

      const results = await Promise.all(
        ids.map((id, index) =>
          supabaseAdmin.from("music_tracks").update({ display_order: index + 1 }).eq("id", id)
        )
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) return fail(failed.error.message)
      return NextResponse.json({ ok: true })
    }

    default:
      return fail("Action inconnue")
  }
}
