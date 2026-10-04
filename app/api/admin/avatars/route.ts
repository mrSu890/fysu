import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { AVATAR_BUCKET } from "@/lib/profile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* Galerie d'avatars proposés aux clients (réservé aux admins par le middleware). */

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("avatars")
    .select("id, url, label, sort")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ avatars: data ?? [] })
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const files = (form?.getAll("file") ?? []).filter((f): f is File => f instanceof File)
  if (!files.length) return NextResponse.json({ error: "Aucune image" }, { status: 400 })

  const added: any[] = []
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "")
    const path = `gallery/${randomUUID()}.${ext || "png"}`
    const { error: upErr } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (upErr) {
      console.error("avatar gallery upload:", upErr)
      return NextResponse.json({ error: "Envoi impossible" }, { status: 500 })
    }
    const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const label = file.name.replace(/\.[^.]+$/, "").slice(0, 40)
    const { data, error } = await supabaseAdmin
      .from("avatars")
      .insert({ url: pub.publicUrl, path, label })
      .select("id, url, label, sort")
      .single()
    if (error) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([path])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    added.push(data)
  }
  return NextResponse.json({ avatars: added })
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => null)
  const id = body?.id
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const { data: row } = await supabaseAdmin.from("avatars").select("path").eq("id", id).maybeSingle()
  if (row?.path) await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([row.path])
  const { error } = await supabaseAdmin.from("avatars").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
