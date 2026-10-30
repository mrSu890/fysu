"use client";

import { useState } from "react";
import NewSelectionIntro, { type Slide as RingSlide } from "@/components/Home/NewSelectionIntro";
import { Tile, type Slide } from "@/components/Home/HomeShowcase";
import type { ProductType } from "@/types/product";

/* ====================================================================
   ACCUEIL : LE CARROUSEL 3D + 3 PRODUITS SOUS LA SLIDE DU MILIEU
   Le carrousel tourne tout seul (et se glisse au doigt) ; dessous, trois produits choisis dans l'admin
   (Accueil → Carrousel → produits de la slide) : l'image seule, sans nom ni prix. Ils changent avec la slide du milieu.
   Toucher la slide du milieu ouvre sa page. Aucun clic n'est nécessaire pour voir les produits.
   ==================================================================== */

export default function HomeStage({
  initialSlides = null,
  slideProducts = {},
}: {
  initialSlides?: Slide[] | null;
  slideProducts?: Record<string, ProductType[]>;
}) {
  const [cur, setCur] = useState<RingSlide | null>(initialSlides?.[0] ?? null);
  const list = (cur ? slideProducts[cur.key] : null) ?? [];
  const who: "men" | "women" | null = cur && /for-her/.test(cur.href) ? "women" : cur && /for-him/.test(cur.href) ? "men" : null;

  return (
    <>
      <NewSelectionIntro initialSlides={initialSlides} onCenter={setCur} tight={list.length > 0} />
      {list.length > 0 && (
        <div className="mx-auto mb-28 w-[min(90vw,520px)] sm:mb-40 md:w-[min(60vw,640px)]">
          <div key={cur?.key} className="grid grid-cols-3 gap-2" style={{ animation: "hs-fade 0.5s ease both" }}>
            {list.slice(0, 3).map((product) => (
              <Tile key={product.id} product={product} who={who} />
            ))}
          </div>
          <style>{`@keyframes hs-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}
    </>
  );
}
