import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { loadStats, earnedIds } from "@/lib/profileStats"
import Stripe from "stripe"
import { randomBytes } from "crypto"
import { badgeById } from "@/lib/badges"
import { AVATAR_BUCKET, BIO_MAX, NAME_MAX, USERNAME_RE, cleanUsername, isAccent } from "@/lib/profile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function currentUser() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

const COLUMNS = "username, display_name, bio, avatar_url, accent, created_at, is_public"

/* Profil + avatars proposés + statistiques + badges + codes déjà gagnés */
export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const [profRes, avatarsRes, rewardsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select(COLUMNS).eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("avatars").select("id, url, label").order("sort", { ascending: true }).order("created_at", { ascending: true }),
    supabaseAdmin.from("badge_rewards").select("badge, code, percent, expires_at").eq("user_id", user.id),
  ])

  const profile = profRes.data ?? null
  const stats = await loadStats(user.id, profile, user.created_at)

  return NextResponse.json({
    profile: {
      username: profile?.username ?? null,
      display_name: profile?.display_name ?? (user.user_metadata?.name as string | undefined) ?? null,
      bio: profile?.bio ?? null,
      avatar_url: profile?.avatar_url ?? null,
      accent: profile?.accent ?? null,
      is_public: profile?.is_public ?? true,
      created_at: profile?.created_at ?? user.created_at ?? null,
    },
    avatars: avatarsRes.data ?? [],
    stats,
    earned: earnedIds(stats),
    rewards: rewardsRes.data ?? [],
  })
}

/* Modifier son profil (pseudo, nom, bio, avatar de la galerie, couleur) */
export async function PUT(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })

  const patch: Record<string, any> = { id: user.id }

  if ("username" in body) {
    const u = cleanUsername(body.username)
    if (u && !USERNAME_RE.test(u)) {
      return NextResponse.json(
        { error: "Pseudo : 3 à 20 caractères (lettres, chiffres, _ et .)" },
        { status: 400 }
      )
    }
    patch.username = u || null
  }
  if ("display_name" in body) {
    patch.display_name = String(body.display_name ?? "").trim().slice(0, NAME_MAX) || null
  }
  if ("bio" in body) {
    patch.bio = String(body.bio ?? "").trim().slice(0, BIO_MAX) || null
  }
  if ("accent" in body) {
    patch.accent = isAccent(body.accent) ? body.accent : null
  }
  if ("is_public" in body) {
    patch.is_public = body.is_public !== false
  }
  if ("avatar_id" in body) {
    if (body.avatar_id === null) {
      patch.avatar_url = null
    } else {
      const { data: av } = await supabaseAdmin.from("avatars").select("url").eq("id", body.avatar_id).maybeSingle()
      if (!av) return NextResponse.json({ error: "Avatar introuvable" }, { status: 400 })
      patch.avatar_url = av.url
    }
  }

  // première fois : la ligne n'existe pas encore, on la crée avec le nom habituel (colonne "name")
  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("id", user.id).maybeSingle()
  let error: any = null
  if (existing) {
    const { id: _id, ...rest } = patch
    const r = await supabaseAdmin.from("profiles").update(rest).eq("id", user.id)
    error = r.error
  } else {
    const fallbackName =
      patch.display_name || (user.user_metadata?.name as string | undefined) || (user.email ?? "").split("@")[0] || "FYSU"
    const r = await supabaseAdmin.from("profiles").insert({ ...patch, name: fallbackName })
    error = r.error
  }
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ce pseudo est déjà pris" }, { status: 409 })
    }
    console.error("profile update:", error)
    return NextResponse.json(
      { error: `Impossible d'enregistrer (${error.message ?? "erreur inconnue"})` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

/* ====================================================================
   POST : photo de profil (multipart) ou code de récompense d'un badge (JSON)
   ==================================================================== */

export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? ""
  if (type.includes("multipart/form-data")) return uploadAvatar(req)
  return claimBadge(req)
}

const MAX_BYTES = 600 * 1024

/* Photo envoyée par le client (déjà réduite en carré par le navigateur) */
async function uploadAvatar(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucune image" }, { status: 400 })
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Format non accepté (JPG, PNG ou WebP)" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde" }, { status: 400 })

  const path = `users/${user.id}.jpg`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true, cacheControl: "60" })
  if (upErr) {
    console.error("avatar upload:", upErr)
    return NextResponse.json({ error: "Envoi impossible" }, { status: 500 })
  }

  const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`

  const { data: row } = await supabaseAdmin.from("profiles").select("id").eq("id", user.id).maybeSingle()
  const r = row
    ? await supabaseAdmin.from("profiles").update({ avatar_url: url }).eq("id", user.id)
    : await supabaseAdmin
        .from("profiles")
        .insert({ id: user.id, avatar_url: url, name: (user.user_metadata?.name as string | undefined) || (user.email ?? "").split("@")[0] || "FYSU" })
  if (r.error) return NextResponse.json({ error: `Impossible d'enregistrer (${r.error.message})` }, { status: 500 })

  return NextResponse.json({ ok: true, url })
}

/* Récompense d'un badge : un code promo Stripe, une seule fois par badge */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
})

async function createCode(userId: string, badge: string, percent: number, days: number) {
  const redeemBy = Math.floor(Date.now() / 1000) + days * 24 * 3600
  const coupon = await stripe.coupons.create({
    percent_off: percent,
    duration: "once",
    max_redemptions: 1,
    redeem_by: redeemBy,
    name: `Badge ${badge} −${percent} %`,
    metadata: { userId, badge },
  })
  const code = `FYSU-${randomBytes(4).toString("hex").toUpperCase()}`
  const promo = stripe.promotionCodes as any
  try {
    await promo.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      max_redemptions: 1,
      expires_at: redeemBy,
    })
  } catch {
    await promo.create({ coupon: coupon.id, code, max_redemptions: 1, expires_at: redeemBy })
  }
  return { code, redeemBy }
}

async function claimBadge(req: Request) {
  const body = await req.json().catch(() => null)
  const id = String(body?.badge ?? "")
  const def = badgeById(id)
  if (!def || !def.reward) return NextResponse.json({ error: "Badge sans récompense" }, { status: 400 })

  const user = await currentUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: existing } = await supabaseAdmin
    .from("badge_rewards")
    .select("badge, code, percent, expires_at")
    .eq("user_id", user.id)
    .eq("badge", id)
    .maybeSingle()
  if (existing?.code) return NextResponse.json({ reward: existing })

  // le badge est-il vraiment gagné ? (vérifié côté serveur)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("username, avatar_url, bio, created_at")
    .eq("id", user.id)
    .maybeSingle()
  const stats = await loadStats(user.id, profile, user.created_at)
  if (!def.test(stats)) return NextResponse.json({ error: "Badge pas encore gagné" }, { status: 403 })

  // on réserve la place d'abord : deux clics en même temps ne créent qu'un seul code
  if (existing) {
    return NextResponse.json({ error: "Création en cours, réessaie dans un instant" }, { status: 409 })
  }
  const { error: lockErr } = await supabaseAdmin
    .from("badge_rewards")
    .insert({ user_id: user.id, badge: id, code: null, percent: def.reward.percent })
  if (lockErr) {
    return NextResponse.json({ error: "Création en cours, réessaie dans un instant" }, { status: 409 })
  }

  try {
    const { code, redeemBy } = await createCode(user.id, id, def.reward.percent, def.reward.days)
    const expires_at = new Date(redeemBy * 1000).toISOString()
    await supabaseAdmin.from("badge_rewards").update({ code, expires_at }).eq("user_id", user.id).eq("badge", id)
    return NextResponse.json({ reward: { badge: id, code, percent: def.reward.percent, expires_at } })
  } catch (err) {
    console.error("badge reward:", err)
    await supabaseAdmin.from("badge_rewards").delete().eq("user_id", user.id).eq("badge", id)
    return NextResponse.json({ error: "Code impossible à créer, réessaie" }, { status: 500 })
  }
}
