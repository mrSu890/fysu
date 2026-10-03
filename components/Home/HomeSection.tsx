"use client";

import { useEffect, useState, useRef } from "react";
import Product from "../Product";
import { ProductType } from "../../types/product"

export default function HomeSection({ slug }: { slug: string }) {
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
       <section className="relative top-10 w-11/12 mx-auto">
      <h2 className="text-xl sm:text-2xl mb-8">{title}</h2>

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
            <Product product={product} scrollRef={scrollRef} />
          </div>
        ))}
      </div>
    </section>
  );
}
