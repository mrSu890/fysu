import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Collections cachées du menu "Collections" (elles ont leur propre page)
const HIDDEN_SLUGS = ["kiban-collector", "thewave"];

export async function GET() {
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

  return new Response(JSON.stringify(visible), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
