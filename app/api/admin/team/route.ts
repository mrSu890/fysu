import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { isRole } from "@/lib/adminRoles"

export const runtime = "nodejs"

/* ÉQUIPE : réservée aux admins (voir lib/adminRoles.ts)
   GET : les membres (comptes ayant un rôle) ; ?q=… cherche un compte par e-mail
   PUT : { id, role } où role = admin | manager | support | content | user (retirer l'accès) */
const fail = (m: string, s = 500) => NextResponse.json({ error: m }, { status: s })

async function emailsById() {
  const map = new Map<string, string>()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    for (const u of data.users) map.set(u.id, u.email ?? "")
    if (data.users.length < 1000) break
  }
  return map
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase()
  const emails = await emailsById()
  const { data, error } = await supabaseAdmin.from("profiles").select("id, role")
  if (error) return fail(error.message)
  const rows = ((data ?? []) as { id: string; role: string | null }[]).map((p) => ({ id: p.id, role: p.role ?? "user", email: emails.get(p.id) ?? "" }))
  if (q) return NextResponse.json({ results: rows.filter((r) => r.email.toLowerCase().includes(q)).slice(0, 8) })
  return NextResponse.json({ members: rows.filter((r) => isRole(r.role)).sort((a, b) => a.email.localeCompare(b.email)) })
}

export async function PUT(req: Request) {
  const b = await req.json().catch(() => null)
  if (!b?.id || (!isRole(b.role) && b.role !== "user")) return fail("Requête invalide.", 400)
  const { data: all } = await supabaseAdmin.from("profiles").select("id, role")
  const admins = ((all ?? []) as { id: string; role: string | null }[]).filter((p) => p.role === "admin")
  if (b.role !== "admin" && admins.length === 1 && admins[0].id === b.id) return fail("Il doit rester au moins un admin.", 400)
  const { error } = await supabaseAdmin.from("profiles").update({ role: b.role }).eq("id", b.id)
  if (error) return fail(error.message)
  return NextResponse.json({ ok: true })
}
