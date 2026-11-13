"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useSiteCopy } from "@/lib/siteCopy";
import { Tile, type Slide } from "@/components/Home/HomeShowcase";
import type { ProductType } from "@/types/product";

/* ====================================================================
   HAUT DE L'ACCUEIL : LA PILE QUI S'OUVRE
   - au début : les images du carrousel sont EMPILÉES au milieu de l'écran, toutes de la même taille (celle de l'écran de chargement)
   - toucher la première : elle se déploie vers la droite avec son texte et ses trois produits phares dessous ;
     les autres glissent à gauche en une colonne de vignettes
   - toucher une vignette : la slide ouverte se replie dans la colonne, celle touchée prend sa place (mouvement continu)
   - toucher la grande image ouvre sa page ; toucher un produit ouvre sa fiche
   Les angles sont droits partout. Les slides et leurs produits se règlent dans l'admin (Accueil → Carrousel).
   RÉGLAGES : MOVE = durée du déplacement des images (ms)
   ==================================================================== */

const MOVE = 850;
const CURVE = "cubic-bezier(0.32, 0.72, 0, 1)";

const BLOOM_IMAGE = "/images/home-feature.jpeg";
const BLOOM_LINK = "/collections/when-the-flowers-bloom";
const FYGRANCES_IMAGE = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

const VIEW: Record<string, string> = { fr: "Découvrir", nl: "Ontdekken", ja: "見る", en: "Discover" };

type Rect = { l: number; t: number; w: number; h: number };
const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

export default function HomeStage({
  initialSlides = null,
  slideProducts = {},
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
}) {
  const router = useRouter();
  const copy = useSiteCopy();
  const lang = useLocale().slice(0, 2);
  const slides: Slide[] =
    initialSlides && initialSlides.length
      ? initialSlides
      : [
          { key: "bloom", label: copy.bloomTitle, href: BLOOM_LINK, image: BLOOM_IMAGE, kind: "Collection" },
          { key: "fygrances", label: "FY'grances", href: FYGRANCES_LINK, image: FYGRANCES_IMAGE, kind: "Fragrance" },
        ];
  const n = slides.length;

  const [active, setActive] = useState<number | null>(null); // null = pile fermée
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [anim, setAnim] = useState(false);
  const [peek, setPeek] = useState(false); // la pile : les images de dessous dépassent, une fois l'écran de chargement fini
  const [wrapH, setWrapH] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const slots = useRef<Record<string, HTMLElement | null>>({});
  const animTimer = useRef(0);

  useEffect(() => {
    let t = 0;
    let iv = 0;
    const show = () => {
      setAnim(!calm());
      setPeek(true);
      t = window.setTimeout(() => setAnim(false), MOVE + 100);
    };
    if ((window as any).__loaderVisualDone) t = window.setTimeout(show, 150);
    else
      iv = window.setInterval(() => {
        if ((window as any).__loaderVisualDone) {
          window.clearInterval(iv);
          t = window.setTimeout(show, 250);
        }
      }, 100);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lit la place de chaque image dans la mise en page courante (pile ou ouverte)
  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w) return;
    const wr = w.getBoundingClientRect();
    const next: Record<string, Rect> = {};
    for (const s of slides) {
      const el = active === null ? slots.current["closed"] : active === slides.indexOf(s) ? slots.current["main"] : slots.current[s.key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next[s.key] = { l: r.left - wr.left, t: r.top - wr.top, w: r.width, h: r.height };
    }
    setRects(next);
    if (inner.current) setWrapH(inner.current.offsetHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, n]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // retour depuis une fiche produit : on retrouve la page comme on l'a laissée (même image ouverte), sans animation
  useLayoutEffect(() => {
    try {
      const v = sessionStorage.getItem("fysu-home-active");
      const i = v === null ? NaN : parseInt(v, 10);
      if (Number.isInteger(i) && i >= 0 && i < n) setActive(i);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(() => measure());
    if (wrap.current) ro.observe(wrap.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [measure]);

  const calm = () =>
    typeof document !== "undefined" &&
    (document.documentElement.classList.contains("a11y-calm") ||
      document.documentElement.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const choose = (i: number) => {
    window.clearTimeout(animTimer.current);
    setAnim(!calm());
    setActive(i);
    try {
      sessionStorage.setItem("fysu-home-active", String(i));
    } catch {}
    animTimer.current = window.setTimeout(() => setAnim(false), MOVE + 100);
  };
  // la croix : on referme le carrousel (la pile se replie)
  const close = () => {
    window.clearTimeout(animTimer.current);
    setAnim(!calm());
    setActive(null);
    try {
      sessionStorage.removeItem("fysu-home-active");
    } catch {}
    animTimer.current = window.setTimeout(() => setAnim(false), MOVE + 100);
  };
  useEffect(() => () => window.clearTimeout(animTimer.current), []);

  const [line, setLine] = useState(false); // le trait sous « discover » se dessine au toucher
  const go = (s: Slide) => {
    setLine(true);
    window.setTimeout(() => {
      open(s);
      setLine(false);
    }, calm() ? 0 : 380);
  };
  const open = (s: Slide) => {
    try {
      const handled = (window as any).__fysuNavigate?.(s.href);
      if (!handled) router.push(s.href);
    } catch {
      router.push(s.href);
    }
  };

  const cur = active === null ? null : slides[active];
  const products = cur ? (slideProducts[cur.key] ?? []).slice(0, 3) : [];
  const who: "men" | "women" | null = cur && /for-her/.test(cur.href) ? "women" : cur && /for-him/.test(cur.href) ? "men" : null;
  const dur = anim ? `${MOVE}ms` : "0ms";

  return (
    <section
      ref={wrap}
      aria-label="FYSU"
      className="relative w-full"
      style={{ height: wrapH ?? undefined, minHeight: "100svh", transition: anim ? `height ${MOVE}ms ${CURVE}` : undefined }}
    >
      {/* mise en page (les emplacements) : l'une pour la pile, l'autre pour l'ouverture */}
      <div ref={inner} className="w-full">
        {active === null ? (
          <div className="flex min-h-[100svh] items-center justify-center">
            <div
              ref={(el) => {
                slots.current["closed"] = el;
              }}
              style={{ width: "clamp(140px, 40vw, 210px)", aspectRatio: "4 / 5" }}
            />
          </div>
        ) : (
          <div className="mx-auto w-[90vw] max-w-[1080px] pb-32 pt-32 sm:pt-36">
            <div className="flex gap-4 md:gap-12" style={{ ["--tw" as string]: "clamp(44px, 12vw, 64px)" }}>
              {/* colonne de vignettes */}
              <div className="flex w-[var(--tw)] shrink-0 flex-col gap-2 self-start">
                {slides.map((s, i) =>
                  i === active ? null : (
                    <div
                      key={s.key}
                      ref={(el) => {
                        slots.current[s.key] = el;
                      }}
                      className="aspect-[4/5] w-full"
                    />
                  )
                )}
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-y-8 md:grid-cols-[minmax(150px,230px)_minmax(0,1fr)] md:gap-x-10 md:gap-y-6">
                {/* grande image */}
                <div className="order-1 md:order-none md:col-start-2 md:row-start-1">
                  <div className="relative ml-auto w-[84%] md:w-full md:max-w-[380px]">
                    <div
                      ref={(el) => {
                        slots.current["main"] = el;
                      }}
                      className="aspect-[4/5] w-full"
                    />
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      style={{ zIndex: n + 10 }}
                      className="absolute right-2.5 top-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition active:scale-90"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* texte */}
                <div className="order-2 md:order-none md:col-start-1 md:row-start-1 md:self-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={cur!.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.4, ease: "easeOut" } }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    >
                      <h2 className="text-[19px] font-light leading-[1.1] tracking-tight text-foreground md:text-[22px]">{cur!.label}</h2>
                      {cur!.kind && <p className="font-info mt-2.5 text-[9.5px] uppercase tracking-[0.22em] text-foreground/62">{cur!.kind}</p>}
                      {cur!.text && <p className="mt-5 max-w-[34ch] text-[12px] font-light leading-[1.7] text-foreground/75">{cur!.text}</p>}
                      <button
                        type="button"
                        onClick={() => go(cur!)}
                        className="font-info mt-6 cursor-pointer text-[12px] lowercase tracking-[0.08em] text-foreground/72 transition-colors hover:text-foreground"
                      >
                        <span
                          className="bg-gradient-to-r from-current to-current bg-no-repeat pb-[3px] transition-[background-size] duration-500 ease-out"
                          style={{ backgroundImage: "linear-gradient(currentColor, currentColor)", backgroundPosition: "left bottom", backgroundSize: line ? "100% 1px" : "0% 1px" }}
                        >
                          {VIEW[lang] ?? VIEW.en} →
                        </span>
                      </button>
                    </motion.div>
                  </AnimatePresence>
                </div>

              </div>
            </div>
            {/* trois produits phares de la slide : sur toute la largeur, plus grands */}
            <div className="mt-12 md:mt-16">
              <AnimatePresence mode="wait" initial={false}>
                {products.length > 0 && (
                  <motion.div
                    key={cur!.key}
                    className="grid grid-cols-3 gap-3 md:ml-auto md:max-w-[760px] md:gap-5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.45, ease: "easeOut" } }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  >
                    {products.map((p) => (
                      <Tile key={p.id} product={p} who={who} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* les images : posées sur leurs emplacements, elles glissent d'un emplacement à l'autre */}
      {slides.map((s, i) => {
        const r = rects[s.key];
        const isMain = active === i;
        const closed = active === null;
        // pile : chaque image de dessous dépasse de PEEK px au-dessus de la précédente (3 couches visibles au plus)
        const k = closed && peek ? Math.min(i, 3) : 0;
        const PEEK = 12;
        const sx = k * 7;
        return (
          <div
            key={s.key}
            role="button"
            tabIndex={closed ? (i === 0 ? 0 : -1) : 0}
            aria-hidden={closed && i !== 0 ? true : undefined}
            aria-label={s.label}
            data-hero-image={i === 0 ? "" : undefined}
            data-ring-img={i}
            onClick={() => (closed ? choose(0) : isMain ? open(s) : choose(i))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closed ? choose(0) : isMain ? open(s) : choose(i);
              }
            }}
            className="absolute cursor-pointer touch-manipulation select-none overflow-hidden bg-neutral-200 will-change-[left,top,width,height] dark:bg-neutral-800"
            style={{
              left: (r?.l ?? 0) + sx,
              top: (r?.t ?? 0) - k * PEEK,
              width: Math.max(0, (r?.w ?? 0) - sx * 2),
              height: r?.h ?? 0,
              opacity: r ? 1 : 0,
              zIndex: isMain ? n + 2 : closed ? n - i : 1,
              transition: `left ${dur} ${CURVE}, top ${dur} ${CURVE}, width ${dur} ${CURVE}, height ${dur} ${CURVE}`,
            }}
          >
            {isVideo(s.image) ? (
              <video src={s.image} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
            )}
          </div>
        );
      })}
    </section>
  );
}
