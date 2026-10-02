"use client"

import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { isPixelExcluded } from "@/components/PixelTransition"

/* Pages avec la transition en pixels (voir components/PixelTransition.tsx) : pas de fondu en plus.
   Les autres pages (Kiban Collector, The Wave, FY'grances, admin) gardent un fondu doux.
   Opacité seulement : le menu fixe ne bouge pas. */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (!isPixelExcluded(pathname)) return <>{children}</>

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
