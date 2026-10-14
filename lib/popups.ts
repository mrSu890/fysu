import { useEffect } from "react"

/* ====================================================================
   UN SEUL POP-UP À LA FOIS
   Tout ce qui apparaît tout seul (chargement, choix de zone, cookies, notifications, astuces,
   question musique, démonstration du changement d'ambiance…) passe par ici :
   - rien ne s'affiche tant qu'autre chose est en cours (ou vient juste de se terminer)
   - pendant un pop-up, les pastilles (horloge, accessibilité, jeux, lecteur, retour) s'effacent
     pour que rien ne se superpose
   ==================================================================== */

type Registry = { claims: Set<string>; hiders: Set<string>; last: number }

function reg(): Registry {
  const w = window as any
  if (!w.__fysuPopups) w.__fysuPopups = { claims: new Set<string>(), hiders: new Set<string>(), last: Date.now() }
  return w.__fysuPopups as Registry
}

function sync() {
  const r = reg()
  const html = document.documentElement
  if (r.hiders.size) html.setAttribute("data-popup", "1")
  else html.removeAttribute("data-popup")
}

// Quelqu'un d'autre (que « id ») occupe-t-il l'écran ?
export function popupBusy(id?: string): boolean {
  if (typeof window === "undefined") return false
  const r = reg()
  for (const c of r.claims) if (c !== id) return true
  // fenêtre modale ouverte par la personne (guide des tailles…)
  return !!document.querySelector('[role="dialog"][aria-modal="true"]')
}

// Libre, et depuis au moins « quiet » ms ?
export function popupReady(id: string, quiet = 1500): boolean {
  if (typeof window === "undefined") return false
  if (document.visibilityState !== "visible") return false
  return !popupBusy(id) && Date.now() - reg().last >= quiet
}

// Prend la place. force = ouvert par la personne elle-même (menu, panneau…) : toujours accepté.
export function claimPopup(id: string, hideFabs = true, force = false): boolean {
  if (typeof window === "undefined") return false
  const r = reg()
  if (!force && [...r.claims].some((c) => c !== id)) return false
  r.claims.add(id)
  if (hideFabs) r.hiders.add(id)
  sync()
  return true
}

export function releasePopup(id: string) {
  if (typeof window === "undefined") return
  const r = reg()
  r.claims.delete(id)
  r.hiders.delete(id)
  r.last = Date.now()
  sync()
  window.dispatchEvent(new Event("fysu-popups-changed"))
}

// Appelle « cb » dès que la place est libre (et prise pour « id »). Renvoie une fonction pour annuler.
export function whenPopupIdle(
  id: string,
  cb: () => void,
  opts: { quiet?: number; hideFabs?: boolean } = {}
): () => void {
  const { quiet = 1500, hideFabs = true } = opts
  let stopped = false
  const stop = () => {
    stopped = true
    window.clearInterval(iv)
  }
  const tick = () => {
    if (stopped) return
    if (popupReady(id, quiet) && claimPopup(id, hideFabs)) {
      stop()
      cb()
    }
  }
  const iv = window.setInterval(tick, 400)
  return stop
}

// Pour les panneaux ouverts par la personne : les pop-ups automatiques attendent.
export function usePopupClaim(id: string, open: boolean, hideFabs = false) {
  useEffect(() => {
    if (!open) return
    claimPopup(id, hideFabs, true)
    return () => releasePopup(id)
  }, [id, open, hideFabs])
}
