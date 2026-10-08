"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, X } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { BUSINESS } from "@/lib/business"

/* ====================================================================
   « BESOIN D'AIDE ? »
   Petit lien à poser partout où quelqu'un peut se sentir bloqué (fiche produit, panier, paiement, pied de page…).
   Il ouvre un panneau en verre : un mot humain, un e-mail, Instagram, et deux réponses rapides
   (livraison, retours). L'adresse et Instagram viennent de lib/business.ts.
   ==================================================================== */

const COPY: Record<string, {
  open: string
  title: string
  intro: string
  mail: string
  mailSub: string
  insta: string
  instaSub: string
  quick: string
  shipping: string
  returns: string
  subject: string
  body: string
  close: string
}> = {
  fr: {
    open: "Besoin d'aide ?",
    title: "Besoin d'aide ?",
    intro: "Une question sur une taille, une commande, un colis ? Écris-nous : une vraie personne te répond.",
    mail: "Écrire un e-mail",
    mailSub: "Le plus simple pour une commande ou un problème",
    insta: "Nous écrire sur Instagram",
    instaSub: "Un message privé, quand tu préfères",
    quick: "Réponses rapides",
    shipping: "Livraison",
    returns: "Retours et remboursement",
    subject: "Besoin d'aide",
    body: "Bonjour,\n\n\n\n(Page : {url})",
    close: "Fermer",
  },
  en: {
    open: "Need help?",
    title: "Need help?",
    intro: "A question about a size, an order, a parcel? Write to us: a real person answers.",
    mail: "Send an e-mail",
    mailSub: "The easiest way for an order or a problem",
    insta: "Message us on Instagram",
    instaSub: "A private message, if you prefer",
    quick: "Quick answers",
    shipping: "Shipping",
    returns: "Returns and refunds",
    subject: "Need help",
    body: "Hello,\n\n\n\n(Page: {url})",
    close: "Close",
  },
}

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted) return null

  const url = typeof window !== "undefined" ? window.location.href : ""
  const mailto = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(copy.subject)}&body=${encodeURIComponent(copy.body.replace("{url}", url))}`
  const line = { borderColor: "color-mix(in srgb, currentColor 18%, transparent)" }
  const row =
    "group flex items-center justify-between gap-4 border-t py-5 text-left transition-opacity hover:opacity-70"

  return createPortal(
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
            style={{ color: "var(--menu)", background: "color-mix(in srgb, var(--navbar-bg) 80%, transparent)" }}
          >
            <div className="mb-6 flex items-center justify-between">
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

            <div className="flex-1 overflow-y-auto">
              <p className="text-[22px] font-extrabold leading-[1.1] tracking-[-0.03em]">{copy.intro}</p>

              <div className="mt-8">
                <a href={mailto} className={row} style={line}>
                  <span>
                    <span className="block text-[15px]">{copy.mail}</span>
                    <span className="font-info mt-1 block text-[11px] font-light opacity-60">{copy.mailSub}</span>
                  </span>
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </a>
                {BUSINESS.instagram && (
                  <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className={row} style={line}>
                    <span>
                      <span className="block text-[15px]">{copy.insta}</span>
                      <span className="font-info mt-1 block text-[11px] font-light opacity-60">{copy.instaSub}</span>
                    </span>
                    <ArrowUpRight size={18} strokeWidth={1.5} />
                  </a>
                )}
              </div>

              <p className="font-info mt-8 text-[10px] font-light uppercase tracking-[0.3em] opacity-60">{copy.quick}</p>
              <div className="mt-2">
                <Link href="/legal/shipping" className={row} style={line} onClick={onClose}>
                  <span className="text-[15px]">{copy.shipping}</span>
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </Link>
                <Link href="/legal/returns" className={row + " border-b"} style={line} onClick={onClose}>
                  <span className="text-[15px]">{copy.returns}</span>
                  <ArrowUpRight size={18} strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default function HelpLink({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-no-tap
        className={
          className ||
          "font-info cursor-pointer text-xs font-light text-foreground/60 underline underline-offset-4 hover:text-foreground"
        }
        style={style}
      >
        {copy.open}
      </button>
      <HelpPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
