import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

const logo = "/images/footer_logo.png"

// Fondu sur les bords pour que l'image se fonde dans le fond de la page
const softEdges: React.CSSProperties = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
  WebkitMaskComposite: "source-in",
  maskImage:
    "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
  maskComposite: "intersect",
};

const Footer: React.FC = () => {
  const t = useTranslations("Footer");

  return (
    <>
      {/* Image d'anthurium en bas de chaque page */}
      <div className="w-full flex justify-center mt-24 bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/anthurium-light.JPG"
          alt=""
          className="flower-light w-full max-w-3xl h-auto"
          style={softEdges}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/anthurium-dark.JPG"
          alt=""
          className="flower-dark w-full max-w-3xl h-auto"
          style={softEdges}
        />
      </div>

      <footer className="relative bg-[#154733] text-white px-6 py-10 text-sm md:text-base font-dior">
        {/* Email Signup */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h2 className="font-bold uppercase mb-2">{t("signInNow")}</h2>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className="w-full px-4 py-2 bg-transparent border border-white placeholder-white text-white"
            />
          </div>

          {/* Client Services */}
          <div>
            <h2 className="font-bold uppercase mb-2">{t("clientServices")}</h2>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:underline">{t("shipping")}</Link></li>
              <li><Link href="/privacy" className="hover:underline">{t("payment")}</Link></li>
              <li><Link href="/privacy" className="hover:underline">{t("returns")}</Link></li>
            </ul>
          </div>

          {/* Logo */}
          <div className="flex justify-start md:justify-center items-center md:items-start">
            <Image
              src={logo}
              width={150}
              height={150}
              alt="logo"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Bottom links */}
        <div className="border-t border-white mt-10 pt-6">
          <div className="max-w-6xl mx-auto flex flex-wrap justify-center md:justify-between text-xs md:text-sm gap-4 md:gap-8 text-center">
            <Link href="/privacy" className="hover:underline">{t("legalTerms").toUpperCase()}</Link>
            <Link href="/privacy" className="hover:underline">{t("contact").toUpperCase()}</Link>
            <Link href="/privacy" className="hover:underline">{t("privacyPolicy").toUpperCase()}</Link>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
