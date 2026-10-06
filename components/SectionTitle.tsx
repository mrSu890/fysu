"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"

/* ====================================================================
   GROS TITRE AVEC TRAIT FIN
   - le texte monte du « sol » (il glisse depuis un cache, pas de fondu)
   - le trait part d'un point au centre et s'étend des deux côtés en même temps
   - se joue une seule fois, quand le titre entre à l'écran
   ==================================================================== */

const EASE = [0.22, 1, 0.36, 1] as const

// vrai quand la page est vraiment visible : écran de chargement terminé
// et rideau de pixels / d'eau en train de se lever (sinon l'animation se joue cachée)
function usePageVisible() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let timer = 0
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      setOk(true)
    }
    const check = () => {
      const w = window as any
      if (!w.__loaderVisualDone || w.__pxCovering) return
      window.clearTimeout(timer)
      timer = window.setTimeout(finish, 220)
    }
    check()
    window.addEventListener("loader-visual-done", check)
    window.addEventListener("pixel-reveal", check)
    const poll = window.setInterval(check, 250)
    const safety = window.setTimeout(finish, 5000) // ne jamais rester caché
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(safety)
      window.clearInterval(poll)
      window.removeEventListener("loader-visual-done", check)
      window.removeEventListener("pixel-reveal", check)
    }
  }, [])
  return ok
}

type Tag = "h1" | "h2" | "h3"

export default function SectionTitle({
  as = "h2",
  children,
  className = "",
  line = true,
  lineClassName = "",
  delay = 0,
}: {
  as?: Tag
  children: React.ReactNode
  className?: string // taille, graisse, couleur du texte
  line?: boolean
  lineClassName?: string // couleur / marge du trait
  delay?: number
}) {
  const Tag = as
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" })
  const calm = useReducedMotion()
  const visible = usePageVisible()
  const show = (inView && visible) || !!calm

  return (
    // data-no-reveal : l'ancien fondu automatique ne s'applique pas ici
    <div ref={ref} data-no-reveal>
      <div className="overflow-hidden pb-[0.14em] -mb-[0.14em]">
        <motion.div
          initial={calm ? false : { y: "115%" }}
          animate={show ? { y: 0 } : undefined}
          transition={{ duration: 1, ease: EASE, delay }}
        >
          <Tag className={className}>{children}</Tag>
        </motion.div>
      </div>
      {line && (
        <motion.div
          aria-hidden="true"
          initial={calm ? false : { scaleX: 0 }}
          animate={show ? { scaleX: 1 } : undefined}
          transition={{ duration: 1.1, ease: EASE, delay: delay + 0.25 }}
          style={{ transformOrigin: "50% 50%" }}
          className={`mt-4 h-px w-full bg-current opacity-80 sm:mt-6 ${lineClassName}`}
        />
      )}
    </div>
  )
}
