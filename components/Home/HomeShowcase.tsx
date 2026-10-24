"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSiteCopy } from "@/lib/siteCopy";
import Product from "@/components/Product";
import IntroReveal from "@/components/IntroReveal";
import type { ProductType } from "@/types/product";

/* ====================================================================
   VITRINE DE L'ACCUEIL (comme la page FY'grances)
   - un grand visuel (la slide en cours) qui change tout seul, lentement, avec un fondu ;
     glisser le doigt dessus (ou toucher une pastille) change de slide
   - les pastilles = les pages du carrousel
   - dessous : les produits phares de la slide en cours + « Tout voir » vers la page complète
   Les slides, leurs textes et leurs produits se règlent dans l'admin : Accueil (hero) → Carrousel de l'accueil.

   RÉGLAGES : AUTO_MS = temps entre deux slides · AUTO_IDLE = pause après un geste du visiteur
   ==================================================================== */

const AUTO_MS = 7000;
const AUTO_IDLE = 14000;
const LINE = "color-mix(in srgb, currentColor 22%, transparent)";

export type Slide = {
  key: string;
  label: string;
  href: string;
  image: string;
  kind: string;
  text?: string;
  product_ids?: number[];
};

const VIEW_ALL: Record<string, string> = { fr: "Tout voir", nl: "Alles bekijken", ja: "すべて見る", en: "View all" };

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const BLOOM_IMAGE = "/images/home-feature.jpeg";
const BLOOM_LINK = "/collections/when-the-flowers-bloom";
const FYGRANCES_IMAGE = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

export default function HomeShowcase({
  initialSlides = null,
  slideProducts = {},
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
}) {
  const copy = useSiteCopy();
  const locale = useLocale();
  const viewAll = VIEW_ALL[locale.slice(0, 2)] ?? VIEW_ALL.en;

  const slides: Slide[] =
    initialSlides && initialSlides.length
      ? initialSlides
      : [
          { key: "bloom", label: copy.bloomTitle, href: BLOOM_LINK, image: BLOOM_IMAGE, kind: "Collection" },
          { key: "fygrances", label: "FY'grances", href: FYGRANCES_LINK, image: FYGRANCES_IMAGE, kind: "Fragrance" },
        ];
  const n = slides.length;

  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);
  const st = useRef({ nextAt: 0, visible: true, flat: false, dragging: false, startX: 0, startY: 0, suppress: false });

  const go = useCallback(
    (i: number, manual = true) => {
      setActive(((i % n) + n) % n);
      st.current.nextAt = performance.now() + (manual ? AUTO_IDLE : AUTO_MS);
    },
    [n]
  );

  // défilement automatique : seulement quand la page est visible, l'intro finie, et sans « Moins d'animations »
  useEffect(() => {
    const el = root.current;
    if (!el || n < 2) return;
    const s = st.current;
    const html = document.documentElement;
    s.flat =
      html.classList.contains("a11y-calm") ||
      html.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => (s.visible = e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    s.nextAt = performance.now() + AUTO_MS;
    const id = window.setInterval(() => {
      const now = performance.now();
      const ok = s.visible && !s.flat && !s.dragging && document.visibilityState === "visible" && (window as any).__loaderVisualDone;
      if (!ok) {
        s.nextAt = Math.max(s.nextAt, now + AUTO_MS);
        return;
      }
      if (now >= s.nextAt) {
        setActive((a) => (a + 1) % n);
        s.nextAt = now + AUTO_MS;
      }
    }, 500);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [n]);

  // glisser sur le grand visuel : slide suivante / précédente
  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.suppress = false;
  };
  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    s.dragging = false;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      s.suppress = true;
      window.setTimeout(() => (s.suppress = false), 80);
      go(active + (dx < 0 ? 1 : -1));
    }
  };

  const current = slides[active];
  const products = slideProducts[current.key] ?? [];

  return (
    <section ref={root} data-no-reveal className="mx-auto mb-28 mt-28 w-11/12 max-w-6xl sm:mb-40 sm:mt-36" aria-label="FYSU">
      <style>{`@keyframes hs-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div className="grid gap-8 md:grid-cols-[minmax(0,460px)_1fr] md:items-center md:gap-14">
        {/* GRAND VISUEL : les slides sont superposées, celle en cours est visible */}
        <div
          data-hero-image=""
          className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-3xl bg-neutral-200 dark:bg-neutral-800"
          style={{ touchAction: "pan-y" }}
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={() => (st.current.dragging = false)}
        >
          {slides.map((s, i) => (
            <div
              key={s.key}
              data-ring-img={i}
              className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
              style={{ opacity: i === active ? 1 : 0 }}
              aria-hidden={i !== active}
            >
              {isVideo(s.image) ? (
                <video src={s.image} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-center" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.image} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
              )}
            </div>
          ))}
          <Link
            href={current.href}
            draggable={false}
            aria-label={current.label}
            className="absolute inset-0 z-10"
            onClick={(e) => {
              if (st.current.suppress) e.preventDefault();
            }}
          />
        </div>

        {/* TITRE + TEXTE : tous empilés dans la même case (pas de saut de hauteur), celui en cours est visible */}
        <IntroReveal delay={0.2}>
          <div className="grid">
            {slides.map((s, i) => (
              <div
                key={s.key}
                className="transition-opacity duration-[700ms] ease-in-out"
                style={{ gridArea: "1 / 1", opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
                aria-hidden={i !== active}
              >
                <p className="font-info text-[11px] uppercase tracking-[0.3em] opacity-60">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-3xl font-light leading-tight tracking-tight sm:text-5xl">{s.label}</h2>
                {s.text && (
                  <div className="mt-6 border-t pt-6" style={{ borderColor: LINE }}>
                    <p className="max-w-md whitespace-pre-line text-sm leading-relaxed opacity-80 sm:text-base">{s.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </IntroReveal>
      </div>

      {/* PASTILLES = pages du carrousel · TOUT VOIR */}
      <IntroReveal delay={0.3} className="mt-10 sm:mt-14">
        <div className="flex items-center justify-between gap-4">
          <div role="tablist" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {slides.map((s, i) => {
              const on = i === active;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => go(i)}
                  className="shrink-0 cursor-pointer touch-manipulation whitespace-nowrap rounded-full px-4 py-2 text-xs transition active:scale-95"
                  style={
                    on
                      ? { background: "var(--foreground)", color: "var(--background)", border: "1px solid transparent" }
                      : { background: "transparent", color: "inherit", border: `1px solid ${LINE}` }
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <Link
            href={current.href}
            className="font-info shrink-0 border-b border-current pb-px text-[11px] uppercase tracking-[0.2em] opacity-80"
          >
            {viewAll} →
          </Link>
        </div>
      </IntroReveal>

      {/* PRODUITS PHARES de la slide en cours */}
      {products.length > 0 && (
        <IntroReveal delay={0.4} className="mt-8">
          <div key={current.key} style={{ animation: "hs-fade 0.6s ease both" }}>
            <div className="no-scrollbar flex touch-pan-x snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2">
              {products.map((product) => (
                <div key={product.id} className="w-[220px] flex-shrink-0 snap-start sm:w-[260px] md:w-[300px]">
                  <Product showArrows product={product} />
                </div>
              ))}
            </div>
          </div>
        </IntroReveal>
      )}
    </section>
  );
}
