import type { Metadata } from "next"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta(PAGES.games)

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
