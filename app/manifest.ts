import type { MetadataRoute } from "next"

/* FYSU sur l'écran d'accueil : nom, icône et affichage sans barre de navigateur. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FYSU",
    short_name: "FYSU",
    description: "FYSU",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#efeeea",
    theme_color: "#151515",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
