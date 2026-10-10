import type { NextConfig } from 'next';
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    domains: ['mugpnlsqeqbojnzrfnjf.supabase.co', 'lh3.googleusercontent.com'],
  },
};

export default withNextIntl(nextConfig);
