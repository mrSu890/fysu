import type { Metadata } from "next"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta(PAGES.fygrances)

export default function FygrancesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
