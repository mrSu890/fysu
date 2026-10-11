import type { NextConfig } from 'next';
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    // l'optimiseur d'images de Vercel a atteint sa limite gratuite (erreur 402) :
    // on sert les images directement depuis leur source
    unoptimized: true,
    domains: ['mugpnlsqeqbojnzrfnjf.supabase.co', 'lh3.googleusercontent.com'],
  },
};

export default withNextIntl(nextConfig);
