import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/* Panier synchronisé entre appareils (utilisateur connecté).
   Table à créer dans Supabase (une fois) :
   create table if not exists user_carts (
     user_id uuid primary key references auth.users(id) on delete cascade,
     items jsonb not null default '[]'::jsonb,
     updated_at timestamptz not null default now()
   );
   alter table user_carts enable row level security;
*/
export const runtime = "nodejs"

async function currentUser() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ items: [] }, { status: 401 })
  const { data, error } = await supabaseAdmin.from("user_carts").select("items").eq("user_id", user.id).maybeSingle()
  if (error) return NextResponse.json({ items: [] })
  return NextResponse.json({ items: Array.isArray(data?.items) ? data!.items : [] })
}

export async function PUT(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  let items: unknown = []
  try {
    const body = await req.json()
    items = Array.isArray(body?.items) ? body.items.slice(0, 50) : []
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from("user_carts")
    .upsert({ user_id: user.id, items, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
