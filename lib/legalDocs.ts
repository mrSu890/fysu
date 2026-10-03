import { BUSINESS } from "@/lib/business"

/* ====================================================================
   PAGES LÉGALES : livraison, paiement, retours, conditions, mentions légales, contact
   Textes en français et en anglais (les autres langues voient l'anglais).
   À faire relire par un professionnel avant le lancement.
   ==================================================================== */

export const LEGAL_SLUGS = ["terms", "shipping", "payment", "returns", "legal-notice", "contact"] as const
export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export type LegalDoc = { title: string; intro?: string; sections: { h: string; p: string[] }[] }
type Lang = "en" | "fr"

const b = BUSINESS
const address = [b.street, [b.postalCode, b.city].filter(Boolean).join(" "), b.country].filter(Boolean).join(", ")
const idLines = (lang: Lang) =>
  [
    `${b.name} (${b.legalForm}) — ${b.owner}`,
    address,
    b.registration ? (lang === "fr" ? `Numéro d'entreprise (BCE) : ${b.registration}` : `Company number (BCE/KBO): ${b.registration}`) : "",
    b.vat ? (lang === "fr" ? `Numéro de TVA : ${b.vat}` : `VAT number: ${b.vat}`) : "",
    b.email ? `E-mail : ${b.email}` : "",
  ].filter(Boolean)

const EN: Record<LegalSlug, LegalDoc> = {
  shipping: {
    title: "Shipping",
    sections: [
      { h: "Where we deliver", p: ["We deliver in Belgium and across Europe."] },
      { h: "Delivery costs", p: ["Delivery is free for orders of €150 and more. Below that amount, any shipping cost is shown at checkout before you pay."] },
      { h: "Preparing and sending your order", p: ["Every order is prepared and packed with care in our signature FYSU packaging. You receive a confirmation as soon as your payment is accepted, and tracking information when your parcel is on its way."] },
      { h: "Pre-orders and upcoming products", p: ["Products marked “Pre-order” or “Coming soon” are sent from the release date shown on the product page. If you order several items together, your order leaves once everything is available, unless you ask us to send it in several parcels."] },
      { h: "A problem with your delivery?", p: ["If your parcel is late, damaged or incomplete, contact us as soon as possible (see the Contact page) and we will sort it out."] },
    ],
  },
  payment: {
    title: "Payment",
    sections: [
      { h: "Secure payment", p: ["Payments are processed by Stripe, a certified payment provider. You pay by card or by any other payment method offered at checkout. FYSU never sees or stores your card details."] },
      { h: "Prices", p: ["Prices are in euros. Applicable taxes are shown at checkout before you confirm your order."] },
      { h: "Promo codes", p: ["Promo codes, including the ones won in our arcade games, are entered at checkout. A code has the conditions stated when it is given (for example one use per code) and cannot be combined with another unless stated otherwise."] },
      { h: "Order confirmation", p: ["Your order is confirmed once your payment has been accepted. If a payment fails, nothing is charged and you can try again."] },
    ],
  },
  returns: {
    title: "Returns and refunds",
    intro: "You can change your mind: you have 14 days to return an item, and the return is free.",
    sections: [
      { h: "Right of withdrawal (14 days)", p: ["You have the right to withdraw from your purchase without giving any reason within 14 days after receiving your order. To do so, tell us by e-mail (see the Contact page) with your order number, then send the items back within 14 days after informing us."] },
      { h: "Free return", p: ["The cost of returning your items is covered by FYSU. Contact us and we will send you a prepaid return label."] },
      { h: "Condition of the items", p: ["Items must be returned unworn and unwashed, with their labels and in their original packaging."] },
      { h: "Fragrances", p: ["For health and hygiene reasons, fragrances and care products cannot be returned once they have been unsealed."] },
      { h: "Refund", p: ["We refund the full price of the items, and the standard delivery cost you paid, within 14 days after we receive your return (or after you prove you sent it), using the same payment method as your order."] },
      { h: "Faulty or non-conforming items", p: ["If an item is defective or does not match what you ordered, contact us: the legal guarantee of 2 years applies and we will repair, replace or refund it."] },
    ],
  },
  terms: {
    title: "Terms and conditions",
    intro: "These terms apply to every order placed on this website.",
    sections: [
      { h: "1. Seller", p: idLines("en") },
      { h: "2. Orders", p: ["By placing an order you accept these terms. The sale is concluded when your payment has been accepted and we have sent you a confirmation. We may refuse or cancel an order in case of a pricing error, an unavailable product or a suspected fraud, and we then refund you in full."] },
      { h: "3. Prices and payment", p: ["Prices are in euros and shown on each product page. Payment is made at the time of the order, securely, through Stripe. See the Payment page."] },
      { h: "4. Delivery", p: ["See the Shipping page. Delivery times are indicative; pre-ordered products are sent from the release date shown on the product page."] },
      { h: "5. Withdrawal and returns", p: ["You can withdraw from your purchase within 14 days, free of charge. See the Returns page for the full conditions, including the exceptions that apply by law."] },
      { h: "6. Legal guarantee", p: ["All products benefit from the legal guarantee of conformity of 2 years. If a product is defective, contact us and we will repair, replace or refund it."] },
      { h: "7. Personal data", p: ["We only use your data to process your order and run the website. See our Privacy policy."] },
      { h: "8. Intellectual property", p: ["The designs, texts, images, music, games and logos of this website belong to FYSU or its partners and cannot be copied or used without written permission."] },
      { h: "9. Applicable law and disputes", p: ["These terms are governed by Belgian law. In case of a dispute, contact us first so we can find a solution together. You can also turn to the Belgian consumer mediation service. The competent courts are those allowed by the consumer protection rules that apply to you."] },
    ],
  },
  "legal-notice": {
    title: "Legal notice",
    sections: [
      { h: "Publisher of the website", p: idLines("en") },
      { h: "Hosting and services", p: ["Website hosted by Vercel Inc. (USA). Data stored with Supabase. Payments processed by Stripe."] },
      { h: "Intellectual property", p: ["All content of this website (designs, texts, images, music, games, logos) belongs to FYSU or its partners. Any reproduction without written permission is forbidden."] },
    ],
  },
  contact: {
    title: "Contact",
    intro: "A question about an order, a product or a return? We would love to hear from you.",
    sections: [
      { h: "Write to us", p: [b.email ? `E-mail: ${b.email}` : "Use the Instagram account below to reach us."] },
      { h: "Follow us", p: [`Instagram: ${b.instagram}`] },
      { h: "Studio", p: idLines("en") },
    ],
  },
}

const FR: Record<LegalSlug, LegalDoc> = {
  shipping: {
    title: "Livraison",
    sections: [
      { h: "Où livrons-nous", p: ["Nous livrons en Belgique et partout en Europe."] },
      { h: "Frais de livraison", p: ["La livraison est offerte à partir de 150 € d'achat. En dessous de ce montant, les éventuels frais de livraison sont affichés au moment de payer."] },
      { h: "Préparation et envoi", p: ["Chaque commande est préparée et emballée avec soin dans l'emballage signature FYSU. Tu reçois une confirmation dès que ton paiement est accepté, puis les informations de suivi quand ton colis part."] },
      { h: "Précommandes et produits à venir", p: ["Les produits marqués « Précommande » ou « Bientôt disponible » sont envoyés à partir de la date de sortie indiquée sur la fiche produit. Si tu commandes plusieurs articles ensemble, ta commande part quand tout est disponible, sauf si tu nous demandes de l'envoyer en plusieurs colis."] },
      { h: "Un problème avec ta livraison ?", p: ["Si ton colis est en retard, abîmé ou incomplet, contacte-nous le plus vite possible (voir la page Contact) et nous réglons ça."] },
    ],
  },
  payment: {
    title: "Paiement",
    sections: [
      { h: "Paiement sécurisé", p: ["Les paiements sont traités par Stripe, un prestataire de paiement certifié. Tu paies par carte ou par un autre moyen proposé au moment de payer. FYSU ne voit ni ne conserve jamais tes données de carte."] },
      { h: "Prix", p: ["Les prix sont en euros. Les taxes applicables sont affichées au moment de payer, avant de confirmer ta commande."] },
      { h: "Codes promo", p: ["Les codes promo, y compris ceux gagnés dans nos jeux d'arcade, s'entrent au moment de payer. Un code a les conditions indiquées quand il est donné (par exemple une utilisation par code) et ne se cumule pas avec un autre, sauf mention contraire."] },
      { h: "Confirmation de commande", p: ["Ta commande est confirmée une fois ton paiement accepté. Si un paiement échoue, rien n'est débité et tu peux réessayer."] },
    ],
  },
  returns: {
    title: "Retours et remboursements",
    intro: "Tu peux changer d'avis : tu as 14 jours pour retourner un article, et le retour est gratuit.",
    sections: [
      { h: "Droit de rétractation (14 jours)", p: ["Tu as le droit de te rétracter de ton achat, sans donner de motif, dans les 14 jours après réception de ta commande. Pour cela, préviens-nous par e-mail (voir la page Contact) avec ton numéro de commande, puis renvoie les articles dans les 14 jours après nous avoir prévenus."] },
      { h: "Retour gratuit", p: ["Les frais de retour sont pris en charge par FYSU. Contacte-nous et nous t'envoyons une étiquette de retour prépayée."] },
      { h: "État des articles", p: ["Les articles doivent être renvoyés non portés et non lavés, avec leurs étiquettes et dans leur emballage d'origine."] },
      { h: "Parfums", p: ["Pour des raisons de santé et d'hygiène, les parfums et les soins ne peuvent pas être retournés une fois descellés."] },
      { h: "Remboursement", p: ["Nous te remboursons le prix des articles, ainsi que les frais de livraison standard payés, dans les 14 jours après réception de ton retour (ou après que tu aies prouvé son envoi), avec le même moyen de paiement que ta commande."] },
      { h: "Article défectueux ou non conforme", p: ["Si un article est défectueux ou ne correspond pas à ce que tu as commandé, contacte-nous : la garantie légale de 2 ans s'applique et nous réparons, remplaçons ou remboursons."] },
    ],
  },
  terms: {
    title: "Conditions générales de vente",
    intro: "Ces conditions s'appliquent à toute commande passée sur ce site.",
    sections: [
      { h: "1. Vendeur", p: idLines("fr") },
      { h: "2. Commandes", p: ["En passant commande, tu acceptes ces conditions. La vente est conclue quand ton paiement est accepté et que nous t'avons envoyé une confirmation. Nous pouvons refuser ou annuler une commande en cas d'erreur de prix, de produit indisponible ou de fraude suspectée, et nous te remboursons alors intégralement."] },
      { h: "3. Prix et paiement", p: ["Les prix sont en euros et affichés sur chaque fiche produit. Le paiement se fait au moment de la commande, de façon sécurisée, via Stripe. Voir la page Paiement."] },
      { h: "4. Livraison", p: ["Voir la page Livraison. Les délais sont indicatifs ; les produits précommandés sont envoyés à partir de la date de sortie indiquée sur la fiche produit."] },
      { h: "5. Rétractation et retours", p: ["Tu peux te rétracter dans les 14 jours, gratuitement. Voir la page Retours pour toutes les conditions, y compris les exceptions prévues par la loi."] },
      { h: "6. Garantie légale", p: ["Tous les produits bénéficient de la garantie légale de conformité de 2 ans. Si un produit est défectueux, contacte-nous et nous le réparons, le remplaçons ou te remboursons."] },
      { h: "7. Données personnelles", p: ["Nous utilisons tes données uniquement pour traiter ta commande et faire fonctionner le site. Voir notre Politique de confidentialité."] },
      { h: "8. Propriété intellectuelle", p: ["Les créations, textes, images, musiques, jeux et logos de ce site appartiennent à FYSU ou à ses partenaires et ne peuvent être copiés ou utilisés sans autorisation écrite."] },
      { h: "9. Droit applicable et litiges", p: ["Ces conditions sont régies par le droit belge. En cas de litige, contacte-nous d'abord pour trouver une solution ensemble. Tu peux aussi saisir le Service de médiation pour le consommateur belge. Les tribunaux compétents sont ceux prévus par les règles de protection des consommateurs qui s'appliquent à toi."] },
    ],
  },
  "legal-notice": {
    title: "Mentions légales",
    sections: [
      { h: "Éditeur du site", p: idLines("fr") },
      { h: "Hébergement et services", p: ["Site hébergé par Vercel Inc. (États-Unis). Données stockées chez Supabase. Paiements traités par Stripe."] },
      { h: "Propriété intellectuelle", p: ["Tout le contenu de ce site (créations, textes, images, musiques, jeux, logos) appartient à FYSU ou à ses partenaires. Toute reproduction sans autorisation écrite est interdite."] },
    ],
  },
  contact: {
    title: "Contact",
    intro: "Une question sur une commande, un produit ou un retour ? On adore avoir de tes nouvelles.",
    sections: [
      { h: "Écris-nous", p: [b.email ? `E-mail : ${b.email}` : "Utilise le compte Instagram ci-dessous pour nous joindre."] },
      { h: "Suis-nous", p: [`Instagram : ${b.instagram}`] },
      { h: "Atelier", p: idLines("fr") },
    ],
  },
}

export function isLegalSlug(v: string): v is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(v)
}

export function getLegalDoc(slug: LegalSlug, locale: string): LegalDoc {
  return (locale === "fr" ? FR : EN)[slug]
}
