"use client";

import { useState } from "react";

/* ====================================================================
   RANGÉE REPLIABLE (accueil)
   Le titre (avec son trait) est le bouton : on le touche pour déplier ou replier la rangée.
   Même animation que la « vision olfactive » de FY'grances.
   `defaultOpen` : ouverte ou fermée à l'arrivée · `meta` : petit texte à droite (ex. le nombre de pièces)
   ==================================================================== */
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
  return (
    <div>
      <div className="relative">
        {header}
        {meta && (
          <span className="font-info pointer-events-none absolute bottom-[3px] right-9 text-[11px] font-light tracking-[0.06em] text-foreground/55 sm:bottom-[6px]">
            {meta}
          </span>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-[6px] right-0 block h-3 w-3 opacity-70 sm:bottom-[10px]">
          <span className="absolute left-0 top-1/2 block h-px w-full -translate-y-1/2 bg-current" />
          <span
            className="absolute left-1/2 top-0 block h-full w-px bg-current transition-transform duration-500"
            style={{ transform: `translateX(-50%) scaleY(${open ? 0 : 1})` }}
          />
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          className="absolute inset-0 z-10 cursor-pointer touch-manipulation"
        />
      </div>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-700 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0 overflow-hidden" aria-hidden={!open}>
          <div className="pb-2 pt-12 sm:pt-16">{children}</div>
        </div>
      </div>
    </div>
  );
}
