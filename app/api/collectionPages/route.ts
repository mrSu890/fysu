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

  // l'Arcade : visible sauf si tu l'as masquée dans l'admin (table « site_settings »)
  let arcade = true
  try {
    const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "arcade_visible").maybeSingle()
    arcade = (data as any)?.value !== false
  } catch {
    arcade = true
  }

  return { kibanCollector: !kiban, thewave: !wave, fygrances: !fy, music, arcade }
}

/* GET /api/collectionPages?weather=1
   Météo actuelle à l'endroit approximatif du visiteur (ville, d'après son adresse IP, donnée par Vercel).
   Rien n'est enregistré. Service : Open-Meteo (gratuit, sans clé). */
async function weatherForVisitor(req: Request) {
  const h = req.headers
  const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "")
  const lon = parseFloat(h.get("x-vercel-ip-longitude") ?? "")
  // repli (test local, adresse inconnue) : Bruxelles
  const la = Number.isFinite(lat) ? Math.round(lat * 10) / 10 : 50.8
  const lo = Number.isFinite(lon) ? Math.round(lon * 10) / 10 : 4.4
  let city = ""
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "")
  } catch {
    city = ""
  }
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code,is_day&timezone=auto`,
      { next: { revalidate: 600 } }
    )
    if (!r.ok) throw new Error("meteo")
    const d = await r.json()
    const c = d?.current
    if (!c) throw new Error("meteo")
    return { ok: true, temp: Math.round(c.temperature_2m), code: Number(c.weather_code), isDay: c.is_day === 1, city }
  } catch {
    return { ok: false }
  }
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("weather")) {
    return new Response(JSON.stringify(await weatherForVisitor(req)), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    })
  }

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
