"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { motion, useInView, useReducedMotion } from "framer-motion"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import SectionTitle from "@/components/SectionTitle"
import { usePageVisible } from "@/lib/usePageVisible"
import type { EventBlock, EventData, EventImage, Lang } from "@/lib/events"

/* ====================================================================
   PAGE ÉVENT : une page qui raconte (modèle réutilisable, voir lib/events.ts)
   - images : rideau qui se lève depuis le sol, l'image se pose en douceur
   - textes : montent du sol, comme les gros titres
   - menu : chaque nom se compose lettre par lettre, trait depuis le centre
   ==================================================================== */

const EASE = [0.22, 1, 0.36, 1] as const

function useShow(margin = "0px 0px -10% 0px") {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: margin as any })
  const calm = useReducedMotion()
  const visible = usePageVisible()
  return { ref, show: (inView && visible) || !!calm, calm: !!calm }
}

/* Image : rideau qui se lève + léger zoom arrière */
function Curtain({ image, lang, className = "", priority = false, position }: { image: EventImage; lang: "fr" | "en"; className?: string; priority?: boolean; position?: string }) {
  const { ref, show, calm } = useShow("0px 0px -6% 0px")
  return (
    <div ref={ref} data-no-reveal className={className}>
      <motion.div
        initial={calm ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
        animate={show ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
        transition={{ duration: 1.3, ease: EASE }}
        className="overflow-hidden bg-neutral-200 dark:bg-neutral-800"
        style={{ aspectRatio: `${image.w} / ${image.h}` }}
      >
        <motion.img
          src={image.src}
          alt={image.alt[lang]}
          width={image.w}
          height={image.h}
          loading={priority ? "eager" : "lazy"}
          draggable={false}
          initial={calm ? false : { scale: 1.2 }}
          animate={show ? { scale: 1 } : undefined}
          transition={{ duration: 1.9, ease: EASE }}
          className="h-full w-full object-cover"
          style={position ? { objectPosition: position } : undefined}
        />
      </motion.div>
    </div>
  )
}

/* Texte qui monte du sol */
function Rise({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, show, calm } = useShow()
  return (
    <div ref={ref} data-no-reveal className={className}>
      <div className="overflow-hidden pb-[0.14em] -mb-[0.14em]">
        <motion.div initial={calm ? false : { y: "115%" }} animate={show ? { y: 0 } : undefined} transition={{ duration: 1, ease: EASE, delay }}>
          {children}
        </motion.div>
      </div>
    </div>
  )
}

/* Un nom qui se compose lettre par lettre */
function Letters({ text, show, calm, delay = 0 }: { text: string; show: boolean; calm: boolean; delay?: number }) {
  return (
    <span aria-label={text} className="inline-flex overflow-hidden pb-[0.16em] -mb-[0.16em]">
      {Array.from(text).map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={calm ? false : { y: "118%", rotate: 7 }}
          animate={show ? { y: 0, rotate: 0 } : undefined}
          transition={{ duration: 1.05, ease: EASE, delay: delay + i * 0.07 }}
          className="inline-block origin-bottom-left transition-colors duration-500 group-hover:text-[#4EAC6C]"
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  )
}

/* Le menu : deux cercles dans une ellipse. Les traits se dessinent, puis les mots montent du sol.
   Au survol (ou au toucher) d'un cercle, l'autre s'efface. */
type MenuBlock = Extract<EventBlock, { type: "menu" }>

function Mask({ children, show, calm, delay = 0, className = "" }: { children: React.ReactNode; show: boolean; calm: boolean; delay?: number; className?: string }) {
  return (
    <span className={`block overflow-hidden pb-[0.16em] -mb-[0.16em] ${className}`}>
      <motion.span className="block" initial={calm ? false : { y: "118%" }} animate={show ? { y: 0 } : undefined} transition={{ duration: 1, ease: EASE, delay }}>
        {children}
      </motion.span>
    </span>
  )
}

// ovale tracé à partir du haut (pour que le trait se dessine depuis le sommet)
const ovalPath = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry} Z`

function VennMenu({ menu }: { menu: MenuBlock }) {
  const { ref, show, calm } = useShow("0px 0px -12% 0px")
  const [active, setActive] = useState<0 | 1 | null>(null)
  const [left, right] = menu.items
  const dim = (i: 0 | 1) => (active === null || active === i ? 1 : 0.22)
  const draw = (delay: number, dur = 2.2) => ({
    initial: calm ? false : { pathLength: 0 },
    animate: show ? { pathLength: 1 } : undefined,
    transition: { duration: dur, ease: EASE, delay },
  })
  const stroke = (i: 0 | 1) => (active === i ? "#4EAC6C" : "currentColor")

  return (
    <div ref={ref} data-no-reveal className="mx-auto w-full max-w-[720px] text-foreground" style={{ containerType: "inline-size" }} onMouseLeave={() => setActive(null)}>
      <div className="relative w-full" style={{ aspectRatio: "1414 / 2000" }}>
        <svg viewBox="0 0 1414 2000" className="absolute inset-0 h-full w-full" fill="none" strokeWidth={3} aria-hidden="true">
          <motion.path d={ovalPath(707, 1000, 587, 893)} stroke="currentColor" strokeOpacity={0.9} {...draw(0)} />
          <motion.path d={ovalPath(707, 1000, 587, 612)} stroke="currentColor" strokeOpacity={0.9} {...draw(0.35)} />
          <motion.g initial={calm ? false : { opacity: 0 }} animate={show ? { opacity: 1 } : undefined} transition={{ duration: 1.6, delay: 1.4 }}>
            <motion.ellipse cx={437} cy={1000} rx={318} ry={330} fill="currentColor" fillOpacity={0.05} stroke={stroke(0)} strokeWidth={active === 0 ? 4 : 2} style={{ transition: "stroke 0.4s" }} />
            <motion.ellipse cx={978} cy={1000} rx={318} ry={330} fill="currentColor" fillOpacity={0.05} stroke={stroke(1)} strokeWidth={active === 1 ? 4 : 2} style={{ transition: "stroke 0.4s" }} />
          </motion.g>
          {/* zones sensibles */}
          <ellipse cx={437} cy={1000} rx={318} ry={330} fill="transparent" style={{ pointerEvents: "all", cursor: "pointer" }} onMouseEnter={() => setActive(0)} onClick={() => setActive(active === 0 ? null : 0)} />
          <ellipse cx={978} cy={1000} rx={318} ry={330} fill="transparent" style={{ pointerEvents: "all", cursor: "pointer" }} onMouseEnter={() => setActive(1)} onClick={() => setActive(active === 1 ? null : 1)} />
        </svg>

        {/* textes */}
        <div className="pointer-events-none absolute left-1/2 top-[13.2%] -translate-x-1/2 -translate-y-1/2" style={{ width: "22%" }}>
          <Mask show={show} calm={calm} delay={0.5}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={menu.top.src} alt={menu.top.alt} width={menu.top.w} height={menu.top.h} className="block h-auto w-full" draggable={false} />
          </Mask>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[23.7%] -translate-x-1/2 -translate-y-1/2 font-bold tracking-tight" style={{ fontSize: "max(11px, 1.9cqw)" }}>
          <Mask show={show} calm={calm} delay={0.8}>{menu.heading}</Mask>
        </div>

        {[left, right].map((it, i) => {
          const idx = i as 0 | 1
          const isLeft = idx === 0
          return (
            <div key={it.name} className="group pointer-events-none">
              <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center transition-opacity duration-500" style={{ left: isLeft ? "28.6%" : "69.7%", top: isLeft ? "39.4%" : "38.6%", opacity: dim(idx) }}>
                <div className="font-dior leading-none" style={{ fontSize: "max(32px, 6.4cqw)" }}>
                  <Letters text={it.name} show={show} calm={calm} delay={1.9 + i * 0.15} />
                </div>
                <div className="mt-[0.5em] font-info uppercase tracking-[0.2em]" style={{ fontSize: "max(8px, 1.1cqw)" }}>
                  <Mask show={show} calm={calm} delay={2.3 + i * 0.15}>{it.tag}</Mask>
                </div>
              </div>
              <ul
                className={`absolute space-y-[0.35em] font-light leading-snug transition-opacity duration-500 ${isLeft ? "text-left" : "text-right"}`}
                style={{ fontSize: "max(12px, 2.1cqw)", top: isLeft ? "45.7%" : "45%", opacity: dim(idx), ...(isLeft ? { left: "14.2%" } : { right: "13.2%" }) }}
              >
                {it.ingredients.map((g, k) => (
                  <li key={g}>
                    <Mask show={show} calm={calm} delay={2.5 + i * 0.15 + k * 0.12}>{g}</Mask>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        <div className="pointer-events-none absolute left-1/2 top-[87.5%] -translate-x-1/2 -translate-y-1/2" style={{ width: "9.8%" }}>
          <Mask show={show} calm={calm} delay={3.1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={menu.bottom.src} alt={menu.bottom.alt} width={menu.bottom.w} height={menu.bottom.h} className="block h-auto w-full" draggable={false} />
          </Mask>
        </div>
      </div>
    </div>
  )
}

/* Petit carrousel : on fait glisser avec le doigt. Chaque look se lève du sol, l'un après l'autre. */
function Looks({ images, lang }: { images: EventImage[]; lang: "fr" | "en" }) {
  const { ref, show, calm } = useShow("0px 0px -8% 0px")
  return (
    <section ref={ref} data-no-reveal className="py-10 sm:py-16" aria-label="Looks">
      <div className="flex snap-x snap-mandatory scroll-pl-[14px] gap-[14px] overflow-x-auto overscroll-x-contain px-[14px] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:scroll-pl-6 sm:gap-5 sm:px-6">
        {images.map((im, i) => (
          <motion.div
            key={im.src}
            initial={calm ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
            animate={show ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
            transition={{ duration: 1.2, ease: EASE, delay: i * 0.12 }}
            className="w-[62vw] max-w-[360px] shrink-0 snap-start overflow-hidden bg-neutral-800"
            style={{ aspectRatio: "5 / 7" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.src} alt={im.alt[lang]} width={im.w} height={im.h} loading="lazy" draggable={false} className="h-full w-full object-cover" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 font-info text-[10px] uppercase tracking-[0.3em] text-foreground/60 sm:text-xs">{children}</p>
}

function Block({ block, lang }: { block: EventBlock; lang: "fr" | "en" }) {
  if (block.type === "text") {
    return (
      <section className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-28">
        {block.label && (
          <Rise>
            <Label>{block.label[lang]}</Label>
          </Rise>
        )}
        <div className="space-y-5">
          {block.paragraphs.map((p, i) => (
            <Rise key={i} delay={i * 0.12}>
              <p className="text-lg font-light leading-relaxed sm:text-2xl sm:leading-relaxed">{p[lang]}</p>
            </Rise>
          ))}
        </div>
      </section>
    )
  }

  if (block.type === "image") {
    return (
      <section className={`px-[14px] py-4 sm:px-6 sm:py-8 ${block.narrow ? "mx-auto max-w-xl" : "mx-auto max-w-6xl"}`}>
        <Curtain image={block.image} lang={lang} />
      </section>
    )
  }

  if (block.type === "pair") {
    return (
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-[14px] px-[14px] py-4 sm:gap-6 sm:px-6 sm:py-8">
        <Curtain image={block.a} lang={lang} />
        <Curtain image={block.b} lang={lang} className="mt-10 sm:mt-24" />
      </section>
    )
  }

  if (block.type === "carousel") {
    return <Looks images={block.images} lang={lang} />
  }

  if (block.type === "link") {
    return (
      <section className="mx-auto w-full max-w-2xl px-6 pb-16 pt-6 sm:pb-24">
        <Rise>
          <Link href={block.href} className="inline-block border-b border-foreground/40 pb-1 font-info text-xs uppercase tracking-[0.3em] transition-opacity hover:opacity-60">
            {block.label[lang]} →
          </Link>
        </Rise>
      </section>
    )
  }

  // menu
  return (
    <section className="mx-auto max-w-3xl px-[14px] py-20 sm:px-6 sm:py-32">
      <div className="px-1 sm:px-0">
        <Rise>
          <Label>{block.label[lang]}</Label>
        </Rise>
        <SectionTitle className="text-4xl font-bold tracking-tight sm:text-6xl">{block.title[lang]}</SectionTitle>
        <Rise className="mt-6">
          <p className="max-w-md text-base font-light leading-relaxed text-foreground/80 sm:text-lg">{block.intro[lang]}</p>
        </Rise>
      </div>
      <div className="mt-14 sm:mt-20">
        <VennMenu menu={block} />
      </div>
    </section>
  )
}

export default function EventPage({ event }: { event: EventData }) {
  const locale = useLocale()
  const lang: "fr" | "en" = locale?.startsWith("fr") ? "fr" : "en"

  // cette page est toujours en mode sombre (ça va mieux à l'ambiance) ; on rend le thème du visiteur en partant
  useEffect(() => {
    const html = document.documentElement
    html.classList.add("dark", "event-page")
    return () => {
      html.classList.remove("event-page")
      try {
        html.classList.toggle("dark", localStorage.getItem("theme") === "dark")
      } catch {}
    }
  }, [])

  useEffect(() => {
    const previous = document.title
    document.title = `${event.title} | FYSU`
    return () => {
      document.title = previous
    }
  }, [event.title])

  return (
    <>
      {/* évite un éclair de mode clair avant que la page passe en sombre */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('dark','event-page')" }} />
      <Navbar />
      <main className="bg-background pb-24 pt-28 text-foreground sm:pt-36">
        {/* En-tête */}
        <header className="mx-auto max-w-6xl px-6">
          <Rise>
            <Label>{event.eyebrow[lang]}</Label>
          </Rise>
          <SectionTitle as="h1" className="text-5xl font-bold leading-[1.02] tracking-tight sm:text-8xl">
            {event.title}
          </SectionTitle>
          <Rise className="mt-8" delay={0.2}>
            <p className="max-w-xl text-lg font-light leading-relaxed sm:text-2xl">{event.intro[lang]}</p>
          </Rise>
        </header>

        {/* Image d'ouverture */}
        <div className="mx-auto mt-12 max-w-[1500px] px-[14px] sm:mt-20 sm:px-6">
          <HeroImage image={event.hero} lang={lang} position={event.heroPosition} />
        </div>

        {/* Fiche */}
        <dl className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-6 sm:mt-16 sm:grid-cols-4">
          {event.facts.map((f, i) => (
            <Rise key={i} delay={i * 0.08}>
              <dt className="mb-2 font-info text-[10px] uppercase tracking-[0.3em] text-foreground/50">{f.label[lang]}</dt>
              <dd className="font-info text-xs leading-relaxed sm:text-sm">{f.value[lang]}</dd>
            </Rise>
          ))}
        </dl>

        {event.blocks.map((b, i) => (
          <Block key={i} block={b} lang={lang} />
        ))}

        <div className="mx-auto mt-16 max-w-6xl px-6">
          <Link href="/" className="font-info text-xs uppercase tracking-[0.3em] text-foreground/60 transition-opacity hover:opacity-60">
            ← FYSU
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}

/* L'image d'ouverture est recadrée (plus haute sur téléphone) pour rester forte */
function HeroImage({ image, lang, position }: { image: EventImage; lang: "fr" | "en"; position?: string }) {
  const { ref, show, calm } = useShow("0px 0px -4% 0px")
  return (
    <div ref={ref} data-no-reveal>
      <motion.div
        initial={calm ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
        animate={show ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
        transition={{ duration: 1.4, ease: EASE }}
        className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 sm:aspect-[16/9]"
      >
        <motion.img
          src={image.src}
          alt={image.alt[lang]}
          width={image.w}
          height={image.h}
          fetchPriority="high"
          draggable={false}
          initial={calm ? false : { scale: 1.2 }}
          animate={show ? { scale: 1 } : undefined}
          transition={{ duration: 2, ease: EASE }}
          className="absolute inset-0 h-full w-full object-cover"
          style={position ? { objectPosition: position } : undefined}
        />
      </motion.div>
    </div>
  )
}
