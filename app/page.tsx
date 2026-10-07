import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeHero from "@/components/Home/Hero";
import LogoIntro from "@/components/Home/LogoIntro";
import NewSelectionIntro from "@/components/Home/NewSelectionIntro";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Metadata } from "next";
import { HOME_DESCRIPTION, HOME_TITLE, SITE } from "@/lib/seo";

import HomeSection from "@/components/Home/HomeSection";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: SITE },
};

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

export default async function Home() {
  const slides = await getHeroSlides();

  return (
    <>
      <Navbar />
      <LogoIntro>
        <HomeHero initialSlides={slides} />
      </LogoIntro>
      <div className="flex flex-col gap-36 sm:gap-48">
        <HomeSection slug="solos" />
        <HomeSection slug="duos" />
      </div>

      <NewSelectionIntro />

      <Footer />
    </>
  );
}
