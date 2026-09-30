"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteCopy } from "@/lib/siteCopy";

const IMAGE_SRC = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

const FygrancesIntro = () => {
  const pathname = usePathname();
  const copy = useSiteCopy();

  // Ce bloc n'apparaît que sur la page d'accueil
  if (pathname !== "/") return null;

  return (
    <section className="w-full mt-24 mb-10 grid grid-cols-2 items-center">
      {/* Image collée à gauche, recadrée */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-200">
        <Image
          src={IMAGE_SRC}
          alt="FY'grances"
          fill
          sizes="50vw"
          className="object-cover object-center"
        />
      </div>

      {/* Texte + bouton à droite */}
      <div className="px-4 sm:px-10 lg:px-16 max-w-xl">
        <h2 className="text-sm sm:text-xl uppercase text-foreground">
          FY&apos;grances
        </h2>

        <p className="mt-3 text-xs sm:text-base leading-snug text-foreground/80">
          {copy.fygrancesText}
        </p>

        <Link
          href={FYGRANCES_LINK}
          style={{ color: "var(--foreground)" }}
          className="mt-6 inline-flex items-center gap-2 border border-foreground px-3 py-2 sm:px-5 sm:py-3 text-[10px] sm:text-sm uppercase tracking-widest transition-opacity hover:opacity-60"
        >
          {copy.learnMore}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
};

export default FygrancesIntro;
