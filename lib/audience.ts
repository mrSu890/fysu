import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { loadCustomers, type Segment } from "@/lib/customers"

export { AUDIENCES, TOPICS, isAudience, isTopic } from "@/lib/audienceMeta"
export type { Audience, Topic } from "@/lib/audienceMeta"
import type { Audience, Topic } from "@/lib/audienceMeta"

export type Sub = { email: string; token: string; locale: string | null; first_name?: string | null; prefs?: Record<string, boolean> | null }

/** inscrits actifs (newsletter, non désinscrits), filtrés par segment */
export async function loadAudience(audience: Audience = "all", topic: Topic = "all"): Promise<Sub[]> {
  // les colonnes first_name et prefs n'existent qu'après le SQL : on essaie de la plus complète à la plus simple
  let q: any = null
  for (const cols of ["email, token, locale, first_name, prefs", "email, token, locale, first_name", "email, token, locale"]) {
    q = await supabaseAdmin.from("newsletter_subscribers").select(cols).is("unsubscribed_at", null)
    if (!q.error) break
  }
  if (q.error) throw new Error(q.error.message)
  let subs = (q.data ?? []) as Sub[]
  if (topic !== "all") subs = subs.filter((s) => s.prefs?.[topic] !== false) // un abonné qui a décoché le sujet ne le reçoit pas
  if (audience === "all") return subs
  const seg = new Map((await loadCustomers()).map((c) => [c.email, c.segment]))
  return subs.filter((s) => (seg.get(s.email.trim().toLowerCase()) ?? "prospect") === audience)
}

export async function audienceCounts(): Promise<Record<Audience, number>> {
  const subs = await loadAudience("all")
  const seg = new Map((await loadCustomers()).map((c) => [c.email, c.segment]))
  const out: Record<string, number> = { all: subs.length, vip: 0, loyal: 0, new: 0, risk: 0, prospect: 0 }
  for (const s of subs) out[seg.get(s.email.trim().toLowerCase()) ?? "prospect"]++
  return out as Record<Audience, number>
}
