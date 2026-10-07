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

      <main className="mx-auto max-w-[880px] px-7 pb-[14vh] pt-40 sm:pt-52 md:ml-[max(64px,12vw)] md:mr-auto md:px-0">
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.045em] sm:text-[56px]">{page.title}</h1>
        {page.intro && (
          <p className="mt-8 max-w-[24em] text-[17px] font-light leading-[1.6] tracking-[-0.01em] text-foreground/75 sm:text-xl">{page.intro}</p>
        )}

        <div className="mt-[14vh]">
          {page.sections.map((section, i) => (
            <section key={section.h} className="pb-[10vh]">
              <div className="mb-8 border-t border-foreground/50 pt-4">
                <p className="font-info text-[11px] font-light uppercase tracking-[0.06em] text-foreground/55">
                  ( {String(i + 1).padStart(2, "0")} )
                </p>
              </div>
              <div className="grid grid-cols-[34px_1fr] gap-x-3 md:grid-cols-[200px_1fr] md:gap-x-0">
                <span />
                <div>
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.03em] sm:text-2xl">{section.h}</h2>
                  <div className="mt-5 max-w-[30em] space-y-3 text-[15px] font-light leading-[1.65] tracking-[-0.01em] text-foreground/75 sm:text-base">
                    {section.p.map((line, k) => (
                      <p key={k}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
