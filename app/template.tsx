"use client"

import { motion } from "framer-motion"

/* Fondu doux à chaque changement de page (opacité seulement : le menu fixe ne bouge pas) */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
