import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { defaultLocale, isAppLocale, locales } from "@/i18n/routing"
import { GATE_COOKIE, gateActive, gateToken } from "@/lib/preLaunch"

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


// Page d'attente (voir lib/preLaunch.ts) : un compte admin connecté entre directement, sans la voir
async function isAdminVisitor(req: NextRequest, res: NextResponse) {
  // pas de session Supabase dans les cookies : inutile d'interroger Supabase
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
  if (!hasSession) return false

  try {
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
    if (!user) return false
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    return profile?.role === "admin"
  } catch {
    return false
  }
}

// Renvoie une réponse si le visiteur doit voir la page d'attente (ou en sortir), sinon null
async function preLaunchGate(req: NextRequest, res: NextResponse): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl
  const onGatePage = pathname === "/password"

  if (!gateActive()) {
    // site ouvert : l'ancienne adresse /password renvoie à l'accueil
    return onGatePage ? NextResponse.redirect(new URL("/", req.url)) : null
  }

  // la connexion admin reste toujours accessible
  if (pathname.startsWith("/auth")) return null

  const token = await gateToken()
  const hasPassword = Boolean(token) && req.cookies.get(GATE_COOKIE)?.value === token
  const allowed = hasPassword || (await isAdminVisitor(req, res))

  if (allowed) return onGatePage ? NextResponse.redirect(new URL("/", req.url)) : null
  if (onGatePage) return null

  // Pas d'accès : la page d'attente s'affiche à la place de la page demandée (l'adresse ne change pas)
  const out = NextResponse.rewrite(new URL("/password", req.url))
  res.cookies.getAll().forEach((c) => out.cookies.set(c))
  out.headers.set("X-Robots-Tag", "noindex, nofollow")
  out.headers.set("Cache-Control", "no-store")
  return out
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

  // Page d'attente avant l'ouverture du site
  const gate = await preLaunchGate(req, res)
  if (gate) return gate

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
