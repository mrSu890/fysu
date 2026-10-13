/* ====================================================================
   PAGE D'ATTENTE AVANT L'OUVERTURE DU SITE
   Tant qu'elle est active, tous les visiteurs arrivent sur la page « vitre + plantes » :
   mot de passe pour entrer, ou e-mail pour être averti de l'ouverture.
   Les comptes admin connectés entrent directement, sans voir cette page.

   POUR LA RETIRER :
   - le plus simple : mets PRE_LAUNCH = false ci-dessous (une seule ligne) ;
   - elle se retire aussi toute seule à la date et l'heure OPEN_AT ;
   - pour la supprimer définitivement (après l'ouverture) : supprime components/PreLaunchGate.tsx,
     components/PreLaunchPlants.ts, app/password/page.tsx, app/api/launch-notify/route.ts,
     puis retire de middleware.ts la fonction preLaunchGate et ses 2 lignes d'appel.

   LE MOT DE PASSE n'est pas écrit ici (le dépôt GitHub est public) :
   il se règle dans Vercel > Settings > Environment Variables > SITE_PASSWORD.
   ==================================================================== */

export const PRE_LAUNCH = true

// Ouverture : 15 décembre 2026 à 12h, heure de Bruxelles (11h00 UTC en décembre)
export const OPEN_AT = "2026-12-15T12:00:00+01:00"

export const GATE_COOKIE = "fysu_access"

export function gateActive(now: number = Date.now()) {
  return PRE_LAUNCH && now < Date.parse(OPEN_AT)
}

// Mot de passe du site : SITE_PASSWORD (ou, à défaut, l'ancienne variable DEV_PASSWORD)
export function sitePassword(): string | null {
  return process.env.SITE_PASSWORD || process.env.DEV_PASSWORD || null
}

// Jeton gardé dans le cookie du visiteur : une empreinte du mot de passe.
// Si tu changes le mot de passe, tous les anciens accès sont invalidés.
export async function gateToken(): Promise<string | null> {
  const password = sitePassword()
  if (!password) return null
  const bytes = new TextEncoder().encode(`fysu-gate:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
