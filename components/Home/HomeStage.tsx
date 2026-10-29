"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import NewSelectionIntro, { type RingApi } from "@/components/Home/NewSelectionIntro";
import HomeShowcase, { type Slide } from "@/components/Home/HomeShowcase";
import type { ProductType } from "@/types/product";

/* ====================================================================
   ACCUEIL : DU CARROUSEL 3D À LA SÉLECTION
   1. Arrivée : le carrousel 3D (coins droits) tourne tout seul.
   2. Au premier geste vers le bas (scroll, glissement du doigt, flèche du clavier) ou en touchant l'image du milieu :
      cette image voyage jusqu'à sa place de carte, ses coins s'arrondissent, et le texte, les pastilles
      et les produits phares apparaissent dessous.
   3. Seule la croix ✕ sur la carte referme tout (l'image redevient rectangulaire dans le carrousel).

   RÉGLAGES : DUR = durée du voyage (ms) · RADIUS = arrondi final des coins (px, 24 = rounded-3xl)
   ==================================================================== */

const DUR = 1100;
const RADIUS = 24;
// ouverture automatique au scroll : désactivée (on ouvre en touchant l'image du milieu)
const AUTO_OPEN = false;

type Phase = "closed" | "opening" | "open" | "closing";
type Anim = { from: DOMRect; to: DOMRect; r0: number; r1: number; dur: number; start: () => void; done: () => void };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function HomeStage({
  initialSlides = null,
  slideProducts = {},
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");
  const [openKey, setOpenKey] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);
  const [cardHidden, setCardHidden] = useState(false);
  const [ov, setOv] = useState<{ src: string; video: boolean } | null>(null);

  const wrap = useRef<HTMLDivElement>(null);
  const ringLayer = useRef<HTMLDivElement>(null);
  const showLayer = useRef<HTMLDivElement>(null);
  const ovRef = useRef<HTMLDivElement>(null);
  const ringApi = useRef<RingApi | null>(null);
  const cur = useRef(0);
  const busy = useRef(false);
  const pending = useRef<Anim | null>(null);
  const prevOverflow = useRef({ h: "", b: "" });

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // écran figé pendant le voyage : plus aucun défilement possible (doigt, molette, élan de l'iPad).
  // On fige la page elle-même (position fixe, tout en haut) : c'est la seule méthode fiable sur iPhone / iPad.
  const locked = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const lock = (on: boolean) => {
    const h = document.documentElement;
    const b = document.body;
    if (on) {
      prevOverflow.current = {
        h: h.style.overflow,
        b: [b.style.overflow, b.style.position, b.style.top, b.style.left, b.style.right, b.style.width].join("|"),
      };
      h.style.overflow = "hidden";
      b.style.overflow = "hidden";
      b.style.position = "fixed";
      b.style.top = "0";
      b.style.left = "0";
      b.style.right = "0";
      b.style.width = "100%";
      locked.current = true;
      (window as any).__stageBusy = true;
      syncRef.current();
    } else {
      locked.current = false;
      (window as any).__stageBusy = false;
      const [o, p, t, l, r, w] = prevOverflow.current.b.split("|");
      h.style.overflow = prevOverflow.current.h;
      b.style.overflow = o;
      b.style.position = p;
      b.style.top = t;
      b.style.left = l;
      b.style.right = r;
      b.style.width = w;
      // (les chapitres du bas ont leur propre blocage : on ne ramène jamais la page en haut pendant qu'ils sont figés)
      if (!(window as any).__chaptersLocked) window.scrollTo(0, 0);
      syncRef.current();
    }
  };

  const isCalm = () => {
    const html = document.documentElement;
    return (
      html.classList.contains("a11y-calm") ||
      html.classList.contains("a11y-focus") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  };

  // le voyage du calque (image qui va du carrousel à la carte, ou l'inverse)
  useLayoutEffect(() => {
    const el = ovRef.current;
    const a = pending.current;
    if (!ov || !el || !a) return;
    pending.current = null;
    const t0 = performance.now();
    let raf = 0;
    const put = (k: number) => {
      el.style.left = `${a.from.left + (a.to.left - a.from.left) * k}px`;
      el.style.top = `${a.from.top + (a.to.top - a.from.top) * k}px`;
      el.style.width = `${a.from.width + (a.to.width - a.from.width) * k}px`;
      el.style.height = `${a.from.height + (a.to.height - a.from.height) * k}px`;
      el.style.borderRadius = `${a.r0 + (a.r1 - a.r0) * k}px`;
    };
    put(0);
    a.start(); // avant le premier affichage : l'image du carrousel est cachée, seul le calque se voit
    const tick = (now: number) => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      const g = Math.min(1, (now - t0) / a.dur);
      put(ease(g));
      if (g >= 1) a.done();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ov]);

  const open = useCallback(() => {
    if (busy.current || phaseRef.current !== "closed" || (window as any).__chaptersLocked) return;
    const api = ringApi.current;
    const w = wrap.current;
    const show = showLayer.current;
    if (!api || !w || !show || api.busy()) return;
    api.snap();
    if (window.scrollY > 0) window.scrollTo(0, 0);
    busy.current = true;
    lock(true);
    const media = api.centerMedia();
    const card = show.querySelector("[data-card]") as HTMLElement | null;
    if (!media || !card) {
      lock(false);
      busy.current = false;
      return;
    }
    const slide = api.centerSlide();
    cur.current = slide;
    setOpenIndex(slide);
    setOpenKey((x) => x + 1);

    const dur = isCalm() ? 1 : DUR;
    const h0 = w.getBoundingClientRect().height;
    const h1 = show.getBoundingClientRect().height;
    w.style.transition = "none";
    w.style.height = `${h0}px`;
    void w.offsetHeight;
    w.style.transition = `height ${dur}ms cubic-bezier(.65,0,.35,1)`;
    w.style.height = `${h1}px`;

    pending.current = {
      from: media.rect,
      to: card.getBoundingClientRect(),
      r0: 0,
      r1: 0,
      dur,
      start: () => api.hideCenter(true),
      done: () => {
        setCardHidden(false);
        setOv(null);
        setP("open");
        lock(false);
        busy.current = false;
      },
    };
    setCardHidden(true);
    setOv({ src: media.src, video: media.video });
    setP("opening");
  }, []);

  const close = useCallback(async () => {
    if (busy.current || phaseRef.current !== "open") return;
    const api = ringApi.current;
    const w = wrap.current;
    const show = showLayer.current;
    const ring = ringLayer.current;
    if (!api || !w || !show || !ring) return;
    busy.current = true;

    // on remonte tout en haut avant de refermer
    if (window.scrollY > 4) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      await new Promise<void>((resolve) => {
        const t0 = performance.now();
        const check = () => {
          if (window.scrollY <= 2 || performance.now() - t0 > 1200) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
      window.scrollTo(0, 0);
    }

    api.focusSlide(cur.current);
    const media = api.centerMedia();
    const card = show.querySelector("[data-card]") as HTMLElement | null;
    if (!media || !card) {
      busy.current = false;
      return;
    }
    lock(true);
    const dur = isCalm() ? 1 : DUR;
    const h0 = w.getBoundingClientRect().height;
    const h1 = ring.getBoundingClientRect().height;
    w.style.transition = "none";
    w.style.height = `${h0}px`;
    void w.offsetHeight;
    w.style.transition = `height ${dur}ms cubic-bezier(.65,0,.35,1)`;
    w.style.height = `${h1}px`;

    pending.current = {
      from: card.getBoundingClientRect(),
      to: media.rect,
      r0: 0,
      r1: 0,
      dur,
      start: () => api.hideCenter(true),
      done: () => {
        api.hideCenter(false);
        setOv(null);
        setP("closed");
        w.style.transition = "";
        w.style.height = "";
        lock(false);
        busy.current = false;
      },
    };
    setCardHidden(true);
    setOv({ src: media.src, video: media.video });
    setP("closing");
  }, []);

  // ouvert : la hauteur suit le contenu (changer de slide peut ajouter ou retirer la rangée de produits)
  useEffect(() => {
    if (phase !== "open") return;
    const el = showLayer.current;
    const w = wrap.current;
    if (!el || !w) return;
    const ro = new ResizeObserver(() => {
      w.style.transition = "none";
      w.style.height = `${el.getBoundingClientRect().height}px`;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // premier geste vers le bas, tout en haut de la page : la sélection s'ouvre
  useEffect(() => {
    const can = () =>
      phaseRef.current === "closed" && !busy.current && window.scrollY <= 4 && !!(window as any).__loaderVisualDone && !(window as any).__chaptersLocked;
    let sx = 0;
    let sy = 0;
    const wheel = (e: WheelEvent) => {
      if (locked.current) {
        e.preventDefault();
        return;
      }
      if (AUTO_OPEN && e.deltaY > 8 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && can()) {
        e.preventDefault();
        open();
      }
    };
    const ts = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    // cet écouteur existe dès le début du geste : il peut donc empêcher la page de commencer à défiler
    const tm = (e: TouchEvent) => {
      if (locked.current) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const dy = sy - e.touches[0].clientY;
      const dx = Math.abs(sx - e.touches[0].clientX);
      if (AUTO_OPEN && dy > 8 && dy > dx * 1.2 && can()) {
        if (e.cancelable) e.preventDefault();
        open();
      }
    };
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(input|textarea|select)$/i.test(t.tagName)) return;
      if (AUTO_OPEN && ["ArrowDown", "PageDown", " "].includes(e.key) && can()) {
        e.preventDefault();
        open();
      }
    };
    // Les écouteurs « bloquants » (non passifs) ralentissent le défilement sur iPhone / iPad :
    // on ne les branche que tout en haut de la page (là où le premier geste ouvre la sélection) et pendant le voyage.
    let armed = false;
    const sync = () => {
      const want = locked.current || (AUTO_OPEN && phaseRef.current === "closed" && window.scrollY <= 4 && !(window as any).__chaptersLocked);
      if (want === armed) return;
      armed = want;
      if (want) {
        window.addEventListener("wheel", wheel, { passive: false });
        window.addEventListener("touchmove", tm, { passive: false });
      } else {
        window.removeEventListener("wheel", wheel);
        window.removeEventListener("touchmove", tm);
      }
    };
    syncRef.current = sync;
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => {
      syncRef.current = () => {};
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", sync);
    };
  }, [open]);

  const closedLook = phase === "closed" || phase === "closing";
  const ringStyle: React.CSSProperties = closedLook
    ? { opacity: 1, visibility: "visible", transition: "opacity 500ms ease 450ms", pointerEvents: phase === "closed" ? "auto" : "none" }
    : { opacity: 0, visibility: "hidden", transition: "opacity 280ms ease, visibility 0s linear 280ms", pointerEvents: "none" };
  const showStyle: React.CSSProperties =
    phase === "closed"
      ? { opacity: 0, visibility: "hidden", transition: "opacity 300ms ease, visibility 0s linear 300ms", pointerEvents: "none" }
      : phase === "closing"
        ? { opacity: 0, visibility: "hidden", transition: "opacity 300ms ease, visibility 0s linear 300ms", pointerEvents: "none" }
        : phase === "opening"
          ? { opacity: 1, visibility: "visible", transition: "opacity 500ms ease 550ms", pointerEvents: "none" }
          : { opacity: 1, visibility: "visible", pointerEvents: "auto" };

  return (
    <>
      {/* hauteur de la zone fermée = celle du carrousel (calculée en CSS pour ne rien faire sauter au chargement) */}
      <div
        ref={wrap}
        className="relative h-[calc(min(80vw,460px)*1.25+17rem)] w-full sm:h-[calc(min(80vw,460px)*1.25+22rem)]"
      >
        <div ref={ringLayer} className="absolute inset-x-0 top-0" style={ringStyle}>
          <NewSelectionIntro initialSlides={initialSlides} apiRef={ringApi} onOpen={open} paused={phase !== "closed"} />
        </div>
        <div ref={showLayer} className="absolute inset-x-0 top-0" style={showStyle}>
          <HomeShowcase
            initialSlides={initialSlides}
            slideProducts={slideProducts}
            openKey={openKey}
            openIndex={openIndex}
            cardHidden={cardHidden}
            onClose={close}
            onIndex={(i) => (cur.current = i)}
          />
        </div>
      </div>

      {/* l'image qui voyage */}
      {ov && (
        <div ref={ovRef} className="pointer-events-none fixed z-40 overflow-hidden" style={{ left: 0, top: 0, width: 0, height: 0, willChange: "left, top, width, height" }}>
          {ov.video ? (
            <video src={ov.src} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ov.src} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          )}
        </div>
      )}
    </>
  );
}
