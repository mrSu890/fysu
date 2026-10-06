import type { Metadata } from "next"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta(PAGES.thewave)

export default function TheWaveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
