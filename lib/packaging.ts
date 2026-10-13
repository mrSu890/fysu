/* Le bloc d'information « packaging » (admin > produit > Infos) s'ouvre dans un panneau, il n'apparaît pas en bas de la page.
   On le repère par son titre d'origine, AVANT la traduction (sinon « Packaging » devient « Verpackung », « 梱包 »… et n'est plus reconnu).
   L'API ajoute donc « is_packaging » à chaque bloc (voir app/api/products/[slug]/route.ts). */

const PACKAGING_RE = /packag|emballage|verpakking|verpackung|embalaje|embalagem|imballaggio|förpackning|opakowanie|pakkaus|梱包|包装|包裝|パッケージ|포장/i

export const titleIsPackaging = (title?: string | null) => PACKAGING_RE.test(title ?? "")
