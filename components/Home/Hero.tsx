"use client";

import RainFill from "@/components/RainFill";
import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { useLocale } from "next-intl";
import LogoIntro from "@/components/Home/LogoIntro";
import ThemeToggle from "@/components/ThemeToggle";
import IntroReveal from "@/components/IntroReveal";
import { fixedTitle } from "@/lib/fixedTitles";

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
const PRONUNCIATION = "/faɪ.su/"; // transcription phonétique (API)
const INTRO: Record<string, string> = {
  fr: "FYSU est une maison de vêtements, de parfums et de sons. Des pièces faites pour être gardées et portées.",
  en: "FYSU is a house of clothing, scent and sound. Pieces made to be kept and lived in.",
  nl: "FYSU is een huis van kleding, geur en geluid. Stukken gemaakt om te bewaren en te dragen.",
  ja: "FYSUは、服と香りと音をつくるメゾン。長く着るためのピース。",
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

  return (
    <section
      data-no-reveal
      className="relative w-full"
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
      {/* GRANDE IMAGE : le gros logo FYSU rose est posé dessus ; toucher l'image mène à Kiban Collector */}
      <div className="relative z-0 h-[62svh] min-h-[360px] w-full overflow-hidden bg-neutral-300 dark:bg-neutral-800 lg:h-[100svh]">
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
        <Link href="/kiban-collector" aria-label="Kiban Collector" className="absolute inset-0 z-10" />
        <LogoIntro />
      </div>
    </section>
  );
};

export default HomeHero;

/* ====================================================================
   BLOC TEXTE « FYSU » (prononciation, phrase, interrupteur clair/sombre, For him / For her)
   Posé juste sous le carrousel du début.
   ==================================================================== */
export function HomeIntroText() {
  const locale = useLocale();
  const intro = INTRO[locale] ?? INTRO.en;

  return (
    <section data-no-reveal className="relative w-full px-7 pb-20 pt-4 text-left sm:px-14 lg:px-20">
      {/* pluie sur le fond de ce bloc (son fond plein cacherait la pluie globale) */}
      <RainFill />
      <IntroReveal delay={0.1}>
        <p className="font-info text-[10px] font-light uppercase tracking-[0.06em] text-foreground/55 sm:text-[11px]">
          {PRONUNCIATION}
        </p>
      </IntroReveal>

      <IntroReveal className="mt-10 sm:mt-12" delay={0.2}>
        <p className="max-w-[24em] text-[clamp(15px,2vw,18px)] font-light leading-[1.6] tracking-[-0.01em] text-foreground">
          {intro}
        </p>
      </IntroReveal>

      <div className="mt-8 -mb-4 w-full sm:mt-10 [&_div.relative]:!top-0 [&_div.relative]:!justify-start [&_div.relative]:!py-2">
        <IntroReveal delay={0.3} mask={false}>
          <ThemeToggle />
        </IntroReveal>
      </div>

      <IntroReveal className="mt-14" delay={0.4}>
        <div className="font-info flex gap-8 text-[11px] font-light uppercase tracking-[0.06em] text-foreground/60">
          <Link href={LEFT_LINK} className="transition-opacity hover:opacity-60">
            {fixedTitle("For him", locale) ?? "For him"}
          </Link>
          <Link href={RIGHT_LINK} className="transition-opacity hover:opacity-60">
            {fixedTitle("For her", locale) ?? "For her"}
          </Link>
        </div>
      </IntroReveal>
    </section>
  );
}
