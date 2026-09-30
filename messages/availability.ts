/* ====================================================================
   DISPONIBILITÉ DES PRODUITS
   (en vente, précommande, me prévenir, devis, à venir, épuisé)
   Un seul endroit pour régler le comportement et les textes (4 langues).
   ==================================================================== */

export type AvailabilityId =
  | "available"
  | "preorder"
  | "notify"
  | "quote"
  | "coming_soon"
  | "sold_out"

export type RequestKind = "notify" | "quote"

export type AvailabilityConfig = {
  id: AvailabilityId
  label: string // nom dans l'admin
  emoji: string
  description: string // explication dans l'admin
  buyable: boolean // le client peut ajouter au panier et payer
}

export const AVAILABILITY_MODES: Record<AvailabilityId, AvailabilityConfig> = {
  available: {
    id: "available",
    label: "En vente",
    emoji: "🟢",
    description: "Bouton « Ajouter au panier ». Le client peut payer tout de suite.",
    buyable: true,
  },
  preorder: {
    id: "preorder",
    label: "Précommande",
    emoji: "🕓",
    description:
      "Bouton « Précommander ». Le client paie maintenant. Le stock indiqué = nombre de pièces précommandables.",
    buyable: true,
  },
  notify: {
    id: "notify",
    label: "Me prévenir si disponible",
    emoji: "🔔",
    description:
      "Pas d'achat. Le client laisse son e-mail, tu retrouves sa demande dans « Demandes ».",
    buyable: false,
  },
  quote: {
    id: "quote",
    label: "Sur devis",
    emoji: "✉️",
    description:
      "Pas d'achat. Le client remplit un formulaire (nom, e-mail, message), tu le retrouves dans « Demandes ».",
    buyable: false,
  },
  coming_soon: {
    id: "coming_soon",
    label: "À venir",
    emoji: "⏳",
    description:
      "Pas d'achat. Affiche « Bientôt disponible » (et la date si tu en indiques une) avec l'option « Me prévenir ».",
    buyable: false,
  },
  sold_out: {
    id: "sold_out",
    label: "Épuisé",
    emoji: "⛔",
    description: "Pas d'achat. Affiche « Épuisé » avec l'option « Me prévenir si de retour ».",
    buyable: false,
  },
}

export const AVAILABILITY_LIST = Object.values(AVAILABILITY_MODES)

export function isAvailabilityId(value: unknown): value is AvailabilityId {
  return typeof value === "string" && value in AVAILABILITY_MODES
}

export function isBuyable(mode: AvailabilityId) {
  return AVAILABILITY_MODES[mode].buyable
}

type SizeLike = { stock?: number | null; is_active?: boolean | null }

// Mode réellement appliqué : un produit « en vente » ou « précommande » sans aucun stock
// s'affiche « Épuisé » (on ne le sait que si les tailles sont fournies).
export function getEffectiveAvailability(p: {
  availability?: string | null
  product_sizes?: SizeLike[] | null
}): AvailabilityId {
  const mode: AvailabilityId = isAvailabilityId(p.availability) ? p.availability : "available"

  if ((mode === "available" || mode === "preorder") && Array.isArray(p.product_sizes)) {
    const hasStock = p.product_sizes.some((s) => s.is_active && Number(s.stock ?? 0) > 0)
    if (!hasStock) return "sold_out"
  }

  return mode
}

/* ====================================================================
   TEXTES DU SITE (en / fr / nl / ja)
   ==================================================================== */

import { getExtraCopy } from "./extraCopy"

type L4 = { en: string; fr: string; nl: string; ja: string }

const COPY = {
  badgePreorder: {
    en: "Preorder",
    fr: "Précommande",
    nl: "Voorbestelling",
    ja: "予約受付中",
  },
  badgeNotify: {
    en: "Notify me",
    fr: "Me prévenir",
    nl: "Waarschuw me",
    ja: "入荷通知",
  },
  badgeQuote: {
    en: "On request",
    fr: "Sur devis",
    nl: "Op aanvraag",
    ja: "ご相談",
  },
  badgeComingSoon: {
    en: "Coming soon",
    fr: "Bientôt",
    nl: "Binnenkort",
    ja: "近日発売",
  },
  badgeSoldOut: {
    en: "Sold out",
    fr: "Épuisé",
    nl: "Uitverkocht",
    ja: "売り切れ",
  },
  comingSoon: {
    en: "Coming soon",
    fr: "Bientôt disponible",
    nl: "Binnenkort beschikbaar",
    ja: "近日発売",
  },
  soldOut: {
    en: "Sold out",
    fr: "Épuisé",
    nl: "Uitverkocht",
    ja: "売り切れ",
  },
  availableOn: {
    en: "Available on {date}",
    fr: "Disponible le {date}",
    nl: "Beschikbaar vanaf {date}",
    ja: "{date} 発売予定",
  },
  expected: {
    en: "Expected from {date}",
    fr: "Prévu à partir du {date}",
    nl: "Verwacht vanaf {date}",
    ja: "{date} 頃より発送予定",
  },
  notifyCta: {
    en: "Notify me when available",
    fr: "Me prévenir dès que disponible",
    nl: "Waarschuw me zodra beschikbaar",
    ja: "入荷したらお知らせ",
  },
  notifyBackCta: {
    en: "Notify me if it comes back",
    fr: "Me prévenir si de retour en stock",
    nl: "Waarschuw me bij herbevoorrading",
    ja: "再入荷をお知らせ",
  },
  quoteCta: {
    en: "Request a quote",
    fr: "Demander un devis",
    nl: "Offerte aanvragen",
    ja: "見積もりを依頼",
  },
  emailLabel: { en: "Email", fr: "E-mail", nl: "E-mail", ja: "メールアドレス" },
  nameLabel: { en: "Name", fr: "Nom", nl: "Naam", ja: "お名前" },
  messageLabel: {
    en: "Your request",
    fr: "Votre demande",
    nl: "Uw aanvraag",
    ja: "ご依頼内容",
  },
  messagePlaceholder: {
    en: "Tell us what you need (quantity, deadline, details…)",
    fr: "Dites-nous ce qu'il vous faut (quantité, délai, détails…)",
    nl: "Vertel ons wat u nodig heeft (aantal, termijn, details…)",
    ja: "ご希望の内容（数量・納期・詳細など）をご記入ください",
  },
  send: { en: "Send", fr: "Envoyer", nl: "Verzenden", ja: "送信" },
  sending: { en: "Sending…", fr: "Envoi…", nl: "Verzenden…", ja: "送信中…" },
  cancel: { en: "Cancel", fr: "Annuler", nl: "Annuleren", ja: "キャンセル" },
  thanksNotify: {
    en: "Thank you! We'll email you as soon as it's available.",
    fr: "Merci ! Nous vous écrirons dès que ce sera disponible.",
    nl: "Bedankt! We mailen u zodra het beschikbaar is.",
    ja: "ありがとうございます。入荷次第、メールでお知らせします。",
  },
  thanksQuote: {
    en: "Thank you! We'll get back to you with a quote soon.",
    fr: "Merci ! Nous revenons vers vous rapidement avec un devis.",
    nl: "Bedankt! We komen snel bij u terug met een offerte.",
    ja: "ありがとうございます。見積もりを近日中にご連絡します。",
  },
  invalidEmail: {
    en: "Please enter a valid email address.",
    fr: "Merci d'entrer une adresse e-mail valide.",
    nl: "Voer een geldig e-mailadres in.",
    ja: "有効なメールアドレスを入力してください。",
  },
  messageRequired: {
    en: "Please describe your request.",
    fr: "Merci de décrire votre demande.",
    nl: "Beschrijf uw aanvraag.",
    ja: "ご依頼内容をご記入ください。",
  },
  error: {
    en: "Something went wrong. Please try again.",
    fr: "Une erreur est survenue. Merci de réessayer.",
    nl: "Er ging iets mis. Probeer het opnieuw.",
    ja: "エラーが発生しました。もう一度お試しください。",
  },
} satisfies Record<string, L4>

export type AvailabilityCopyKey = keyof typeof COPY
export type AvailabilityCopy = Record<AvailabilityCopyKey, string>

export function getAvailabilityCopy(locale: string): AvailabilityCopy {
  const core = locale === "fr" || locale === "nl" || locale === "ja" || locale === "en"
  const l: keyof L4 = core ? (locale as keyof L4) : "en"
  const extra = core ? undefined : getExtraCopy(locale, "Availability")
  const out = {} as AvailabilityCopy
  for (const key of Object.keys(COPY) as AvailabilityCopyKey[]) {
    out[key] = extra?.[key] ?? COPY[key][l]
  }
  return out
}

// Date de sortie lisible dans la langue du visiteur (« 12 mars 2027 »)
export function formatReleaseDate(value: string | null | undefined, locale: string) {
  if (!value) return ""
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
}

// Texte du petit badge sur les cartes (null = pas de badge)
export function getBadgeText(mode: AvailabilityId, copy: AvailabilityCopy): string | null {
  switch (mode) {
    case "preorder":
      return copy.badgePreorder
    case "notify":
      return copy.badgeNotify
    case "quote":
      return copy.badgeQuote
    case "coming_soon":
      return copy.badgeComingSoon
    case "sold_out":
      return copy.badgeSoldOut
    default:
      return null
  }
}
