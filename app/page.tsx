import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeHero from "@/components/Home/Hero";
import LogoIntro from "@/components/Home/LogoIntro";
import NewSelectionIntro, { type Slide } from "@/components/Home/NewSelectionIntro";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Metadata } from "next";
import { homeCopy, SITE } from "@/lib/seo";
import { getLocale } from "next-intl/server";

import HomeSection from "@/components/Home/HomeSection";
import RecentlyViewed from "@/components/RecentlyViewed";
import { GET as getSectionRoute } from "@/app/api/sections/[slug]/route";
import { internalRequest, readRoute } from "@/lib/serverData";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = homeCopy(await getLocale());
  return { title, description, alternates: { canonical: SITE } };
}

// Les images du hero sont lues côté serveur : elles sont déjà dans la page à l'arrivée
export const dynamic = "force-dynamic";

async function getHeroSlides() {
  try {
    const { data, error } = await supabaseAdmin
      .from("hero_slider")
      .select("media_path, media_type")
      .order("order");
    if (error) {
      console.error("hero_slider:", error.message);
      return [];
    }
    return (data ?? []) as { media_path: string; media_type?: "image" | "video" }[];
  } catch (err) {
    console.error("hero_slider:", err);
    return [];
  }
}

// Les slides du carrousel de l'accueil (réglées dans l'admin) : lues côté serveur pour que la première image soit connue dès l'arrivée
async function getCarouselSlides(): Promise<Slide[] | null> {
  try {
    const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "home_carousel").maybeSingle();
    if (!Array.isArray(data?.value) || data!.value.length === 0) return null;
    return (data!.value as any[]).map((s, i) => ({
      key: String(s.id || i),
      label: String(s.label || ""),
      href: String(s.href || "/"),
      image: String(s.image || ""),
      kind: String(s.kind || ""),
    }));
  } catch {
    return null;
  }
}

// Les deux rangées de l'accueil sont lues côté serveur : produits et prix sont dans le HTML
async function getSection(slug: string) {
  return readRoute<{ title?: string; products?: any[] }>(() =>
    getSectionRoute(internalRequest(`/api/sections/${slug}`), { params: Promise.resolve({ slug }) })
  );
}

export default async function Home() {
  const [slides, solos, duos, carousel] = await Promise.all([getHeroSlides(), getSection("solos"), getSection("duos"), getCarouselSlides()]);

  return (
    <>
      <Navbar />
      {/* 1. carrousel des collections : c'est la première chose que l'on voit */}
      <NewSelectionIntro initialSlides={carousel} />
      {/* 2. rangées de produits */}
      <RecentlyViewed className="mt-20 sm:mt-28" />
      <div className="flex flex-col gap-36 sm:gap-48">
        <HomeSection slug="solos" index={1} initialSection={solos} />
        <HomeSection slug="duos" index={2} initialSection={duos} />
      </div>
      {/* 3. gros logo rose, puis la grande image (mène à Kiban Collector) */}
      <LogoIntro />
      <HomeHero initialSlides={slides} />

      <Footer />
    </>
  );
}
