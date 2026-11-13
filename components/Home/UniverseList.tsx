"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

/* ====================================================================
   « DISCOVER THE UNIVERSE » (bas de l'accueil)
   Une liste de lignes (miniature, titre, texte court). Toucher une ligne la déplie en grande carte :
   l'image grandit depuis sa miniature, le fond se grise, un bouton mène à la page. Croix / fond / Échap pour fermer.
   Les lignes se règlent dans l'admin : Accueil (hero) → Chapitres de l'accueil (titre, image, texte, lien).
   ==================================================================== */

export type Universe = { id: string; label: string; href: string; image: string; text?: string };

const TITLE: Record<string, string> = {
  fr: "Découvre l'univers",
  nl: "Ontdek het universum",
  ja: "ユニバースを見る",
  en: "Discover the universe",
};
const ENTER: Record<string, string> = { fr: "entrer", nl: "binnengaan", ja: "入る", en: "enter" };
const CLOSE: Record<string, string> = { fr: "Fermer", nl: "Sluiten", ja: "閉じる", en: "Close" };

const DEFAULTS: Record<string, Universe[]> = {
  fr: [
    { id: "kiban", label: "Kiban Collector", href: "/kiban-collector", image: "", text: "La ligne nocturne de FYSU." },
    { id: "fygrances", label: "FY'grances", href: "/fygrances", image: "", text: "Les parfums de la maison." },
    { id: "music", label: "Musique", href: "/music", image: "", text: "Les sorties et les albums." },
    { id: "arcade", label: "Arcade", href: "/games", image: "", text: "Les jeux hors-ligne FYSU." },
    { id: "about", label: "À propos", href: "/about", image: "", text: "L'histoire de FYSU." },
  ],
  en: [
    { id: "kiban", label: "Kiban Collector", href: "/kiban-collector", image: "", text: "FYSU's night line." },
    { id: "fygrances", label: "FY'grances", href: "/fygrances", image: "", text: "The house fragrances." },
    { id: "music", label: "Music", href: "/music", image: "", text: "Releases and albums." },
    { id: "arcade", label: "Arcade", href: "/games", image: "", text: "FYSU's offline games." },
    { id: "about", label: "About", href: "/about", image: "", text: "The story of FYSU." },
  ],
};

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

function Media({ src, className }: { src: string; className?: string }) {
  if (!src) return <div className={`bg-neutral-300 dark:bg-neutral-700 ${className ?? ""}`} />;
  if (isVideo(src)) return <video src={src} muted loop autoPlay playsInline preload="metadata" className={`object-cover ${className ?? ""}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} className={`object-cover ${className ?? ""}`} />;
}

export default function UniverseList({ items }: { items?: Universe[] | null }) {
  const lang = useLocale().slice(0, 2);
  const calm = useReducedMotion();
  const list = items && items.length ? items : DEFAULTS[lang] ?? DEFAULTS.en;
  const [open, setOpen] = useState<string | null>(null);
  const cur = list.find((u) => u.id === open) ?? null;
  const spring = calm ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.9 };

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", key);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  return (
    <section aria-label={TITLE[lang] ?? TITLE.en} className="mx-auto w-[88vw] max-w-[1080px] pb-28 pt-4 sm:pb-40">
      <div className="flex items-end justify-between border-b border-foreground/20 pb-4">
        <h2 className="text-[22px] font-light tracking-tight sm:text-[28px]">{TITLE[lang] ?? TITLE.en}</h2>
      </div>

      <LayoutGroup>
        <ul>
          {list.map((u) => (
            <li key={u.id} className="border-b border-foreground/10">
              <button
                type="button"
                onClick={() => setOpen(u.id)}
                aria-haspopup="dialog"
                className="group flex w-full cursor-pointer touch-manipulation items-center gap-4 py-3 text-left transition-colors hover:bg-foreground/[0.05] active:bg-foreground/[0.08] sm:gap-6"
              >
                {open === u.id ? (
                  <div className="h-12 w-12 shrink-0 sm:h-14 sm:w-14" />
                ) : (
                  <motion.div layoutId={`uni-img-${u.id}`} transition={spring} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-14">
                    <Media src={u.image} className="absolute inset-0 h-full w-full" />
                  </motion.div>
                )}
                <span className="min-w-0 flex-1 truncate text-[15px] font-light tracking-tight sm:text-[17px]">{u.label}</span>
                {u.text && <span className="hidden min-w-0 flex-1 truncate text-[13px] font-light text-foreground/65 md:block">{u.text}</span>}
                <span aria-hidden="true" className="shrink-0 pr-1 text-foreground/58 transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
            </li>
          ))}
        </ul>

        <AnimatePresence>
          {cur && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={cur.label}>
              <motion.button
                type="button"
                aria-label={CLOSE[lang] ?? CLOSE.en}
                onClick={() => setOpen(null)}
                className="absolute inset-0 cursor-default bg-black/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: calm ? 0 : 0.3 }}
              />
              <motion.div
                className="relative flex w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] bg-[var(--page-bg,var(--background))] text-foreground shadow-2xl sm:flex-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: calm ? 0 : 0.22 }}
              >
                <motion.div layoutId={`uni-img-${cur.id}`} transition={spring} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[22px] sm:aspect-auto sm:min-h-[360px] sm:w-[46%]">
                  <Media src={cur.image} className="absolute inset-0 h-full w-full" />
                </motion.div>
                <motion.div
                  className="flex flex-1 flex-col justify-between p-5 pb-6 sm:p-8"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: calm ? 0 : 0.18, duration: 0.3 } }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  <div>
                    <h3 className="text-[26px] font-light leading-[1.05] tracking-tight">{cur.label}</h3>
                    {cur.text && <p className="mt-4 max-w-[36ch] text-[13px] font-light leading-relaxed text-foreground/70">{cur.text}</p>}
                  </div>
                  <Link href={cur.href} className="font-info mt-6 w-fit text-[12px] lowercase tracking-[0.08em] text-foreground/72 transition-colors hover:text-foreground">
                    {ENTER[lang] ?? ENTER.en} →
                  </Link>
                </motion.div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label={CLOSE[lang] ?? CLOSE.en}
                  className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition active:scale-95"
                >
                  <X className="h-4 w-4" strokeWidth={1.4} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
