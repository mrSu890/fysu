"use client";

import { useEffect, useState, useRef } from "react";
import Product from "../Product";
import { ProductType } from "../../types/product"
import SectionTitle from "../SectionTitle";

export default function HomeSection({ slug, index }: { slug: string; index?: number }) {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [title, setTitle] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetch(`/api/sections/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setTitle(data.title);
      });
  }, [slug]);

  if (!products.length) return null;

  return (
       <section className={`relative top-6 mx-auto w-11/12 sm:mb-24 ${index === 1 ? "mt-20 sm:mt-28" : ""}`}>
      <div className="relative mb-12 sm:mb-16">
        {/* nombre de pièces de la sélection, à droite du titre */}
        <span className="font-info absolute bottom-[3px] right-0 text-[11px] font-light tracking-[0.06em] text-foreground/55 sm:bottom-[6px]">
          ( {String(products.length).padStart(2, "0")} )
        </span>
        <SectionTitle lineAbove className="text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[44px]">{title}</SectionTitle>
      </div>

      <div
        ref={scrollRef}
        className="
          flex
          gap-6
          overflow-x-auto
          overflow-y-hidden
          overscroll-x-contain
          scroll-smooth
          snap-x snap-mandatory
          no-scrollbar
          pb-2
        "
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="
              snap-start
              flex-shrink-0
              w-[220px]
              sm:w-[260px]
              md:w-[300px]
              lg:w-[320px]
            "
          >
            <Product showArrows product={product} scrollRef={scrollRef} />
          </div>
        ))}
      </div>
    </section>
  );
}
