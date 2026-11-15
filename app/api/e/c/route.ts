import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { sign, unb64 } from "@/lib/tracking"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const u = q.get("u") ?? ""
  if (!/^https?:\/\//i.test(u) || q.get("s") !== sign(u)) return NextResponse.redirect(new URL("/", req.url))
  try {
    const c = q.get("c") ?? ""
    if (/^[0-9a-f-]{36}$/i.test(c)) {
      await supabaseAdmin.from("email_events").insert({ campaign_id: c, email: unb64(q.get("r") ?? "").slice(0, 254), type: "click", variant: (q.get("v") ?? "A").slice(0, 1), url: u.slice(0, 500) })
    }
  } catch {}
  return NextResponse.redirect(u)
}
