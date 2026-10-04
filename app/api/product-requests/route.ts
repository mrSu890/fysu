import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Demandes envoyées depuis la fiche produit : « me prévenir » et « devis ».
// Route publique (pas besoin d'être connecté). Les demandes se lisent dans l'admin > Demandes.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Piège anti-robots : ce champ caché doit rester vide. On répond "ok" sans rien enregistrer.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ ok: true })
    }

    const productId = Number(body.productId)
    const kind = body.kind === "quote" ? "quote" : body.kind === "notify" ? "notify" : null
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : ""
    const locale = typeof body.locale === "string" ? body.locale.slice(0, 8) : null

    if (!Number.isInteger(productId) || productId <= 0 || !kind) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    if (kind === "quote" && message.length < 3) {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, availability")
      .eq("id", productId)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Un devis n'est possible que sur un produit "sur devis"
    if (kind === "quote" && product.availability !== "quote") {
      return NextResponse.json({ error: "Quotes are not available for this product" }, { status: 400 })
    }

    // Même personne, même produit, même type, déjà en attente : on ne crée pas de doublon
    if (kind === "notify") {
      // une même personne peut demander des tailles différentes : on compare aussi le message (taille / couleur)
      let dup = supabaseAdmin
        .from("product_requests")
        .select("id")
        .eq("product_id", productId)
        .eq("kind", "notify")
        .eq("email", email)
        .eq("status", "new")
      dup = message ? dup.eq("message", message) : dup.is("message", null)
      const { data: existing } = await dup.limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json({ ok: true })
      }
    }

    const { error } = await supabaseAdmin.from("product_requests").insert({
      product_id: productId,
      kind,
      email,
      name: name || null,
      message: message || null,
      locale,
    })

    if (error) {
      console.error("product_requests insert error:", error)
      return NextResponse.json({ error: "Unable to save request" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("product-requests error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
