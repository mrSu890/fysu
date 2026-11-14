import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"

async function unsub(token: string | null) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return false
  const { error } = await supabaseAdmin.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("token", token)
  return !error
}

const page = (ok: boolean) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FYSU</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#efeeea;font-family:Helvetica,Arial,sans-serif;color:#151515;text-align:center;padding:24px">
<div><div style="font-family:Georgia,serif;font-size:26px;letter-spacing:.14em;font-weight:700;margin-bottom:24px">FYSU</div>
<p style="font-size:16px;font-weight:300;line-height:1.6">${ok ? "Tu es désinscrit de la newsletter.<br>You have been unsubscribed." : "Lien invalide.<br>Invalid link."}</p>
<a href="/" style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#151515">f-y-s-u.com</a></div></body>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )

export async function GET(req: Request) {
  return page(await unsub(new URL(req.url).searchParams.get("t")))
}

// désinscription en un clic depuis Gmail / Apple Mail (en-tête List-Unsubscribe-Post)
export async function POST(req: Request) {
  return page(await unsub(new URL(req.url).searchParams.get("t")))
}
