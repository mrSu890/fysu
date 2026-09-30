"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useLocale, useMessages } from "next-intl"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import {
  CONTINENTS,
  COUNTRIES,
  LANGUAGE_NAMES,
  countryName,
  flagEmoji,
  getStoredCountry,
  offeredLanguages,
  saveRegion,
  type ContinentId,
  type Country,
} from "@/lib/regions"

/* ====== TEXTES (faciles à modifier) ====== */

type Copy = {
  title: string
  subtitle: string
  countryTitle: string
  languageTitle: string
  back: string
  close: string
  continents: Record<ContinentId, string>
}

const COPY: Record<string, Copy> = {
  en: {
    title: "Where are you shopping from?",
    subtitle: "Pick your region and we'll set the language for you.",
    countryTitle: "Which country?",
    languageTitle: "Which language do you prefer?",
    back: "Back",
    close: "Close",
    continents: {
      europe: "Europe",
      asia: "Asia",
      northAmerica: "North America",
      southAmerica: "South America",
      africa: "Africa",
      oceania: "Oceania",
    },
  },
  fr: {
    title: "D'où nous rejoignez-vous ?",
    subtitle: "Choisissez votre région, on s'occupe de la langue.",
    countryTitle: "Quel pays ?",
    languageTitle: "Quelle langue préférez-vous ?",
    back: "Retour",
    close: "Fermer",
    continents: {
      europe: "Europe",
      asia: "Asie",
      northAmerica: "Amérique du Nord",
      southAmerica: "Amérique du Sud",
      africa: "Afrique",
      oceania: "Océanie",
    },
  },
  nl: {
    title: "Vanuit welk deel van de wereld shop je?",
    subtitle: "Kies je regio, dan regelen wij de taal.",
    countryTitle: "Welk land?",
    languageTitle: "Welke taal heb je liever?",
    back: "Terug",
    close: "Sluiten",
    continents: {
      europe: "Europa",
      asia: "Azië",
      northAmerica: "Noord-Amerika",
      southAmerica: "Zuid-Amerika",
      africa: "Afrika",
      oceania: "Oceanië",
    },
  },
  ja: {
    title: "どちらからご覧ですか？",
    subtitle: "地域を選ぶと、言語が自動で設定されます。",
    countryTitle: "国を選んでください",
    languageTitle: "ご希望の言語を選んでください",
    back: "戻る",
    close: "閉じる",
    continents: {
      europe: "ヨーロッパ",
      asia: "アジア",
      northAmerica: "北アメリカ",
      southAmerica: "南アメリカ",
      africa: "アフリカ",
      oceania: "オセアニア",
    },
  },
}

type Step = "continent" | "country" | "language"

/* ====== POP-UP DE CHOIX DE ZONE ====== */

export default function RegionGate() {
  const locale = useLocale()
  const router = useRouter()
  const messages = useMessages() as { RegionGate?: Copy }
  const copy = COPY[locale] ?? messages.RegionGate ?? COPY.en

  const [open, setOpen] = useState(false)
  const [closable, setClosable] = useState(false)
  const [step, setStep] = useState<Step>("continent")
  const [continent, setContinent] = useState<ContinentId | null>(null)
  const [country, setCountry] = useState<Country | null>(null)

  // Première visite : le pop-up apparaît dès que l'écran de chargement est terminé
  useEffect(() => {
    const start = () => {
      if (getStoredCountry()) return
      setClosable(false)
      setStep("continent")
      setOpen(true)
    }

    if ((window as any).__loaderVisualDone) {
      start()
      return
    }

    window.addEventListener("loader-visual-done", start, { once: true })
    return () => window.removeEventListener("loader-visual-done", start)
  }, [])

  // Réouverture depuis le menu (changer de zone / de langue)
  useEffect(() => {
    const reopen = () => {
      setClosable(true)
      setStep("continent")
      setContinent(null)
      setCountry(null)
      setOpen(true)
    }
    window.addEventListener("open-region-picker", reopen)
    return () => window.removeEventListener("open-region-picker", reopen)
  }, [])

  // Bloque le scroll tant que le pop-up est ouvert
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = prev
    }
  }, [open])

  // Echap ferme (seulement si on peut fermer)
  useEffect(() => {
    if (!open || !closable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closable])

  const countries = useMemo(() => {
    if (!continent) return []
    return COUNTRIES.filter((c) => c.continent === continent).sort((a, b) =>
      countryName(a.code, locale).localeCompare(countryName(b.code, locale), locale)
    )
  }, [continent, locale])

  const apply = (c: Country, lang: string) => {
    saveRegion(c.code, lang)
    setOpen(false)

    const changed = lang !== locale
    if (changed) router.refresh()

    // On laisse la langue se charger avant de lancer cookies et notifications
    window.setTimeout(
      () => {
        ;(window as any).__regionDone = true
        window.dispatchEvent(new Event("region-done"))
      },
      changed ? 700 : 0
    )
  }

  const pickCountry = (c: Country) => {
    const langs = offeredLanguages(c)
    if (langs.length === 1) {
      apply(c, langs[0])
      return
    }
    setCountry(c)
    setStep("language")
  }

  const goBack = () => {
    if (step === "language") setStep("country")
    else if (step === "country") setStep("continent")
  }

  const title =
    step === "continent"
      ? copy.title
      : step === "country"
      ? copy.countryTitle
      : copy.languageTitle

  const rowClass =
    "flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-current/15 bg-white/10 px-4 py-3 text-left text-sm transition hover:bg-white/20"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9000] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={closable ? () => setOpen(false) : undefined}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="relative liquid-glass flex max-h-[82dvh] w-full max-w-md flex-col rounded-[28px] p-6 text-[var(--menu)]"
          >
            {/* En-tête */}
            <div className="flex items-start gap-3">
              {step !== "continent" && (
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={copy.back}
                  className="mt-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium leading-snug">{title}</h2>
                {step === "continent" && (
                  <p className="mt-1 text-xs opacity-75">{copy.subtitle}</p>
                )}
                {step === "country" && continent && (
                  <p className="mt-1 text-xs opacity-75">
                    {copy.continents[continent]}
                  </p>
                )}
                {step === "language" && country && (
                  <p className="mt-1 text-xs opacity-75">
                    {flagEmoji(country.code)} {countryName(country.code, locale)}
                  </p>
                )}
              </div>

              {closable && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={copy.close}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="mt-5 -mr-2 flex-1 overflow-y-auto pr-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-2"
                >
                  {step === "continent" &&
                    CONTINENTS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={rowClass}
                        onClick={() => {
                          setContinent(id)
                          setStep("country")
                        }}
                      >
                        <span className="flex-1">{copy.continents[id]}</span>
                        <ChevronRight size={16} className="opacity-60" />
                      </button>
                    ))}

                  {step === "country" &&
                    countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        className={rowClass}
                        onClick={() => pickCountry(c)}
                      >
                        <span className="text-lg leading-none" aria-hidden="true">
                          {flagEmoji(c.code)}
                        </span>
                        <span className="flex-1">{countryName(c.code, locale)}</span>
                      </button>
                    ))}

                  {step === "language" &&
                    country &&
                    offeredLanguages(country).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={rowClass}
                        onClick={() => apply(country, lang)}
                      >
                        <span className="flex-1">{LANGUAGE_NAMES[lang] ?? lang}</span>
                      </button>
                    ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
