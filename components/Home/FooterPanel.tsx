"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import HelpLink from "@/components/HelpLink";

/* ====================================================================
   PIED DE PAGE DE L'ACCUEIL : le dernier « chapitre » (vert, plein écran)
   Le gros logo FYSU (blanc) est posé par-dessus, en haut : il remplace le petit logo du pied de page.
   ==================================================================== */
export default function FooterPanel() {
  const t = useTranslations("Footer");
  return (
    <footer
      className="font-dior flex h-full w-full flex-col justify-end bg-[#154733] px-6 text-sm text-white md:text-base"
      style={{ paddingTop: "calc(28.2vw + 2.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="font-info mb-4 text-[11px] font-light uppercase tracking-[0.06em]">{t("signInNow")}</h2>
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            className="w-full border border-white bg-transparent px-4 py-2 text-white placeholder-white"
          />
        </div>

        <div>
          <h2 className="font-info mb-4 text-[11px] font-light uppercase tracking-[0.06em]">{t("clientServices")}</h2>
          <ul className="space-y-2.5 text-sm font-light">
            <li><Link href="/legal/shipping" className="hover:underline">{t("shipping")}</Link></li>
            <li><Link href="/legal/payment" className="hover:underline">{t("payment")}</Link></li>
            <li><Link href="/legal/returns" className="hover:underline">{t("returns")}</Link></li>
            <li><Link href="/legal/faq" className="hover:underline">{t("faq")}</Link></li>
            <li><HelpLink className="cursor-pointer text-left hover:underline" /></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-white pt-6">
        <div className="font-info mx-auto flex max-w-6xl flex-wrap justify-center gap-4 text-center text-[11px] font-light uppercase tracking-[0.06em] md:justify-between md:gap-8">
          <Link href="/legal/terms" className="hover:underline">{t("legalTerms").toUpperCase()}</Link>
          <Link href="/legal/contact" className="hover:underline">{t("contact").toUpperCase()}</Link>
          <Link href="/privacy" className="hover:underline">{t("privacyPolicy").toUpperCase()}</Link>
        </div>
      </div>
    </footer>
  );
}
