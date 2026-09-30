"use client"

import { useLocale, useMessages } from "next-intl"
import { registerExtraCopy } from "@/lib/extraCopy"

// Invisible : enregistre les textes de la langue courante (voir lib/extraCopy.ts)
export default function ExtraCopyBridge() {
  const locale = useLocale()
  const messages = useMessages()
  registerExtraCopy(locale, messages)
  return null
}
