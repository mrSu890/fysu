/* ====================================================================
   LIVRAISON : règles uniques utilisées par le panier, Apple Pay et la page de paiement
   - gratuite dès 150 € d'achat, sinon 5 € partout dans le monde
   - délais annoncés : Benelux 2 à 4 jours ouvrables, reste de l'Europe 4 à 8 (hors précommandes)
   ==================================================================== */

export const FREE_SHIPPING_FROM_CENTS = 15000
export const SHIPPING_FEE_CENTS = 500

export const shippingFeeCents = (subtotalCents: number) =>
  subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_FEE_CENTS

const BENELUX = ["BE", "NL", "LU"]
const EUROPE = [
  "AT", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "MT",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH", "NO", "IS", "LI", "MC", "AD", "SM", "VA",
]

// délai en jours ouvrables pour un pays (null = pas de délai annoncé)
export function deliveryDays(country: string | null | undefined): { min: number; max: number } | null {
  const c = (country ?? "").toUpperCase()
  if (BENELUX.includes(c)) return { min: 2, max: 4 }
  if (EUROPE.includes(c)) return { min: 4, max: 8 }
  return null
}
