import Navbar from "@/components/Navbar"

// Pendant que le serveur prépare la fiche : même écran vide qu'avant (fond du site)
export default function Loading() {
  return (
    <>
      <Navbar />
      <div className="w-screen h-screen bg-background" />
    </>
  )
}
