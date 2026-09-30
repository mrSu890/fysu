"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSiteCopy } from "@/lib/siteCopy";

type HeroMedia = {
  media_path: string;
  media_type?: "image" | "video";
};

const SLIDE_DURATION = 6000; // ms

// Pages vers lesquelles renvoient les deux images (à adapter si les adresses diffèrent)
const LEFT_LINK = "/for-him";
const RIGHT_LINK = "/for-her";

// Bouton "Discover" quand il n'y a qu'une seule image
const DISCOVER_LINK = "/product/saku-t-1";

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
  const copy = useSiteCopy();
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

  const split = slides.length >= 2;
  const count = slides.length;

  // Défilement automatique (mode une seule image ou plus de 2 : ici mode "une image à la fois")
  useEffect(() => {
    if (split || count <= 1) return;
    const timer = setTimeout(() => setCurrent((c) => (c + 1) % count), SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [current, count, split]);

  // Mode "split" : les 2 premiers médias côte à côte, chacun cliquable
  if (split) {
    const panels = [
      { item: slides[0], href: LEFT_LINK, label: "For him" },
      { item: slides[1], href: RIGHT_LINK, label: "For her" },
    ];
    return (
      <section
        data-no-reveal
        className="relative w-full aspect-[4/3] sm:aspect-[8/5] overflow-hidden bg-neutral-900"
      >
        <div className="absolute inset-0 grid grid-cols-2">
          {panels.map(({ item, href, label }) => (
            <div key={href} className="relative h-full w-full">
              <Link href={href} aria-label={label} className="absolute inset-0 block">
                <Media item={item} alt={label} eager />
              </Link>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const height = "h-[65svh] sm:h-[75svh] lg:h-[100svh] min-h-[400px]";

  return (
    <section
      data-no-reveal
      className={`relative w-full ${height} overflow-hidden bg-neutral-900`}
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
      {slides.map((item, index) => (
        <div
          key={item.media_path + index}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: index === current ? 1 : 0, pointerEvents: index === current ? "auto" : "none" }}
          aria-hidden={index !== current}
        >
          <Media item={item} alt={`Hero media ${index + 1}`} eager={index === 0} />

          <div className="absolute inset-0 flex items-end justify-start px-4">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

            <div className="relative text-white pb-8 sm:pb-12 max-w-[92%]">
              <h2 className="text-xl sm:text-3xl uppercase font-normal tracking-[0.08em] leading-tight">
                {copy.heroTitle}
              </h2>

              <p className="mt-3 font-serif text-sm sm:text-lg">{copy.heroSubtitle}</p>

              <Link
                href={DISCOVER_LINK}
                className="mt-4 inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.12em]"
                style={{ color: "#ffffff" }}
              >
                {copy.discover}
                <span aria-hidden="true">&rsaquo;</span>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {count > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
          <div key={current} className="h-full bg-white animate-progress" />
        </div>
      )}
    </section>
  );
};

export default HomeHero;
