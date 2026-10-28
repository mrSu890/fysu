"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useSiteCopy } from "@/lib/siteCopy";
import Product from "@/components/Product";
import ViewToggle from "@/components/ViewToggle";
import IntroReveal from "@/components/IntroReveal";
import type { ProductType } from "@/types/product";

/* ====================================================================
   VITRINE DE L'ACCUEIL (comme la page FY'grances)
   - un grand visuel (la slide en cours) qui change tout seul, lentement, avec un fondu ;
     glisser le doigt dessus (ou toucher une pastille) change de slide
   - les pastilles = les pages du carrousel
   - dessous : les produits phares de la slide en cours + « Tout voir » vers la page complète
   Les slides, leurs textes et leurs produits se règlent dans l'admin : Accueil (hero) → Carrousel de l'accueil.

   Le changement de slide est en 3D (les images pivotent), il suit le doigt quand on glisse.
   Purement manuel : on glisse sur l'image ou on touche une pastille (pas de défilement automatique).
   ==================================================================== */

const PERSPECTIVE = 1100; // force de la 3D (plus petit = plus marqué)
const TURN = 52; // angle de rotation des images (degrés)
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

const DISCOVER: Record<string, string> = { fr: "Découvrir", nl: "Ontdekken", ja: "見る", en: "Discover" };

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const BLOOM_IMAGE = "/images/home-feature.jpeg";
const BLOOM_LINK = "/collections/when-the-flowers-bloom";
const FYGRANCES_IMAGE = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

export default function HomeShowcase({
  initialSlides = null,
  slideProducts = {},
  openKey = 0,
  openIndex = 0,
  cardHidden = false,
  onClose,
  onIndex,
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
  openKey?: number; // change à chaque ouverture
  openIndex?: number; // slide affichée à l'ouverture
  cardHidden?: boolean; // pendant le voyage de l'image (c'est un calque qui la montre)
  onClose?: () => void;
  onIndex?: (i: number) => void;
}) {
  const copy = useSiteCopy();
  const locale = useLocale();
  const discover = DISCOVER[locale.slice(0, 2)] ?? DISCOVER.en;
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
  const stage = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({
    pos: 0, tgt: 0, rate: 0.1, raf: 0, last: 0,
    dragging: false, startX: 0, startY: 0, startTgt: 0, moved: 0, w: 1,
  });

  // place chaque image selon sa distance à la position courante (0 = devant, ±1 = voisines)
  const apply = useCallback(() => {
    const p = st.current.pos;
    for (let i = 0; i < n; i++) {
      const el = panels.current[i];
      if (!el) continue;
      let d = (((i - p) % n) + n) % n;
      if (d > n / 2) d -= n;
      const a = Math.abs(d);
      if (a >= 1) {
        el.style.visibility = "hidden";
        continue;
      }
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${d * 100}%,0,${-a * 160}px) rotateY(${-d * TURN}deg)`;
      el.style.zIndex = String(Math.round((1 - a) * 10));
    }
  }, [n]);

  const loop = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - s.last);
      s.last = now;
      if (!s.dragging) {
        const k = 1 - Math.pow(1 - s.rate, dt / 16);
        s.pos += (s.tgt - s.pos) * k;
        if (Math.abs(s.tgt - s.pos) < 0.0015) s.pos = s.tgt;
      }
      apply();
      if (s.dragging || s.pos !== s.tgt) s.raf = requestAnimationFrame(tick);
      else s.raf = 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, [apply]);

  const goTo = useCallback(
    (target: number, rate: number) => {
      const s = st.current;
      s.tgt = target;
      s.rate = rate;
      const idx = ((Math.round(target) % n) + n) % n;
      setActive(idx);
      onIndex?.(idx);
      loop();
    },
    [n, loop, onIndex]
  );

  // pastille : on prend le chemin le plus court
  const pick = (i: number) => {
    const s = st.current;
    const cur = ((Math.round(s.tgt) % n) + n) % n;
    let diff = i - cur;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    goTo(Math.round(s.tgt) + diff, 0.1);
  };

  useEffect(() => {
    apply();
    return () => cancelAnimationFrame(st.current.raf);
  }, [apply]);

  // à chaque ouverture : on se place sur la slide qui était au milieu du carrousel
  useEffect(() => {
    if (!openKey) return;
    const s = st.current;
    s.pos = s.tgt = openIndex;
    setActive(openIndex);
    onIndex?.(openIndex);
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  // glisser sur le grand visuel : les images suivent le doigt
  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    s.dragging = true;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.startTgt = Math.round(s.tgt);
    s.moved = 0;
    s.w = stage.current?.getBoundingClientRect().width || 1;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.startX;
    s.moved = Math.max(s.moved, Math.abs(dx), Math.abs(e.clientY - s.startY));
    if (Math.abs(dx) > 6) {
      s.pos = s.startTgt - dx / s.w;
      s.tgt = s.pos;
      loop();
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.dragging) return;
    s.dragging = false;
    const dx = e.clientX - s.startX;
    let target = s.startTgt;
    if (Math.abs(dx) > 36) target = s.startTgt + (dx < 0 ? 1 : -1);
    goTo(target, 0.12);
  };

  const current = slides[active];
  // Womenswear / Menswear : la slide décide du genre du modèle (pas de choix homme / femme)
  const slideWho: "men" | "women" | null = /for-her/.test(current.href) ? "women" : /for-him/.test(current.href) ? "men" : null;
  const products = slideProducts[current.key] ?? [];

  return (
    <section ref={root} data-no-reveal className="mx-auto mb-28 mt-28 w-11/12 max-w-6xl sm:mb-40 sm:mt-36" aria-label="FYSU">
      <style>{`@keyframes hs-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <div className="grid grid-cols-[11fr_9fr] items-center gap-4 sm:gap-8 md:grid-cols-[minmax(0,460px)_1fr] md:gap-14">
        {/* GRAND VISUEL : les images pivotent en 3D, celle de devant est la slide en cours */}
        <div
          ref={stage}
          data-card=""
          className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-3xl bg-neutral-200 dark:bg-neutral-800"
          style={{ touchAction: "pan-y", perspective: PERSPECTIVE, isolation: "isolate", visibility: cardHidden ? "hidden" : "visible" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {slides.map((s, i) => (
            <div
              key={s.key}
              ref={(el) => {
                panels.current[i] = el;
              }}
              className="absolute inset-0 overflow-hidden rounded-3xl will-change-transform"
              style={{ visibility: i === 0 ? "visible" : "hidden", backfaceVisibility: "hidden" }}
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
          {onClose && (
            <button
              type="button"
              aria-label="Fermer"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={onClose}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white backdrop-blur-md"
              style={{ background: "rgba(0,0,0,0.28)" }}
            >
              <span aria-hidden="true" className="relative block h-3 w-3">
                <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 -rotate-45 bg-current" />
              </span>
            </button>
          )}
          <Link
            href={current.href}
            draggable={false}
            aria-label={current.label}
            className="absolute inset-0 z-20"
            onClick={(e) => {
              if (st.current.moved > 8) e.preventDefault();
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
                <p className="font-info text-[10px] uppercase tracking-[0.3em] opacity-60 sm:text-[11px]">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 text-xl font-light leading-tight tracking-tight sm:mt-3 sm:text-3xl md:text-5xl">{s.label}</h2>
                {s.text && (
                  <div className="mt-3 border-t pt-3 sm:mt-6 sm:pt-6" style={{ borderColor: LINE }}>
                    <p className="max-w-md whitespace-pre-line text-xs leading-relaxed opacity-80 sm:text-sm md:text-base">{s.text}</p>
                  </div>
                )}
                <Link
                  href={s.href}
                  tabIndex={i === active ? 0 : -1}
                  className="font-info mt-4 inline-block border-b border-current pb-px text-[10px] uppercase tracking-[0.2em] opacity-55 sm:mt-6 sm:text-[11px]"
                >
                  {discover} →
                </Link>
              </div>
            ))}
          </div>
        </IntroReveal>
      </div>

      {/* PASTILLES = pages du carrousel */}
      <IntroReveal delay={0.3} className="mt-8 sm:mt-12">
        <div role="tablist" className="flex flex-wrap gap-2">
          {slides.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(i)}
                className="cursor-pointer touch-manipulation whitespace-nowrap rounded-full px-4 py-2 text-xs transition active:scale-95"
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
      </IntroReveal>

      {/* PRODUITS PHARES de la slide en cours */}
      {products.length > 0 && (
        <IntroReveal delay={0.4} className="mt-8">
          <div key={current.key} style={{ animation: "hs-fade 0.6s ease both" }}>
            {/* vue à plat / modèle (et homme / femme), valable pour tout le site */}
            <div className="mb-3 flex justify-end">
              <ViewToggle fixedWho={slideWho} products={products} />
            </div>
            <div className="no-scrollbar flex touch-pan-x snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2">
              {products.map((product) => (
                <div key={product.id} className="w-[220px] flex-shrink-0 snap-start sm:w-[260px] md:w-[300px]">
                  <Product showArrows product={product} forceWho={slideWho} />
                </div>
              ))}
              {/* « Tout voir » : n'apparaît qu'au bout de la sélection */}
              <div className="w-[160px] flex-shrink-0 snap-start sm:w-[190px] md:w-[220px]">
                <Link
                  href={current.href}
                  className="font-info flex aspect-[3/4] w-full items-center justify-center rounded-3xl text-[11px] uppercase tracking-[0.2em] transition active:scale-95"
                  style={{ border: `1px solid ${LINE}` }}
                >
                  {viewAll} →
                </Link>
              </div>
            </div>
          </div>
        </IntroReveal>
      )}
    </section>
  );
}
