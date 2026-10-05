"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { useLocale } from "next-intl"
import { BlockMedia, type InfoBlock } from "@/components/Product/ProductInfoBlocks"

/* ====================================================================
   PACKAGING
   Panneau en verre qui sort de la droite (comme les filtres) : photo du packaging
   et petites lignes qui expliquent ce que le client va recevoir.
   Le contenu vient du bloc d'information dont le titre contient « packaging »
   (admin > produit > Infos) : l'image, le titre, le sous-titre et le texte.
   Chaque ligne ou chaque phrase du texte devient une petite ligne du panneau.
   ==================================================================== */

const COPY: Record<string, { open: string; title: string }> = {
  fr: { open: "Voir le packaging", title: "Packaging" },
  en: { open: "See packaging", title: "Packaging" },
}

export const packagingLabel = (locale: string) => (COPY[locale] ?? COPY.en).open

function toLines(text: string | null): string[] {
  const clean = (text ?? "").replace(/\\n/g, "\n").trim()
  if (!clean) return []
  const byLine = clean.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (byLine.length > 1) return byLine
  return clean.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
}

export default function PackagingDrawer({
  open,
  onClose,
  block,
}: {
  open: boolean
  onClose: () => void
  block: InfoBlock | null
}) {
  const locale = useLocale()
  const copy = COPY[locale] ?? COPY.en

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!block) return null
  const lines = toLines(block.content)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "110%" }}
            animate={{ x: 0 }}
            exit={{ x: "110%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            role="dialog"
            aria-label={copy.title}
            className="liquid-glass fixed bottom-3 right-3 top-3 z-[210] flex w-[calc(100%-24px)] flex-col rounded-[30px] p-7 sm:w-[420px] sm:p-9"
            style={{
              color: "var(--menu)",
              background: "color-mix(in srgb, var(--navbar-bg) 80%, transparent)",
            }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-[0.3em]">{copy.title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-no-tap
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
                style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {block.image_url && (
                <div className="relative aspect-[11/12] w-full overflow-hidden rounded-2xl bg-black/10">
                  <BlockMedia url={block.image_url} alt={block.title ?? copy.title} />
                </div>
              )}

              {block.subtitle && (
                <p className="font-info mt-7 text-[11px] font-light uppercase tracking-[0.25em] opacity-60">
                  {block.subtitle}
                </p>
              )}

              {lines.length > 0 && (
                <ul className="mt-5">
                  {lines.map((l, i) => (
                    <li
                      key={i}
                      className="font-info border-t py-4 text-[12px] font-light leading-[1.8] first:border-t-0 first:pt-0"
                      style={{ borderColor: "color-mix(in srgb, currentColor 18%, transparent)" }}
                    >
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
