import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { loadStats, earnedIds } from "@/lib/profileStats"
import { loadCloset, loadProducts, loadWishlistCards } from "@/lib/socialData"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const REACTIONS = ["❤️", "🔥", "🎁", "👀", "👌"]
const PUBLIC_COLS = "id, username, display_name, avatar_url"

async function me() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

const unauth = () => NextResponse.json({ error: "Not authenticated" }, { status: 401 })

async function friendshipBetween(a: string, b: string) {
  const { data } = await supabaseAdmin
    .from("friendships")
    .select("id, requester, addressee, status")
    .or(`and(requester.eq.${a},addressee.eq.${b}),and(requester.eq.${b},addressee.eq.${a})`)
    .maybeSingle()
  return data as { id: string; requester: string; addressee: string; status: string } | null
}

function relationOf(userId: string, row: Awaited<ReturnType<typeof friendshipBetween>>) {
  if (!row) return "none"
  if (row.status === "accepted") return "friends"
  return row.requester === userId ? "outgoing" : "incoming"
}

/* ============================== LECTURE ============================== */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const what = url.searchParams.get("what")

  /* --- Profil public d'un client : /u/pseudo --- */
  if (what === "profile") {
    const uname = String(url.searchParams.get("u") ?? "").toLowerCase()
    if (!uname) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, accent, created_at, is_public")
      .eq("username", uname)
      .maybeSingle()
    if (!p) return NextResponse.json({ error: "Introuvable" }, { status: 404 })

    const viewer = await me()
    const isSelf = viewer?.id === p.id
    const fr = viewer && !isSelf ? await friendshipBetween(viewer.id, p.id) : null
    const relation = !viewer ? "anon" : isSelf ? "self" : relationOf(viewer.id, fr)
    const canSeeAll = p.is_public || isSelf || relation === "friends"

    const base = {
      username: p.username,
      display_name: p.display_name,
      bio: canSeeAll ? p.bio : null,
      avatar_url: p.avatar_url,
      accent: p.accent,
      created_at: p.created_at,
    }
    if (!canSeeAll) return NextResponse.json({ profile: base, private: true, relation })

    const stats = await loadStats(p.id, p)
    const [closet, wishlist] = await Promise.all([loadCloset(p.id), loadWishlistCards(p.id)])
    return NextResponse.json({ profile: base, private: false, relation, earned: earnedIds(stats), closet, wishlist })
  }

  const user = await me()
  if (!user) return unauth()

  /* --- Recherche d'un pseudo --- */
  if (what === "search") {
    const q = String(url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_.]/g, "")
    if (q.length < 2) return NextResponse.json({ users: [] })
    const { data } = await supabaseAdmin
      .from("profiles")
      .select(PUBLIC_COLS)
      .ilike("username", `${q.replace(/_/g, "\\_")}%`)
      .neq("id", user.id)
      .limit(8)
    const users = []
    for (const u of (data ?? []) as any[]) {
      const row = await friendshipBetween(user.id, u.id)
      users.push({ username: u.username, display_name: u.display_name, avatar_url: u.avatar_url, relation: relationOf(user.id, row) })
    }
    return NextResponse.json({ users })
  }

  /* --- Vue d'ensemble : amis, demandes, boîte de réception --- */
  const { data: rows } = await supabaseAdmin
    .from("friendships")
    .select("requester, addressee, status")
    .or(`requester.eq.${user.id},addressee.eq.${user.id}`)

  const otherIds = Array.from(
    new Set((rows ?? []).map((r: any) => (r.requester === user.id ? r.addressee : r.requester)))
  )
  const { data: others } = otherIds.length
    ? await supabaseAdmin.from("profiles").select(PUBLIC_COLS).in("id", otherIds)
    : { data: [] as any[] }
  const byId = new Map((others ?? []).map((o: any) => [o.id, o]))
  const card = (id: string) => {
    const o: any = byId.get(id)
    return o ? { id, username: o.username, display_name: o.display_name, avatar_url: o.avatar_url } : null
  }

  const friends: any[] = []
  const incoming: any[] = []
  const outgoing: any[] = []
  for (const r of (rows ?? []) as any[]) {
    const other = r.requester === user.id ? r.addressee : r.requester
    const c = card(other)
    if (!c) continue
    if (r.status === "accepted") friends.push(c)
    else if (r.addressee === user.id) incoming.push(c)
    else outgoing.push(c)
  }

  const { data: sh } = await supabaseAdmin
    .from("shares")
    .select("id, from_user, product_id, message, reaction, seen, created_at")
    .eq("to_user", user.id)
    .order("created_at", { ascending: false })
    .limit(40)
  const senderIds = Array.from(new Set((sh ?? []).map((s: any) => s.from_user)))
  const { data: senders } = senderIds.length
    ? await supabaseAdmin.from("profiles").select(PUBLIC_COLS).in("id", senderIds)
    : { data: [] as any[] }
  const senderById = new Map((senders ?? []).map((s: any) => [s.id, s]))
  const prods = await loadProducts((sh ?? []).map((s: any) => Number(s.product_id)))
  const inbox = (sh ?? [])
    .map((s: any) => {
      const product = prods.get(Number(s.product_id))
      const from: any = senderById.get(s.from_user)
      if (!product) return null
      return {
        id: s.id,
        message: s.message,
        reaction: s.reaction,
        seen: s.seen,
        created_at: s.created_at,
        product,
        from: from ? { username: from.username, display_name: from.display_name, avatar_url: from.avatar_url } : null,
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    friends,
    incoming,
    outgoing,
    inbox,
    unseen: inbox.filter((i: any) => !i.seen).length,
  })
}

/* ============================== ACTIONS ============================== */

export async function POST(req: Request) {
  const user = await me()
  if (!user) return unauth()
  const body = await req.json().catch(() => null)
  const action = String(body?.action ?? "")

  const userByName = async (name: unknown) => {
    const u = String(name ?? "").trim().toLowerCase().replace(/^@/, "")
    if (!u) return null
    const { data } = await supabaseAdmin.from("profiles").select("id, username").eq("username", u).maybeSingle()
    return data as { id: string; username: string } | null
  }

  /* Demander quelqu'un en ami */
  if (action === "request") {
    const target = await userByName(body?.username)
    if (!target) return NextResponse.json({ error: "Pseudo introuvable" }, { status: 404 })
    if (target.id === user.id) return NextResponse.json({ error: "C'est toi !" }, { status: 400 })
    const row = await friendshipBetween(user.id, target.id)
    if (row?.status === "accepted") return NextResponse.json({ ok: true, relation: "friends" })
    if (row && row.addressee === user.id) {
      // il t'avait déjà demandé : on accepte
      await supabaseAdmin.from("friendships").update({ status: "accepted" }).eq("id", row.id)
      return NextResponse.json({ ok: true, relation: "friends" })
    }
    if (row) return NextResponse.json({ ok: true, relation: "outgoing" })
    const { error } = await supabaseAdmin.from("friendships").insert({ requester: user.id, addressee: target.id })
    if (error) return NextResponse.json({ error: "Impossible d'envoyer la demande" }, { status: 500 })
    return NextResponse.json({ ok: true, relation: "outgoing" })
  }

  /* Accepter / refuser / annuler / retirer */
  if (["accept", "decline", "cancel", "remove"].includes(action)) {
    const target = await userByName(body?.username)
    if (!target) return NextResponse.json({ error: "Introuvable" }, { status: 404 })
    const row = await friendshipBetween(user.id, target.id)
    if (!row) return NextResponse.json({ ok: true, relation: "none" })
    if (action === "accept") {
      if (row.addressee !== user.id) return NextResponse.json({ error: "Action impossible" }, { status: 400 })
      await supabaseAdmin.from("friendships").update({ status: "accepted" }).eq("id", row.id)
      return NextResponse.json({ ok: true, relation: "friends" })
    }
    await supabaseAdmin.from("friendships").delete().eq("id", row.id)
    return NextResponse.json({ ok: true, relation: "none" })
  }

  /* Envoyer une pièce à un ami */
  if (action === "share") {
    const target = await userByName(body?.username)
    const productId = Number(body?.productId)
    if (!target || !Number.isFinite(productId)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
    const row = await friendshipBetween(user.id, target.id)
    if (row?.status !== "accepted") return NextResponse.json({ error: "Vous n'êtes pas amis" }, { status: 403 })

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from("shares")
      .select("id", { count: "exact", head: true })
      .eq("from_user", user.id)
      .gte("created_at", since)
    if ((count ?? 0) >= 20) return NextResponse.json({ error: "Limite de 20 partages par jour atteinte" }, { status: 429 })

    const { data: prod } = await supabaseAdmin.from("products").select("id, is_hidden").eq("id", productId).maybeSingle()
    if (!prod || (prod as any).is_hidden) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })

    const message = String(body?.message ?? "").trim().slice(0, 140) || null
    const { error } = await supabaseAdmin
      .from("shares")
      .insert({ from_user: user.id, to_user: target.id, product_id: productId, message })
    if (error) return NextResponse.json({ error: "Envoi impossible" }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  /* Réagir à une pièce reçue */
  if (action === "react") {
    const reaction = REACTIONS.includes(body?.reaction) ? body.reaction : null
    await supabaseAdmin.from("shares").update({ reaction }).eq("id", String(body?.id)).eq("to_user", user.id)
    return NextResponse.json({ ok: true })
  }

  /* Marquer la boîte comme lue */
  if (action === "seen") {
    await supabaseAdmin.from("shares").update({ seen: true }).eq("to_user", user.id).eq("seen", false)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
}
