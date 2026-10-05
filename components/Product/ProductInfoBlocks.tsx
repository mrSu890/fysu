"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { useLocale } from "next-intl"

/* ====================================================================
   BLOCS D'INFORMATION SOUS LE PRODUIT
   Une image ou une vidéo presque carrée + un texte. Sur ordinateur : média d'un côté,
   texte de l'autre (comme sur la première page), en alternant la gauche et la droite.
   Sur téléphone / iPad : média au-dessus, texte en dessous.
   Le bloc dont le titre contient « packaging » n'apparaît pas ici : il s'ouvre depuis
   le bouton « See packaging » (voir PackagingDrawer).
   ==================================================================== */

export type InfoBlock = {
  id: string
  image_url: string | null
  title: string | null
  subtitle: string | null
  content: string | null
}

export const isPackagingBlock = (b: { title?: string | null }) =>
  /packag|emballage|verpakking|embalagem|imballaggio/i.test(b.title ?? "")

export const isVideoUrl = (url: string) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)

const LABELS: Record<string, { more: string; less: string }> = {
  fr: { more: "Lire plus", less: "Lire moins" },
  en: { more: "Read more", less: "Read less" },
}

function ExpandableText({ text }: { text: string }) {
  const locale = useLocale()
  const labels = LABELS[locale] ?? LABELS.en
  const [expanded, setExpanded] = useState(false)
  const [needsToggle, setNeedsToggle] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)
  const COLLAPSED = 120 // px, environ 5 lignes

  useEffect(() => {
    const el = ref.current
    if (el) setNeedsToggle(el.scrollHeight > COLLAPSED + 8)
  }, [text])

  return (
    <div>
      <motion.div
        initial={false}
        animate={{ height: expanded || !needsToggle ? "auto" : COLLAPSED }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden"
      >
        <p ref={ref} className="font-info whitespace-pre-line text-[13px] font-light leading-[1.95] text-foreground/75">
          {text.replace(/\\n/g, "\n")}
        </p>
      </motion.div>

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="font-info mt-4 cursor-pointer text-[11px] font-light uppercase tracking-[0.2em] text-foreground/50 underline underline-offset-4 transition hover:text-foreground"
        >
          {expanded ? labels.less : labels.more}
        </button>
      )}
    </div>
  )
}

export function BlockMedia({ url, alt, className = "" }: { url: string; alt: string; className?: string }) {
  return isVideoUrl(url) ? (
    <video src={url} className={`absolute inset-0 h-full w-full object-cover ${className}`} muted autoPlay loop playsInline />
  ) : (
    <Image src={url} alt={alt} fill className={`object-cover ${className}`} sizes="(min-width: 1024px) 50vw, 100vw" />
  )
}

export default function ProductInfoBlocks({ blocks }: { blocks: InfoBlock[] }) {
  const list = (blocks ?? []).filter((b) => b.image_url && !isPackagingBlock(b))
  if (!list.length) return null

  return (
    <section className="w-full pt-24 sm:pt-32">
      {list.map((block, i) => {
        const flip = i % 2 === 1
        return (
          <motion.div
            key={block.id}
            className="w-full lg:grid lg:grid-cols-2"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "-60px" }}
          >
            <div
              className={`relative aspect-[11/12] w-full overflow-hidden bg-neutral-300 dark:bg-neutral-800 ${
                flip ? "lg:order-2" : ""
              }`}
            >
              <BlockMedia url={block.image_url!} alt={block.title ?? "FYSU"} />
            </div>

            <div className="flex flex-col justify-center px-8 py-14 sm:px-14 lg:px-20 lg:py-0">
              <div className="w-full max-w-md lg:mx-auto">
                {block.title && <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{block.title}</h3>}

                {block.subtitle && (
                  <p className="font-info mt-3 text-[11px] font-light uppercase tracking-[0.25em] text-foreground/45">
                    {block.subtitle}
                  </p>
                )}

                {block.content && (
                  <div className="mt-8 border-t border-foreground/15 pt-8">
                    <ExpandableText text={block.content} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </section>
  )
}
