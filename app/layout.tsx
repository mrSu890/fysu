import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import { Inter } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import DecorativeDots from "@/components/DecorativeDots";
import ScrollReveal from "@/components/ScrollReveal";
import SiteLoader from "@/components/SiteLoader";
import NotificationToasts from "@/components/NotificationToasts";
import RegionGate from "@/components/RegionGate";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
//import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Fysu",
  description: "Fysu",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
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
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground transition-colors duration-400">
        {/* Écran de chargement d'arrivée sur le site */}
        <SiteLoader />
        {/* <AuthProvider> */}
          <NextIntlClientProvider messages={messages}>
            <CartProvider>
              {children}
              {/* Choix de la zone : apparaît avant les cookies et les notifications */}
              <RegionGate />
              <CookieBanner />
              <NotificationToasts />
            </CartProvider>
          </NextIntlClientProvider>
        {/* </AuthProvider> */}
        <Toaster />
        <DecorativeDots />
        <ScrollReveal />
      </body>
    </html>
  );
}
