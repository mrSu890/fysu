"use client"

import { useLocale } from "next-intl"
import BoutiqueScene from "@/components/Rpg/BoutiqueScene"

// Prototype RPG : la boutique FYSU où l'on se balade
export default function BoutiquePage() {
  const locale = useLocale()
  return (
    <main className="mx-auto w-11/12 max-w-3xl pb-24 pt-28 sm:pt-36">
      <BoutiqueScene locale={locale} />
    </main>
  )
}
