import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeHero from "@/components/Home/Hero";
import NewSelectionIntro from "@/components/Home/NewSelectionIntro";
import ThemeToggle from "@/components/ThemeToggle";

import HomeSection from "@/components/Home/HomeSection";

export default function Home() {
  return (
    <>
      <Navbar />
      <HomeHero />
      <ThemeToggle />
      <NewSelectionIntro />
      <div className="flex flex-col gap-28">
        <HomeSection slug="solos" />
        <HomeSection slug="duos" />
      </div>
    
      <Footer />
    </>
  );
}
