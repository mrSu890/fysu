import { getAboutBlocks } from "@/lib/db/about"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ThemeToggle from "@/components/ThemeToggle"
import { getTranslations } from "next-intl/server"
import { PAGES, pageMeta } from "@/lib/seo"
import SectionTitle from "@/components/SectionTitle"

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

  return (
      <>

      <Navbar />
        <main className="bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 space-y-32">

            {blocks.map((block, index) => {
            const isReverse = index % 2 === 1

            return (
                <section
                key={block.id}
                className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
                >
                {/* IMAGE */}
                <div
                    className={`order-1 ${
                    isReverse ? "md:order-2" : "md:order-1"
                    }`}
                >
                    <div className="overflow-hidden">
                    <img
                        src={block.image_url}
                        alt={block.title}
                        className="w-full h-auto object-cover transition duration-700 hover:scale-105"
                    />
                    </div>
                </div>

                {/* TEXTE */}
                <div
                    className={`order-2 ${
                    isReverse ? "md:order-1" : "md:order-2"
                    }`}
                >
                    <div className="mb-6">
                    <SectionTitle className="text-3xl md:text-4xl font-dior">
                    {block.title}
                    </SectionTitle>
                    </div>

                    <div className="space-y-4 text-base md:text-lg leading-relaxed text-muted-foreground">
                    {block.about_block_paragraphs
                        ?.sort((a, b) => a.order_index - b.order_index)
                        .map((p) => (
                        <p key={p.id}>{p.content}</p>
                        ))}
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
