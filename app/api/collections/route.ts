import { localize } from "@/lib/translate"
import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"

export async function GET() {
  const supabase = await supabaseServer();
  try {
    const { data, error } = await supabase
      .from("pages")
      .select("id, title, slug")
      .eq("visible", true)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Erreur fetch collections:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(await localize(data))
  } catch (err: any) {
    console.error("Crash API collections:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
