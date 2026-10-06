"use client"

import { motion, useReducedMotion } from "framer-motion"
import { usePageVisible } from "@/lib/usePageVisible"

/* ====================================================================
   APPARITION « DU SOL » (ou « DU PLAFOND ») POUR UN TEXTE / UN ÉLÉMENT
   Même effet que les gros titres : le contenu glisse depuis un cache.
   Il attend que la page soit vraiment visible (fin de l'intro / du chargement).
   from="bottom" : monte du sol · from="top" : descend d'en haut
   pad : marge de sécurité (px) pour ne pas couper une ombre
   ==================================================================== */
export default function IntroReveal({
  children,
  className = "",
  delay = 0,
  from = "bottom",
  pad = 0,
  mask = true,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  from?: "bottom" | "top"
  pad?: number
  mask?: boolean // false : fondu + glissement, sans cache (pour les éléments avec une ombre, comme l'interrupteur)
}) {
  const calm = useReducedMotion()
  const visible = usePageVisible()

  if (calm) return <div className={className}>{children}</div>

  if (!mask) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={visible ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
        >
          {children}
        </motion.div>
      </div>
    )
  }

  return (
    <div className={className} style={pad ? { padding: pad, margin: -pad } : undefined}>
      <div className="overflow-hidden pb-[0.14em] -mb-[0.14em]">
        <motion.div
          initial={{ y: from === "bottom" ? "115%" : "-115%" }}
          animate={visible ? { y: 0 } : undefined}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
