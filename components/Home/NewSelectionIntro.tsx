"use client";

import { useState } from "react";
import Link from "next/link";

// Photo : envoie-la dans public/images sous le nom home-feature.jpeg
const FEATURE_SRC = "/images/home-feature.jpeg";
const COLLECTION_LINK = "/collections/when-the-flowers-bloom";

const NewSelectionIntro = () => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section className="w-full mt-10 mb-20 sm:mt-16 sm:mb-28 grid grid-cols-2 items-center">
      {/* Image collée à gauche, recadrée (elle ne s'affiche pas en entier) */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-200">
        {!imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={FEATURE_SRC}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      {/* Texte + bouton à droite */}
      <div className="px-4 sm:px-10 lg:px-16 max-w-xl">
        <h2 className="text-sm sm:text-xl uppercase text-foreground">
          When the flowers bloom
        </h2>

        <p className="mt-3 text-xs sm:text-base leading-snug text-foreground/80">
          A recurring timeless spring collection built around an expressive,
          young and curious style. The collection appears every year during
          spring then vanishes until when the flowers bloom again.
        </p>

        <Link
          href={COLLECTION_LINK}
          className="mt-6 inline-flex items-center gap-2 border border-foreground px-3 py-2 sm:px-5 sm:py-3 text-[10px] sm:text-sm uppercase tracking-widest text-foreground transition-opacity hover:opacity-60"
        >
          Learn more
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
};

export default NewSelectionIntro;
