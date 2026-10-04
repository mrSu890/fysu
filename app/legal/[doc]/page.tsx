import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale } from "next-intl/server"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import { isLegalSlug } from "@/lib/legalDocs"
import { getLegalDocResolved } from "@/lib/legalStore"
import { localize } from "@/lib/translate"

type Props = { params: Promise<{ doc: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params
  if (!isLegalSlug(doc)) return {}
  const locale = await getLocale()
  const lang = locale === "fr" ? "fr" : "en"
  return { title: `${(await getLegalDocResolved(doc, lang)).title} — FYSU` }
}

export default async function LegalPage({ params }: Props) {
  const { doc } = await params
  if (!isLegalSlug(doc)) notFound()
  const locale = await getLocale()
  // français et anglais : textes écrits (ou modifiés dans l'admin) ; les autres langues : anglais traduit par DeepL
  const lang = locale === "fr" ? "fr" : "en"
  let page = await getLegalDocResolved(doc, lang)
  if (locale !== "fr" && locale !== "en") page = await localize(page)

  return (
    <div className="bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <h1 className="mb-6 text-4xl font-semibold">{page.title}</h1>
        {page.intro && <p className="mb-14 text-lg leading-relaxed opacity-80">{page.intro}</p>}

        <div className="space-y-12">
          {page.sections.map((section) => (
            <section key={section.h} className="space-y-4">
              <h2 className="text-xl font-medium">{section.h}</h2>
              <div className="space-y-3 leading-relaxed opacity-90">
                {section.p.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
