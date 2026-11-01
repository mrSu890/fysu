"use client"

import { useLocale } from "next-intl"
import AvatarStudio from "@/components/Profile/AvatarStudio"

// Éditeur d'avatar (le même que dans My FYSU)
export default function AvatarPage() {
  const locale = useLocale()
  return (
    <main className="mx-auto w-11/12 max-w-6xl pb-24 pt-32 sm:pt-44">
      <AvatarStudio locale={locale} />
    </main>
  )
}
