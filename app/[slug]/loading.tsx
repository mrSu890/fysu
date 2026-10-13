import Navbar from "@/components/Navbar"

// Même écran d'attente qu'avant : la barre de navigation et une page vide
export default function Loading() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen" />
    </>
  )
}
