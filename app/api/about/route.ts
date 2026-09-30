import { localize } from "@/lib/translate"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  const supabase = supabaseAdmin

  const { data, error } = await supabase
    .from("about_blocks")
    .select(`
      *,
      about_block_paragraphs (*)
    `)
    .eq("is_active", true)
    .order("order_index", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(await localize(data))
}

export async function POST(req: Request) {
    const supabase = supabaseAdmin
    const body = await req.json()
  
    const { title, image_url, order_index, paragraphs } = body
  
    const { data: block, error } = await supabase
      .from("about_blocks")
      .insert({
        title,
        image_url,
        order_index
      })
      .select()
      .single()
  
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  
    if (paragraphs?.length) {
      await supabase.from("about_block_paragraphs").insert(
        paragraphs.map((p: string, index: number) => ({
          block_id: block.id,
          content: p,
          order_index: index
        }))
      )
    }
  
    return NextResponse.json(block)
  }
