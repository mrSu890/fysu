/* ====================================================================
   RETOUR APRÈS CONNEXION : on revient là où on était (le paiement, une fiche produit…), pas à l'accueil.
   - la page de connexion lit ?next=/chemin, sinon la page d'où on vient
   - le choix est gardé pendant la visite (connexion <-> inscription) et pour Google (cookie court)
   ==================================================================== */

const KEY = "fysu:auth-next"
const COOKIE = "fysu_next"

const isSafe = (p: string | null | undefined): p is string =>
  !!p && p.startsWith("/") && !p.startsWith("//") && !/^\/(auth|api|password)(\/|$)/.test(p)

// À appeler à l'arrivée sur la page de connexion / d'inscription
export function captureNext() {
  try {
    const param = new URLSearchParams(window.location.search).get("next")
    let target: string | null = isSafe(param) ? param : null
    if (!target && document.referrer) {
      const u = new URL(document.referrer)
      if (u.origin === window.location.origin) {
        const p = u.pathname + u.search
        if (isSafe(p)) target = p
      }
    }
    if (target) sessionStorage.setItem(KEY, target)
  } catch {
    /* ignore */
  }
}

export function getNext(): string {
  try {
    const v = sessionStorage.getItem(KEY)
    if (isSafe(v)) return v
  } catch {
    /* ignore */
  }
  return "/"
}

export function clearNext() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

// Google : la personne quitte le site puis revient par /api/auth/callback, qui lit ce cookie
export function stashNextForOAuth() {
  try {
    document.cookie = `${COOKIE}=${encodeURIComponent(getNext())}; path=/; max-age=900; samesite=lax`
  } catch {
    /* ignore */
  }
}

export const NEXT_COOKIE = COOKIE
