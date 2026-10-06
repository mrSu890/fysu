import { localize } from "@/lib/translate"
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("visible", true)
    .order("created_at", { ascending: true });

  if (error) console.error(error);

  // on garde seulement ce dont le menu a besoin ; l'adresse de l'image n'est pas traduite
  const rows = (data ?? []).map((p: any) => ({ title: p.title, slug: p.slug, visible: p.visible }));
  const translated = await localize(rows);
  const out = translated.map((r: any, i: number) => ({ ...r, hero_image: (data as any[])[i]?.hero_image ?? null }));
  return new Response(JSON.stringify(out), { status: 200 });
}
