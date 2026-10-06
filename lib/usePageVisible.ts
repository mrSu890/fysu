"use client"

import { useEffect, useState } from "react"

/* ====================================================================
   « La page est vraiment visible » : l'écran de chargement / l'intro est terminé(e)
   et le rideau de pixels ou d'eau est en train de se lever.
   Les animations d'apparition (titres, textes, logo) attendent ce signal,
   sinon elles se joueraient cachées derrière l'écran.
   ==================================================================== */
export function usePageVisible(extraDelay = 220) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let timer = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      setOk(true)
    }
    const check = () => {
      const w = window as any
      if (!w.__loaderVisualDone || w.__pxCovering) return
      window.clearTimeout(timer)
      timer = window.setTimeout(finish, extraDelay)
    }
    check()
    window.addEventListener("loader-visual-done", check)
    window.addEventListener("pixel-reveal", check)
    const poll = window.setInterval(check, 250)
    const safety = window.setTimeout(finish, 12000) // ne jamais rester caché
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(safety)
      window.clearInterval(poll)
      window.removeEventListener("loader-visual-done", check)
      window.removeEventListener("pixel-reveal", check)
    }
  }, [extraDelay])
  return ok
}
