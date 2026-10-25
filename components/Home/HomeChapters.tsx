"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import LogoIntro, { PINK } from "@/components/Home/LogoIntro";
import FooterPanel from "@/components/Home/FooterPanel";

/* ====================================================================
   CHAPITRES PLEIN ÉCRAN (bas de l'accueil, sous les rangées de produits) : pages qui se tournent
   - en arrivant, la page se cale sur les chapitres et se FIGE : plus de défilement classique
   - un coup sec du doigt vers le haut (ou molette / flèche bas) : le chapitre suivant monte du bas et se colle par-dessus
   - un coup vers le bas : on revient au chapitre précédent
   - le pied de page vert est le dernier chapitre (le gros logo y devient blanc et remplace le petit logo) ; premier chapitre + coup vers le bas : on remonte aux rangées
   - le gros logo FYSU reste fixé en haut pendant tous les chapitres et change de couleur (voir logoColor) ; la barre de navigation s'efface pendant ce temps
   - téléphone / iPad : image ou vidéo (portrait) plein écran, petit titre centré en bas + « Découvrir »
   - ordinateur : la moitié de l'écran en image / vidéo, l'autre moitié vide avec un titre minuscule cliquable au milieu
   Les chapitres se règlent dans l'admin : Accueil (hero) → Chapitres de l'accueil.

   RÉGLAGES : TURN = durée d'un changement de chapitre (ms) · SWIPE = distance du coup de doigt (px)
   ==================================================================== */

const TURN = 760;
const SWIPE = 34;
const ENTER = 620; // durée du calage sur les chapitres
const EXIT = 650; // durée de la sortie vers le footer / les rangées

export type Chapter = { id: string; label: string; href: string; image: string; color?: string };

// couleur du gros logo pendant chaque chapitre (réglable dans l'admin) : noir pour Musique, bleu ciel pour Arcade, rose sinon ; blanc sur le pied de page
const INK = "#141414";
const SKY = "#8ec5ea";
const logoColor = (c: Chapter) => (c.color && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : c.id === "music" ? INK : c.id === "arcade" ? SKY : PINK);

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
  const count = list.length; // les chapitres ; le pied de page est le chapitre numéro `count`

  const root = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const topRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    const body = document.body;
    const st = { locked: false, until: 0, cool: 0, lastY: window.scrollY, y0: NaN, fired: false, top: 0 };
    let raf = 0;
    let saved = { h: "", b: ["", "", "", "", "", ""] };

    const calm = () =>
      html.classList.contains("a11y-calm") ||
      html.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const animate = (dur: number, step: (k: number) => void, done?: () => void) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const g = Math.min(1, (now - t0) / Math.max(1, dur));
        step(ease(g));
        if (g < 1) raf = requestAnimationFrame(tick);
        else done?.();
      };
      raf = requestAnimationFrame(tick);
    };
    const jump = (y: number) => window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });

    const lockBody = (y: number) => {
      saved = { h: html.style.overflow, b: [body.style.overflow, body.style.position, body.style.top, body.style.left, body.style.right, body.style.width] };
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `${-y}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    };
    const unlockBody = () => {
      html.style.overflow = saved.h;
      [body.style.overflow, body.style.position, body.style.top, body.style.left, body.style.right, body.style.width] = saved.b;
    };

    // ----- gestes (branchés seulement pendant que les chapitres sont figés)
    const turn = (dir: 1 | -1) => {
      if (!st.locked || performance.now() < st.until) return;
      const n = idxRef.current + dir;
      if (n > count) return; // rien après le pied de page
      if (n < 0) return leave(-1);
      idxRef.current = n;
      setIdx(n);
      st.until = performance.now() + (calm() ? 1 : TURN) + 120;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 12) return;
      turn(e.deltaY > 0 ? 1 : -1);
    };
    const ts = (e: TouchEvent) => {
      st.y0 = e.touches[0].clientY;
      st.fired = false;
    };
    const tm = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (Number.isNaN(st.y0)) {
        st.y0 = e.touches[0].clientY;
        return;
      }
      if (st.fired) return;
      const dy = st.y0 - e.touches[0].clientY;
      if (Math.abs(dy) > SWIPE) {
        st.fired = true;
        turn(dy > 0 ? 1 : -1);
      }
    };
    const key = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && /^(input|textarea|select)$/i.test(tg.tagName)) return; // on peut écrire dans le champ e-mail
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        turn(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        turn(-1);
      }
    };
    const arm = (on: boolean) => {
      if (on) {
        st.y0 = NaN;
        window.addEventListener("wheel", wheel, { passive: false });
        window.addEventListener("touchstart", ts, { passive: true });
        window.addEventListener("touchmove", tm, { passive: false });
        window.addEventListener("keydown", key);
      } else {
        window.removeEventListener("wheel", wheel);
        window.removeEventListener("touchstart", ts);
        window.removeEventListener("touchmove", tm);
        window.removeEventListener("keydown", key);
      }
    };

    // ----- entrer : la page se cale sur les chapitres, puis se fige
    const enter = () => {
      if (st.locked) return;
      const r = el.getBoundingClientRect();
      const y0 = window.scrollY;
      const target = y0 + r.top;
      st.locked = true;
      st.top = y0;
      st.until = performance.now() + (calm() ? 1 : ENTER) + 120;
      lockBody(y0);
      arm(true);
      html.classList.add("chapters-active");
      animate(calm() ? 1 : ENTER, (k) => {
        st.top = y0 + (target - y0) * k;
        body.style.top = `${-st.top}px`;
      });
    };

    // ----- sortir : on rend la page au défilement normal, en glissant vers le footer (1) ou vers les rangées (-1)
    function leave(dir: 1 | -1) {
      if (!st.locked) return;
      const y = st.top;
      st.locked = false;
      st.cool = performance.now() + (calm() ? 1 : EXIT) + 500;
      arm(false);
      unlockBody();
      jump(y);
      const target = Math.max(0, y + dir * window.innerHeight * 0.6);
      animate(calm() ? 1 : EXIT, (k) => jump(y + (target - y) * k), () => {
        st.lastY = window.scrollY;
      });
    }

    // toucher le gros logo : retour très rapide tout en haut de la page (là où est la barre de navigation)
    topRef.current = () => {
      const from = st.locked ? st.top : window.scrollY;
      if (st.locked) {
        st.locked = false;
        arm(false);
        unlockBody();
        jump(from);
      }
      st.cool = performance.now() + 1500;
      animate(calm() ? 1 : 450, (k) => jump(from * (1 - k)), () => {
        st.lastY = window.scrollY;
        st.cool = performance.now() + 300;
        idxRef.current = 0;
        setIdx(0);
      });
    };

    const onScroll = () => {
      const y = window.scrollY;
      const dir = y > st.lastY ? 1 : y < st.lastY ? -1 : 0;
      st.lastY = y;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      html.classList.toggle("chapters-active", st.locked || (r.top <= 60 && r.bottom >= h - 60));
      if (st.locked || dir === 0 || performance.now() < st.cool) return;
      // la section couvre plus de la moitié de l'écran : on la cale d'un coup
      if (dir > 0 && r.top <= h * 0.5 && r.top > -h * 0.5) enter();
      else if (dir < 0 && r.top >= -h * 0.5 && r.top < h * 0.5) enter();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      if (st.locked) {
        arm(false);
        unlockBody();
      }
      html.classList.remove("chapters-active");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <section ref={root} aria-label="FYSU" className="relative h-[100svh] w-full overflow-hidden">
      <style>{`html.chapters-active .navbar-root{transform:translateY(-140%)!important;opacity:0!important;pointer-events:none!important}
@media (prefers-reduced-motion: reduce){.hc-panel{transition:none!important}}
html.a11y-calm .hc-panel,html.a11y-focus .hc-panel{transition:none!important}`}</style>

      {list.map((c, i) => {
        const flip = i % 2 === 1;
        return (
          <div
            key={c.id}
            className="hc-panel absolute inset-0 overflow-hidden bg-[var(--page-bg,var(--background))] will-change-transform lg:grid lg:grid-cols-2"
            style={{
              zIndex: i + 1,
              transform: i <= idx ? "translateY(0)" : "translateY(100%)",
              transition: `transform ${TURN}ms cubic-bezier(0.7, 0, 0.2, 1)`,
            }}
            aria-hidden={i !== idx}
          >
            {/* image / vidéo */}
            <Link
              href={c.href}
              draggable={false}
              aria-label={c.label}
              tabIndex={i === idx ? 0 : -1}
              className={`absolute inset-0 block bg-neutral-300 dark:bg-neutral-800 lg:relative lg:inset-auto ${flip ? "lg:order-2" : ""}`}
            >
              {c.image &&
                (isVideo(c.image) ? (
                  <video src={c.image} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-center" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="eager" draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
                ))}
              {/* voile léger sous le texte (téléphone / iPad) */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent lg:hidden" />
            </Link>

            {/* titre minuscule + Découvrir */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] lg:drop-shadow-none lg:pointer-events-auto lg:static lg:items-center lg:text-foreground ${flip ? "lg:order-1" : ""}`}
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2.75rem)" }}
            >
              <Link href={c.href} tabIndex={i === idx ? 0 : -1} className="group pointer-events-auto block text-center">
                <span className="font-info block text-[10px] tracking-[0.3em] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-3 block text-[12px] font-light uppercase tracking-[0.22em] sm:text-[13px]">{c.label}</span>
                <span className="font-info mt-3 inline-block border-b border-current pb-px text-[10px] uppercase tracking-[0.2em] opacity-60 transition-opacity group-hover:opacity-100 sm:text-[11px]">
                  {discover} →
                </span>
              </Link>
            </div>
          </div>
        );
      })}

      {/* pied de page : le dernier chapitre */}
      <div
        className="hc-panel absolute inset-0 overflow-hidden will-change-transform"
        style={{
          zIndex: count + 1,
          transform: count <= idx ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${TURN}ms cubic-bezier(0.7, 0, 0.2, 1)`,
        }}
        aria-hidden={idx !== count}
      >
        <FooterPanel />
      </div>

      {/* gros logo : fixé en haut pendant tous les chapitres, il change de couleur en douceur */}
      <LogoIntro color={idx < count ? logoColor(list[idx]) : "#ffffff"} onClick={() => topRef.current()} />
    </section>
  );
}
