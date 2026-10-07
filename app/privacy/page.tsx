import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ThemeToggle from "@/components/ThemeToggle"
import { getTranslations } from "next-intl/server"

type Paragraph = {
  id: string
  content: string
  order_index: number
}

type Section = {
  id: string
  title: string
  order_index: number
  privacy_policy_paragraphs: Paragraph[]
}

async function getPrivacyPolicy(): Promise<Section[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/privacy-policy`, {
    cache: "no-store"
  })

  if (!res.ok) return []

  const data = await res.json()

  return data || []
}

export default async function Page() {
  const t = await getTranslations("Pages")
  const sections = await getPrivacyPolicy()

  return (
    <div className="bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-[880px] px-7 pb-[14vh] pt-40 sm:pt-52 md:ml-[max(64px,12vw)] md:mr-auto md:px-0">
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.045em] sm:text-[56px]">
          {t("privacyPolicy")}
        </h1>

        <div className="mt-[14vh]">
          {sections.map((section, i) => (
            <section key={section.id} className="pb-[10vh]">
              <div className="mb-8 border-t border-foreground/50 pt-4">
                <p className="font-info text-[11px] font-light uppercase tracking-[0.06em] text-foreground/55">
                  ( {String(i + 1).padStart(2, "0")} )
                </p>
              </div>
              <div className="grid grid-cols-[34px_1fr] gap-x-3 md:grid-cols-[200px_1fr] md:gap-x-0">
                <span />
                <div>
                  <h2 className="text-xl font-bold leading-tight tracking-[-0.03em] sm:text-2xl">{section.title}</h2>
                  <div className="mt-5 max-w-[30em] space-y-3 text-[15px] font-light leading-[1.65] tracking-[-0.01em] text-foreground/75 sm:text-base">
                    {section.privacy_policy_paragraphs
                      ?.sort((a, b) => a.order_index - b.order_index)
                      .map((paragraph) => (
                        <p key={paragraph.id}>{paragraph.content}</p>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      <ThemeToggle />

      <Footer />
    </div>
  )
}
