import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import { Inter, DM_Mono } from "next/font/google";
import ClickFeedback from "@/components/ClickFeedback";
import CookieBanner from "@/components/CookieBanner";
import DecorativeDots from "@/components/DecorativeDots";
import ScrollReveal from "@/components/ScrollReveal";
import SiteLoader from "@/components/SiteLoader";
import PixelTransition from "@/components/PixelTransition";
import NotificationToasts from "@/components/NotificationToasts";
import RegionGate from "@/components/RegionGate";
import ExtraCopyBridge from "@/components/ExtraCopyBridge";
import MiniPlayer from "@/components/MusicMiniPlayer";
import MusicPrompt from "@/components/MusicPrompt";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import BackButton from "@/components/BackButton";
import Tips from "@/components/Tips";
import { MusicPlayerProvider } from "@/context/MusicPlayerContext";
import { rtlLocales } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { HOME_DESCRIPTION, HOME_TITLE, SITE, SITE_NAME, organizationJsonLd } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
// Police « fiche technique » pour les textes d'information (tailles, matières, prix…)
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-mono",
  display: "swap",
});
//import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["FYSU", "fysu", "fysu clothing", "fysu fragrance", "fysu music", "independent fashion house", "slow fashion", "perfume", "piano ambient"],
  alternates: { canonical: SITE },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Codes de vérification des moteurs de recherche (à ajouter dans Vercel, voir les étapes données par Claude)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } : {}),
      ...(process.env.NEXT_PUBLIC_NAVER_VERIFICATION ? { "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_VERIFICATION } : {}),
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE,
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
  icons: {
    icon: [{ url: "/api/favicon", type: "image/png" }],
    shortcut: "/api/favicon",
    apple: "/api/favicon",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={rtlLocales.includes(locale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${dmMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem("theme");
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                }
              } catch (e) {}
              try {
                const a = JSON.parse(localStorage.getItem("fysu-a11y") || "null");
                if (a) {
                  const h = document.documentElement;
                  const sizes = ["", "112.5%", "125%", "140%"];
                  if (a.size) h.style.fontSize = sizes[a.size] || "";
                  if (a.readable) h.classList.add("a11y-readable");
                  if (a.contrast) h.classList.add("a11y-contrast");
                  if (a.calm) h.classList.add("a11y-calm");
                  if (a.nodots) h.classList.add("a11y-nodots");
                  if (a.focus) h.classList.add("a11y-focus");
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground transition-colors duration-400">
        {/* Données structurées pour Google : qui est FYSU */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()).replace(/</g, "\\u003c") }}
        />
        {/* Écran de chargement d'arrivée sur le site */}
        <SiteLoader />
        {/* <AuthProvider> */}
          <NextIntlClientProvider messages={messages}>
            <ExtraCopyBridge />
            <CartProvider>
              <MusicPlayerProvider>
                {children}
                {/* Flèche retour (pastille discrète sous la barre de navigation) */}
                <BackButton />
                {/* Astuces guidées (première fois : musique, vinyle, accessibilité…) */}
                <Tips />
                {/* Choix de la zone : apparaît avant les cookies et les notifications */}
                <RegionGate />
                <CookieBanner />
                <NotificationToasts />
                {/* Musique : pop-up sur les collections + pastille de lecture */}
                <MusicPrompt />
                <MiniPlayer />
                {/* Transition en pixels entre les pages */}
                <PixelTransition />
                {/* Accessibilité : pastille en bas à gauche */}
                <AccessibilityMenu />
              </MusicPlayerProvider>
            </CartProvider>
          </NextIntlClientProvider>
        {/* </AuthProvider> */}
        <Toaster />
        <DecorativeDots />
        <ScrollReveal />
        <ClickFeedback />
      </body>
    </html>
  );
}
