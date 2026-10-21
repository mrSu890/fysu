/* ====================================================================
   CHARGEUR D'IMAGES
   Les photos des produits sont des fichiers lourds. Au lieu de les envoyer en taille d'origine,
   on demande à Supabase (option « Image Transformations », incluse dans le plan Pro) une version
   à la bonne taille : le site s'affiche beaucoup plus vite et consomme moins de données.
   Les autres images (autres sites) sont laissées telles quelles.
   Pour revenir en arrière : remettre « unoptimized: true » dans next.config.ts.
   ==================================================================== */

const MARK = "/storage/v1/object/public/"
const RENDER = "/storage/v1/render/image/public/"

export default function supabaseImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // seulement les images publiques de notre Supabase, et pas les formats qui ne se redimensionnent pas
  if (!src.includes("supabase.co") || !src.includes(MARK) || /\.(svg|gif|mp4|mov|webm)(\?|$)/i.test(src)) return src
  const base = src.split("?")[0].replace(MARK, RENDER)
  return `${base}?width=${width}&quality=${quality || 75}`
}
