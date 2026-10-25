"use client";

import { useEffect, useState, useRef } from "react";
import Product from "../Product";
import { ProductType } from "../../types/product"
import SectionTitle from "../SectionTitle";
import Fold from "./Fold";

export default function HomeSection({
  slug,
  index,
  initialSection,
}: {
  slug: string;
  index?: number;
  // envoyé par le serveur : les produits sont déjà dans le HTML (référencement Google)
  initialSection?: { title?: string; products?: ProductType[] } | null;
}) {
  const [products, setProducts] = useState<ProductType[]>(initialSection?.products ?? []);
  const [title, setTitle] = useState(initialSection?.title ?? "");
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(!!initialSection)

  useEffect(() => {
    if (initialSection) return;
    fetch(`/api/sections/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setTitle(data.title);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [slug, initialSection]);

  // pendant le chargement : des cartes grises qui respirent, à la place d'un vide
  if (!products.length && !loaded) {
    return (
      <section className="relative top-6 mx-auto w-11/12 sm:mb-24" aria-hidden="true">
        <div className="mb-12 h-8 w-40 animate-pulse rounded-full bg-foreground/10 sm:mb-16" />
        <div className="flex gap-6 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="min-w-[220px] flex-shrink-0 sm:min-w-[260px] md:min-w-[300px]">
              <div className="aspect-[3/4] w-full animate-pulse rounded-2xl bg-foreground/10" />
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded-full bg-foreground/10" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
       <section className={`relative top-6 mx-auto w-11/12 sm:mb-24 ${index === 1 ? "mt-20 sm:mt-28" : ""}`}>
      <Fold
        label={title}
        meta={`( ${String(products.length).padStart(2, "0")} )`}
        header={
          <SectionTitle lineAbove className="text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[44px]">{title}</SectionTitle>
        }
      >
        <div
          ref={scrollRef}
          data-row-memory={slug}
          className="flex gap-6 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-mandatory no-scrollbar pb-2"
        >
          {products.map((product) => (
            <div key={product.id} className="snap-start flex-shrink-0 w-[220px] sm:w-[260px] md:w-[300px] lg:w-[320px]">
              <Product showArrows product={product} scrollRef={scrollRef} />
            </div>
          ))}
        </div>
      </Fold>
    </section>
  );
}
