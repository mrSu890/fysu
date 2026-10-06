"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSiteCopy } from "@/lib/siteCopy";

/* ====================================================================
   CARROUSEL INFINI DE L'ACCUEIL (remplace les deux blocs image + texte)
   Une grande image au centre, les voisines qui dépassent, le nom au-dessus.
   On fait glisser avec le doigt (ou les flèches sur ordinateur) et ça tourne sans fin.
   Les slides se gèrent dans l'admin : Accueil (hero) → Carrousel de l'accueil.
   ==================================================================== */

const COPIES = 5; // la liste est répétée pour pouvoir tourner sans fin
const GAP_LEFT = 14; // petit espace à gauche de l'écran (en pixels)

type Slide = { key: string; label: string; href: string; image: string; kind: string };

const BLOOM_IMAGE = "/images/home-feature.jpeg";
const BLOOM_LINK = "/collections/when-the-flowers-bloom";
const FYGRANCES_IMAGE = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

const NewSelectionIntro = () => {
  const copy = useSiteCopy();
  const scroller = useRef<HTMLDivElement>(null);

  // slides réglées dans l'admin (Accueil → Carrousel) ; sinon les deux slides d'origine
  const [custom, setCustom] = useState<Slide[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/collectionPages?carousel=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !Array.isArray(d?.slides) || d.slides.length === 0) return;
        setCustom(
          d.slides.map((s: any, i: number) => ({
            key: String(s.id || i),
            label: String(s.label || ""),
            href: String(s.href || "/"),
            image: String(s.image || ""),
            kind: String(s.kind || ""),
          }))
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const slides: Slide[] = custom ?? [
    { key: "bloom", label: copy.bloomTitle, href: BLOOM_LINK, image: BLOOM_IMAGE, kind: "Collection" },
    { key: "fygrances", label: "FY'grances", href: FYGRANCES_LINK, image: FYGRANCES_IMAGE, kind: "Fragrance" },
  ];
  const n = slides.length;

  // largeur d'un « tour » complet de la liste (en pixels)
  const setWidth = useCallback(() => {
    const el = scroller.current;
    if (!el) return 0;
    const first = el.querySelector<HTMLElement>('[data-slide="0"]');
    const next = el.querySelector<HTMLElement>(`[data-slide="${n}"]`);
    return first && next ? next.offsetLeft - first.offsetLeft : 0;
  }, [n]);

  // on démarre au milieu, sur la première slide
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const place = () => {
      const w = setWidth();
      if (!w) return;
      const first = el.querySelector<HTMLElement>(`[data-slide="${n * 2}"]`);
      if (!first) return;
      el.style.scrollSnapType = "none";
      el.scrollLeft = first.offsetLeft - GAP_LEFT;
      requestAnimationFrame(() => (el.style.scrollSnapType = ""));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [n, setWidth]);

  // quand le défilement s'arrête, on revient discrètement au tour du milieu (même image, même place)
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let timer = 0;
    const settle = () => {
      const w = setWidth();
      if (!w) return;
      const mid = el.scrollLeft - w * 2;
      // distance (en tours) par rapport au tour du milieu
      const turns = Math.round(mid / w);
      if (turns === 0) return;
      el.style.scrollSnapType = "none";
      el.scrollLeft -= turns * w;
      requestAnimationFrame(() => (el.style.scrollSnapType = ""));
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [setWidth]);

  const items = Array.from({ length: COPIES * n }, (_, i) => ({ s: slides[i % n], i }));

  return (
    <section data-no-reveal className="relative mb-20 mt-20 w-full sm:mb-28 sm:mt-28" aria-label="FYSU">
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory scroll-pl-[14px] gap-[14px] overflow-x-auto overscroll-x-contain px-[14px] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map(({ s, i }) => (
          <Link
            key={i}
            data-slide={i}
            href={s.href}
            aria-hidden={i < n * 2 || i >= n * 3 ? true : undefined}
            tabIndex={i < n * 2 || i >= n * 3 ? -1 : undefined}
            className="group w-[80vw] max-w-[460px] shrink-0 snap-start"
          >
            <p
              className="mb-3 text-[13px] uppercase tracking-[0.02em] text-foreground sm:text-sm"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 200 }}
            >
              {s.label}
            </p>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
              {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.image) ? (
                <video
                  src={s.image}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.image}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              )}
            </div>
          </Link>
        ))}
      </div>

    </section>
  );
};

export default NewSelectionIntro;
