"use client";

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBrandPage } from "@/lib/useBrandPage";
import { useTranslations } from "next-intl";
import CroppedLogo from "./CroppedLogo";
import FygrancesIntro from "./FygrancesIntro";
import HomeTiles from "./HomeTiles";

const logo = "/images/footer_logo.png"

// Version TheWave du pied de page : rose pâle pastel en Liquid Glass
const WAVE_INK = "#3b1a1d"
const WAVE_GLASS = {
  "--glass-color": "#f9d3d5",
  "--navbar-bg": "#f9d3d5",
  "--glass-tint": "72%",
  color: WAVE_INK,
} as React.CSSProperties

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
  const isWave = useBrandPage() === "thewave";
  const pathname = usePathname();
  const showGame = pathname === "/collections/when-the-flowers-bloom";
  const ink = isWave ? { color: WAVE_INK } : undefined;

  return (
    <>
      {/* Présentation des FY'grances (image + texte + bouton) */}
      <FygrancesIntro />

      {/* Page d'accueil : « Explore The Universe » juste au-dessus de l'anthurium */}
      {pathname === "/" && <HomeTiles />}

      {/* Pastille du jeu FYSU Bird (page When the flowers bloom) */}
      {showGame && (
        <div className="mt-16 flex flex-col items-center gap-2">
          <Link href="/games/fysu-bird" aria-label="FYSU Bird" className="block active:scale-95 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/games-bird-icon.png"
              alt=""
              width={84}
              height={84}
              style={{ width: 84, height: 84, borderRadius: 19, imageRendering: "pixelated", boxShadow: "0 6px 18px rgba(0,0,0,0.3)" }}
            />
          </Link>
          <span className="text-xs tracking-wide opacity-80">FYSU Bird</span>
        </div>
      )}

      {/* Image d'anthurium en bas de chaque page */}
      <div className="w-full flex justify-center mt-10 bg-background">
        {/* Même anthurium détouré (sans fond) en clair et en sombre, avec une ombre portée */}
        {["flower-light", "flower-dark"].map((cls) => (
          <div key={cls} className={`${cls} relative w-full max-w-3xl`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/anthurium-sans-fond.png"
              alt=""
              className="h-auto w-full"
            />
            {/* petite ombre de contact sous le vase (supprimer ce bloc pour la retirer) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[49%] top-[92.5%] h-[1.1%] w-[13%] -translate-x-1/2 rounded-[50%] bg-black/30 blur-[5px]"
            />
          </div>
        ))}
      </div>

      <footer
        className={
          isWave
            ? "relative liquid-glass px-6 py-10 text-sm md:text-base font-dior"
            : "relative bg-[#154733] text-white px-6 py-10 text-sm md:text-base font-dior"
        }
        style={isWave ? WAVE_GLASS : undefined}
      >
        {/* Email Signup */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h2 className="font-bold uppercase mb-2">{t("signInNow")}</h2>
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              className={
                isWave
                  ? "w-full px-4 py-2 bg-transparent border border-current placeholder:text-[#3b1a1d]/60"
                  : "w-full px-4 py-2 bg-transparent border border-white placeholder-white text-white"
              }
              style={ink}
            />
          </div>

          {/* Client Services */}
          <div>
            <h2 className="font-bold uppercase mb-2">{t("clientServices")}</h2>
            <ul className="space-y-2">
              <li><Link href="/legal/shipping" className="hover:underline" style={ink}>{t("shipping")}</Link></li>
              <li><Link href="/legal/payment" className="hover:underline" style={ink}>{t("payment")}</Link></li>
              <li><Link href="/legal/returns" className="hover:underline" style={ink}>{t("returns")}</Link></li>
            </ul>
          </div>

          {/* Logo */}
          <div className="flex justify-start md:justify-center items-center md:items-start">
            {isWave ? (
              <CroppedLogo
                bases={["/images/the-wave-logo"]}
                alt="TheWave"
                className="h-12 w-auto"
                style={{ filter: "brightness(0)", opacity: 0.85 }}
              />
            ) : (
              <Image
                src={logo}
                width={150}
                height={150}
                alt="logo"
                className="object-contain"
                priority
              />
            )}
          </div>
        </div>

        {/* Bottom links */}
        <div className={isWave ? "border-t border-current mt-10 pt-6" : "border-t border-white mt-10 pt-6"}>
          <div className="max-w-6xl mx-auto flex flex-wrap justify-center md:justify-between text-xs md:text-sm gap-4 md:gap-8 text-center">
            <Link href="/legal/terms" className="hover:underline" style={ink}>{t("legalTerms").toUpperCase()}</Link>
            <Link href="/legal/contact" className="hover:underline" style={ink}>{t("contact").toUpperCase()}</Link>
            <Link href="/privacy" className="hover:underline" style={ink}>{t("privacyPolicy").toUpperCase()}</Link>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
