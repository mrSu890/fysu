import type { Metadata } from "next"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata: Metadata = pageMeta(PAGES.music)

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
