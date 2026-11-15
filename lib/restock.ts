import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { SITE_URL } from "@/lib/emailBlocks"
import { autoSend } from "@/lib/emailScenarios"

/* RETOUR EN STOCK : les demandes « Me prévenir » (product_requests, kind = notify, status = new)
   dont la taille / couleur est de nouveau disponible reçoivent un mail, puis passent en « traitée ».
   Ne fait jamais échouer l'action qui l'appelle. */
export async function notifyRestock(): Promise<number> {
  let sent = 0
  try {
    const { data: reqs } = await supabaseAdmin
      .from("product_requests")
      .select("id, product_id, email, message, locale, products(name, slug)")
      .eq("kind", "notify")
      .eq("status", "new")
      .limit(500)
    if (!reqs?.length) return 0

    const pids = Array.from(new Set(reqs.map((r: any) => r.product_id)))
    const [{ data: sizes }, { data: colors }] = await Promise.all([
      supabaseAdmin.from("product_sizes").select("product_id, color_id, size, stock, is_active").in("product_id", pids),
      supabaseAdmin.from("product_colors").select("id, name").in("product_id", pids),
    ])
    const colorName = new Map<string, string>((colors ?? []).map((c: any) => [c.id, String(c.name).toLowerCase()]))

    for (const r of reqs as any[]) {
      const m = String(r.message ?? "")
      const size = /Taille\s*:\s*([^·]+)/i.exec(m)?.[1]?.trim().toLowerCase()
      const color = /Couleur\s*:\s*([^·]+)/i.exec(m)?.[1]?.trim().toLowerCase()
      const back = (sizes ?? []).some(
        (s: any) => s.product_id === r.product_id && s.is_active && s.stock > 0 && (!size || String(s.size).trim().toLowerCase() === size) && (!color || colorName.get(s.color_id) === color)
      )
      if (!back) continue
      const p = Array.isArray(r.products) ? r.products[0] : r.products
      // on marque d'abord : pas de double envoi si deux enregistrements se suivent
      const { error } = await supabaseAdmin.from("product_requests").update({ status: "done" }).eq("id", r.id).eq("status", "new")
      if (error) continue
      await autoSend("restock", {
        email: r.email,
        lang: String(r.locale ?? "").startsWith("fr") ? "fr" : "en",
        locale: r.locale,
        vars: { produit: [p?.name, size && size.toUpperCase()].filter(Boolean).join(" · "), url: p?.slug ? `${SITE_URL}/product/${p.slug}` : SITE_URL },
      })
      sent++
    }
  } catch (e) {
    console.error("restock:", e)
  }
  return sent
}
