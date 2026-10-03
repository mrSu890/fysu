/* Hors-ligne pour les jeux d'arcade FYSU.
   Ne touche à RIEN d'autre sur le site : seules la page du jeu, ses images
   et les fichiers du site demandés par cette page sont gardés en mémoire. */
const CACHE = "fysu-games-v1"
const GAME_PAGE = "/games/fysu-bird"

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isGamePage = req.mode === "navigate" && url.pathname === GAME_PAGE
  const isGameAsset = url.pathname.startsWith("/games-bird-")
  const fromGamePage = (req.referrer || "").includes(GAME_PAGE)
  const isSiteFile = url.pathname.startsWith("/_next/static/") && fromGamePage

  if (isGamePage) {
    // page : le réseau d'abord, la mémoire si hors-ligne
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(GAME_PAGE, copy))
          return res
        })
        .catch(() => caches.match(GAME_PAGE).then((r) => r || Response.error()))
    )
    return
  }

  if (isGameAsset || isSiteFile) {
    // images et fichiers : la mémoire d'abord
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          })
      )
    )
  }
})
