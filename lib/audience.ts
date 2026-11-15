import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { loadCustomers, type Segment } from "@/lib/customers"

/* AUDIENCES D'ENVOI : tous les inscrits, ou un segment du CRM (mêmes noms que dans Clients) */
export type Audience = "all" | Segment
export const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "all", label: "Tous les inscrits" },
  { id: "vip", label: "VIP" },
  { id: "loyal", label: "Fidèles" },
  { id: "new", label: "Nouveaux clients" },
  { id: "risk", label: "À relancer" },
  { id: "prospect", label: "Sans achat" },
]
export const isAudience = (x: unknown): x is Audience => AUDIENCES.some((a) => a.id === x)

export type Sub = { email: string; token: string; locale: string | null; first_name?: string | null }

/** inscrits actifs (newsletter, non désinscrits), filtrés par segment */
export async function loadAudience(audience: Audience = "all"): Promise<Sub[]> {
  let q = await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale, first_name").is("unsubscribed_at", null)
  if (q.error && /first_name/i.test(q.error.message)) q = (await supabaseAdmin.from("newsletter_subscribers").select("email, token, locale").is("unsubscribed_at", null)) as typeof q
  if (q.error) throw new Error(q.error.message)
  const subs = (q.data ?? []) as Sub[]
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
