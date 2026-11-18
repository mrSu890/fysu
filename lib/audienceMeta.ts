import type { Segment } from "@/lib/customers"

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

export type Topic = "all" | "collections" | "private" | "events"
export const TOPICS: { id: Topic; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "collections", label: "Collections" },
  { id: "private", label: "Ventes privées" },
  { id: "events", label: "Événements" },
]
export const isTopic = (x: unknown): x is Topic => TOPICS.some((t) => t.id === x)

