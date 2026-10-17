"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { claimPopup, releasePopup } from "@/lib/popups";
import { motion, AnimatePresence } from "framer-motion";

type StoryItem = {
  id: string;
  type: "image" | "video";
  media_url: string;
  duration: number;
  products?: { id: number; name: string; slug: string; price: number; image: string | null }[];
};

type Story = {
  id: string;
  title: string;
  cover_url: string;
  story_items: StoryItem[];
};

type Props = {
  pageSlug?: string;
  collectionSlug?: string;
};

export default function StoryBar({ pageSlug, collectionSlug }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tray, setTray] = useState(false); // tiroir « Shop now » ouvert
  const router = useRouter();
  const hold = paused || tray; // la story s'arrête pendant un appui long ou quand le tiroir est ouvert
  // transition rond -> plein écran
  type Rect = { top: number; left: number; width: number; height: number };
  const [origin, setOrigin] = useState<Rect | null>(null);
  const [closing, setClosing] = useState(false);
  const [shown, setShown] = useState(false); // le contenu apparaît une fois la forme agrandie
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [videoDur, setVideoDur] = useState<number | null>(null);
  const [mediaReady, setMediaReady] = useState(false); // la diapo est chargée : le temps peut s'écouler
  const [mounted, setMounted] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /* -------------------------------------------------- */
  /* CHARGEMENT : une requête serveur + copie gardée sur l'appareil (affichage instantané) */
  /* -------------------------------------------------- */

  useEffect(() => {
    const key = `fysu-stories:${pageSlug ? "p:" + pageSlug : "c:" + collectionSlug}`;
    let alive = true;

    // 1) la dernière copie connue s'affiche tout de suite
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(cached) && cached.length) {
        setStories(cached);
        setLoading(false);
      }
    } catch {}

    // 2) puis on vérifie auprès du serveur
    const qs = pageSlug
      ? `page=${encodeURIComponent(pageSlug)}`
      : collectionSlug
        ? `collection=${encodeURIComponent(collectionSlug)}`
        : "";
    if (!qs) {
      setLoading(false);
      return;
    }
    fetch(`/api/stories?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Story[] = Array.isArray(d?.stories) ? d.stories : [];
        setStories(list);
        setLoading(false);
        try {
          localStorage.setItem(key, JSON.stringify(list));
        } catch {}
      })
      .catch(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [pageSlug, collectionSlug]);

  /* -------------------------------------------------- */
  /* PRÉCHARGEMENT : tout est prêt avant le premier toucher */
  /* -------------------------------------------------- */

  const keep = useRef<any[]>([]);
  useEffect(() => {
    if (stories.length === 0) return;
    const run = () => {
      const bag: any[] = [];
      stories.forEach((st) => {
        if (st.cover_url) {
          const c = new Image();
          c.src = st.cover_url;
          bag.push(c);
        }
        st.story_items.forEach((it, i) => {
          if (!it.media_url) return;
          if (it.type === "image") {
            const im = new Image();
            im.src = it.media_url;
            bag.push(im);
          } else if (i === 0) {
            // première vidéo de chaque story : on commence déjà à la télécharger
            const v = document.createElement("video");
            v.preload = "auto";
            v.muted = true;
            v.playsInline = true;
            v.src = it.media_url;
            v.load();
            bag.push(v);
          }
        });
      });
      keep.current = bag;
    };
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 800);
    return () => {
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [stories]);

  // pendant une story : on charge déjà la diapo suivante
  useEffect(() => {
    if (!activeStory) return;
    const nxt = activeStory.story_items[currentIndex + 1];
    if (nxt?.type === "image") {
      const im = new Image();
      im.src = nxt.media_url;
    }
  }, [activeStory, currentIndex]);

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    setMounted(true);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  /* -------------------------------------------------- */
  /* VISIONNEUSE PLEIN ÉCRAN                             */
  /* -------------------------------------------------- */

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchY = useRef<number | null>(null);

  const circleRect = (id: string): Rect | null => {
    const el = document.querySelector(`[data-story-cover="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  // sécurité : le contenu apparaît même si l'animation d'ouverture ne signale pas sa fin
  useEffect(() => {
    if (!activeStory || closing) return;
    const t = window.setTimeout(() => setShown(true), 700);
    return () => window.clearTimeout(t);
  }, [activeStory, closing]);

  // la story se rétracte vers sa pastille
  const closeStory = () => {
    if (!activeStory || closing) return;
    const r = circleRect(activeStory.id);
    if (r) setOrigin(r);
    setShown(false);
    setPaused(false);
    setClosing(true);
  };

  const finishClose = () => {
    setActiveStory(null);
    setCurrentIndex(0);
    setClosing(false);
    setOrigin(null);
  };

  const openStory = (story: Story) => {
    const r = circleRect(story.id);
    setOrigin(r ?? { top: window.innerHeight / 2 - 40, left: window.innerWidth / 2 - 40, width: 80, height: 80 });
    setClosing(false);
    setShown(false);
    setCurrentIndex(0);
    setActiveStory(story);
  };

  const nextSlide = () => {
    if (!activeStory) return;
    if (currentIndex < activeStory.story_items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // dernière diapo : on enchaîne sur la story suivante (comme Instagram), sinon on ferme
      const i = stories.findIndex((st) => st.id === activeStory.id);
      const nextStory = i >= 0 ? stories[i + 1] : undefined;
      if (nextStory) {
        setCurrentIndex(0);
        setActiveStory(nextStory);
      } else {
        closeStory();
      }
    }
  };

  const currentProducts = activeStory?.story_items[currentIndex]?.products ?? [];

  // un produit choisi : on quitte la story et on va sur sa fiche
  const goProduct = (slug: string) => {
    finishClose();
    router.push(`/product/${slug}`);
  };

  const prevSlide = () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));

  // pendant une story : le reste du site se met à l'écart, la page ne défile plus, Échap ferme
  useEffect(() => {
    if (!activeStory) return;
    claimPopup("story", true, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tray) setTray(false);
        else closeStory();
      }
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowUp" && (activeStory.story_items[currentIndex]?.products?.length ?? 0) > 0) setTray(true);
      if (e.key === "ArrowDown") setTray(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      releasePopup("story");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory, currentIndex, tray]);

  // le tiroir se referme à chaque nouvelle diapo / story
  useEffect(() => {
    setTray(false);
  }, [activeStory, currentIndex]);

  // nouvelle diapo : on attend qu'elle soit chargée (une image déjà en cache est prête tout de suite)
  useEffect(() => {
    setMediaReady(false);
    setVideoDur(null);
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth > 0) setMediaReady(true);
    // sécurité : si rien ne charge au bout de 12 s, on avance quand même
    const t = window.setTimeout(() => setMediaReady(true), 12000);
    return () => window.clearTimeout(t);
  }, [activeStory, currentIndex]);

  // maintenir le doigt = pause (la barre et la vidéo s'arrêtent)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hold || !shown) v.pause();
    else v.play().catch(() => {});
  }, [hold, currentIndex, activeStory, shown]);

  if (loading) return null;
  if (stories.length === 0) return null;

  return (
    <>
      {/* STORY CIRCLES */}
      <div className="w-full flex justify-center gap-4 overflow-x-auto py-4 relative top-12">
        {stories.map((story) => (
          <motion.div
            key={story.id}
            whileHover={{ scale: 1.05 }}
            onClick={() => openStory(story)}
            className="flex flex-col items-center cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full p-[2px] bg-gray-100 border border-gray-700">
              <div
                data-story-cover={story.id}
                className="w-full h-full rounded-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${story.cover_url})`,
                }}
              />
            </div>
            <span className="text-sm mt-2 text-center">
              {story.title}
            </span>
          </motion.div>
        ))}
      </div>

      {/* STORY PLEIN ÉCRAN */}
      <style>{`@keyframes fysu-story-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      {mounted &&
        createPortal(
      <AnimatePresence>
        {activeStory && activeStory.story_items[currentIndex] && (
          <motion.div
            className="fixed overflow-hidden bg-black bg-cover bg-center"
            style={{
              zIndex: 9000,
              touchAction: "none",
              backgroundImage: `url(${activeStory.cover_url})`,
            }}
            initial={{
              top: origin?.top ?? 0,
              left: origin?.left ?? 0,
              width: origin?.width ?? vp.w,
              height: origin?.height ?? vp.h,
              borderRadius: 9999,
            }}
            animate={
              closing && origin
                ? { top: origin.top, left: origin.left, width: origin.width, height: origin.height, borderRadius: 9999 }
                : { top: 0, left: 0, width: vp.w, height: vp.h, borderRadius: 0 }
            }
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => {
              if (closing) finishClose();
              else setShown(true);
            }}
            onTouchStart={(e) => {
              touchY.current = e.touches[0].clientY;
              setPaused(true);
            }}
            onTouchEnd={(e) => {
              setPaused(false);
              const y0 = touchY.current;
              touchY.current = null;
              if (y0 === null) return;
              const dy = e.changedTouches[0].clientY - y0;
              if (dy < -70 && currentProducts.length > 0) setTray(true); // glisser vers le haut : les produits
              else if (dy > 110) {
                if (tray) setTray(false);
                else closeStory();
              }
            }}
            onWheel={(e) => {
              if (e.deltaY > 30 && currentProducts.length > 0) setTray(true);
              else if (e.deltaY < -30) setTray(false);
            }}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
          >
            {/* le contenu apparaît en fondu quand la forme est agrandie */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center md:bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: shown && !closing ? 1 : 0 }}
              transition={{ duration: shown ? 0.25 : 0.12 }}
              style={{ pointerEvents: shown && !closing ? "auto" : "none" }}
            >
            {/* colonne de la story : tout l'écran sur téléphone, colonne 9:16 centrée sur grand écran */}
            <div className="relative h-full w-full overflow-hidden md:aspect-[9/16] md:h-full md:w-auto md:max-w-full">
              {activeStory.story_items[currentIndex].type === "image" ? (
                <img
                  ref={imgRef}
                  onLoad={() => setMediaReady(true)}
                  onError={() => setMediaReady(true)}
                  key={activeStory.story_items[currentIndex].id ?? currentIndex}
                  src={activeStory.story_items[currentIndex].media_url}
                  className="absolute inset-0 h-full w-full object-cover"
                  alt=""
                  draggable={false}
                />
              ) : (
                <video
                  key={activeStory.story_items[currentIndex].id ?? currentIndex}
                  ref={videoRef}
                  onLoadedData={(e) => {
                    setMediaReady(true);
                    const d = (e.currentTarget as HTMLVideoElement).duration;
                    if (Number.isFinite(d) && d > 0) setVideoDur(Math.min(60, Math.max(2, d)));
                  }}
                  onError={() => setMediaReady(true)}
                  src={activeStory.story_items[currentIndex].media_url}
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              )}

              {/* dégradé léger en haut pour lire les barres et le titre */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent" />

              {/* zones de navigation : gauche = précédent, droite = suivant */}
              <div className="absolute left-0 top-0 h-full w-1/3" onClick={prevSlide} />
              <div className="absolute right-0 top-0 h-full w-2/3" onClick={nextSlide} />

              {/* barres de progression */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 flex gap-1 px-3"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
              >
                {activeStory.story_items.map((item, index) => (
                  <div key={index} className="h-[3px] flex-1 overflow-hidden rounded bg-white/35">
                    {index < currentIndex && <div className="h-full w-full bg-white" />}
                    {index === currentIndex && (
                      <div
                        key={`${activeStory.id}-${currentIndex}`}
                        className="h-full w-full origin-left bg-white"
                        style={{
                          animation: `fysu-story-bar ${(item.type === "video" && videoDur) || item.duration || 5}s linear forwards`,
                          animationPlayState: hold || !mediaReady ? "paused" : "running",
                        }}
                        onAnimationEnd={nextSlide}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* titre + fermer */}
              <div
                className="absolute inset-x-0 flex items-center justify-between px-4"
                style={{ top: "calc(env(safe-area-inset-top, 0px) + 28px)" }}
              >
                <div className="pointer-events-none flex items-center gap-2.5 text-white">
                  <span
                    className="h-8 w-8 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${activeStory.cover_url})` }}
                  />
                  <span className="text-sm font-medium drop-shadow">{activeStory.title}</span>
                </div>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeStory();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-white"
                >
                  ✕
                </button>
              </div>

              {/* « Shop now » : flèche discrète, glisser vers le haut (ou toucher) ouvre les produits */}
              {currentProducts.length > 0 && !tray && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTray(true);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 flex cursor-pointer flex-col items-center gap-1 text-white"
                  style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
                  aria-label="Shop now"
                >
                  <motion.svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ y: [0, -5, 0], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <path d="M6 14l6-6 6 6" />
                  </motion.svg>
                  <span className="text-[11px] font-medium uppercase tracking-[0.28em] drop-shadow">Shop now</span>
                </button>
              )}

              {/* tiroir des produits : monte depuis le bas */}
              <AnimatePresence>
                {tray && currentProducts.length > 0 && (
                  <>
                    <motion.div
                      key="tray-bg"
                      className="absolute inset-0 bg-black/45"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTray(false);
                      }}
                    />
                    <motion.div
                      key="tray"
                      className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white text-[#171717]"
                      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", stiffness: 340, damping: 36 }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label="Fermer"
                        onClick={() => setTray(false)}
                        className="mx-auto mt-2.5 block h-1.5 w-11 cursor-pointer rounded-full bg-[#171717]/20"
                      />
                      <p className="px-5 pb-3 pt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-[#171717]/55">Shop the look</p>
                      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-1">
                        {currentProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => goProduct(p.slug)}
                            className="w-[132px] shrink-0 cursor-pointer text-left active:scale-[0.98]"
                          >
                            <span
                              className="block aspect-[3/4] w-full rounded-2xl bg-[#f0ece5] bg-cover bg-center"
                              style={{ backgroundImage: p.image ? `url(${p.image})` : undefined }}
                            />
                            <span className="mt-2 block truncate text-[13px] font-medium">{p.name}</span>
                            <span className="text-xs text-[#171717]/60">{p.price} EUR</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body
        )}
    </>
  );
}