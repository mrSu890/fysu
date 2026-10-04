import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { BADGES, type Stats } from "@/lib/badges"

/* Statistiques d'un client (lues côté serveur) : sert aux badges et à la page profil. */
export async function loadStats(
  userId: string,
  profile: { username?: string | null; avatar_url?: string | null; bio?: string | null; created_at?: string | null } | null,
  fallbackCreatedAt?: string | null
): Promise<Stats> {
  const [ordersRes, wishRes, birdRes] = await Promise.all([
    supabaseAdmin.from("orders").select("status, items").eq("user_id", userId),
    supabaseAdmin.from("wishlist").select("product_id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin
      .from("game_scores")
      .select("score")
      .eq("user_id", userId)
      .eq("game", "fysu-bird")
      .order("score", { ascending: false })
      .limit(1),
  ])

  const orders = (ordersRes.data ?? []).filter(
    (o: any) => !["pending", "canceled", "cancelled", "failed", "refunded"].includes(String(o.status ?? "").toLowerCase())
  )

  let pieces = 0
  for (const o of orders as any[]) {
    let items: any = o.items
    if (typeof items === "string") {
      try {
        items = JSON.parse(items)
      } catch {
        items = []
      }
    }
    if (!Array.isArray(items)) items = []
    for (const it of items) pieces += Math.max(1, Number(it?.quantity) || 1)
  }

  return {
    orders: orders.length,
    pieces,
    wishlist: wishRes.count ?? 0,
    birdBest: Number((birdRes.data as any)?.[0]?.score ?? 0),
    profileComplete: !!(profile?.username && profile?.avatar_url && profile?.bio),
    memberSince: profile?.created_at ?? fallbackCreatedAt ?? null,
  }
}

export const earnedIds = (s: Stats) => BADGES.filter((b) => b.test(s)).map((b) => b.id)
