import { localize } from "@/lib/translate"
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase
    .from("pages")
    .select("title, slug, visible")
    .eq("visible", true)
    .order("created_at", { ascending: true });

  if (error) console.error(error);

  return new Response(JSON.stringify(await localize(data ?? [])), { status: 200 });
}
