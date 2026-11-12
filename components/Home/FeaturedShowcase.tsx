"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { prefetchProduct } from "@/lib/productCache";

/* ====================================================================
   SÉLECTION DU HAUT DE L'ACCUEIL (après l'ouverture du carrousel)
   Une grande image au centre (angles droits), une colonne de miniatures sur le côté, le nom et le texte à gauche.
   Toucher une miniature change de pièce en glissant ; ça défile aussi tout seul ; toucher la grande image ouvre la page.
   téléphone : grande image, texte dessous, miniatures en rangée sous l'image.
   RÉGLAGES : AUTO_MS = temps entre deux pièces (ms) · AUTO_IDLE = pause après un toucher (ms)
   ==================================================================== */

const AUTO_MS = 5200;
const AUTO_IDLE = 9000;
const EASE = [0.32, 0.72, 0, 1] as const;

export type FeaturedItem = {
  key: string;
  title: string;
  sub: string;
  text: string;
  image: string;
  href: string;
  slug?: string; // fiche produit : l'image « voyage » jusqu'à la fiche
  who?: "men" | "women" | null;
};

const VIEW: Record<string, string> = { fr: "Voir la pièce", nl: "Bekijk", ja: "見る", en: "View piece" };

export default function FeaturedShowcase({ items }: { items: FeaturedItem[] }) {
  const router = useRouter();
  const lang = useLocale().slice(0, 2);
  const [cur, setCur] = useState(0);
  const [dir, setDir] = useState(1);
  const idle = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const n = items.length;

  const pick = useCallback(
    (i: number, manual = false) => {
      setDir(i >= cur ? 1 : -1);
      setCur(i);
      if (manual) idle.current = Date.now() + AUTO_IDLE;
    },
    [cur]
  );

  useEffect(() => {
    if (n < 2) return;
    const t = window.setInterval(() => {
      if (document.hidden || Date.now() < idle.current) return;
      setDir(1);
      setCur((c) => (c + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n]);

  if (n === 0) return null;
  const it = items[Math.min(cur, n - 1)];

  const go = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!it.slug) return; // lien normal
    e.preventDefault();
    try {
      if (it.who) sessionStorage.setItem("fysu-who", it.who);
      else sessionStorage.removeItem("fysu-who");
    } catch {}
    try {
      const w = window as any;
      const el = box.current?.querySelector("img") as HTMLImageElement | null;
      const shown = el?.currentSrc || el?.src;
      if (w.__fysuHero && shown && w.__fysuHero(box.current, it.href, shown)) return;
    } catch {}
    const handled = (window as any).__fysuNavigate?.(it.href);
    if (!handled) router.push(it.href);
  };

  const slideIn = dir > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";

  return (
    <div className="mx-auto w-[88vw] max-w-[1080px] md:grid md:grid-cols-[56px_minmax(200px,260px)_minmax(0,1fr)] md:items-center md:gap-8 lg:gap-14">
      {/* miniatures : colonne (iPad, ordinateur) */}
      <div className="hidden flex-col gap-2 md:flex" role="tablist" aria-orientation="vertical">
        {items.map((s, i) => (
          <Thumb key={s.key} item={s} on={i === cur} onPick={() => pick(i, true)} />
        ))}
      </div>

      {/* texte */}
      <div className="order-3 mt-6 md:order-none md:mt-0" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={it.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <p className="font-info text-[10px] uppercase tracking-[0.28em] text-foreground/50">{String(Math.min(cur, n - 1) + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</p>
            <h2 className="mt-3 text-[26px] font-light leading-[1.05] tracking-tight text-foreground md:text-[30px]">{it.title}</h2>
            {it.sub && <p className="font-info mt-2 text-[11px] uppercase tracking-[0.18em] text-foreground/55">{it.sub}</p>}
            {it.text && <p className="mt-4 max-w-[34ch] text-[13px] font-light leading-relaxed text-foreground/70">{it.text}</p>}
            <Link
              href={it.href}
              onClick={go}
              className="font-info mt-5 inline-block border-b border-foreground pb-px text-[11px] uppercase tracking-[0.2em] text-foreground transition-opacity hover:opacity-60"
            >
              {VIEW[lang] ?? VIEW.en} →
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* grande image */}
      <Link
        href={it.href}
        onClick={go}
        data-hero-link=""
        aria-label={it.title}
        draggable={false}
        onPointerEnter={() => it.slug && prefetchProduct(it.slug)}
        onPointerDown={() => it.slug && prefetchProduct(it.slug)}
        className="order-1 mx-auto block w-full md:order-none md:ml-auto md:max-w-[440px]"
      >
        <div ref={box} data-card-box="" className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
          <AnimatePresence initial={false}>
            <motion.div
              key={it.key}
              className="absolute inset-0"
              initial={{ clipPath: slideIn }}
              animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
              exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.55 } }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-cover object-center" />
            </motion.div>
          </AnimatePresence>
        </div>
      </Link>

      {/* miniatures : rangée (téléphone) */}
      <div className="no-scrollbar order-2 mt-4 flex gap-2 overflow-x-auto md:hidden">
        {items.map((s, i) => (
          <Thumb key={s.key} item={s} on={i === cur} onPick={() => pick(i, true)} />
        ))}
      </div>
    </div>
  );
}

function Thumb({ item, on, onPick }: { item: FeaturedItem; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      aria-label={item.title}
      onClick={onPick}
      className={`relative h-14 w-14 shrink-0 cursor-pointer touch-manipulation overflow-hidden bg-neutral-200 transition-opacity duration-300 dark:bg-neutral-800 ${on ? "opacity-100" : "opacity-45 hover:opacity-80"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt="" draggable={false} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {on && <span className="absolute inset-0 ring-1 ring-inset ring-foreground" />}
    </button>
  );
}
