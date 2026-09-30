import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { defaultLocale, isAppLocale, locales } from "@/i18n/routing"

function getPreferredLocale(req: NextRequest) {
  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value
  if (isAppLocale(cookieLocale)) return cookieLocale

  const acceptLanguage = req.headers.get("accept-language")
  const acceptedLocales =
    acceptLanguage
      ?.split(",")
      .map((part) => part.split(";")[0]?.trim().toLowerCase())
      .filter(Boolean) ?? []

  for (const accepted of acceptedLocales) {
    const base = accepted.split("-")[0]
    const locale = locales.find((item) => item === accepted || item === base)
    if (locale) return locale
  }

  return defaultLocale
}

// Protège toutes les routes /api/admin/* : il faut être connecté ET avoir le rôle admin
async function guardAdminApi(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // API admin : réservée aux admins
  // (exception : la lecture de la politique de confidentialité, affichée sur le site public)
  if (pathname.startsWith("/api/admin")) {
    if (req.method === "GET" && pathname === "/api/admin/privacy-policy") {
      return NextResponse.next()
    }
    return guardAdminApi(req)
  }

  // Laisser passer fichiers statiques et internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.includes(".") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next()
  }

  const isAdminPage = pathname.startsWith("/admin")
  const isAuthPage = pathname.startsWith("/auth")
  const res = NextResponse.next()

  if (!req.cookies.get("NEXT_LOCALE")) {
    res.cookies.set("NEXT_LOCALE", getPreferredLocale(req), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  // Si la route n'est ni admin ni auth, on laisse passer
  if (!isAdminPage && !isAuthPage) {
    return res
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Empêcher l'accès aux pages /auth si connecté
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Protéger /admin si pas connecté
  if (isAdminPage && !user) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  // Vérifier le rôle admin uniquement pour /admin
  if (isAdminPage && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/admin/:path*"],
}
