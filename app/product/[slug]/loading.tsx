import Navbar from "@/components/Navbar"
import HeroPlaceholder from "@/components/Product/HeroPlaceholder"

// Pendant que le serveur prépare la fiche : le fond du site, avec la place de la grande photo déjà réservée
export default function Loading() {
  return (
    <>
      <Navbar />
      <HeroPlaceholder />
    </>
  )
}
