"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { animate, motion, useMotionValue } from "framer-motion"
import { Download, Printer } from "lucide-react"
import { COPY, barcodeBars, dateText, money, type ReceiptData, type ReceiptLang } from "@/lib/receipt"
import { downloadReceiptPdf } from "@/lib/receiptPdf"

/* ====================================================================
   REÇU QUI S'IMPRIME
   Une petite imprimante (noire en mode clair, gris clair en mode sombre) fait sortir le reçu
   par saccades. À la fin : tampon « PAID », puis boutons « Télécharger en PDF » et « Continuer ».
   Réglages : DURATION (secondes d'impression), STEPS (nombre de saccades), couleurs ci-dessous.
   Pas d'animation si « Moins d'animations » est activé ou si ce reçu a déjà été imprimé sur cet appareil.
   ==================================================================== */

const PAPER = "#f9f7f1"
const INK = "#1a1a1a"
const SOFT = "rgba(26,26,26,0.5)"
const LINE = "rgba(26,26,26,0.3)"
const GREEN = "#154733" // le vert du pied de page
const DURATION = 5.5
const STEPS = 14

// le papier avance par à-coups : un petit mouvement, une pause, et ainsi de suite
const stepEase = (t: number) => {
  const k = Math.min(STEPS - 1, Math.floor(t * STEPS))
  const f = t * STEPS - k
  const s = Math.min(1, f * 2.4)
  return (k + s * s * (3 - 2 * s)) / STEPS
}

function Row({ label, value, soft }: { label: string; value: string; soft?: boolean }) {
  return (
    <div className="font-info flex justify-between gap-3 text-[10.5px] leading-[2]">
      <span className="uppercase" style={{ color: SOFT, letterSpacing: "0.12em" }}>
        {label}
      </span>
      <span className="text-right" style={{ color: soft ? SOFT : INK }}>
        {value}
      </span>
    </div>
  )
}

export default function ReceiptPrinter({
  receipt,
  lang,
  locale,
  continueLabel,
}: {
  receipt: ReceiptData
  lang: ReceiptLang
  locale: string
  continueLabel: string
}) {
  const c = COPY[lang]
  const y = useMotionValue(-10000)
  const paperRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const [h, setH] = useState(0)
  const [printing, setPrinting] = useState(false)
  const [done, setDone] = useState(false)

  // hauteur du reçu
  useLayoutEffect(() => {
    const el = paperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    setH(el.offsetHeight)
    return () => ro.disconnect()
  }, [])

  // lancement de l'impression
  useEffect(() => {
    if (h === 0 || started.current) return
    started.current = true
    const key = `fysu-receipt-${receipt.number}`
    let skip = false
    try {
      const html = document.documentElement
      skip =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        html.classList.contains("a11y-calm") ||
        html.classList.contains("a11y-focus") ||
        localStorage.getItem(key) === "1"
    } catch {
      /* on imprime quand même */
    }
    if (skip) {
      y.set(0)
      setDone(true)
      return
    }
    y.set(-h - 16)
    setPrinting(true)
    animate(y, 0, {
      duration: DURATION,
      delay: 0.5,
      ease: stepEase,
      onComplete: () => {
        setPrinting(false)
        setDone(true)
        try {
          localStorage.setItem(key, "1")
        } catch {
          /* ignore */
        }
      },
    })
  }, [h, receipt.number, y])

  const cur = receipt.currency
  const bars = barcodeBars(receipt.number)
  const barTotal = bars.reduce((s, b) => s + b, 0)
  let bx = 0

  return (
    <div className="w-full max-w-[380px]">
      {/* la machine */}
      <motion.div
        animate={printing ? { x: [0, 0.7, -0.7, 0] } : { x: 0 }}
        transition={printing ? { repeat: Infinity, duration: 0.14 } : { duration: 0.2 }}
        className="relative z-10 mx-auto h-[58px] w-full rounded-[20px] bg-gradient-to-b from-[#3c3c3c] via-[#1b1b1b] to-[#0a0a0a] shadow-[0_14px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] dark:from-[#f4f4f4] dark:via-[#d6d6d6] dark:to-[#aeaeae] dark:shadow-[0_14px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]"
      >
        <span className="font-info absolute left-5 top-3 text-[9px] tracking-[0.4em] text-white/45 dark:text-black/45">
          FYSU
        </span>
        <motion.span
          className="absolute right-5 top-[13px] h-[6px] w-[6px] rounded-full"
          style={{ background: "#4EAC6C", boxShadow: "0 0 8px #4EAC6C" }}
          animate={printing ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={printing ? { repeat: Infinity, duration: 0.5 } : { duration: 0.2 }}
        />
        <span className="absolute inset-x-4 bottom-[7px] h-[8px] rounded-full bg-black shadow-[inset_0_2px_3px_rgba(0,0,0,0.9)] dark:bg-[#3a3a3a]" />
      </motion.div>

      {/* le reçu, qui sort de la fente */}
      <div
        className="relative mx-auto -mt-[6px] w-[88%] overflow-hidden"
        style={{ height: h || undefined, filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.22))" }}
      >
        <motion.div ref={paperRef} style={{ y, color: INK }}>
          <div className="px-5 pb-3 pt-9" style={{ background: PAPER }}>
            {/* en-tête */}
            <div className="text-center">
              <div className="text-[26px] font-bold" style={{ letterSpacing: "0.5em", paddingLeft: "0.5em" }}>
                FYSU
              </div>
              <div
                className="font-info mt-1 text-[9px] uppercase"
                style={{ letterSpacing: "0.3em", paddingLeft: "0.3em", color: SOFT }}
              >
                {c.title}
              </div>
            </div>

            <div className="my-4" style={{ borderTop: `1px dashed ${LINE}` }} />

            <Row label={c.receipt} value={receipt.number} />
            <Row label={c.date} value={dateText(receipt.created, locale)} />
            {receipt.name && <Row label={c.customer} value={receipt.name.toUpperCase().slice(0, 24)} />}

            <div className="my-4" style={{ borderTop: `1px dashed ${LINE}` }} />

            {/* articles */}
            {receipt.lines.map((l, i) => (
              <div key={i} className="font-info mb-2.5 flex justify-between gap-3 text-[11.5px] leading-[1.5]">
                <span className="min-w-0 break-words font-medium">
                  {l.d}
                  {l.q > 1 ? ` × ${l.q}` : ""}
                </span>
                <span className="shrink-0">{money(l.a, cur)}</span>
              </div>
            ))}
            {receipt.shipping !== null ? (
              <Row label={c.shipping} value={receipt.shipping > 0 ? money(receipt.shipping, cur) : c.free} soft />
            ) : receipt.other > 0 ? (
              <Row label={c.other} value={money(receipt.other, cur)} soft />
            ) : null}
            {receipt.discount > 0 && <Row label={c.discount} value={`-${money(receipt.discount, cur)}`} soft />}
            {receipt.tax > 0 && <Row label={c.vat} value={money(receipt.tax, cur)} soft />}

            <div className="mt-3" style={{ borderTop: `1px solid ${INK}` }} />

            {/* total + tampon */}
            <div className="relative flex items-baseline justify-between pb-1 pt-5">
              <span className="font-info text-[15px] font-medium uppercase">{c.total}</span>
              <span className="font-info text-[21px] font-medium">{money(receipt.total, cur)}</span>
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2"
                style={{ x: "-50%", y: "-46%", mixBlendMode: "multiply" }}
                initial={{ scale: 1.9, opacity: 0, rotate: -30 }}
                animate={done ? { scale: 1, opacity: 0.88, rotate: -12 } : { scale: 1.9, opacity: 0, rotate: -30 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
              >
                <svg viewBox="0 0 100 100" width="92" height="92">
                  <defs>
                    <path id="fysu-stamp-arc" d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0" />
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="none" stroke={GREEN} strokeWidth="2" />
                  <circle cx="50" cy="50" r="28" fill="none" stroke={GREEN} strokeWidth="1" />
                  <text fontSize="7" fill={GREEN} fontFamily="ui-monospace, Menlo, monospace">
                    <textPath href="#fysu-stamp-arc" textLength="214" lengthAdjust="spacing">
                      {c.stampTop}
                    </textPath>
                  </text>
                  <text
                    x="50"
                    y="57"
                    textAnchor="middle"
                    fontSize="19"
                    fontWeight="700"
                    fill={GREEN}
                    fontFamily="ui-monospace, Menlo, monospace"
                  >
                    {c.paid.toUpperCase()}
                  </text>
                </svg>
              </motion.div>
            </div>

            <div className="font-info flex justify-between gap-3 pb-4 text-[9px] uppercase" style={{ color: SOFT, letterSpacing: "0.1em" }}>
              <span>{receipt.method ? `${c.paidBy} ${receipt.method}` : c.paid}</span>
              <span>{c.approved}</span>
            </div>

            <div className="mb-4" style={{ borderTop: `1px dashed ${LINE}` }} />

            {/* code-barres décoratif */}
            <svg viewBox={`0 0 ${barTotal} 36`} preserveAspectRatio="none" className="h-[38px] w-full" aria-hidden="true">
              {bars.map((b, i) => {
                const x = bx
                bx += b
                return i % 2 === 0 ? <rect key={i} x={x} y={0} width={b} height={36} fill={INK} /> : null
              })}
            </svg>
            <div className="font-info mt-2 text-center text-[9px]" style={{ letterSpacing: "0.25em", color: SOFT }}>
              {receipt.number}
            </div>

            <div
              className="mt-4 pb-3 text-center text-[15px]"
              style={{ fontStyle: "italic", fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {c.thanks}
            </div>
          </div>

          {/* bord dentelé */}
          <div
            aria-hidden="true"
            style={{
              height: 10,
              backgroundImage: `linear-gradient(135deg, ${PAPER} 50%, transparent 50%), linear-gradient(225deg, ${PAPER} 50%, transparent 50%)`,
              backgroundSize: "14px 10px",
              backgroundRepeat: "repeat-x",
            }}
          />
        </motion.div>
      </div>

      {/* état + boutons */}
      <div className="mt-8 flex min-h-[150px] flex-col items-center gap-5 text-center" aria-live="polite">
        <div className="font-info flex items-center gap-2 text-[11px] opacity-60">
          <Printer size={14} strokeWidth={1.5} />
          {done ? c.ready : c.printing}
        </div>

        {done && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-5"
          >
            <button
              type="button"
              onClick={() => downloadReceiptPdf(receipt, lang, locale)}
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-full px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] transition active:scale-[0.98]"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              <Download size={15} strokeWidth={1.6} />
              {c.download}
            </button>
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 opacity-70 transition hover:opacity-100"
            >
              {continueLabel}
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
