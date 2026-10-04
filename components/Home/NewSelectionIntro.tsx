"use client";

import { useState } from "react";
import Link from "next/link";
import { useSiteCopy } from "@/lib/siteCopy";

// Photo : envoie-la dans public/images sous le nom home-feature.jpeg
const FEATURE_SRC = "/images/home-feature.jpeg";
const COLLECTION_LINK = "/collections/when-the-flowers-bloom";

const NewSelectionIntro = () => {
  const [imageFailed, setImageFailed] = useState(false);
  const copy = useSiteCopy();

  return (
    <section className="w-full mt-16 mb-28 sm:mt-28 sm:mb-44 grid grid-cols-2 items-center">
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
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-5xl">
          {copy.bloomTitle}
        </h2>

        <p className="mt-4 text-xs font-light leading-relaxed text-foreground/75 sm:mt-6 sm:text-base">
          {copy.bloomText}
        </p>

        <Link
          href={COLLECTION_LINK}
          className="mt-8 inline-flex items-center gap-2 border-b border-foreground/40 pb-1 text-[10px] font-light uppercase tracking-[0.25em] text-foreground transition-opacity hover:opacity-60 sm:mt-10 sm:text-xs"
        >
          {copy.learnMore}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
};

export default NewSelectionIntro;
