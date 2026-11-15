import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { BUSINESS } from "@/lib/business"
import { FOOTER, stripKeep, renderDoc, renderText, SITE_URL, type Block } from "@/lib/emailBlocks"
import { baseLocale, isTranslated, translateDeep } from "@/lib/mailTranslate"
import { resendBatch, resendReady, type Mail } from "@/lib/resend"

/* ====================================================================
   SCÉNARIOS D'E-MAILS FYSU
   auto      : part tout seul quand l'événement arrive (interrupteur dans l'admin)
   situation : tu l'envoies toi-même aux clients concernés (retard, pardon, bug…)
   campaign  : une campagne, préparée dans l'éditeur Newsletter
   soon      : prévu, pas encore branché
   ==================================================================== */

export type Lang = "fr" | "en"
export type Copy = { subject: string; eyebrow: string; title: string; body: string; cta: string; url: string; blocks?: Block[] }
export type Scenario = {
  id: string
  kind: "auto" | "situation" | "campaign" | "soon"
  label: string
  when: string // « quand ça part » en une phrase
  copy: Record<Lang, Copy>
}

const home = SITE_URL
const c = (fr: Omit<Copy, "url"> & { url?: string }, en: Omit<Copy, "url"> & { url?: string }): Record<Lang, Copy> => ({
  fr: { url: home, ...fr },
  en: { url: home, ...en },
})

export const SCENARIOS: Scenario[] = [
  {
    id: "welcome", kind: "auto", label: "Bienvenue", when: "À chaque nouvelle inscription à la newsletter",
    copy: c(
      { subject: "Bienvenue chez FYSU", eyebrow: "Bienvenue", title: "Tu fais partie de la maison.", body: "Merci de nous avoir rejoints. Tu seras le premier au courant des nouvelles pièces, des ventes privées et des événements.\n\nEn attendant, jette un œil à la collection.", cta: "Découvrir" },
      { subject: "Welcome to FYSU", eyebrow: "Welcome", title: "You're part of the house.", body: "Thanks for joining us. You'll be the first to hear about new pieces, private sales and events.\n\nIn the meantime, have a look at the collection.", cta: "Discover" }
    ),
  },
  {
    id: "shipped", kind: "auto", label: "Commande expédiée", when: "Quand tu passes une commande en « expédiée »",
    copy: c(
      { subject: "Ta commande FYSU est en route", eyebrow: "Expédition", title: "C'est parti, {prenom}.", body: "Ta commande #{commande} vient de quitter notre atelier.\n\nNuméro de suivi : {suivi}", cta: "Voir mon compte", url: `${home}/profile` },
      { subject: "Your FYSU order is on its way", eyebrow: "Shipping", title: "It's on its way, {prenom}.", body: "Your order #{commande} has just left our studio.\n\nTracking number: {suivi}", cta: "View my account", url: `${home}/profile` }
    ),
  },
  {
    id: "delay", kind: "situation", label: "Retard de livraison", when: "Aux clients dont la commande prend du retard",
    copy: c(
      { subject: "Un petit retard sur ta commande", eyebrow: "Information", title: "Ta commande prend un peu de retard.", body: "Bonjour {prenom},\n\nNous t'écrivons pour être transparents : ta commande #{commande} arrivera avec quelques jours de retard. Nous faisons tout pour la faire partir au plus vite et reviendrons vers toi avec le suivi dès l'expédition.\n\nMerci pour ta patience.", cta: "Nous écrire" },
      { subject: "A small delay on your order", eyebrow: "Update", title: "Your order is running a little late.", body: "Hello {prenom},\n\nWe want to be upfront: your order #{commande} will arrive a few days later than planned. We're doing everything to ship it as soon as possible and will send the tracking as soon as it leaves.\n\nThank you for your patience.", cta: "Contact us" }
    ),
  },
  {
    id: "apology", kind: "situation", label: "Pardon / erreur de notre part", when: "Quand on s'est trompé (mauvaise pièce, défaut…)",
    copy: c(
      { subject: "Toutes nos excuses", eyebrow: "Excuses", title: "Nous sommes désolés.", body: "Bonjour {prenom},\n\nNous avons fait une erreur sur ta commande #{commande}. Ce n'est pas le niveau d'exigence que nous nous fixons, et nous tenons à le réparer rapidement.\n\nRéponds simplement à cet e-mail : nous nous occupons de tout.", cta: "Nous écrire" },
      { subject: "Our sincere apologies", eyebrow: "Apologies", title: "We're sorry.", body: "Hello {prenom},\n\nWe made a mistake with your order #{commande}. That's not the standard we hold ourselves to, and we want to make it right quickly.\n\nJust reply to this email and we'll take care of everything.", cta: "Contact us" }
    ),
  },
  {
    id: "stockout", kind: "situation", label: "Article épuisé après commande", when: "Quand une pièce commandée n'est plus disponible",
    copy: c(
      { subject: "À propos de ta commande", eyebrow: "Information", title: "Une pièce n'est plus disponible.", body: "Bonjour {prenom},\n\nUne pièce de ta commande #{commande} est malheureusement épuisée. Nous pouvons te proposer un échange ou un remboursement : dis-nous ce que tu préfères en répondant à cet e-mail.", cta: "Nous écrire" },
      { subject: "About your order", eyebrow: "Information", title: "An item is no longer available.", body: "Hello {prenom},\n\nOne piece from your order #{commande} is unfortunately sold out. We can offer an exchange or a refund: just reply to this email and let us know.", cta: "Contact us" }
    ),
  },
  {
    id: "refund", kind: "situation", label: "Remboursement effectué", when: "Après un remboursement",
    copy: c(
      { subject: "Ton remboursement est effectué", eyebrow: "Remboursement", title: "C'est fait.", body: "Bonjour {prenom},\n\nNous avons remboursé ta commande #{commande}. Selon ta banque, le montant apparaît sous 5 à 10 jours ouvrés.", cta: "Nous écrire" },
      { subject: "Your refund has been issued", eyebrow: "Refund", title: "It's done.", body: "Hello {prenom},\n\nWe've refunded your order #{commande}. Depending on your bank, the amount shows up within 5 to 10 business days.", cta: "Contact us" }
    ),
  },
  {
    id: "bug", kind: "situation", label: "Problème technique (bug)", when: "Quand le site a eu un souci qui a pu les gêner",
    copy: c(
      { subject: "Un souci technique, désolés", eyebrow: "Information", title: "Un problème sur le site.", body: "Bonjour,\n\nNotre site a rencontré un problème technique qui a pu gêner ta visite ou ta commande. C'est corrigé. Si quelque chose ne s'est pas passé comme prévu, réponds à cet e-mail et nous réglons ça.", cta: "Retourner sur le site" },
      { subject: "A technical issue, sorry", eyebrow: "Information", title: "A problem on the site.", body: "Hello,\n\nOur site ran into a technical problem that may have affected your visit or order. It's fixed. If anything didn't go as planned, reply to this email and we'll sort it out.", cta: "Back to the site" }
    ),
  },
  {
    id: "maintenance", kind: "situation", label: "Maintenance", when: "Avant une coupure ou une mise à jour du site",
    copy: c(
      { subject: "Le site est en maintenance", eyebrow: "Maintenance", title: "Une courte pause.", body: "Bonjour,\n\nLe site sera en maintenance le [date] de [heure] à [heure]. Il sera de nouveau disponible juste après, avec quelques améliorations.", cta: "Visiter le site" },
      { subject: "The site is under maintenance", eyebrow: "Maintenance", title: "A short pause.", body: "Hello,\n\nThe site will be under maintenance on [date] from [time] to [time]. It will be back right after, with a few improvements.", cta: "Visit the site" }
    ),
  },
  {
    id: "review", kind: "situation", label: "Demande d'avis", when: "Quelques jours après la livraison",
    copy: c(
      { subject: "Alors, cette pièce ?", eyebrow: "Ton avis", title: "Comment ça se passe ?", body: "Bonjour {prenom},\n\nTa commande #{commande} est arrivée depuis quelques jours. Un retour de ta part, même court, nous aide énormément.\n\nRéponds simplement à cet e-mail.", cta: "Nous écrire" },
      { subject: "So, how is it?", eyebrow: "Your feedback", title: "How is it going?", body: "Hello {prenom},\n\nYour order #{commande} arrived a few days ago. A short note from you helps us a lot.\n\nJust reply to this email.", cta: "Contact us" }
    ),
  },
  { id: "collection", kind: "campaign", label: "Nouvelle collection", when: "Annoncer une collection", copy: c({ subject: "", eyebrow: "", title: "", body: "", cta: "" }, { subject: "", eyebrow: "", title: "", body: "", cta: "" }) },
  { id: "private", kind: "campaign", label: "Vente privée", when: "Accès anticipé réservé aux inscrits", copy: c({ subject: "", eyebrow: "", title: "", body: "", cta: "" }, { subject: "", eyebrow: "", title: "", body: "", cta: "" }) },
  { id: "product", kind: "campaign", label: "Nouveauté", when: "Mettre une pièce en avant", copy: c({ subject: "", eyebrow: "", title: "", body: "", cta: "" }, { subject: "", eyebrow: "", title: "", body: "", cta: "" }) },
  {
    id: "cart", kind: "auto", label: "Panier abandonné", when: "Rappel 2 h à 3 jours après un paiement non terminé",
    copy: c(
      { subject: "Tu as oublié quelque chose", eyebrow: "Ton panier", title: "Ta sélection t'attend.", body: "Bonjour,\n\nTu as commencé une commande sans la terminer :\n{produits}\n\nTes pièces sont toujours là, mais le stock est limité.", cta: "Reprendre ma commande", url: `${home}/checkout` },
      { subject: "You left something behind", eyebrow: "Your cart", title: "Your selection is waiting.", body: "Hello,\n\nYou started an order without finishing it:\n{produits}\n\nYour pieces are still here, but stock is limited.", cta: "Resume my order", url: `${home}/checkout` }
    ),
  },
  {
    id: "restock", kind: "auto", label: "Retour en stock", when: "Quand une pièce demandée via « Me prévenir » revient",
    copy: c(
      { subject: "C'est de nouveau disponible", eyebrow: "Retour en stock", title: "Elle est revenue.", body: "Bonne nouvelle : {produit} est de nouveau disponible. Les quantités sont limitées.", cta: "Voir la pièce" },
      { subject: "It's back in stock", eyebrow: "Back in stock", title: "It's back.", body: "Good news: {produit} is available again. Quantities are limited.", cta: "View the piece" }
    ),
  },
]

export type Settings = Record<string, { enabled?: boolean; fr?: Partial<Copy>; en?: Partial<Copy> }>

export async function loadScenarioSettings(): Promise<Settings> {
  try {
    const { data } = await supabaseAdmin.from("email_templates").select("data").eq("key", "scenarios").maybeSingle()
    return (data?.data as Settings) ?? {}
  } catch {
    return {}
  }
}

export function resolveCopy(s: Scenario, st: Settings, lang: Lang): Copy {
  return { ...s.copy[lang], ...(st[s.id]?.[lang] ?? {}) }
}
export const isEnabled = (s: Scenario, st: Settings) => st[s.id]?.enabled ?? s.kind === "auto"

export type Vars = { prenom?: string; commande?: string; suivi?: string; produit?: string; produits?: string; url?: string }
const fill = (t: string, v: Vars) =>
  t.replace(/\{prenom\}/g, v.prenom || "").replace(/\{commande\}/g, v.commande || "").replace(/\{suivi\}/g, v.suivi || "—").replace(/\{produit\}/g, v.produit || "").replace(/\{produits\}/g, v.produits || "").replace(/ ,/g, ",").replace(/,\s*([.!?…])/g, "$1").replace(/,\s*$/g, "")

// remplace les {prenom}, {commande}… dans tous les textes d'un bloc
export function fillDeep<T>(x: T, v: Vars): T {
  if (typeof x === "string") return fill(x, v) as T
  if (Array.isArray(x)) return x.map((i) => fillDeep(i, v)) as T
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x as object).map(([k, val]) => [k, fillDeep(val, v)])) as T
  return x
}

export function renderScenario(copy: Copy, v: Vars, unsubUrl?: string | null, lang = "fr", footer?: { intro: string; link: string }) {
  let blocks: Block[]
  if (copy.blocks?.length) {
    blocks = fillDeep(copy.blocks, v).map((b) => (b.type === "button" && v.url ? { ...b, url: v.url } : b))
  } else {
    blocks = [
      { type: "title", eyebrow: copy.eyebrow, title: fill(copy.title, v) },
      { type: "text", text: fill(copy.body, v) },
    ]
    if (copy.cta && (v.url || copy.url)) blocks.push({ type: "button", label: copy.cta, url: v.url || copy.url, style: "solid" })
  }
  return {
    subject: stripKeep(fill(copy.subject, v)),
    html: renderDoc({ preheader: fill(copy.subject, v), blocks, unsubUrl: unsubUrl ?? null, business: BUSINESS, lang, footer }),
    text: renderText(blocks, unsubUrl ?? null, footer?.link),
  }
}

/** locale = langue du site du client (ex. « ja ») : traduction automatique si ce n'est ni fr ni en */
export type Recipient = { email: string; lang: Lang; locale?: string | null; vars: Vars; unsubUrl?: string }

export async function sendScenario(copyFor: (lang: Lang) => Copy, rs: Recipient[], testPrefix = "") {
  const from = process.env.ORDERS_FROM || process.env.NEWSLETTER_FROM!
  const replyTo = process.env.NEWSLETTER_REPLY_TO || BUSINESS.email
  // une seule traduction par langue, même pour 500 destinataires
  const tr = new Map<string, Promise<{ copy: Copy; footer: { intro: string; link: string } } | null>>()
  const translated = (loc: string) => {
    if (!tr.has(loc)) tr.set(loc, translateDeep({ copy: copyFor("en"), footer: FOOTER.en }, "en", loc))
    return tr.get(loc)!
  }
  const prepared = await Promise.all(rs.map(async (r) => {
    const loc = baseLocale(r.locale)
    const t = isTranslated(loc) ? await translated(loc) : null
    return { r, copy: t?.copy ?? copyFor(t === null && isTranslated(loc) ? "en" : r.lang), footer: t?.footer, lang: t ? loc : isTranslated(loc) ? "en" : r.lang }
  }))
  const mails: Mail[] = prepared.map(({ r, copy, footer, lang }) => {
    const m = renderScenario(copy, r.vars, r.unsubUrl, lang, footer)
    return {
      from, to: [r.email], subject: testPrefix + m.subject, html: m.html, text: m.text, reply_to: replyTo,
      ...(r.unsubUrl ? { headers: { "List-Unsubscribe": `<${r.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }
  })
  for (let i = 0; i < mails.length; i += 100) await resendBatch(mails.slice(i, i + 100))
  return mails.length
}

/** envoi automatique : ne fait JAMAIS échouer l'action qui le déclenche */
export async function autoSend(id: string, r: Recipient) {
  try {
    if (!resendReady()) return
    const s = SCENARIOS.find((x) => x.id === id)
    if (!s) return
    const st = await loadScenarioSettings()
    if (!isEnabled(s, st)) return
    await sendScenario((l) => resolveCopy(s, st, l), [r])
  } catch (e) {
    console.error("auto mail", id, e)
  }
}
