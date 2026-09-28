"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { Carousel } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

type HeroMedia = {
  media_path: string;
  media_type?: "image" | "video";
};

const SLIDE_DURATION = 6000; // ms

const isVideoMedia = (item: HeroMedia) =>
  item.media_type === "video" || /\.(mp4|webm|mov)$/i.test(item.media_path);

const HeroOverlay = () => {
  const t = useTranslations("Home");

  return (
    <div className="absolute inset-0 flex items-end justify-start px-4 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

      <div className="relative text-white space-y-2 pb-6 pointer-events-auto">
        <div>
          <p className="font-dior text-[1.1rem]">{t("heroTitle")}</p>
          <p className="font-dior text-sm">{t("heroSubtitle")}</p>
        </div>

        <Link href="/collections/when-the-flowers-bloom">
          <button className="text-sm mb-4 px-4 py-2 bg-white text-black rounded-lg cursor-pointer">
            {t("heroCta")}
          </button>
        </Link>
      </div>
    </div>
  );
};

const HomeHero = () => {
  const t = useTranslations("Home");
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

  // Mode "split" : les 2 premiers médias côte à côte (photo ou vidéo)
  const leftMedia = slides[0];
  const rightMedia = slides[1];

  const renderPanel = (item: HeroMedia, isLeft: boolean) => {
    const url = getUrl(item.media_path);

    return isVideoMedia(item) ? (
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
        alt={isLeft ? "Hero left" : "Hero right"}
        fill
        priority
        sizes="50vw"
        className="object-cover object-center"
      />
    );
  };

  if (leftMedia && rightMedia) {
    return (
           <section className="relative w-full aspect-[4/3] sm:aspect-[8/5] overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2">
          <div className="relative h-full w-full">
            {renderPanel(leftMedia, true)}
          </div>

          <div className="relative h-full w-full">
            {renderPanel(rightMedia, false)}
          </div>
        </div>

        <HeroOverlay />
      </section>
    );
  }

  return (
    <section className="relative w-full h-[65vh] sm:h-[75vh] lg:h-[100vh] min-h-[400px] overflow-hidden">
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

                <div className="relative text-white space-y-2 pb-6">
                  <div>
                    <p className="font-dior text-[1.1rem]">
                      {t("heroTitle")}
                    </p>
                    <p className="font-dior text-sm">
                      {t("heroSubtitle")}
                    </p>
                  </div>

                  <Link href="/collections/when-the-flowers-bloom">
                    <button className="text-sm mb-4 px-4 py-2 bg-white text-black rounded-lg cursor-pointer">
                      {t("heroCta")}
                    </button>
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
