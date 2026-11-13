import { NextRequest, NextResponse } from "next/server"
import { GET as getPage } from "../route"

export const runtime = "nodejs"

/* Les catégories d'une page (For him, For her…) avec le nombre de produits : sert au menu en couches. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const res = await getPage(request, ctx)
  if (!res.ok) return NextResponse.json({ total: 0, rows: [] }, { status: res.status })
  const data = await res.json()
  const seen = new Set<number>()
  const rows = (data.sections ?? [])
    .map((s: any) => {
      const products = (s.section_products ?? []).map((sp: any) => sp.product).filter(Boolean)
      products.forEach((p: any) => seen.add(p.id))
      return { id: String(s.id), title: s.title, count: products.length }
    })
    .filter((r: any) => r.count > 0)
  return NextResponse.json({ total: seen.size, rows }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } })
}
