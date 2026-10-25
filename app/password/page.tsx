import type { Metadata } from "next"
import { getLocale } from "next-intl/server"
import PreLaunchGate from "@/components/PreLaunchGate"
import { OPEN_AT } from "@/lib/preLaunch"
import { homeCopy, SITE } from "@/lib/seo"

// Page d'attente avant l'ouverture : c'est elle que Google voit à l'adresse de l'accueil.
// Elle est indexable (titre « FYSU » + description) pour que le site reste dans les résultats de recherche ;
// les autres pages restent en noindex (voir middleware.ts).
export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = homeCopy(await getLocale())
  return {
    title,
    description,
    alternates: { canonical: SITE },
    robots: { index: true, follow: true },
    openGraph: { siteName: "FYSU", type: "website", title, description, url: SITE },
    twitter: { card: "summary_large_image", title, description },
  }
}

export const dynamic = "force-dynamic"

export default function PasswordPage() {
  return <PreLaunchGate openAt={OPEN_AT} />
}
