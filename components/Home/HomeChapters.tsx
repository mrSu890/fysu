"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import IntroReveal from "@/components/IntroReveal";
import LogoIntro from "@/components/Home/LogoIntro";

/* ====================================================================
   CHAPITRES PLEIN ÉCRAN (bas de l'accueil, sous les rangées de produits)
   - chaque chapitre est un « onglet » plein écran : en scrollant, le suivant monte du bas et se pose PAR-DESSUS le précédent
   - le gros logo FYSU rose reste fixé en haut pendant tous les chapitres, jusqu'au footer ; la barre de navigation s'efface pendant ce temps
   - téléphone / iPad : image ou vidéo (portrait) plein écran, petit titre centré en bas + « Découvrir »
   - ordinateur : la moitié de l'écran en image / vidéo, l'autre moitié vide avec un titre minuscule cliquable au milieu
     (l'image change de côté d'un chapitre à l'autre)
   Les chapitres se règlent dans l'admin : Accueil (hero) → Chapitres de l'accueil.
   ==================================================================== */

export type Chapter = { id: string; label: string; href: string; image: string };

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const DISCOVER: Record<string, string> = { fr: "Découvrir", nl: "Ontdekken", ja: "見る", en: "Discover" };

const DEFAULTS: Record<string, { music: string; arcade: string; about: string }> = {
  fr: { music: "Musique", arcade: "Arcade", about: "À propos" },
  nl: { music: "Muziek", arcade: "Arcade", about: "Over ons" },
  ja: { music: "ミュージック", arcade: "アーケード", about: "私たちについて" },
  en: { music: "Music", arcade: "Arcade", about: "About" },
};

export default function HomeChapters({ chapters }: { chapters?: Chapter[] | null }) {
  const lang = useLocale().slice(0, 2);
  const discover = DISCOVER[lang] ?? DISCOVER.en;
  const d = DEFAULTS[lang] ?? DEFAULTS.en;
  const list: Chapter[] =
    chapters && chapters.length
      ? chapters
      : [
          { id: "music", label: d.music, href: "/music", image: "" },
          { id: "arcade", label: d.arcade, href: "/games", image: "" },
          { id: "about", label: d.about, href: "/about", image: "" },
        ];

  // pendant les chapitres, le gros logo rose remplace la barre de navigation (elle revient en sortant des chapitres)
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    const check = () => {
      const r = el.getBoundingClientRect();
      html.classList.toggle("chapters-active", r.top <= 40 && r.bottom > 140);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      html.classList.remove("chapters-active");
    };
  }, []);

  return (
    <section ref={root} aria-label="FYSU" className="relative">
      <style>{`html.chapters-active .navbar-root{transform:translateY(-140%)!important;opacity:0!important;pointer-events:none!important}`}</style>
      {/* gros logo rose : fixé en haut pendant tous les chapitres */}
      <div className="sticky top-0 z-30 h-0">
        <LogoIntro />
      </div>
      {list.map((c, i) => {
        const flip = i % 2 === 1;
        return (
          <div
            key={c.id}
            className="sticky top-0 h-[100svh] min-h-[540px] w-full overflow-hidden bg-[var(--page-bg,var(--background))] lg:grid lg:grid-cols-2"
            style={{ zIndex: i + 1 }}
          >
            {/* image / vidéo */}
            <Link
              href={c.href}
              draggable={false}
              aria-label={c.label}
              className={`absolute inset-0 block bg-neutral-300 dark:bg-neutral-800 lg:relative lg:inset-auto ${flip ? "lg:order-2" : ""}`}
            >
              {c.image &&
                (isVideo(c.image) ? (
                  <video src={c.image} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-center" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
                ))}
              {/* voile léger sous le texte (téléphone / iPad) */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent lg:hidden" />
            </Link>

            {/* titre minuscule + Découvrir */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-white lg:pointer-events-auto lg:static lg:items-center lg:text-foreground ${flip ? "lg:order-1" : ""}`}
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.75rem)" }}
            >
              <IntroReveal className="pointer-events-auto">
                <Link href={c.href} className="group block text-center">
                  <span className="font-info block text-[10px] tracking-[0.3em] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mt-3 block text-[12px] font-light uppercase tracking-[0.22em] sm:text-[13px]">{c.label}</span>
                  <span className="font-info mt-3 inline-block border-b border-current pb-px text-[10px] uppercase tracking-[0.2em] opacity-60 transition-opacity group-hover:opacity-100 sm:text-[11px]">
                    {discover} →
                  </span>
                </Link>
              </IntroReveal>
            </div>
          </div>
        );
      })}
    </section>
  );
}
