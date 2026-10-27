"use client";

import { useRef, useState } from "react";

/* ====================================================================
   RANGÉE REPLIABLE (accueil)
   Le titre (avec son trait) est le bouton : on le touche pour déplier ou replier la rangée.
   Pour que ce soit évident : un rond avec + / − à droite, et un soulignement qui se trace
   quand on touche ou survole le titre.
   La hauteur est animée en pixels (plus fluide que l'ancienne méthode, sans à-coup).
   `defaultOpen` : ouverte ou fermée à l'arrivée · `meta` : petit texte à droite (ex. le nombre de pièces)
   ==================================================================== */

const DURATION = 560;

export default function Fold({
  header,
  meta,
  defaultOpen = true,
  label,
  children,
}: {
  header: React.ReactNode;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // null = hauteur automatique (ouverte au repos) ; sinon une hauteur en pixels pendant l'animation
  const [h, setH] = useState<number | null>(defaultOpen ? null : 0);
  const inner = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const el = inner.current;
    if (!el) {
      setOpen((v) => !v);
      return;
    }
    const full = el.scrollHeight;
    if (open) {
      // on fixe la hauteur actuelle, puis on descend à 0 au battement suivant
      setH(full);
      requestAnimationFrame(() => requestAnimationFrame(() => setH(0)));
      setOpen(false);
    } else {
      setOpen(true);
      setH(full);
    }
  };

  return (
    <div>
      <div className="group relative">
        {header}
        {meta && (
          <span className="font-info pointer-events-none absolute bottom-[5px] right-12 text-[11px] font-light tracking-[0.06em] text-foreground/55 sm:bottom-[9px]">
            {meta}
          </span>
        )}
        {/* soulignement qui se trace au toucher / survol */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-out group-active:scale-x-100 [@media(hover:hover)]:group-hover:scale-x-100"
        />
        {/* le rond + / − : un vrai bouton visible */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-current/35 transition-colors duration-300 group-active:bg-foreground/10 [@media(hover:hover)]:group-hover:bg-foreground/10 sm:bottom-1"
        >
          <span className="relative block h-3 w-3 opacity-80">
            <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 bg-current" />
            <span
              className="absolute left-1/2 top-0 block h-full w-px bg-current transition-transform duration-500"
              style={{ transform: `translateX(-50%) scaleY(${open ? 0 : 1})` }}
            />
          </span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={label}
          onClick={toggle}
          className="absolute inset-0 z-10 cursor-pointer touch-manipulation"
        />
      </div>
      <div
        className="overflow-hidden"
        style={{
          height: h === null ? "auto" : h,
          opacity: open ? 1 : 0,
          transition: `height ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${DURATION}ms ease`,
        }}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget || e.propertyName !== "height") return;
          // ouverte et au repos : la hauteur redevient automatique (les images qui chargent ne coupent rien)
          if (open) setH(null);
        }}
        aria-hidden={!open}
        inert={!open}
      >
        <div ref={inner}>
          <div className="pb-2 pt-12 sm:pt-16">{children}</div>
        </div>
      </div>
    </div>
  );
}
