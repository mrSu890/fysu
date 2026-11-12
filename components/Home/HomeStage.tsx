"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NewSelectionIntro from "@/components/Home/NewSelectionIntro";
import FeaturedShowcase, { type FeaturedItem } from "@/components/Home/FeaturedShowcase";
import type { Slide } from "@/components/Home/HomeShowcase";
import type { ProductType } from "@/types/product";

/* ====================================================================
   HAUT DE L'ACCUEIL
   1. au chargement : le carrousel 3D s'ouvre (les images s'écartent comme avant)
   2. puis il laisse la place à la sélection : grande image, miniatures sur le côté, nom et texte (voir FeaturedShowcase)
   Les pièces viennent de l'admin (Accueil → Carrousel → produits de chaque slide) ; une slide sans produit s'affiche elle-même.
   ==================================================================== */

const MAX_ITEMS = 10;

export default function HomeStage({
  initialSlides = null,
  slideProducts = {},
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
}) {
  const items = useMemo<FeaturedItem[]>(() => {
    const out: FeaturedItem[] = [];
    const seen = new Set<number>();
    for (const s of initialSlides ?? []) {
      const who: "men" | "women" | null = /for-her/.test(s.href) ? "women" : /for-him/.test(s.href) ? "men" : null;
      const list = slideProducts[s.key] ?? [];
      if (list.length === 0) {
        if (s.image && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.image)) out.push({ key: `s-${s.key}`, title: s.label, sub: s.kind, text: (s as any).text ?? "", image: s.image, href: s.href });
        continue;
      }
      for (const p of list) {
        if (seen.has(Number(p.id))) continue;
        const imgs = ((p as any).product_images ?? []) as { url: string; worn_for?: string | null }[];
        const src = (imgs.find((i) => !i.worn_for) ?? imgs[0])?.url;
        if (!src) continue;
        seen.add(Number(p.id));
        out.push({
          key: `p-${p.id}`,
          title: p.name,
          sub: [(p as any).category, p.price ? `${p.price} €` : ""].filter(Boolean).join("  ·  "),
          text: (s as any).text ?? "",
          image: src,
          href: `/product/${p.slug}`,
          slug: p.slug,
          who,
        });
      }
    }
    return out.slice(0, MAX_ITEMS);
  }, [initialSlides, slideProducts]);

  const cont = useRef<HTMLDivElement>(null);
  const show = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ring" | "swap" | "show">("ring");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const settled = () => {
    if (phaseRef.current !== "ring" || itemsRef.current.length === 0) return; // rien à montrer : le carrousel reste
    const ringH = cont.current?.offsetHeight ?? 0;
    setH(ringH);
    setPhase("swap");
    requestAnimationFrame(() => requestAnimationFrame(() => setH(show.current?.offsetHeight ?? null)));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("show");
        setH(null);
      }, 900)
    );
  };

  const showing = phase !== "ring";

  return (
    <div ref={cont} className="grid" style={{ height: h ?? undefined, transition: "height 0.8s cubic-bezier(0.32,0.72,0,1)" }}>
      {phase !== "show" && (
        <div className="[grid-area:1/1]" style={{ opacity: phase === "swap" ? 0 : 1, transition: "opacity 0.55s ease", pointerEvents: phase === "swap" ? "none" : undefined }}>
          <NewSelectionIntro initialSlides={initialSlides} onSettled={settled} tight={false} paused={phase === "swap"} />
        </div>
      )}
      {items.length > 0 && (
        <div
          ref={show}
          className="mb-24 mt-28 self-start [grid-area:1/1] sm:mb-32 sm:mt-36"
          style={{
            opacity: showing ? 1 : 0,
            transition: "opacity 0.7s ease 0.25s",
            pointerEvents: showing ? undefined : "none",
            visibility: showing ? "visible" : "hidden",
          }}
          aria-hidden={!showing}
        >
          <FeaturedShowcase items={items} />
        </div>
      )}
    </div>
  );
}
