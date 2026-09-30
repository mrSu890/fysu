import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

// Liste des commandes (la route est réservée aux admins par le middleware)

const GROUPS: Record<string, string[]> = {
  paid: ["paid"],
  shipped: ["shipped"],
  pending: ["pending"],
  closed: ["cancelled", "refunded"],
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") ?? 20)))
  const group = (searchParams.get("status") ?? "all").toLowerCase()
  const q = (searchParams.get("q") ?? "").trim()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabaseAdmin
    .from("orders")
    .select("id, status, total, currency, email, createdAt, shipping_data, items, tracking_number", {
      count: "exact",
    })
    .order("createdAt", { ascending: false })
    .range(from, to)

  if (GROUPS[group]) query = query.in("status", GROUPS[group])

  if (q) {
    const safe = q.replace(/[%_,()]/g, " ").trim()
    if (safe) {
      query = query.or(
        `email.ilike.%${safe}%,shipping_data->>name.ilike.%${safe}%,stripe_session_id.ilike.%${safe}%`
      )
    }
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compteurs des onglets
  const countOf = async (statuses?: string[]) => {
    let c = supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
    if (statuses) c = c.in("status", statuses)
    const { count: n } = await c
    return n ?? 0
  }

  const [all, paid, shipped, pending, closed] = await Promise.all([
    countOf(),
    countOf(GROUPS.paid),
    countOf(GROUPS.shipped),
    countOf(GROUPS.pending),
    countOf(GROUPS.closed),
  ])

  // Noms et miniatures des produits (pour reconnaître une commande d'un coup d'œil)
  const rows = (data ?? []) as any[]
  const ids = new Set<number>()
  for (const o of rows) {
    for (const it of Array.isArray(o.items) ? o.items : []) {
      const n = Number(it?.product_id)
      if (Number.isFinite(n)) ids.add(n)
    }
  }

  const products: Record<number, { name: string; image: string | null }> = {}
  if (ids.size > 0) {
    const { data: prods } = await supabaseAdmin
      .from("products")
      .select("id, name, product_images(url)")
      .in("id", Array.from(ids))
    for (const p of (prods ?? []) as any[]) {
      products[Number(p.id)] = { name: p.name, image: p.product_images?.[0]?.url ?? null }
    }
  }

  const orders = rows.map((o) => {
    const items = (Array.isArray(o.items) ? o.items : []) as any[]
    return {
      id: o.id,
      status: o.status,
      total: o.total,
      currency: o.currency,
      email: o.email,
      createdAt: o.createdAt,
      customerName: o.shipping_data?.name ?? null,
      trackingNumber: o.tracking_number ?? null,
      itemCount: items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0),
      items: items.slice(0, 3).map((it) => ({
        name: products[Number(it?.product_id)]?.name ?? "Produit",
        image: products[Number(it?.product_id)]?.image ?? null,
        quantity: Number(it?.quantity) || 0,
      })),
    }
  })

  return NextResponse.json({
    orders,
    totalCount: count ?? 0,
    counts: { all, paid, shipped, pending, closed },
  })
}
