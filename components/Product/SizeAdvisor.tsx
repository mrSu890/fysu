"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useLocale } from "next-intl"
import { advise, kindOf, BRANDS, EMPTY_ANSWERS, LETTER_SIZES, type Answers, type Fit } from "@/lib/sizeAdvisor"
import type { SizeGuide } from "@/lib/sizeGuide"
import { HelpPanel } from "@/components/HelpLink"

/* ====================================================================
   CONSEILLER DE TAILLE (fiche produit)
   Panneau en verre : quelques questions (taille habituelle, taille, poids, marque, coupe voulue),
   puis une taille conseillée avec un mot humain. Le calcul est dans lib/sizeAdvisor.ts.
   Les réponses restent sur l'appareil du client (pour ne pas les retaper).
   ==================================================================== */

const COPY: Record<string, {
  open: string
  title: string
  intro: string
  usual: string
  usualSub: string
  body: string
  height: string
  weight: string
  brand: string
  brandPh: string
  brandNote: string
  brandSize: string
  brandOther: string
  measureTop: string
  measureBottom: string
  optional: string
  fit: string
  fits: Record<Fit, string>
  go: string
  need: string
  yours: string
  between: string
  low: string
  good: string
  pick: string
  soldOut: string
  edit: string
  noGuide: string
  privacy: string
  help: string
  close: string
  cm: string
  kg: string
}> = {
  fr: {
    open: "Trouver ma taille",
    title: "Trouver ma taille",
    intro: "Réponds à deux ou trois questions, on te dit quelle taille choisir. Moins il y a de réponses, moins c'est précis : ce n'est pas grave.",
    usual: "Ta taille habituelle",
    usualSub: "Celle que tu prends le plus souvent dans les magasins",
    body: "Ton corps",
    height: "Taille",
    weight: "Poids",
    brand: "Une marque où une taille te va parfaitement ?",
    brandPh: "Le nom de la marque",
    brandNote: "Les marques taillent différemment : on s'en sert comme un repère, pas comme une règle.",
    brandSize: "Ta taille chez {b}",
    brandOther: "Autre",
    measureTop: "Ton tour de poitrine, si tu le connais",
    measureBottom: "Ton tour de taille, si tu le connais",
    optional: "facultatif",
    fit: "Comment tu aimes porter ce vêtement ?",
    fits: { slim: "Ajusté", regular: "Normal", loose: "Ample" },
    go: "Trouver ma taille",
    need: "Choisis au moins ta taille habituelle, ou ta taille et ton poids.",
    yours: "On te conseille",
    between: "Tu es entre deux tailles. Prends {a} si tu aimes ajusté, {b} si tu préfères plus ample.",
    low: "Avec plus d'infos (taille et poids, ou une mesure), on serait plus précis.",
    good: "C'est une estimation à partir des mesures du vêtement. Un doute ? On est là.",
    pick: "Choisir la taille {s}",
    soldOut: "La taille {s} est épuisée pour le moment. Tu peux être prévenu quand elle revient.",
    edit: "Modifier mes réponses",
    noGuide: "On n'a pas encore assez de mesures pour ce produit. Écris-nous, on te conseille à la main.",
    privacy: "Le calcul se fait sur ton appareil. Rien n'est envoyé.",
    help: "Besoin d'aide ?",
    close: "Fermer",
    cm: "cm",
    kg: "kg",
  },
  en: {
    open: "Find my size",
    title: "Find my size",
    intro: "Answer two or three questions and we'll tell you which size to pick. The fewer answers, the less precise: that's fine.",
    usual: "Your usual size",
    usualSub: "The one you most often take in shops",
    body: "Your body",
    height: "Height",
    weight: "Weight",
    brand: "A brand where one size fits you perfectly?",
    brandPh: "The brand name",
    brandNote: "Brands size differently: we use this as a reference, not a rule.",
    brandSize: "Your size at {b}",
    brandOther: "Other",
    measureTop: "Your chest measurement, if you know it",
    measureBottom: "Your waist measurement, if you know it",
    optional: "optional",
    fit: "How do you like to wear it?",
    fits: { slim: "Fitted", regular: "Regular", loose: "Loose" },
    go: "Find my size",
    need: "Pick at least your usual size, or your height and weight.",
    yours: "We suggest",
    between: "You're between two sizes. Take {a} if you like it fitted, {b} if you prefer it looser.",
    low: "With more info (height and weight, or a measurement) we'd be more precise.",
    good: "It's an estimate based on the garment's measurements. In doubt? We're here.",
    pick: "Choose size {s}",
    soldOut: "Size {s} is sold out for now. You can be notified when it's back.",
    edit: "Edit my answers",
    noGuide: "We don't have enough measurements for this product yet. Write to us and we'll advise you by hand.",
    privacy: "The calculation happens on your device. Nothing is sent.",
    help: "Need help?",
    close: "Close",
    cm: "cm",
    kg: "kg",
  },
}

const KEY = "fysu:sizeadvisor"

export default function SizeAdvisor({
  open,
  onClose,
  guide,
  sizes,
  onPick,
}: {
  open: boolean
  onClose: () => void
  guide: SizeGuide | null
  sizes: { size: string; stock: number }[]
  onPick: (size: string) => void
}) {
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en
  const [mounted, setMounted] = useState(false)
  const [a, setA] = useState<Answers>(EMPTY_ANSWERS)
  const [shown, setShown] = useState(false)
  const [warn, setWarn] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [other, setOther] = useState(false) // « Autre » : le client écrit lui-même la marque

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const saved = { ...EMPTY_ANSWERS, ...JSON.parse(raw) }
        setA(saved)
        if (saved.brand && !BRANDS.includes(saved.brand)) setOther(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setShown(false)
    setWarn(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null

  const kind = kindOf(guide)
  const set = (patch: Partial<Answers>) => setA((cur) => ({ ...cur, ...patch }))

  const run = () => {
    const r = advise(guide, a)
    if (!r.ok && r.reason === "no-answers") return setWarn(true)
    setWarn(false)
    setShown(true)
    try {
      localStorage.setItem(KEY, JSON.stringify(a))
    } catch {
      /* ignore */
    }
  }

  const result = shown ? advise(guide, a) : null
  const line = { borderColor: "color-mix(in srgb, currentColor 18%, transparent)" }
  const field =
    "w-full border-b bg-transparent py-2 text-[16px] outline-none placeholder:opacity-40"
  const chip = (on: boolean) =>
    "cursor-pointer rounded-full border px-4 py-2 text-[13px] transition " + (on ? "" : "hover:opacity-70")
  const chipStyle = (on: boolean): React.CSSProperties =>
    on
      ? { background: "var(--menu)", color: "var(--navbar-bg)", borderColor: "var(--menu)" }
      : { borderColor: "color-mix(in srgb, currentColor 30%, transparent)" }
  const label = "font-info mb-3 block text-[10px] font-light uppercase tracking-[0.3em] opacity-70"

  const pickable = (s: string) => sizes.find((x) => x.size.trim().toLowerCase() === s.trim().toLowerCase())

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "110%" }}
              animate={{ x: 0 }}
              exit={{ x: "110%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              role="dialog"
              aria-label={copy.title}
              className="liquid-glass fixed bottom-3 right-3 top-3 z-[310] flex w-[calc(100%-24px)] flex-col rounded-[30px] p-7 sm:w-[420px] sm:p-9"
              style={{ color: "var(--menu)", background: "color-mix(in srgb, var(--navbar-bg) 82%, transparent)" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-[0.3em]">{copy.title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.close}
                  data-no-tap
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                  style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {!kind ? (
                  <div>
                    <p className="text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em]">{copy.noGuide}</p>
                    <button
                      type="button"
                      onClick={() => setHelpOpen(true)}
                      className="font-info mt-6 cursor-pointer text-xs underline underline-offset-4"
                    >
                      {copy.help}
                    </button>
                  </div>
                ) : result && result.ok ? (
                  <div>
                    <p className="font-info text-[10px] font-light uppercase tracking-[0.3em] opacity-70">{copy.yours}</p>
                    <p className="mt-2 text-[72px] font-extrabold leading-none tracking-[-0.05em]">{result.best}</p>

                    {result.alt && (
                      <p className="mt-5 text-[15px] leading-[1.5]">
                        {(() => {
                          // la plus petite des deux = pour celui qui aime ajusté
                          const idx = (x: string) => (guide?.rows ?? []).findIndex((r) => r.size === x)
                          const [small, big] = idx(result.best) <= idx(result.alt!) ? [result.best, result.alt!] : [result.alt!, result.best]
                          return copy.between.replace("{a}", small).replace("{b}", big)
                        })()}
                      </p>
                    )}
                    <p className="font-info mt-5 text-[12px] font-light leading-[1.8] opacity-70">
                      {result.precision === "low" ? copy.low : copy.good}
                    </p>

                    {pickable(result.best) && pickable(result.best)!.stock > 0 ? (
                      <button
                        type="button"
                        data-no-tap
                        onClick={() => {
                          onPick(pickable(result.best)!.size)
                          onClose()
                        }}
                        className="mt-8 w-full cursor-pointer py-3 text-sm font-medium tracking-wide transition active:scale-[0.98]"
                        style={{ background: "var(--menu)", color: "var(--navbar-bg)" }}
                      >
                        {copy.pick.replace("{s}", result.best)}
                      </button>
                    ) : (
                      <p className="mt-8 text-[14px] leading-[1.6]">{copy.soldOut.replace("{s}", result.best)}</p>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShown(false)}
                        className="font-info cursor-pointer text-xs underline underline-offset-4"
                      >
                        {copy.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelpOpen(true)}
                        className="font-info cursor-pointer text-xs underline underline-offset-4"
                      >
                        {copy.help}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em]">{copy.intro}</p>

                    <div className="mt-8">
                      <span className={label}>{copy.usual}</span>
                      <div className="flex flex-wrap gap-2">
                        {LETTER_SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            data-no-tap
                            onClick={() => set({ usual: a.usual === s ? "" : s })}
                            className={chip(a.usual === s)}
                            style={chipStyle(a.usual === s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <p className="font-info mt-2 text-[11px] font-light opacity-60">{copy.usualSub}</p>
                    </div>

                    <div className="mt-8">
                      <span className={label}>{copy.body}</span>
                      <div className="grid grid-cols-2 gap-6">
                        <label className="block">
                          <span className="font-info text-[11px] font-light opacity-60">{copy.height} ({copy.cm})</span>
                          <input
                            inputMode="numeric"
                            value={a.height}
                            onChange={(e) => set({ height: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })}
                            placeholder="175"
                            className={field}
                            style={line}
                          />
                        </label>
                        <label className="block">
                          <span className="font-info text-[11px] font-light opacity-60">{copy.weight} ({copy.kg})</span>
                          <input
                            inputMode="numeric"
                            value={a.weight}
                            onChange={(e) => set({ weight: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })}
                            placeholder="70"
                            className={field}
                            style={line}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-8">
                      <span className={label}>
                        {copy.brand} <span className="normal-case tracking-normal opacity-70">({copy.optional})</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {BRANDS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            data-no-tap
                            onClick={() => {
                              setOther(false)
                              set(a.brand === b ? { brand: "", brandSize: "" } : { brand: b })
                            }}
                            className={chip(a.brand === b)}
                            style={chipStyle(a.brand === b)}
                          >
                            {b}
                          </button>
                        ))}
                        <button
                          type="button"
                          data-no-tap
                          onClick={() => {
                            setOther(!other)
                            if (!other) set({ brand: "" })
                            else set({ brand: "", brandSize: "" })
                          }}
                          className={chip(other)}
                          style={chipStyle(other)}
                        >
                          {copy.brandOther}
                        </button>
                      </div>

                      {other && (
                        <input
                          value={a.brand}
                          onChange={(e) => set({ brand: e.target.value.slice(0, 40) })}
                          placeholder={copy.brandPh}
                          className={field + " mt-4"}
                          style={line}
                        />
                      )}

                      {a.brand.trim() && (
                        <div className="mt-5">
                          <span className="font-info text-[11px] font-light opacity-60">
                            {copy.brandSize.replace("{b}", a.brand.trim())}
                          </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {LETTER_SIZES.map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                data-no-tap
                                onClick={() => set({ brandSize: a.brandSize === sz ? "" : sz })}
                                className={chip(a.brandSize === sz)}
                                style={chipStyle(a.brandSize === sz)}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="font-info mt-3 text-[11px] font-light opacity-60">{copy.brandNote}</p>
                    </div>

                    <div className="mt-8">
                      <label className="block">
                        <span className={label}>
                          {kind === "top" ? copy.measureTop : copy.measureBottom}{" "}
                          <span className="normal-case tracking-normal opacity-70">({copy.optional})</span>
                        </span>
                        <input
                          inputMode="numeric"
                          value={a.measure}
                          onChange={(e) => set({ measure: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) })}
                          placeholder={kind === "top" ? "96" : "82"}
                          className={field}
                          style={line}
                        />
                      </label>
                    </div>

                    <div className="mt-8">
                      <span className={label}>{copy.fit}</span>
                      <div className="flex flex-wrap gap-2">
                        {(["slim", "regular", "loose"] as Fit[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            data-no-tap
                            onClick={() => set({ fit: f })}
                            className={chip(a.fit === f)}
                            style={chipStyle(a.fit === f)}
                          >
                            {copy.fits[f]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {warn && <p className="mt-6 text-[14px] leading-[1.5]">{copy.need}</p>}

                    <button
                      type="button"
                      data-no-tap
                      onClick={run}
                      className="mt-8 w-full cursor-pointer py-3 text-sm font-medium tracking-wide transition active:scale-[0.98]"
                      style={{ background: "var(--menu)", color: "var(--navbar-bg)" }}
                    >
                      {copy.go}
                    </button>
                    <p className="font-info mt-4 text-center text-[11px] font-light opacity-60">{copy.privacy}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>,
    document.body
  )
}

export const sizeAdvisorLabel = (locale: string) => (COPY[locale] ?? COPY.en).open
