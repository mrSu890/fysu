import { BUSINESS } from "@/lib/business"

/* ====================================================================
   PAGES LÉGALES : livraison, paiement, retours, conditions, mentions légales, contact, FAQ
   Textes en français et en anglais (les autres langues voient l'anglais).
   À faire relire par un professionnel avant le lancement.
   ==================================================================== */

export const LEGAL_SLUGS = ["terms", "shipping", "payment", "returns", "legal-notice", "contact", "faq"] as const
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
  faq: {
    title: "FAQ",
    sections: [
      { h: "Where do you deliver?", p: ["We deliver worldwide. Delivery takes 2 to 4 working days in Belgium, the Netherlands and Luxembourg, and 4 to 8 working days in the rest of Europe. For other countries, delivery times are confirmed on request (see the Contact page)."] },
      { h: "How much is delivery?", p: ["Delivery is free for orders of €150 and more. Below that amount, a flat fee of €5 applies, shown at checkout before you pay."] },
      { h: "How do I track my order?", p: ["You receive a confirmation as soon as your payment is accepted, then tracking information when your parcel is on its way."] },
      { h: "Can I change or cancel an order?", p: ["Contact us as soon as possible after ordering, with your order number. An order can be changed or cancelled as long as it has not been handed to the carrier."] },
      { h: "Do I pay customs duties or import taxes?", p: ["No. Customs duties and taxes are included in the price."] },
      { h: "What if my order arrives damaged or incomplete?", p: ["Tell us as soon as possible by e-mail, with your order number. Customer service will find a solution."] },
      { h: "What is a pre-order?", p: ["Products marked “Pre-order” are paid at the time of the order and sent from the release date shown on the product page. The standard delivery times do not apply to them."] },
      { h: "Can I return an item?", p: ["Yes. You have 14 days after receiving your order to return an item, and the return is free: we send you a prepaid label. Items must be unworn and unwashed, with their labels and in their original packaging."] },
      { h: "Can I exchange a size?", p: ["FYSU does not offer direct exchanges. Return the item for a refund and place a new order in the size you want."] },
      { h: "When am I refunded?", p: ["Within 14 days after we receive your return, with the same payment method as your order. The standard delivery cost you paid is refunded too."] },
      { h: "Can I return a fragrance?", p: ["Not once it has been unsealed, for health and hygiene reasons."] },
      { h: "How do the sizes fit?", p: ["The FYSU silhouette is slightly oversized. Each product page has a size guide with measurements."] },
      { h: "What are the pieces made of, and how do I care for them?", p: ["Many pieces are made of cotton and wool. The materials and care instructions are listed on each product page."] },
      { h: "Will a sold-out piece come back?", p: ["Yes, pieces come back. Use “Notify me” on the product page to be told when it is available again."] },
      { h: "Which payment methods do you accept?", p: ["Card, Apple Pay, Google Pay and the other payment methods offered at checkout. Payments are processed by Stripe, a certified payment provider, and FYSU never sees or stores your card details. Prices are in euros."] },
      { h: "How do I use a promo code?", p: ["Enter it at checkout. A code has the conditions stated when it is given (for example one use per code), and cannot be combined with another unless stated otherwise. This includes the codes won in our arcade games."] },
      { h: "Where are the pieces made?", p: ["The place of manufacture is stated on each product page. Depending on the piece, they are made in Portugal, Morocco, Italy, China and other countries."] },
      { h: "Why do you work with these factories?", p: ["We choose each factory for the complexity of the designs, the work on the material and the retail price we want to offer. Some pieces are made in China so that key pieces cost less when sold directly to customers. These factories are certified."] },
      { h: "Which factories do you work with?", p: ["Our factories are certified. Their names are confidential, under non-disclosure agreements."] },
      { h: "Where are made-to-measure and Kiban Collector pieces made?", p: ["In our workshops in Belgium, or by partner artisans local to the countries concerned."] },
      { h: "What are Kiban Collector and TheWave?", p: ["Kiban Collector is FYSU's craft program: a lab where artisans and engineers work side by side to create objects. TheWave is a FYSU line of knitwear and summer accessories, and a music production platform."] },
      { h: "Does FYSU organise events?", p: ["Yes. Subscribe to the newsletter to be informed."] },
      { h: "How do I contact FYSU, or propose a collaboration?", p: ["By e-mail, at the address on the Contact page. The same address is used for collaborations and applications. We reply quickly."] },
    ],
  },
  shipping: {
    title: "Shipping",
    sections: [
      { h: "Where we deliver", p: ["We deliver worldwide. Delivery times are 2 to 4 working days in Belgium, the Netherlands and Luxembourg, and 4 to 8 working days in the rest of Europe. For other countries, delivery times depend on the destination and are confirmed on request (see the Contact page)."] },
      { h: "Delivery costs", p: ["Delivery is free for orders of €150 and more. Below that amount, a flat fee of €5 applies, shown at checkout before you pay."] },
      { h: "Preparing and sending your order", p: ["Every order is prepared and packed with care in our signature FYSU packaging. You receive a confirmation as soon as your payment is accepted, and tracking information when your parcel is on its way."] },
      { h: "Pre-orders and upcoming products", p: ["The delivery times above do not apply to pre-orders. Products marked “Pre-order” or “Coming soon” are sent from the release date shown on the product page. If you order several items together, your order leaves once everything is available, unless you ask us to send it in several parcels."] },
      { h: "A problem with your delivery?", p: ["If your parcel is late, damaged or incomplete, contact us as soon as possible (see the Contact page) and we will sort it out."] },
    ],
  },
  payment: {
    title: "Payment",
    sections: [
      { h: "Secure payment", p: ["Payments are processed by Stripe, a certified payment provider. You pay by card, Apple Pay, Google Pay or any other payment method offered at checkout. FYSU never sees or stores your card details."] },
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
  faq: {
    title: "FAQ",
    sections: [
      { h: "Où livrez-vous ?", p: ["Nous livrons dans le monde entier. La livraison prend 2 à 4 jours ouvrables en Belgique, aux Pays-Bas et au Luxembourg, et 4 à 8 jours ouvrables dans le reste de l'Europe. Pour les autres pays, les délais sont confirmés sur demande (voir la page Contact)."] },
      { h: "Combien coûte la livraison ?", p: ["La livraison est offerte dès 150 € d'achat. En dessous, un forfait de 5 € s'applique, indiqué au paiement avant que tu paies."] },
      { h: "Comment suivre ma commande ?", p: ["Tu reçois une confirmation dès que ton paiement est accepté, puis les informations de suivi quand ton colis est en route."] },
      { h: "Puis-je modifier ou annuler une commande ?", p: ["Contacte-nous dès que possible après ta commande, avec ton numéro de commande. Une commande peut être modifiée ou annulée tant qu'elle n'a pas été remise au transporteur."] },
      { h: "Dois-je payer des droits de douane ou des taxes à l'importation ?", p: ["Non. Les droits de douane et les taxes sont inclus dans le prix."] },
      { h: "Que faire si ma commande arrive abîmée ou incomplète ?", p: ["Préviens-nous dès que possible par e-mail, avec ton numéro de commande. Le service client trouvera une solution."] },
      { h: "Qu'est-ce qu'une précommande ?", p: ["Les produits marqués « Précommande » sont payés au moment de la commande et expédiés à partir de la date de sortie indiquée sur la fiche produit. Les délais de livraison standard ne s'appliquent pas."] },
      { h: "Puis-je retourner un article ?", p: ["Oui. Tu as 14 jours après réception de ta commande pour retourner un article, et le retour est gratuit : nous t'envoyons une étiquette prépayée. Les articles doivent être non portés et non lavés, avec leurs étiquettes et dans leur emballage d'origine."] },
      { h: "Puis-je échanger une taille ?", p: ["FYSU ne propose pas d'échange direct. Retourne l'article pour être remboursé et passe une nouvelle commande dans la taille souhaitée."] },
      { h: "Quand suis-je remboursé ?", p: ["Dans les 14 jours après réception de ton retour, avec le même moyen de paiement que ta commande. Les frais de livraison standard payés sont remboursés aussi."] },
      { h: "Puis-je retourner un parfum ?", p: ["Pas une fois qu'il a été descellé, pour des raisons de santé et d'hygiène."] },
      { h: "Comment taillent les pièces ?", p: ["La silhouette FYSU est légèrement oversize. Chaque fiche produit a un guide des tailles avec les mesures."] },
      { h: "En quoi sont faites les pièces, et comment les entretenir ?", p: ["Beaucoup de pièces sont en coton et en laine. Les matières et les conseils d'entretien sont indiqués sur chaque fiche produit."] },
      { h: "Une pièce épuisée revient-elle ?", p: ["Oui, les pièces reviennent. Utilise « Me prévenir » sur la fiche produit pour être averti de son retour."] },
      { h: "Quels moyens de paiement acceptez-vous ?", p: ["Carte, Apple Pay, Google Pay et les autres moyens proposés au paiement. Les paiements sont traités par Stripe, un prestataire de paiement certifié, et FYSU ne voit ni ne conserve tes données de carte. Les prix sont en euros."] },
      { h: "Comment utiliser un code promo ?", p: ["Saisis-le au paiement. Un code a les conditions indiquées lors de son attribution (par exemple une utilisation par code) et ne se cumule pas avec un autre, sauf mention contraire. Cela inclut les codes gagnés dans nos jeux d'arcade."] },
      { h: "Où sont fabriquées les pièces ?", p: ["Le lieu de fabrication est indiqué sur chaque fiche produit. Selon les pièces, elles sont fabriquées au Portugal, au Maroc, en Italie, en Chine et dans d'autres pays."] },
      { h: "Pourquoi travaillez-vous avec ces usines ?", p: ["Nous choisissons chaque usine selon la complexité des designs, le travail de la matière et le prix de vente que nous voulons proposer. Certaines pièces sont fabriquées en Chine pour que les pièces clés coûtent moins cher en vente directe. Ces usines sont certifiées."] },
      { h: "Avec quelles usines travaillez-vous ?", p: ["Nos usines sont certifiées. Leurs noms sont confidentiels, protégés par des accords de confidentialité."] },
      { h: "Où sont fabriquées les pièces sur mesure et Kiban Collector ?", p: ["Dans nos ateliers en Belgique, ou par des artisans partenaires locaux dans les pays concernés."] },
      { h: "Que sont Kiban Collector et TheWave ?", p: ["Kiban Collector est le programme artisanal de FYSU : un laboratoire où artisans et ingénieurs travaillent côte à côte pour créer des objets. TheWave est une ligne FYSU de knitwear et d'accessoires d'été, et une plateforme de production musicale."] },
      { h: "FYSU organise-t-elle des événements ?", p: ["Oui. Abonne-toi à la newsletter pour être averti."] },
      { h: "Comment contacter FYSU, ou proposer une collaboration ?", p: ["Par e-mail, à l'adresse de la page Contact. La même adresse sert pour les collaborations et les candidatures. Nous répondons rapidement."] },
    ],
  },
  shipping: {
    title: "Livraison",
    sections: [
      { h: "Où livrons-nous", p: ["Nous livrons dans le monde entier. Les délais sont de 2 à 4 jours ouvrables en Belgique, aux Pays-Bas et au Luxembourg, et de 4 à 8 jours ouvrables dans le reste de l'Europe. Pour les autres pays, les délais dépendent de la destination et sont confirmés sur demande (voir la page Contact)."] },
      { h: "Frais de livraison", p: ["La livraison est offerte à partir de 150 € d'achat. En dessous de ce montant, des frais forfaitaires de 5 € s'appliquent, affichés au moment de payer."] },
      { h: "Préparation et envoi", p: ["Chaque commande est préparée et emballée avec soin dans l'emballage signature FYSU. Tu reçois une confirmation dès que ton paiement est accepté, puis les informations de suivi quand ton colis part."] },
      { h: "Précommandes et produits à venir", p: ["Les délais ci-dessus ne s'appliquent pas aux précommandes. Les produits marqués « Précommande » ou « Bientôt disponible » sont envoyés à partir de la date de sortie indiquée sur la fiche produit. Si tu commandes plusieurs articles ensemble, ta commande part quand tout est disponible, sauf si tu nous demandes de l'envoyer en plusieurs colis."] },
      { h: "Un problème avec ta livraison ?", p: ["Si ton colis est en retard, abîmé ou incomplet, contacte-nous le plus vite possible (voir la page Contact) et nous réglons ça."] },
    ],
  },
  payment: {
    title: "Paiement",
    sections: [
      { h: "Paiement sécurisé", p: ["Les paiements sont traités par Stripe, un prestataire de paiement certifié. Tu paies par carte, Apple Pay, Google Pay ou un autre moyen proposé au moment de payer. FYSU ne voit ni ne conserve jamais tes données de carte."] },
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
