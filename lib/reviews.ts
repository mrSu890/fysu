import { SITE_URL } from "@/lib/emailBlocks"
import { sign } from "@/lib/tracking"

/* Lien d'avis envoyé par mail : signé, il ne marche que pour cette commande. */
export const reviewToken = (orderId: string) => sign(`review:${orderId}`)
export const reviewUrl = (orderId: string) => `${SITE_URL}/review?o=${encodeURIComponent(orderId)}&t=${reviewToken(orderId)}`
