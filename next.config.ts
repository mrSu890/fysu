import type { NextConfig } from 'next';
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // une page déjà visitée ou préparée d'avance se rouvre instantanément (30 s) ; le retour arrière aussi
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    // l'optimiseur de Vercel a atteint sa limite gratuite (erreur 402) : les photos sont redimensionnées par Supabase
    // (voir lib/supabaseImageLoader.ts). Pour revenir en arrière : remplacer ces deux lignes par « unoptimized: true, »
    loader: "custom",
    loaderFile: "./lib/supabaseImageLoader.ts",
    domains: ['mugpnlsqeqbojnzrfnjf.supabase.co', 'lh3.googleusercontent.com'],
  },
};

export default withNextIntl(nextConfig);
