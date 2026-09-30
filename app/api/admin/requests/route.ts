import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// Liste des demandes clients (me prévenir / devis). Réservée aux admins par le middleware.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("product_requests")
    .select("id, product_id, kind, email, name, message, locale, status, created_at, products(name, slug)")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const requests = (data ?? []).map((r: any) => {
    const product = Array.isArray(r.products) ? r.products[0] : r.products
    return {
      id: r.id,
      productId: r.product_id,
      productName: product?.name ?? "Produit supprimé",
      productSlug: product?.slug ?? null,
      kind: r.kind,
      email: r.email,
      name: r.name,
      message: r.message,
      locale: r.locale,
      status: r.status,
      createdAt: r.created_at,
    }
  })

  return NextResponse.json({ requests })
}
