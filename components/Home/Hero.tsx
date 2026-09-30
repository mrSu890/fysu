"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Carousel } from "antd";
import Image from "next/image";
import Link from "next/link";

type HeroMedia = {
  media_path: string;
  media_type?: "image" | "video";
};

const SLIDE_DURATION = 6000; // ms

// Pages vers lesquelles renvoient les deux images (à adapter si les adresses diffèrent)
const LEFT_LINK = "/for-him";
const RIGHT_LINK = "/for-her";

// Bouton "Discover" quand il n'y a qu'une seule image
const DISCOVER_LINK = "/product/saku-t-1";
const HERO_TITLE = "SPRING SPIRIT";
const HERO_SUBTITLE = "When Sakuras Meet Denim";

const isVideoMedia = (item: HeroMedia) =>
  item.media_type === "video" || /\.(mp4|webm|mov)$/i.test(item.media_path);

const HomeHero = () => {
  const [slides, setSlides] = useState<HeroMedia[]>([]);
  const [current, setCurrent] = useState(0);

  const carouselRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      const { data, error } = await supabaseClient
        .from("hero_slider")
        .select("media_path, media_type")
        .order("order");

      if (error) {
        console.error("Erreur Supabase:", error);
        return;
      }

      setSlides(data || []);
    };

    fetchMedia();
  }, []);

  useEffect(() => {
    // Pas d'autoplay / pas de progress si 0 ou 1 slide
    if (slides.length <= 1) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const next = (current + 1) % slides.length;
      carouselRef.current?.goTo(next);
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, slides.length]);

  const getUrl = (path: string) =>
    `https://mugpnlsqeqbojnzrfnjf.supabase.co/storage/v1/object/public/hero-images/${path}`;

  // Mode "split" : les 2 premiers médias côte à côte, chacun cliquable
  const leftMedia = slides[0];
  const rightMedia = slides[1];

  const renderPanel = (item: HeroMedia, href: string, label: string) => {
    const url = getUrl(item.media_path);

    return (
      <Link href={href} aria-label={label} className="absolute inset-0 block">
        {isVideoMedia(item) ? (
          <video
            src={url}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <Image
            src={url}
            alt={label}
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
        )}
      </Link>
    );
  };

  if (leftMedia && rightMedia) {
    return (
      <section
        data-no-reveal
        className="relative w-full aspect-[4/3] sm:aspect-[8/5] overflow-hidden"
      >
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="relative h-full w-full">
            {renderPanel(leftMedia, LEFT_LINK, "For him")}
          </div>

          <div className="relative h-full w-full">
            {renderPanel(rightMedia, RIGHT_LINK, "For her")}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-no-reveal
      className="relative w-full h-[65vh] sm:h-[75vh] lg:h-[100vh] min-h-[400px] overflow-hidden"
    >
      <Carousel
        ref={carouselRef}
        dots={false}
        effect="scrollx"
        beforeChange={(_, next) => setCurrent(next)}
        className="h-full"
      >
        {slides.map((item, index) => {
          const url = getUrl(item.media_path);
          const isVideo =
            item.media_type === "video" ||
            /\.(mp4|webm|mov)$/i.test(item.media_path);

          return (
            <div
              key={index}
              className="relative w-full h-[65vh] sm:h-[75vh] lg:h-[100vh] min-h-[400px]"
            >
              {isVideo ? (
                <video
                  src={url}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <Image
                  src={url}
                  alt={`Hero media ${index + 1}`}
                  fill
                  className="object-cover object-center"
                  priority={index === 0}
                />
              )}

              <div className="absolute inset-0 flex items-end justify-start px-4">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

                <div className="relative text-white pb-8 sm:pb-12 max-w-[92%]">
                  <h2 className="text-xl sm:text-3xl uppercase font-normal tracking-[0.08em] leading-tight">
                    {HERO_TITLE}
                  </h2>

                  <p className="mt-3 font-serif text-sm sm:text-lg">
                    {HERO_SUBTITLE}
                  </p>

                  <Link
                    href={DISCOVER_LINK}
                    className="mt-4 inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.12em]"
                    style={{ color: "#ffffff" }}
                  >
                    Discover
                    <span aria-hidden="true">&rsaquo;</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </Carousel>

      {/* Progress bar uniquement si + d'1 slide */}
      {slides.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20">
          <div key={current} className="h-full bg-white animate-progress" />
        </div>
      )}
    </section>
  );
};

export default HomeHero;
