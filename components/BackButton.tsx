"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useLocale } from "next-intl"

/* ====================================================================
   FLÈCHE « RETOUR »
   Petite pastille en verre sous la barre de navigation, en haut à gauche de la page
   (elle défile avec la page, elle ne gêne donc pas). Absente de la page d'accueil,
   de l'admin et des pages sans navigation.
   Si le visiteur est arrivé directement sur cette page, la flèche le ramène à l'accueil.
   ==================================================================== */

const LABEL: Record<string, string> = { fr: "Retour", en: "Back" }

const isHome = (p: string) => p === "/" || /^\/[a-z]{2}(-[A-Za-z]{2})?\/?$/.test(p)
// les pages musique et jeux ont déjà leurs propres boutons de retour
const HIDDEN = [/^\/admin/, /^\/password/, /^\/success/, /^\/auth/, /^\/music/, /^\/games/]

export default function BackButton() {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const locale = useLocale()
  const steps = useRef(0) // nombre de pages visitées sur le site depuis l'arrivée
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    steps.current += 1
  }, [pathname])

  if (isHome(pathname) || HIDDEN.some((r) => r.test(pathname))) return null

  const label = LABEL[locale] ?? LABEL.en

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-back-button
      onClick={() => {
        if (steps.current > 0) {
          steps.current = Math.max(0, steps.current - 1)
          router.back()
        } else {
          router.push("/")
        }
      }}
      className="liquid-glass absolute left-4 top-[116px] z-[35] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition active:scale-90 sm:left-6"
      style={{
        color: "var(--menu)",
        background: "color-mix(in srgb, var(--navbar-bg) 78%, transparent)",
      }}
    >
      <ArrowLeft size={16} strokeWidth={1.5} />
    </button>
  )
}
