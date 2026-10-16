"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { animate, motion, useMotionValue } from "framer-motion"
import { Download, Printer } from "lucide-react"
import { COPY, dateText, money, type ReceiptData, type ReceiptLang } from "@/lib/receipt"
import { downloadReceiptPdf } from "@/lib/receiptPdf"

/* ====================================================================
   REÇU QUI S'IMPRIME
   Une carte sombre (résumé de la commande + fente) fait sortir un reçu blanc, épuré, par saccades.
   À la fin : boutons « Télécharger en PDF » et « Continuer ».
   Réglages : DURATION (secondes d'impression), STEPS (nombre de saccades), couleurs ci-dessous.
   Pas d'animation si « Moins d'animations » est activé ou si ce reçu a déjà été imprimé sur cet appareil.
   ==================================================================== */

const PAPER = "#ffffff"
const INK = "#1a1a1a"
const SOFT = "rgba(26,26,26,0.5)"
const LINE = "rgba(26,26,26,0.3)"
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
  const [copied, setCopied] = useState(false)

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
  const subtotal = receipt.lines.reduce((s, l) => s + l.a, 0)

  return (
    <div className="w-full max-w-[380px]">
      {/* la machine : carte sombre avec le résumé de la commande, et la fente d'où sort le reçu */}
      <motion.div
        animate={printing ? { x: [0, 0.6, -0.6, 0] } : { x: 0 }}
        transition={printing ? { repeat: Infinity, duration: 0.14 } : { duration: 0.2 }}
        className="relative z-10 mx-auto w-full rounded-[28px] p-3"
        style={{ background: "#2b2b2b", boxShadow: "0 18px 40px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <div className="rounded-[20px] px-5 py-4" style={{ background: "#232323", color: "#f4f4f2" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[17px] font-medium leading-tight">
                {receipt.lines[0]?.d ?? c.title}
              </p>
              <p className="font-info mt-1 text-[12px] font-light" style={{ color: "rgba(244,244,242,0.55)" }}>
                {receipt.lines.length > 1 ? `+ ${receipt.lines.length - 1} ${c.articles}` : c.title}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-info text-[11px] font-light" style={{ color: "rgba(244,244,242,0.55)" }}>
                {c.total}
              </p>
              <p className="text-[24px] font-medium leading-tight tracking-tight">{money(receipt.total, cur)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2.5 text-[14px]">
            <motion.span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
              style={{ background: "#4EAC6C" }}
              animate={printing ? { opacity: [1, 0.45, 1] } : { opacity: 1 }}
              transition={printing ? { repeat: Infinity, duration: 0.6 } : { duration: 0.2 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6.3l2.3 2.3 4.7-4.9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.span>
            {c.confirmed}
          </div>
        </div>
        {/* la fente */}
        <div className="mx-auto mt-3 h-[10px] w-[calc(100%-24px)] rounded-full" style={{ background: "#141414", boxShadow: "inset 0 2px 3px rgba(0,0,0,0.9)" }} />
      </motion.div>

      {/* le reçu, qui sort de la fente */}
      <div
        className="relative z-20 mx-auto -mt-[17px] w-[84%] overflow-hidden"
        style={{ height: h || undefined, filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.18))" }}
      >
        <motion.div ref={paperRef} style={{ y, color: INK }}>
          <div className="px-6 pb-7 pt-9" style={{ background: PAPER }}>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/fysu-dark.png" alt="FYSU" className="mx-auto block h-[26px] w-auto" draggable={false} />
            </div>

            <div className="my-6" style={{ borderTop: `1px dashed ${LINE}` }} />

            {/* articles */}
            {receipt.lines.map((l, i) => (
              <div key={i} className="font-info mb-3 flex justify-between gap-3 text-[12px] font-semibold uppercase leading-[1.5]">
                <span className="min-w-0 break-words">
                  {l.d}
                  {l.q > 1 ? ` × ${l.q}` : ""}
                </span>
                <span className="shrink-0">{money(l.a, cur)}</span>
              </div>
            ))}

            <div className="my-5" style={{ borderTop: `1px dashed ${LINE}` }} />

            <Row label={c.subtotal} value={money(subtotal, cur)} />
            {receipt.shipping !== null ? (
              <Row label={c.shipping} value={receipt.shipping > 0 ? money(receipt.shipping, cur) : c.free} />
            ) : receipt.other > 0 ? (
              <Row label={c.other} value={money(receipt.other, cur)} />
            ) : null}
            {receipt.discount > 0 && <Row label={c.discount} value={`-${money(receipt.discount, cur)}`} />}
            {receipt.tax > 0 && <Row label={c.vat} value={money(receipt.tax, cur)} />}

            <div className="font-info mt-4 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold uppercase" style={{ letterSpacing: "0.04em" }}>
                {c.totalPaid}
              </span>
              <span className="text-[22px] font-semibold">{money(receipt.total, cur)}</span>
            </div>

            <div className="my-5" style={{ borderTop: `1px dashed ${LINE}` }} />

            <div className="font-info flex justify-between gap-3 text-[10.5px] leading-[2]">
              <span className="uppercase" style={{ color: SOFT, letterSpacing: "0.12em" }}>
                {c.orderNo}
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(receipt.number)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1600)
                  } catch {
                    /* ignore */
                  }
                }}
                className="cursor-pointer text-right underline decoration-dotted underline-offset-4"
                style={{ color: INK }}
                aria-label={lang === "fr" ? "Copier le numéro de commande" : "Copy order number"}
              >
                {copied ? (lang === "fr" ? "Copié" : "Copied") : receipt.number}
              </button>
            </div>
            {receipt.method && <Row label={c.paidWith} value={receipt.method} />}
            <Row label={c.date} value={dateText(receipt.created, locale)} />
          </div>
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
