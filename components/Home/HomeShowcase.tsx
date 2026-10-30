"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { prefetchProduct } from "@/lib/productCache";
import { useLocale } from "next-intl";
import { useSiteCopy } from "@/lib/siteCopy";
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

// petite vignette produit (sans nom ni prix) : l'image seule, qui voyage vers la fiche au toucher
export function Tile({ product, who }: { product: ProductType; who: "men" | "women" | null }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const imgs = ((product as any).product_images ?? []) as { url: string; worn_for?: string | null }[];
  const src = (imgs.find((i) => !i.worn_for) ?? imgs[0])?.url;
  const path = `/product/${product.slug}`;
  const go = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    try {
      if (who) sessionStorage.setItem("fysu-who", who);
      else sessionStorage.removeItem("fysu-who");
    } catch {}
    try {
      const w = window as any;
      const el = box.current?.querySelector("img") as HTMLImageElement | null;
      const shown = el?.currentSrc || el?.src;
      if (w.__fysuHero && shown && product.brand !== "thewave" && w.__fysuHero(box.current, path, shown)) return;
    } catch {}
    const handled = (window as any).__fysuNavigate?.(path);
    if (!handled) router.push(path);
  };
  return (
    <div data-href={path} onPointerEnter={() => prefetchProduct(product.slug)} onPointerDown={() => prefetchProduct(product.slug)}>
      <Link href={path} onClick={go} aria-label={product.name} draggable={false} className="block">
        <div ref={box} data-card-box="" className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 transition active:scale-[0.98]">
          {src && <Image src={src} alt="" fill draggable={false} sizes="(max-width: 768px) 30vw, 170px" className="object-cover" />}
        </div>
      </Link>
    </div>
  );
}

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
    <section ref={root} data-no-reveal className="mx-auto mb-28 mt-28 w-11/12 max-w-xl sm:mb-40 sm:mt-36" aria-label="FYSU">
      <style>{`@keyframes hs-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* GRAND VISUEL : les images pivotent en 3D, celle de devant est la slide en cours */}
      <div
        ref={stage}
        data-card=""
        className="relative aspect-[4/5] w-full select-none overflow-hidden"
        style={{ touchAction: "pan-y", perspective: PERSPECTIVE, isolation: "isolate", opacity: cardHidden ? 0 : 1 }}
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
            className="absolute inset-0 overflow-hidden will-change-transform"
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
            className="absolute right-1 top-1 z-30 flex h-9 w-9 cursor-pointer items-center justify-center text-white opacity-80 transition-opacity hover:opacity-100"
            style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.45))" }}
          >
            <span aria-hidden="true" className="relative block h-2.5 w-2.5">
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

      {/* TITRE de la slide en cours (tous empilés dans la même case : pas de saut de hauteur) */}
      <IntroReveal delay={0.2}>
        <div className="mt-4 grid">
          {slides.map((s, i) => (
            <div
              key={s.key}
              className="transition-opacity duration-[700ms] ease-in-out"
              style={{ gridArea: "1 / 1", opacity: i === active ? 1 : 0, pointerEvents: i === active ? "auto" : "none" }}
              aria-hidden={i !== active}
            >
              <h2 className="text-xl font-light leading-tight tracking-tight sm:text-2xl">{s.label}</h2>
            </div>
          ))}
        </div>
      </IntroReveal>

      {/* TROIS PRODUITS choisis dans l'admin pour la slide en cours : l'image seule, sans nom ni prix */}
      {products.length > 0 && (
        <IntroReveal delay={0.3} className="mt-5">
          <div key={current.key} className="grid grid-cols-3 gap-2" style={{ animation: "hs-fade 0.6s ease both" }}>
            {products.slice(0, 3).map((product) => (
              <Tile key={product.id} product={product} who={slideWho} />
            ))}
          </div>
        </IntroReveal>
      )}
    </section>
  );
}
