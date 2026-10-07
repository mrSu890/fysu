import { getAboutBlocks } from "@/lib/db/about"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ThemeToggle from "@/components/ThemeToggle"
import { getTranslations } from "next-intl/server"
import { PAGES, pageMeta } from "@/lib/seo"

export const metadata = pageMeta(PAGES.about)

export default async function AboutPage() {
  const t = await getTranslations("Pages")
  const blocks = await getAboutBlocks()

  if (!blocks.length) {
    return (
        <>
            <Navbar />

            <p className="text-center pt-44">{t("aboutEmpty")}</p>

            <div className="relative top-42">
                <Footer />
            </div>
        </>
    )
  }

  const pad = (n: number) => String(n).padStart(2, "0")

  return (
    <>
      <Navbar />
      <main className="bg-background text-foreground">
        {/* une seule colonne, calée à gauche, avec beaucoup de vide autour : l'image et le texte prennent leur temps */}
        <div className="mx-auto max-w-[880px] px-7 pb-[18vh] pt-40 sm:pt-52 md:ml-[max(64px,12vw)] md:mr-auto md:px-0">
          {blocks.map((block, index) => {
            const offset = index % 2 === 1
            return (
              <section key={block.id} className="pb-[16vh]">
                <div className="mb-10 border-t border-foreground/80 pt-4 sm:mb-14">
                  <p className="font-info text-[11px] font-light uppercase tracking-[0.06em] text-foreground/55">
                    ( {pad(index + 1)} )
                  </p>
                </div>

                {/* IMAGE : petit format, calée à gauche (ou légèrement décalée une fois sur deux) */}
                {block.image_url && (
                  <div className={`mb-14 aspect-[3/4] w-[68%] max-w-[320px] overflow-hidden sm:mb-20 ${offset ? "ml-auto md:ml-[18%]" : ""}`}>
                    <img src={block.image_url} alt={block.title} className="h-full w-full object-cover" />
                  </div>
                )}

                {/* TEXTE : petit repère à gauche, titre gras, texte fin décalé */}
                <div className="grid grid-cols-[34px_1fr] items-baseline gap-x-3 md:grid-cols-[200px_1fr] md:gap-x-0">
                  <p className="font-info text-[11px] font-light uppercase tracking-[0.06em] text-foreground/55">{pad(index + 1)}</p>
                  <div>
                    <h2 className="text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[40px]">{block.title}</h2>
                    <div className="mt-6 max-w-[28em] space-y-4 text-base font-light leading-[1.65] tracking-[-0.01em] text-foreground/75 md:text-[19px]">
                      {block.about_block_paragraphs
                        ?.sort((a, b) => a.order_index - b.order_index)
                        .map((p) => (
                          <p key={p.id}>{p.content}</p>
                        ))}
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      </main>

      <ThemeToggle />

      <Footer />
    </>
  )
}
