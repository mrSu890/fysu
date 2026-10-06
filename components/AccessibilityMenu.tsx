"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useLocale } from "next-intl"
import DraggableFab from "@/components/DraggableFab"
import { resetTips } from "@/lib/tips"

/* ====================================================================
   ACCESSIBILITÉ
   Une pastille ronde en bas à gauche (on peut la déplacer avec le doigt).
   Elle ouvre un petit panneau : texte plus grand, texte plus lisible, contraste,
   moins d'animations, sans points décoratifs, mode concentration (TDAH).
   Les choix sont retenus sur l'appareil. Les styles sont dans app/globals.css
   (classes a11y-…) et sont appliqués dès le chargement (voir app/layout.tsx).
   ==================================================================== */

type Prefs = {
  size: 0 | 1 | 2 | 3
  readable: boolean
  contrast: boolean
  calm: boolean
  nodots: boolean
  focus: boolean
}

const DEFAULTS: Prefs = { size: 0, readable: false, contrast: false, calm: false, nodots: false, focus: false }
const KEY = "fysu-a11y"
const SIZES = ["", "112.5%", "125%", "140%"]

function apply(p: Prefs) {
  const h = document.documentElement
  h.style.fontSize = SIZES[p.size] || ""
  h.classList.toggle("a11y-readable", p.readable)
  h.classList.toggle("a11y-contrast", p.contrast)
  h.classList.toggle("a11y-calm", p.calm)
  h.classList.toggle("a11y-nodots", p.nodots)
  h.classList.toggle("a11y-focus", p.focus)
}

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    return DEFAULTS
  }
}

/* ---------- textes (en / fr / nl / ja ; les autres langues : anglais) ---------- */

type Copy = {
  open: string
  title: string
  close: string
  size: string
  readable: [string, string]
  contrast: [string, string]
  calm: [string, string]
  nodots: [string, string]
  focus: [string, string]
  reset: string
}

const COPY: Record<string, Copy> = {
  en: {
    open: "Accessibility",
    title: "Accessibility",
    close: "Close",
    size: "Text size",
    readable: ["Easier-to-read text", "Clearer font, more space between letters and lines"],
    contrast: ["Stronger contrast", "Darker text, underlined links"],
    calm: ["Fewer animations", "Nothing fades, slides or moves"],
    nodots: ["No decorative dots", "Hides the dots on the sides of the screen"],
    focus: ["Focus mode", "Calm page: no pop-ups, no animations, no dots, clearer reading"],
    reset: "Reset everything",
  },
  fr: {
    open: "Accessibilité",
    title: "Accessibilité",
    close: "Fermer",
    size: "Taille du texte",
    readable: ["Texte plus lisible", "Police plus claire, lettres et lignes plus espacées"],
    contrast: ["Contraste renforcé", "Texte plus foncé, liens soulignés"],
    calm: ["Moins d'animations", "Rien ne s'efface, ne glisse ni ne bouge"],
    nodots: ["Sans points décoratifs", "Cache les points sur les côtés de l'écran"],
    focus: ["Mode concentration", "Page calme : pas de pop-ups, d'animations ni de points, lecture plus claire"],
    reset: "Tout réinitialiser",
  },
  nl: {
    open: "Toegankelijkheid",
    title: "Toegankelijkheid",
    close: "Sluiten",
    size: "Tekstgrootte",
    readable: ["Beter leesbare tekst", "Duidelijker lettertype, meer ruimte tussen letters en regels"],
    contrast: ["Sterker contrast", "Donkerdere tekst, onderstreepte links"],
    calm: ["Minder animaties", "Niets vervaagt, schuift of beweegt"],
    nodots: ["Geen decoratieve stippen", "Verbergt de stippen aan de zijkanten van het scherm"],
    focus: ["Focusmodus", "Rustige pagina: geen pop-ups, animaties of stippen, duidelijker lezen"],
    reset: "Alles terugzetten",
  },
  ja: {
    open: "アクセシビリティ",
    title: "アクセシビリティ",
    close: "閉じる",
    size: "文字の大きさ",
    readable: ["読みやすい文字", "見やすい書体、文字と行の間隔を広く"],
    contrast: ["コントラストを強く", "濃い文字、リンクに下線"],
    calm: ["アニメーションを減らす", "フェードやスライド、動きをなくします"],
    nodots: ["飾りの点を消す", "画面の両端の点を隠します"],
    focus: ["集中モード", "ポップアップ・アニメーション・点なしの落ち着いたページ"],
    reset: "すべてリセット",
  },
}

/* ---------- interrupteur ---------- */

function Row({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string
  hint: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl px-3 py-3 text-left transition active:scale-[0.99]"
      style={{ border: "1px solid color-mix(in srgb, currentColor 18%, transparent)" }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-tight">{label}</span>
        <span className="mt-0.5 block text-xs leading-snug opacity-70">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
        style={{
          background: on ? "var(--foreground)" : "color-mix(in srgb, currentColor 22%, transparent)",
        }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full transition-all"
          style={{
            left: on ? 24 : 4,
            background: "var(--background)",
          }}
        />
      </span>
    </button>
  )
}

// Symbole universel d'accessibilité : un cercle, une personne les bras écartés
function UniversalAccessIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7.2" r="1.3" fill="currentColor" stroke="none" />
      <path d="M6.4 9.6 C9.6 10.5 14.4 10.5 17.6 9.6" />
      <path d="M12 10.4 V14" />
      <path d="M12 14 L9.9 18.2" />
      <path d="M12 14 L14.1 18.2" />
    </svg>
  )
}

export default function AccessibilityMenu() {
  const locale = useLocale()
  const pathname = usePathname()
  const copy = COPY[locale] ?? COPY.en

  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS)

  useEffect(() => {
    setPrefs(load())
  }, [])

  // ouverture depuis la recherche
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("open-accessibility", onOpen)
    return () => window.removeEventListener("open-accessibility", onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      html.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function update(change: Partial<Prefs>) {
    const next = { ...prefs, ...change }
    setPrefs(next)
    apply(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  if (pathname.startsWith("/admin")) return null

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="a11y-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[66]"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-label={copy.title}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 mx-auto max-h-[88svh] w-full max-w-md overflow-y-auto rounded-t-[28px] px-5 pt-5 shadow-2xl"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
                paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-medium">
                  <UniversalAccessIcon size={20} /> {copy.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={copy.close}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full active:scale-95"
                  style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* taille du texte */}
              <p className="mb-2 text-sm font-medium">{copy.size}</p>
              <div role="radiogroup" aria-label={copy.size} className="mb-4 grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => {
                  const active = prefs.size === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => update({ size: i as Prefs["size"] })}
                      role="radio"
                      aria-checked={active}
                      className="flex h-12 cursor-pointer items-center justify-center rounded-xl transition active:scale-95"
                      style={{
                        fontSize: 13 + i * 3,
                        background: active ? "var(--foreground)" : "transparent",
                        color: active ? "var(--background)" : "inherit",
                        border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
                      }}
                    >
                      A
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <Row
                  label={copy.readable[0]}
                  hint={copy.readable[1]}
                  on={prefs.readable}
                  onToggle={() => update({ readable: !prefs.readable })}
                />
                <Row
                  label={copy.contrast[0]}
                  hint={copy.contrast[1]}
                  on={prefs.contrast}
                  onToggle={() => update({ contrast: !prefs.contrast })}
                />
                <Row
                  label={copy.calm[0]}
                  hint={copy.calm[1]}
                  on={prefs.calm}
                  onToggle={() => update({ calm: !prefs.calm })}
                />
                <Row
                  label={copy.nodots[0]}
                  hint={copy.nodots[1]}
                  on={prefs.nodots}
                  onToggle={() => update({ nodots: !prefs.nodots })}
                />
                <Row
                  label={copy.focus[0]}
                  hint={copy.focus[1]}
                  on={prefs.focus}
                  onToggle={() => update({ focus: !prefs.focus })}
                />
              </div>

              <button
                type="button"
                onClick={() => update({ ...DEFAULTS })}
                className="mt-5 w-full cursor-pointer rounded-full py-3 text-sm transition active:scale-[0.98]"
                style={{ border: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}
              >
                {copy.reset}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetTips()
                  setOpen(false)
                }}
                className="mt-2 w-full cursor-pointer rounded-full py-3 text-sm opacity-80 transition active:scale-[0.98]"
                style={{ border: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}
              >
                {locale === "fr" ? "Revoir les astuces" : "Replay the tips"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DraggableFab
        storageKey="fysu-a11y-fab"
        side="left"
        size={52}
        label={copy.open}
        onTap={() => setOpen(true)}
        zIndex={55}
        lift
        tip="a11y"
        className="liquid-glass"
        style={{ color: "var(--menu)" }}
      >
        <UniversalAccessIcon size={26} />
      </DraggableFab>
    </>
  )
}
