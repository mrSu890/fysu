import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PAGES, pageMeta } from "@/lib/seo"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const metadata: Metadata = pageMeta(PAGES.thewave)

// vérifié à chaque visite : si tu masques TheWave dans l'admin, le lien direct renvoie à l'accueil
export const dynamic = "force-dynamic"

export default async function TheWaveLayout({ children }: { children: React.ReactNode }) {
  let hidden = false
  try {
    const { data } = await supabaseAdmin.from("collectionPages").select("visible").eq("slug", "thewave").maybeSingle()
    hidden = !!data && (data as { visible?: boolean }).visible === false
  } catch {
    hidden = false
  }
  if (hidden) redirect("/")
  return <>{children}</>
}
