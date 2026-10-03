import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  // /api/auth/callback?me=1 : qui est connecté ? (lu côté serveur, sans passer par la session du navigateur)
  if (requestUrl.searchParams.get("me")) {
    try {
      const supabase = await supabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return NextResponse.json({ user: null }, { status: 401 });

      return NextResponse.json({
        user: { id: user.id, email: user.email, user_metadata: user.user_metadata ?? {} },
      });
    } catch {
      return NextResponse.json({ user: null }, { status: 500 });
    }
  }

  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
