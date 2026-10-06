import type { Metadata } from "next"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta(PAGES.kibanCollector)

export default function KibanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
