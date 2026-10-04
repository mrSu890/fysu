"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { useLocale } from "next-intl";
import ThemeToggle from "@/components/ThemeToggle";

type HeroMedia = {
  media_path: string;
  media_type?: "image" | "video";
};

const SLIDE_DURATION = 6000; // ms

// Pages vers lesquelles renvoient les deux images (à adapter si les adresses diffèrent)
const LEFT_LINK = "/for-him";
const RIGHT_LINK = "/for-her";

/* ====================================================================
   TEXTE DE LA PREMIÈRE PAGE (facile à modifier)
   ==================================================================== */
const PRONUNCIATION = "fai.su";
const INTRO: Record<string, string> = {
  fr: "FYSU est une maison discrète de vêtements, de parfums et de sons. Des pièces faites lentement, pour être gardées et portées.",
  en: "FYSU is a quiet house of clothing, scent and sound. Pieces made slowly, to be kept and lived in.",
};

const isVideoMedia = (item: HeroMedia) =>
  item.media_type === "video" || /\.(mp4|webm|mov)$/i.test(item.media_path);

const getUrl = (path: string) =>
  `https://mugpnlsqeqbojnzrfnjf.supabase.co/storage/v1/object/public/hero-images/${path}`;

// Image ou vidéo plein cadre (simple balise, sans optimisation : jamais de zone vide)
function Media({ item, alt, eager }: { item: HeroMedia; alt: string; eager?: boolean }) {
  const url = getUrl(item.media_path);
  return isVideoMedia(item) ? (
    <video
      src={url}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      autoPlay
      loop
      playsInline
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover object-center"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
    />
  );
}

const HomeHero = ({ initialSlides = [] }: { initialSlides?: HeroMedia[] }) => {
  const locale = useLocale();
  const [slides, setSlides] = useState<HeroMedia[]>(initialSlides);
  const [current, setCurrent] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Si le serveur n'a rien donné, on réessaie depuis le navigateur
  useEffect(() => {
    if (initialSlides.length > 0) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchMedia = async (attempt = 0) => {
      let result: HeroMedia[] | null = null;
      try {
        const { data, error } = await supabaseClient
          .from("hero_slider")
          .select("media_path, media_type")
          .order("order");
        if (!error && data && data.length > 0) result = data as HeroMedia[];
      } catch {
        /* on réessaie */
      }

      if (cancelled) return;
      if (result) {
        setSlides(result);
        return;
      }
      if (attempt < 5) {
        retryTimer = setTimeout(() => fetchMedia(attempt + 1), 700 * (attempt + 1));
      }
    };

    fetchMedia();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [initialSlides.length]);

  const count = slides.length;

  // Défilement lent entre les images (s'il y en a plusieurs)
  useEffect(() => {
    if (count <= 1) return;
    const timer = setTimeout(() => setCurrent((c) => (c + 1) % count), SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, count]);

  const intro = INTRO[locale] ?? INTRO.en;

  return (
    <section
      data-no-reveal
      className="relative w-full lg:grid lg:h-[100svh] lg:grid-cols-2"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start || count <= 1) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          setCurrent((c) => (dx < 0 ? (c + 1) % count : (c - 1 + count) % count));
        }
      }}
    >
      {/* IMAGE : moitié haute (téléphone, iPad) ou moitié gauche (ordinateur) */}
      <div className="relative h-[50svh] min-h-[320px] w-full overflow-hidden bg-neutral-300 dark:bg-neutral-800 lg:h-full">
        {slides.map((item, index) => (
          <div
            key={item.media_path + index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{ opacity: index === current ? 1 : 0 }}
            aria-hidden={index !== current}
          >
            <Media item={item} alt={`FYSU ${index + 1}`} eager={index === 0} />
          </div>
        ))}
      </div>

      {/* VIDE + TEXTE : moitié basse (téléphone, iPad) ou moitié droite (ordinateur) */}
      <div className="relative flex min-h-[50svh] flex-col items-center justify-center px-8 py-16 text-center lg:min-h-0 lg:px-20">
        <p className="text-[11px] font-light uppercase tracking-[0.4em] text-foreground/35 sm:text-xs">
          ( {PRONUNCIATION} )
        </p>

        <p className="mt-8 max-w-[22rem] text-[13px] font-light leading-[1.9] text-foreground/80 sm:mt-10 sm:max-w-md sm:text-sm">
          {intro}
        </p>

        <div className="mt-10 -mb-4 sm:mt-12">
          <ThemeToggle />
        </div>

        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-8 text-[10px] font-light uppercase tracking-[0.3em] text-foreground/45 sm:bottom-8">
          <Link href={LEFT_LINK} className="transition-opacity hover:opacity-60">
            For him
          </Link>
          <Link href={RIGHT_LINK} className="transition-opacity hover:opacity-60">
            For her
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
