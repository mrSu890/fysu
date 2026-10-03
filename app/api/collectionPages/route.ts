import { localize } from "@/lib/translate"
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Collections cachées du menu "Collections" (elles ont leur propre page)
const HIDDEN_SLUGS = ["kiban-collector", "thewave"];

/* GET /api/collectionPages?visibility=1
   Quelles pastilles afficher sur la page d'accueil ? (« Explore The Universe »)
   Une pastille disparaît si la page est masquée dans l'admin. */
async function homeVisibility() {
  const hidden = async (table: "collectionPages" | "pages", slug: string) => {
    try {
      const { data } = await supabaseAdmin
        .from(table)
        .select("visible")
        .eq("slug", slug)
        .maybeSingle()
      return !!data && (data as any).visible === false
    } catch {
      return false
    }
  }

  // la musique : visible s'il reste au moins un album visible
  let music = true
  try {
    const { count } = await supabaseAdmin
      .from("music_albums")
      .select("id", { count: "exact", head: true })
      .eq("visible", true)
    music = (count ?? 0) > 0
  } catch {
    music = true
  }

  const [kiban, wave, fy] = await Promise.all([
    hidden("collectionPages", "kiban-collector"),
    hidden("collectionPages", "thewave"),
    hidden("pages", "fygrances"),
  ])

  return { kibanCollector: !kiban, thewave: !wave, fygrances: !fy, music }
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("visibility")) {
    return new Response(JSON.stringify(await homeVisibility()), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    })
  }

  const { data, error } = await supabaseAdmin
    .from("collectionPages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }

  const visible = (data ?? []).filter(
    (c: any) => !HIDDEN_SLUGS.includes(c.slug)
  );

  return new Response(JSON.stringify(await localize(visible)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
