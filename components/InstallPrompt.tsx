"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Share, X, MoreVertical } from "lucide-react"
import { supabaseClient } from "@/lib/supabaseClient"
import { useCart } from "@/context/CartContext"
import { releasePopup, whenPopupIdle } from "@/lib/popups"

/* ====================================================================
   « AJOUTER FYSU À L'ÉCRAN D'ACCUEIL »
   Apparaît une fois, sur téléphone ou tablette, quand la personne est connectée.
   Jamais pendant un achat : pas sur le panier, le paiement ou la page de confirmation, et pas tant que
   le panier contient des articles (compte créé pour finaliser une commande : on attend la fin de l'achat).
   Fermée avec la croix : elle revient dans 30 jours. « C'est fait » : plus jamais.
   ==================================================================== */

const DONE = "fysu-install-done"
const LATER = "fysu-install-later"
const LATER_DAYS = 30
const BLOCKED = /^\/(admin|auth|cart|checkout|success|password|review|preferences|privacy)(\/|$)/

const COPY = {
  fr: {
    title: "FYSU sur ton écran d'accueil",
    why: "Ouvre FYSU en un geste, comme une appli.",
    ios: ["Touche Partager (le carré avec une flèche), en bas ou dans le menu ⋯ de ton navigateur.", "Fais défiler et touche « Sur l'écran d'accueil ».", "Touche « Ajouter » en haut à droite."],
    android: ["Touche le menu ⋮ en haut à droite de ton navigateur.", "Touche « Installer l'application » ou « Ajouter à l'écran d'accueil ».", "Confirme avec « Installer » ou « Ajouter »."],
    install: "Installer",
    done: "C'est fait",
    close: "Fermer",
  },
  en: {
    title: "FYSU on your home screen",
    why: "Open FYSU in one tap, like an app.",
    ios: ["Tap Share (the square with an arrow), at the bottom or in your browser's ⋯ menu.", "Scroll down and tap “Add to Home Screen”.", "Tap “Add” at the top right."],
    android: ["Tap the ⋮ menu at the top right of your browser.", "Tap “Install app” or “Add to Home screen”.", "Confirm with “Install” or “Add”."],
    install: "Install",
    done: "Done",
    close: "Close",
  },
}

function platform(): "ios" | "android" | null {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios"
  if (/Android/i.test(ua)) return "android"
  return null
}
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true

function dismissed(): boolean {
  try {
    if (localStorage.getItem(DONE)) return true
    const l = Number(localStorage.getItem(LATER))
    return !!l && Date.now() - l < LATER_DAYS * 86400e3
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const t = useLocale() === "fr" ? COPY.fr : COPY.en
  const pathname = usePathname()
  const { cart } = useCart()
  const [logged, setLogged] = useState(false)
  const [open, setOpen] = useState(false)
  const [plat, setPlat] = useState<"ios" | "android" | null>(null)
  const [evt, setEvt] = useState<any>(null)

  useEffect(() => {
    setPlat(platform())
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e) }
    window.addEventListener("beforeinstallprompt", onPrompt)
    supabaseClient.auth.getSession().then(({ data }) => setLogged(!!data.session))
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, s) => setLogged(!!s))
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); sub.subscription.unsubscribe() }
  }, [])

  const eligible = !!plat && logged && cart.length === 0 && !BLOCKED.test(pathname) && !open

  useEffect(() => {
    if (!eligible) return
    let stop: (() => void) | undefined
    const timer = window.setTimeout(() => {
      if (standalone() || dismissed() || document.documentElement.classList.contains("a11y-focus")) return
      stop = whenPopupIdle("install", () => setOpen(true), { quiet: 2500 })
    }, 8000)
    return () => { window.clearTimeout(timer); stop?.() }
  }, [eligible])

  // le panier se remplit pendant que c'est ouvert : on referme sans rien retenir
  useEffect(() => {
    if (open && (cart.length > 0 || BLOCKED.test(pathname))) { setOpen(false); releasePopup("install") }
  }, [open, cart.length, pathname])

  function close(permanent: boolean) {
    setOpen(false)
    releasePopup("install")
    try { permanent ? localStorage.setItem(DONE, "1") : localStorage.setItem(LATER, String(Date.now())) } catch { /* ignore */ }
  }

  async function install() {
    try { await evt.prompt(); await evt.userChoice } catch { /* ignore */ }
    close(true)
  }

  if (!open || !plat) return null
  const steps = plat === "ios" ? t.ios : t.android

  return (
    <div role="dialog" aria-label={t.title} className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md border border-foreground/20 bg-background p-5 shadow-2xl">
      <button type="button" aria-label={t.close} onClick={() => close(false)} className="absolute right-3 top-3 p-1 opacity-60"><X size={16} strokeWidth={1.4} /></button>
      <p className="pr-6 text-[11px] font-light uppercase tracking-[0.22em]">{t.title}</p>
      <p className="mt-2 text-sm font-light text-foreground/65">{t.why}</p>
      {plat === "android" && evt ? (
        <button type="button" onClick={install} className="mt-5 text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4">{t.install}</button>
      ) : (
        <ol className="mt-4 space-y-3 text-sm font-light">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-info text-foreground/45">{i + 1}</span>
              <span>{s}{i === 0 && (plat === "ios" ? <Share size={14} strokeWidth={1.4} className="ml-1.5 inline align-[-2px]" /> : <MoreVertical size={14} strokeWidth={1.4} className="ml-1 inline align-[-2px]" />)}</span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={() => close(true)} className="mt-5 block text-[11px] font-light uppercase tracking-[0.18em] opacity-60">{t.done}</button>
    </div>
  )
}
