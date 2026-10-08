"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useLocale } from "next-intl"
import { advise, kindOf, BRANDS, EMPTY_ANSWERS, LETTER_SIZES, type Answers, type Fit, type Gender } from "@/lib/sizeAdvisor"
import type { SizeGuide } from "@/lib/sizeGuide"
import { HelpPanel } from "@/components/HelpLink"

/* ====================================================================
   CONSEILLER DE TAILLE : une conversation avec l'assistant FYSU
   Une petite fenêtre de discussion : l'assistant pose une question à la fois, le client répond en touchant
   un bouton ou en écrivant, puis l'assistant donne la taille conseillée. Ce n'est pas une IA : les questions
   sont écrites d'avance (les textes sont juste en dessous). Le calcul est dans lib/sizeAdvisor.ts et se fait
   sur l'appareil du client : rien n'est envoyé ni enregistré.
   ==================================================================== */

type Copy = {
  open: string
  title: string
  online: string
  hello: string[]
  askGender: string
  genders: Record<Gender, string>
  askUsual: string
  dontKnow: string
  askBrand: string
  skip: string
  other: string
  askBrandName: string
  brandNamePh: string
  askBrandSize: string
  askBody: string
  height: string
  weight: string
  send: string
  askMeasureTop: string
  askMeasureBottom: string
  measurePh: string
  askFit: string
  fits: Record<Fit, string>
  thinking: string
  best: string
  between: string
  low: string
  good: string
  pick: string
  soldOut: string
  restart: string
  help: string
  noInfo: string
  noGuide: string
  privacy: string
  close: string
  picked: string
}

const COPY: Record<string, Copy> = {
  fr: {
    open: "Trouver ma taille",
    title: "Assistant FYSU",
    online: "Je t'aide à trouver ta taille",
    hello: ["Salut ! Je vais t'aider à trouver ta taille.", "Quelques questions, ça prend 30 secondes. Tu peux passer celles que tu veux."],
    askGender: "D'abord, c'est pour qui ?",
    genders: { m: "Un homme", f: "Une femme", u: "Peu importe" },
    askUsual: "Quelle taille tu portes d'habitude ?",
    dontKnow: "Je ne sais pas",
    askBrand: "Il y a une marque où une taille te va parfaitement ?",
    skip: "Passer",
    other: "Autre",
    askBrandName: "Laquelle ?",
    brandNamePh: "Le nom de la marque",
    askBrandSize: "Et ta taille chez {b} ?",
    askBody: "Ta taille et ton poids ?",
    height: "cm",
    weight: "kg",
    send: "Envoyer",
    askMeasureTop: "Tu connais ton tour de poitrine ? Si oui, donne-le-moi en cm.",
    askMeasureBottom: "Tu connais ton tour de taille ? Si oui, donne-le-moi en cm.",
    measurePh: "cm",
    askFit: "Dernière question : tu veux le porter comment, par rapport à la coupe prévue ?",
    fits: { slim: "Plus ajusté", regular: "Comme prévu", loose: "Plus ample" },
    thinking: "",
    best: "Je te conseille la taille {s}.",
    between: "Tu es entre deux tailles : prends {a} pour plus ajusté, {b} pour plus ample.",
    low: "Avec ta taille et ton poids, ou une mesure, je serais plus précis.",
    good: "C'est une estimation à partir des mesures du vêtement. Un doute ? On est là.",
    pick: "Choisir la taille {s}",
    soldOut: "Petit souci : la taille {s} est épuisée pour le moment. Tu peux être prévenu quand elle revient.",
    restart: "Recommencer",
    help: "Besoin d'aide ?",
    noInfo: "Je n'ai pas assez d'informations pour te conseiller. On recommence ?",
    noGuide: "Je n'ai pas encore assez de mesures pour ce produit. Écris-nous, on te conseille à la main.",
    privacy: "Rien n'est envoyé ni enregistré : tout se passe sur ton appareil.",
    close: "Fermer",
    picked: "Parfait, c'est choisi.",
  },
  en: {
    open: "Find my size",
    title: "FYSU assistant",
    online: "I help you find your size",
    hello: ["Hi! I'll help you find your size.", "A few questions, about 30 seconds. Skip any you like."],
    askGender: "First, who is it for?",
    genders: { m: "A man", f: "A woman", u: "Doesn't matter" },
    askUsual: "What size do you usually wear?",
    dontKnow: "I don't know",
    askBrand: "Is there a brand where one size fits you perfectly?",
    skip: "Skip",
    other: "Other",
    askBrandName: "Which one?",
    brandNamePh: "The brand name",
    askBrandSize: "And your size at {b}?",
    askBody: "Your height and weight?",
    height: "cm",
    weight: "kg",
    send: "Send",
    askMeasureTop: "Do you know your chest measurement? If so, tell me in cm.",
    askMeasureBottom: "Do you know your waist measurement? If so, tell me in cm.",
    measurePh: "cm",
    askFit: "Last question: how do you want to wear it, compared to the intended cut?",
    fits: { slim: "More fitted", regular: "As designed", loose: "Looser" },
    thinking: "",
    best: "I'd go for size {s}.",
    between: "You're between two sizes: take {a} for more fitted, {b} for looser.",
    low: "With your height and weight, or a measurement, I'd be more precise.",
    good: "It's an estimate based on the garment's measurements. In doubt? We're here.",
    pick: "Choose size {s}",
    soldOut: "Small catch: size {s} is sold out for now. You can be notified when it's back.",
    restart: "Start over",
    help: "Need help?",
    noInfo: "I don't have enough information to advise you. Shall we start over?",
    noGuide: "I don't have enough measurements for this product yet. Write to us and we'll advise you by hand.",
    privacy: "Nothing is sent or saved: everything happens on your device.",
    close: "Close",
    picked: "Perfect, it's selected.",
  },
}

export const sizeAdvisorLabel = (locale: string) => (COPY[locale] ?? COPY.en).open

type Msg = { id: number; from: "bot" | "me"; text: string; big?: boolean }
type Step = "wait" | "gender" | "usual" | "brand" | "brandText" | "brandSize" | "body" | "measure" | "fit" | "result"

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
  const kind = kindOf(guide)

  const [mounted, setMounted] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState<Step>("wait")
  const [helpOpen, setHelpOpen] = useState(false)
  const [text, setText] = useState("")
  const [h, setH] = useState("")
  const [w, setW] = useState("")
  const [best, setBest] = useState<string | null>(null)

  const ans = useRef<Answers>({ ...EMPTY_ANSWERS })
  const run = useRef(0) // change à chaque nouvelle conversation : les anciennes réponses de l'assistant s'arrêtent
  const idRef = useRef(0)
  const timers = useRef<number[]>([])
  const scroller = useRef<HTMLDivElement | null>(null)

  useEffect(() => setMounted(true), [])

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms))
    })

  const push = (m: Omit<Msg, "id">) => setMsgs((cur) => [...cur, { ...m, id: ++idRef.current }])

  // l'assistant « écrit » (trois petits points) puis envoie son message
  const bot = useCallback(async (lines: string[] | string, big = false) => {
    const mine = run.current
    for (const line of Array.isArray(lines) ? lines : [lines]) {
      setTyping(true)
      await wait(450 + Math.min(line.length * 12, 700))
      if (mine !== run.current) return false
      setTyping(false)
      push({ from: "bot", text: line, big })
      await wait(180)
      if (mine !== run.current) return false
    }
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(async () => {
    run.current += 1
    const mine = run.current
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    ans.current = { ...EMPTY_ANSWERS }
    setMsgs([])
    setTyping(false)
    setStep("wait")
    setText("")
    setH("")
    setW("")
    setBest(null)
    if (!kind) {
      if (await bot(copy.noGuide)) setStep("result")
      return
    }
    if (!(await bot(copy.hello))) return
    if (!(await bot(copy.askGender))) return
    if (mine === run.current) setStep("gender")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, locale])

  useEffect(() => {
    if (!open) {
      run.current += 1
      timers.current.forEach((t) => window.clearTimeout(t))
      timers.current = []
      return
    }
    void start()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // la conversation reste calée en bas
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [msgs, typing, step])

  /* ---------- les réponses du client ---------- */

  const me = (t: string) => push({ from: "me", text: t })
  const go = async (next: Step, lines: string[] | string) => {
    setStep("wait")
    const mine = run.current
    if (await bot(lines)) if (mine === run.current) setStep(next)
  }

  const askBody = () => go("body", copy.askBody)
  const askMeasure = () => go("measure", kind === "bottom" ? copy.askMeasureBottom : copy.askMeasureTop)

  const onGender = (g: Gender) => {
    me(copy.genders[g])
    ans.current.gender = g
    void go("usual", copy.askUsual)
  }

  const onUsual = (v: string | null) => {
    me(v ?? copy.dontKnow)
    ans.current.usual = v ?? ""
    void go("brand", copy.askBrand)
  }

  const onBrand = (b: string | "other" | null) => {
    if (b === null) {
      me(copy.skip)
      void askBody()
    } else if (b === "other") {
      me(copy.other)
      void go("brandText", copy.askBrandName)
    } else {
      me(b)
      ans.current.brand = b
      void go("brandSize", copy.askBrandSize.replace("{b}", b))
    }
  }

  const onBrandText = () => {
    const t = text.trim()
    if (!t) return
    me(t)
    ans.current.brand = t.slice(0, 40)
    setText("")
    void go("brandSize", copy.askBrandSize.replace("{b}", t.slice(0, 40)))
  }

  const onBrandSize = (v: string | null) => {
    me(v ?? copy.dontKnow)
    ans.current.brandSize = v ?? ""
    void askBody()
  }

  const onBody = (skip: boolean) => {
    if (skip || (!h.trim() && !w.trim())) {
      me(copy.skip)
    } else {
      me([h.trim() && `${h.trim()} cm`, w.trim() && `${w.trim()} kg`].filter(Boolean).join(" · "))
      ans.current.height = h
      ans.current.weight = w
    }
    void askMeasure()
  }

  const onMeasure = (skip: boolean) => {
    if (skip || !text.trim()) {
      me(copy.dontKnow)
    } else {
      me(`${text.trim()} cm`)
      ans.current.measure = text
    }
    setText("")
    void go("fit", copy.askFit)
  }

  const pickable = (s: string) => sizes.find((x) => x.size.trim().toLowerCase() === s.trim().toLowerCase())

  const onFit = async (f: Fit) => {
    me(copy.fits[f])
    ans.current.fit = f
    setStep("wait")
    const mine = run.current
    const r = advise(guide, ans.current)
    if (!r.ok) {
      if (await bot(r.reason === "no-guide" ? copy.noGuide : copy.noInfo)) if (mine === run.current) setStep("result")
      return
    }
    if (!(await bot(copy.best.replace("{s}", r.best)))) return
    // gros affichage de la taille
    push({ from: "bot", text: r.best, big: true })
    if (r.alt) {
      const idx = (x: string) => (guide?.rows ?? []).findIndex((row) => row.size === x)
      const [small, large] = idx(r.best) <= idx(r.alt) ? [r.best, r.alt] : [r.alt, r.best]
      if (!(await bot(copy.between.replace("{a}", small).replace("{b}", large)))) return
    }
    if (!(await bot(r.precision === "low" ? copy.low : copy.good))) return
    const hit = pickable(r.best)
    if (!hit || hit.stock <= 0) {
      if (!(await bot(copy.soldOut.replace("{s}", r.best)))) return
      setBest(null)
    } else {
      setBest(hit.size)
    }
    if (mine === run.current) setStep("result")
  }

  /* ---------- l'affichage ---------- */

  if (!mounted) return null

  const line = { borderColor: "color-mix(in srgb, currentColor 22%, transparent)" }
  const chip =
    "cursor-pointer rounded-full border px-4 py-2 text-[13px] transition hover:opacity-70 active:scale-95"
  const chipStyle: React.CSSProperties = { borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }
  const solid: React.CSSProperties = { background: "var(--menu)", color: "var(--navbar-bg)", borderColor: "var(--menu)" }
  const field = "min-w-0 flex-1 border-b bg-transparent py-2 text-[16px] outline-none placeholder:opacity-40"
  const sendBtn =
    "shrink-0 cursor-pointer rounded-full px-5 py-2 text-[12px] font-medium transition active:scale-95 disabled:opacity-40"
  const numeric = (v: string) => v.replace(/[^\d.,]/g, "").slice(0, 5)

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
              className="fixed inset-0 z-[300] bg-black/25 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              role="dialog"
              aria-label={copy.title}
              className="liquid-glass fixed inset-x-3 bottom-3 z-[310] flex h-[min(82dvh,640px)] flex-col overflow-hidden rounded-[30px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[400px]"
              style={{ color: "var(--menu)", background: "color-mix(in srgb, var(--navbar-bg) 86%, transparent)", transformOrigin: "100% 100%" }}
            >
              {/* en-tête */}
              <div className="flex items-center gap-3 border-b px-5 py-4" style={line}>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold tracking-[-0.04em]"
                  style={solid}
                >
                  F
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-tight">{copy.title}</p>
                  <p className="font-info mt-0.5 text-[11px] font-light opacity-60">{copy.online}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.close}
                  data-no-tap
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full"
                  style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* la conversation */}
              <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                {msgs.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[84%] px-4 py-2.5 leading-[1.45] ${
                        m.from === "me" ? "rounded-[20px] rounded-br-md" : "rounded-[20px] rounded-bl-md"
                      } ${m.big ? "text-[44px] font-extrabold leading-none tracking-[-0.05em] py-3" : "text-[15px]"}`}
                      style={
                        m.from === "me"
                          ? { background: "var(--menu)", color: "var(--navbar-bg)" }
                          : { background: "color-mix(in srgb, currentColor 11%, transparent)" }
                      }
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}

                {typing && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md px-4 py-3.5"
                      style={{ background: "color-mix(in srgb, currentColor 11%, transparent)" }}
                      aria-label="…"
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="block h-1.5 w-1.5 rounded-full bg-current"
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* la zone de réponse change à chaque question */}
              <div className="border-t px-5 pb-4 pt-4" style={line}>
                {step === "gender" && (
                  <div className="flex flex-wrap gap-2">
                    {(["m", "f", "u"] as Gender[]).map((g) => (
                      <button key={g} type="button" data-no-tap onClick={() => onGender(g)} className={chip} style={chipStyle}>
                        {copy.genders[g]}
                      </button>
                    ))}
                  </div>
                )}

                {step === "usual" && (
                  <div className="flex flex-wrap gap-2">
                    {LETTER_SIZES.map((s) => (
                      <button key={s} type="button" data-no-tap onClick={() => onUsual(s)} className={chip} style={chipStyle}>
                        {s}
                      </button>
                    ))}
                    <button type="button" data-no-tap onClick={() => onUsual(null)} className={chip} style={chipStyle}>
                      {copy.dontKnow}
                    </button>
                  </div>
                )}

                {step === "brand" && (
                  <div className="flex max-h-[132px] flex-wrap gap-2 overflow-y-auto">
                    {BRANDS.map((b) => (
                      <button key={b} type="button" data-no-tap onClick={() => onBrand(b)} className={chip} style={chipStyle}>
                        {b}
                      </button>
                    ))}
                    <button type="button" data-no-tap onClick={() => onBrand("other")} className={chip} style={chipStyle}>
                      {copy.other}
                    </button>
                    <button type="button" data-no-tap onClick={() => onBrand(null)} className={chip} style={chipStyle}>
                      {copy.skip}
                    </button>
                  </div>
                )}

                {step === "brandText" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onBrandText()
                    }}
                    className="flex items-end gap-3"
                  >
                    <input
                      autoFocus
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 40))}
                      placeholder={copy.brandNamePh}
                      className={field}
                      style={line}
                    />
                    <button type="submit" disabled={!text.trim()} className={sendBtn} style={solid}>
                      {copy.send}
                    </button>
                  </form>
                )}

                {step === "brandSize" && (
                  <div className="flex flex-wrap gap-2">
                    {LETTER_SIZES.map((s) => (
                      <button key={s} type="button" data-no-tap onClick={() => onBrandSize(s)} className={chip} style={chipStyle}>
                        {s}
                      </button>
                    ))}
                    <button type="button" data-no-tap onClick={() => onBrandSize(null)} className={chip} style={chipStyle}>
                      {copy.dontKnow}
                    </button>
                  </div>
                )}

                {step === "body" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onBody(false)
                    }}
                    className="flex items-end gap-3"
                  >
                    <input
                      inputMode="numeric"
                      value={h}
                      onChange={(e) => setH(numeric(e.target.value))}
                      placeholder={`175 ${copy.height}`}
                      aria-label={copy.height}
                      className={field}
                      style={line}
                    />
                    <input
                      inputMode="numeric"
                      value={w}
                      onChange={(e) => setW(numeric(e.target.value))}
                      placeholder={`70 ${copy.weight}`}
                      aria-label={copy.weight}
                      className={field}
                      style={line}
                    />
                    <button type="submit" className={sendBtn} style={solid}>
                      {copy.send}
                    </button>
                    <button
                      type="button"
                      data-no-tap
                      onClick={() => onBody(true)}
                      className="font-info shrink-0 cursor-pointer py-2 text-[12px] underline underline-offset-4 opacity-70"
                    >
                      {copy.skip}
                    </button>
                  </form>
                )}

                {step === "measure" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onMeasure(false)
                    }}
                    className="flex items-end gap-3"
                  >
                    <input
                      inputMode="numeric"
                      value={text}
                      onChange={(e) => setText(numeric(e.target.value))}
                      placeholder={kind === "bottom" ? "82 cm" : "96 cm"}
                      aria-label={copy.measurePh}
                      className={field}
                      style={line}
                    />
                    <button type="submit" disabled={!text.trim()} className={sendBtn} style={solid}>
                      {copy.send}
                    </button>
                    <button
                      type="button"
                      data-no-tap
                      onClick={() => onMeasure(true)}
                      className="font-info shrink-0 cursor-pointer py-2 text-[12px] underline underline-offset-4 opacity-70"
                    >
                      {copy.dontKnow}
                    </button>
                  </form>
                )}

                {step === "fit" && (
                  <div className="flex flex-wrap gap-2">
                    {(["slim", "regular", "loose"] as Fit[]).map((f) => (
                      <button key={f} type="button" data-no-tap onClick={() => void onFit(f)} className={chip} style={chipStyle}>
                        {copy.fits[f]}
                      </button>
                    ))}
                  </div>
                )}

                {step === "result" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {best && (
                      <button
                        type="button"
                        data-no-tap
                        onClick={() => {
                          onPick(best)
                          onClose()
                        }}
                        className="cursor-pointer rounded-full px-5 py-2.5 text-[13px] font-medium transition active:scale-95"
                        style={solid}
                      >
                        {copy.pick.replace("{s}", best)}
                      </button>
                    )}
                    <button type="button" data-no-tap onClick={() => void start()} className={chip} style={chipStyle}>
                      {copy.restart}
                    </button>
                    <button type="button" data-no-tap onClick={() => setHelpOpen(true)} className={chip} style={chipStyle}>
                      {copy.help}
                    </button>
                  </div>
                )}

                {step === "wait" && <div className="h-[38px]" aria-hidden="true" />}

                <p className="font-info mt-3 text-center text-[10px] font-light opacity-50">{copy.privacy}</p>
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
