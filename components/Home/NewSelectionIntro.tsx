"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useSiteCopy } from "@/lib/siteCopy";

/* ====================================================================
   CARROUSEL INFINI DE L'ACCUEIL (remplace les deux blocs image + texte)
   Une grande image au centre, les voisines qui dépassent, le nom au-dessus.
   On fait glisser avec le doigt (ou les flèches sur ordinateur) et ça tourne sans fin.
   Les slides se gèrent dans l'admin : Accueil (hero) → Carrousel de l'accueil.
   ==================================================================== */

const COPIES = 5; // la liste est répétée pour pouvoir tourner sans fin

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
      el.scrollLeft = first.offsetLeft - (el.clientWidth - first.offsetWidth) / 2;
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

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    if (!card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 14), behavior: "smooth" });
  };

  const items = Array.from({ length: COPIES * n }, (_, i) => ({ s: slides[i % n], i }));

  return (
    <section data-no-reveal className="relative mb-20 mt-10 w-full sm:mb-28 sm:mt-16" aria-label="FYSU">
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-[14px] overflow-x-auto overscroll-x-contain px-[14vw] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-[calc(50vw-210px)]"
      >
        {items.map(({ s, i }) => (
          <Link
            key={i}
            data-slide={i}
            href={s.href}
            aria-hidden={i < n * 2 || i >= n * 3 ? true : undefined}
            tabIndex={i < n * 2 || i >= n * 3 ? -1 : undefined}
            className="group w-[72vw] max-w-[420px] shrink-0 snap-center"
          >
            <p className="mb-3 flex items-baseline justify-between font-info text-[10px] uppercase tracking-[0.3em] text-foreground/60 sm:text-xs">
              <span className="font-bold text-foreground">{s.label}</span>
              <span>{s.kind}</span>
            </p>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-black">
                <ArrowUpRight size={16} strokeWidth={1.5} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* flèches (ordinateur) */}
      <div className="mt-6 hidden justify-center gap-3 sm:flex">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/30 text-foreground transition-opacity hover:opacity-60"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/30 text-foreground transition-opacity hover:opacity-60"
        >
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
};

export default NewSelectionIntro;
