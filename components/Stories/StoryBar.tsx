"use client";

import { useEffect, useRef, useState } from "react";
import { claimPopup, releasePopup } from "@/lib/popups";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

type StoryItem = {
  id: string;
  type: "image" | "video";
  media_url: string;
  duration: number;
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
  const supabase = supabaseClient;

  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  /* -------------------------------------------------- */
  /* FETCH STORIES */
  /* -------------------------------------------------- */

  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
  
      let pageId: string | null = null;
      let collectionPageId: string | null = null;
  
      // 1) Resolve target id
      if (pageSlug) {
        const { data, error } = await supabase
          .from("pages")
          .select("id")
          .eq("slug", pageSlug)
          .maybeSingle();
  
        if (error) console.log("pages slug error:", error);
        pageId = data?.id ?? null;
      } else if (collectionSlug) {
        const { data, error } = await supabase
          .from("collectionPages") // <-- IMPORTANT: exact table name from your schema
          .select("id")
          .eq("slug", collectionSlug)
          .maybeSingle();
  
        if (error) console.log("collectionPages slug error:", error);
        collectionPageId = data?.id ?? null;
      }
  
      if (!pageId && !collectionPageId) {
        setStories([]);
        setLoading(false);
        return;
      }
  
      // 2) Fetch links from the SAME table, filtering on the right column
      let linksQuery = supabase
        .from("story_page_links")
        .select("story_id, priority");
  
      if (pageId) linksQuery = linksQuery.eq("page_id", pageId);
      if (collectionPageId)
        linksQuery = linksQuery.eq("collection_page_id", collectionPageId);
  
      const { data: links, error: linksError } = await linksQuery.order("priority", {
        ascending: false,
      });
  
      if (linksError) console.log("story_page_links error:", linksError);
  
      if (!links || links.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }
  
      const storyIds = links.map((l) => l.story_id);
  
      // 3) Fetch stories + items
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .select(
          `
            id, title, cover_url, order_index, is_active,
            story_items ( id, type, media_url, duration, order_index )
          `
        )
        .in("id", storyIds)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
  
      if (storyError) console.log("stories error:", storyError);
  
      // 4) Sort story_items by order_index (important!)
      const sorted =
        (storyData ?? []).map((s) => ({
          ...s,
          story_items: [...(s.story_items ?? [])].sort(
            (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
          ),
        })) ?? [];
  
      setStories(sorted);
      setLoading(false);
    };
  
    fetchStories();
  }, [pageSlug, collectionSlug]);

  /* -------------------------------------------------- */
  /* VISIONNEUSE PLEIN ÉCRAN                             */
  /* -------------------------------------------------- */

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchY = useRef<number | null>(null);

  const closeStory = () => {
    setActiveStory(null);
    setCurrentIndex(0);
    setPaused(false);
  };

  const nextSlide = () => {
    if (!activeStory) return;
    if (currentIndex < activeStory.story_items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      closeStory();
    }
  };

  const prevSlide = () => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));

  // pendant une story : le reste du site se met à l'écart, la page ne défile plus, Échap ferme
  useEffect(() => {
    if (!activeStory) return;
    claimPopup("story", true, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeStory();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      releasePopup("story");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory, currentIndex]);

  // maintenir le doigt = pause (la barre et la vidéo s'arrêtent)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, currentIndex, activeStory]);

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
            onClick={() => {
              setActiveStory(story);
              setCurrentIndex(0);
            }}
            className="flex flex-col items-center cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full p-[2px] bg-gray-100 border border-gray-700">
              <div
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
      <AnimatePresence>
        {activeStory && activeStory.story_items[currentIndex] && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black"
            style={{ zIndex: 9000, touchAction: "none" }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onTouchStart={(e) => {
              touchY.current = e.touches[0].clientY;
              setPaused(true);
            }}
            onTouchEnd={(e) => {
              setPaused(false);
              const y0 = touchY.current;
              touchY.current = null;
              if (y0 !== null && e.changedTouches[0].clientY - y0 > 110) closeStory();
            }}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
          >
            {/* colonne de la story : tout l'écran sur téléphone, colonne 9:16 centrée sur grand écran */}
            <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:h-full md:w-auto md:max-w-full">
              {activeStory.story_items[currentIndex].type === "image" ? (
                <img
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
                          animation: `fysu-story-bar ${item.duration || 5}s linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}