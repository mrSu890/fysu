"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSiteCopy } from "@/lib/siteCopy";
import IntroReveal from "@/components/IntroReveal";

/* ====================================================================
   CARROUSEL 3D DE L'ACCUEIL (anneau adouci)
   Les slides sont posées sur un anneau : celle du milieu est de face, les voisines pivotent un peu et reculent,
   comme sur un tambour. On fait glisser avec le doigt (ou la souris), ça tourne sans fin et s'arrête sur une slide.
   Toucher la slide du milieu ouvre la page ; toucher une voisine la ramène au milieu.
   La taille est celle de l'ancien carrousel (80 % de la largeur, 460 px au maximum).
   Les slides se gèrent dans l'admin : Accueil (hero) → Carrousel de l'accueil.

   RÉGLAGES (si ça donne mal à la tête, baisser ANGLE ; pour moins de 3D : ANGLE = 0) :
   - ANGLE : rotation d'une slide voisine, en degrés (24 = doux, 40 = proche d'un vrai cylindre)
   - PERSPECTIVE : plus c'est grand, plus c'est plat
   - GAP : espace entre deux slides (px)
   ==================================================================== */

const ANGLE = 24;
const PERSPECTIVE = 1500;
const GAP = 40;
const MIN_PANELS = 6; // l'anneau a toujours au moins 6 panneaux (les slides sont répétées si besoin)

export type Slide = { key: string; label: string; href: string; image: string; kind: string };

const BLOOM_IMAGE = "/images/home-feature.jpeg";
const BLOOM_LINK = "/collections/when-the-flowers-bloom";
const FYGRANCES_IMAGE = "/images/Fygrances-hero.JPG";
const FYGRANCES_LINK = "/fygrances";

const rad = (d: number) => (d * Math.PI) / 180;

const NewSelectionIntro = ({ initialSlides = null }: { initialSlides?: Slide[] | null }) => {
  const copy = useSiteCopy();
  const ring = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // slides réglées dans l'admin (lues côté serveur si possible) ; sinon les deux slides d'origine
  const [custom, setCustom] = useState<Slide[] | null>(initialSlides && initialSlides.length ? initialSlides : null);
  useEffect(() => {
    if (initialSlides && initialSlides.length) return;
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
  }, [initialSlides]);

  const slides: Slide[] = custom ?? [
    { key: "bloom", label: copy.bloomTitle, href: BLOOM_LINK, image: BLOOM_IMAGE, kind: "Collection" },
    { key: "fygrances", label: "FY'grances", href: FYGRANCES_LINK, image: FYGRANCES_IMAGE, kind: "Fragrance" },
  ];
  const n = slides.length;
  const m = n * Math.max(1, Math.ceil(MIN_PANELS / n)); // nombre de panneaux sur l'anneau
  const items = Array.from({ length: m }, (_, i) => ({ s: slides[i % n], i }));

  // ---- état du mouvement (hors React : on écrit directement les transformations) ----
  const st = useRef({
    pos: 0, // position de l'anneau, en nombre de slides (0 = première slide au milieu)
    target: null as number | null,
    dragging: false,
    moved: false,
    startX: 0,
    startPos: 0,
    lastX: 0,
    lastT: 0,
    vel: 0, // slides par ms
    raf: 0,
    cw: 368,
    flat: false,
    suppress: false,
  });

  const layout = useCallback(() => {
    const s = st.current;
    const steps = s.flat ? 0 : ANGLE;
    const cw = s.cw;
    const R = steps > 0 ? (cw * 1.1 + GAP) / 2 / Math.tan(rad(steps / 2)) : 0;
    for (let i = 0; i < m; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      let d = i - s.pos;
      d = ((((d + m / 2) % m) + m) % m) - m / 2; // distance au milieu, entre -m/2 et m/2
      let x: number, z: number, a: number;
      if (steps > 0) {
        a = d * steps;
        x = R * Math.sin(rad(a));
        z = -R * (1 - Math.cos(rad(a)));
      } else {
        a = 0;
        x = d * (cw + GAP);
        z = 0;
      }
      const ad = Math.abs(d * (steps || ANGLE));
      const op = ad <= 40 ? 1 : ad >= 62 ? 0 : 1 - (ad - 40) / 22;
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${a.toFixed(2)}deg)`;
      el.style.opacity = String(op);
      el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      el.style.pointerEvents = op < 0.05 ? "none" : "auto";
    }
  }, [m]);

  const loop = useCallback(() => {
    const s = st.current;
    s.raf = 0;
    if (s.target !== null && !s.dragging) {
      const diff = s.target - s.pos;
      if (Math.abs(diff) < 0.0008) {
        s.pos = s.target;
        s.target = null;
        layout();
        return;
      }
      s.pos += diff * 0.16;
      layout();
      s.raf = requestAnimationFrame(loop);
    }
  }, [layout]);

  const kick = useCallback(() => {
    if (!st.current.raf) st.current.raf = requestAnimationFrame(loop);
  }, [loop]);

  const goTo = useCallback(
    (index: number) => {
      const s = st.current;
      // la plus courte route vers cette slide
      let d = index - s.pos;
      d = ((((d + m / 2) % m) + m) % m) - m / 2;
      s.target = Math.round(s.pos + d);
      kick();
    },
    [m, kick]
  );

  // taille, mode « calme » et premier affichage
  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    const html = document.documentElement;
    const measure = () => {
      const first = itemRefs.current[0];
      if (first) st.current.cw = first.offsetWidth || st.current.cw;
      st.current.flat =
        html.classList.contains("a11y-calm") ||
        html.classList.contains("a11y-focus") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      layout();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(st.current.raf);
    };
  }, [layout, m]);

  // doigt / souris : glisser pour tourner
  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    const s = st.current;

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      s.dragging = true;
      s.moved = false;
      s.suppress = false;
      s.target = null;
      s.startX = s.lastX = e.clientX;
      s.startPos = s.pos;
      s.lastT = performance.now();
      s.vel = 0;
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.startX;
      if (!s.moved && Math.abs(dx) > 6) {
        s.moved = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {}
      }
      if (!s.moved) return;
      const now = performance.now();
      const newPos = s.startPos - dx / (s.cw + GAP);
      const dt = Math.max(1, now - s.lastT);
      s.vel = 0.8 * s.vel + 0.2 * ((newPos - s.pos) / dt);
      s.lastT = now;
      s.pos = newPos;
      layout();
    };
    const up = () => {
      if (!s.dragging) return;
      s.dragging = false;
      if (s.moved) {
        s.suppress = true; // le clic qui suit un glissement ne doit rien ouvrir
        window.setTimeout(() => (s.suppress = false), 60);
        const flick = Math.max(-1.5, Math.min(1.5, s.vel * 260));
        s.target = Math.round(s.pos + flick);
        kick();
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    // clic : avant les autres écouteurs du site (rideau de pixels…)
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-ring]") as HTMLAnchorElement | null;
      if (!a || !el.contains(a)) return;
      const i = Number(a.dataset.ring);
      let d = i - s.pos;
      d = ((((d + m / 2) % m) + m) % m) - m / 2;
      if (s.suppress || Math.abs(d) > 0.35) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!s.suppress) goTo(i);
      }
    };
    window.addEventListener("click", click, true);

    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      window.removeEventListener("click", click, true);
    };
  }, [layout, kick, goTo, m]);

  return (
    <section data-no-reveal className="relative mb-28 mt-28 w-full sm:mb-40 sm:mt-36" aria-label="FYSU">
      <div
        ref={ring}
        className="relative mx-auto w-full select-none overflow-hidden"
        style={{
          ["--cw" as any]: "min(80vw, 460px)",
          height: "calc(var(--cw) * 1.25 + 3rem)",
          perspective: `${PERSPECTIVE}px`,
          touchAction: "pan-y",
        }}
      >
        {items.map(({ s, i }) => {
          const real = i < n; // les panneaux répétés ne sont que des copies pour remplir l'anneau
          const label = (
            <p
              className="text-[13px] uppercase tracking-[0.02em] text-foreground sm:text-sm"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 200 }}
            >
              {s.label}
            </p>
          );
          return (
            <Link
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-ring={i}
              href={s.href}
              draggable={false}
              aria-hidden={real ? undefined : true}
              tabIndex={real ? undefined : -1}
              className="group absolute left-1/2 top-0 block will-change-transform"
              style={{ width: "var(--cw)", marginLeft: "calc(var(--cw) / -2)", opacity: i === 0 ? 1 : 0 }}
            >
              {real ? (
                <IntroReveal className="mb-3" delay={0.15 + i * 0.12}>
                  {label}
                </IntroReveal>
              ) : (
                <div className="mb-3">{label}</div>
              )}
              <div
                data-hero-image={i === 0 ? "" : undefined}
                className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800"
              >
                {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.image) ? (
                  <video
                    src={s.image}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default NewSelectionIntro;
