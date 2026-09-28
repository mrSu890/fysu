import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/context/CartContext";
import { Libre_Baskerville } from "next/font/google"
import { Playfair_Display } from 'next/font/google';
import { Tenor_Sans } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
import DecorativeDots from "@/components/DecorativeDots";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'], // Specify needed weights
  variable: '--font-playfair', // CSS variable name
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
})

const tenorSans = Tenor_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-tenor",
  display: "swap",
})
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
    <html lang={locale} className={`${libreBaskerville.variable} ${playfair.variable} ${tenorSans.variable}`}>
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
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground transition-colors duration-400">
        {/* <AuthProvider> */}
          <NextIntlClientProvider messages={messages}>
            <CartProvider>
              {children}
              <CookieBanner />
            </CartProvider>
          </NextIntlClientProvider>
        {/* </AuthProvider> */}
        <Toaster />
                <DecorativeDots />

        
      </body>
    </html>
  );
}
