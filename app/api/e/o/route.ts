import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { unb64 } from "@/lib/tracking"

export const runtime = "nodejs"

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  try {
    const c = q.get("c") ?? ""
    if (/^[0-9a-f-]{36}$/i.test(c)) {
      await supabaseAdmin.from("email_events").insert({ campaign_id: c, email: unb64(q.get("r") ?? "").slice(0, 254), type: "open", variant: (q.get("v") ?? "A").slice(0, 1) })
    }
  } catch {}
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } })
}
