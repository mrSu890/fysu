import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeHero, { HomeIntroText } from "@/components/Home/Hero";
import HomeStage from "@/components/Home/HomeStage";
import type { Slide } from "@/components/Home/HomeShowcase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Metadata } from "next";
import { homeCopy, SITE } from "@/lib/seo";
import { getLocale } from "next-intl/server";
import { localize } from "@/lib/translate";

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
      text: String(s.text || ""),
      product_ids: Array.isArray(s.product_ids) ? s.product_ids.map(Number).filter((x: number) => Number.isFinite(x)) : [],
    }));
  } catch {
    return null;
  }
}

// Les produits phares choisis à la main pour chaque slide (dans l'ordre choisi)
async function getSlideProducts(slides: Slide[] | null): Promise<Record<string, any[]>> {
  const out: Record<string, any[]> = {};
  if (!slides) return out;
  const ids = Array.from(new Set(slides.flatMap((s) => s.product_ids ?? [])));
  if (ids.length === 0) return out;
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(`id, name, slug, price, availability, release_date, product_sizes (stock, is_active), categories (name), product_images (*), product_colors!product_colors_product_id_fkey (*)`)
      .in("id", ids)
      .eq("is_hidden", false);
    if (error || !data) return out;
    const loc: any = await localize(data.map((p: any) => ({ ...p, category: p?.categories?.name ?? null, main_image: p?.product_images?.[0]?.url ?? null })));
    const byId = new Map<number, any>(loc.map((p: any) => [Number(p.id), p]));
    for (const s of slides) {
      const list = (s.product_ids ?? []).map((id) => byId.get(id)).filter(Boolean);
      if (list.length) out[s.key] = list;
    }
  } catch (err) {
    console.error("slide products:", err);
  }
  return out;
}

// Les deux rangées de l'accueil sont lues côté serveur : produits et prix sont dans le HTML
async function getSection(slug: string) {
  return readRoute<{ title?: string; products?: any[] }>(() =>
    getSectionRoute(internalRequest(`/api/sections/${slug}`), { params: Promise.resolve({ slug }) })
  );
}

export default async function Home() {
  const [slides, solos, duos, carousel] = await Promise.all([getHeroSlides(), getSection("solos"), getSection("duos"), getCarouselSlides()]);
  const slideProducts = await getSlideProducts(carousel);

  return (
    <>
      <Navbar />
      {/* 1. carrousel 3D qui se déploie en sélection (pastilles + produits phares) au premier scroll */}
      <HomeStage initialSlides={carousel} slideProducts={slideProducts} />
      {/* 2. bloc texte FYSU */}
      <HomeIntroText />
      {/* 3. rangées de produits */}
      <div className="mt-20 flex flex-col gap-36 sm:mt-28 sm:gap-48">
        <HomeSection slug="solos" index={1} initialSection={solos} />
        {/* « Recently viewed » : toujours juste sous la rangée New in */}
        <RecentlyViewed />
        <HomeSection slug="duos" index={2} initialSection={duos} />
      </div>
      {/* 4. grande image avec le gros logo rose dessus (mène à Kiban Collector) */}
      <div className="mt-36 sm:mt-48" />
      <HomeHero initialSlides={slides} />

      <Footer />
    </>
  );
}
