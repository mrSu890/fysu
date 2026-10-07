"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import ProductFilters from "@/components/ProductFilters"

type Crumb = { label: string; href?: string }

type Props = {
  // Chemin après "Menu" (ex : [{ label: "For Her" }])
  trail: Crumb[]
  // Filtres (facultatif) : affichés à droite de la bande
  filters?: any
  setFilters?: (f: any) => void
  // Remplace l'interrupteur clair / sombre au milieu de la bande (facultatif)
  middle?: React.ReactNode
}

/* Interrupteur clair / sombre (version compacte pour la bande) */
function BarThemeSwitch() {
  const [isOn, setIsOn] = useState(false) // true = mode sombre

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    const dark = saved === "dark"
    setIsOn(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  const toggle = () => {
    const next = !isOn
    setIsOn(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
    window.dispatchEvent(new Event("theme-change"))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOn ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isOn}
      className="relative liquid-glass h-8 w-[68px] rounded-full cursor-pointer"
    >
      <motion.div
        initial={false}
        animate={{ x: isOn ? 30 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="absolute left-1 top-1 h-6 w-[30px] rounded-full bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      />

      <div className="relative z-10 flex h-full w-full items-center">
        <span
          className={`flex h-full w-1/2 items-center justify-center transition-colors ${
            isOn ? "text-white/60" : "text-neutral-700"
          }`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </span>

        <span
          className={`flex h-full w-1/2 items-center justify-center transition-colors ${
            isOn ? "text-neutral-700" : "text-white/60"
          }`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
          </svg>
        </span>
      </div>
    </button>
  )
}

export default function PageBar({ trail, filters, setFilters, middle }: Props) {
  const tn = useTranslations("Navigation")

  const crumbs: Crumb[] = [{ label: tn("menu"), href: "/" }, ...trail]

  return (
    <div className="page-bar w-full">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-10">
        {/* GAUCHE : chemin parcouru */}
        <nav
          aria-label="Breadcrumb"
          className="font-info min-w-0 truncate whitespace-nowrap text-xs sm:text-sm opacity-70"
        >
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`}>
              {i > 0 && <span className="mx-1.5">&gt;</span>}
              {crumb.href ? (
                <Link href={crumb.href} style={{ color: "inherit" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* MILIEU : interrupteur clair / sombre (ou bouton personnalisé) */}
        <div className="flex justify-center">
          {middle ?? null}
        </div>

        {/* DROITE : filtres */}
        <div className="flex justify-end">
          {filters && setFilters ? (
            <ProductFilters filters={filters} setFilters={setFilters} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
