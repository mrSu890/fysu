import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from '@/components/Footer';
import ProductClient from "./ProductClient";
import ThemeToggle from "@/components/ThemeToggle";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://f-y-s-u.com").replace(/\/$/, "");

// Aperçu quand on partage le lien d'un produit (Instagram, WhatsApp, iMessage, Google…) :
// nom, courte description et première image du produit.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await supabaseAdmin
      .from("products")
      .select("name, description, price, slug, product_images(url)")
      .eq("slug", slug)
      .eq("is_hidden", false)
      .maybeSingle();

    if (!data) return {};

    const name = String((data as any).name ?? "FYSU");
    const price = Number((data as any).price);
    const raw = String((data as any).description ?? "").replace(/\s+/g, " ").trim();
    const base = raw.length > 150 ? `${raw.slice(0, 147)}…` : raw;
    const description = [Number.isFinite(price) ? `€${price.toFixed(2)}` : "", base].filter(Boolean).join(" · ") || "FYSU";
    const image: string | undefined = (data as any).product_images?.[0]?.url ?? undefined;
    const title = `${name} — FYSU`;
    const url = `${SITE}/product/${slug}`;

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "FYSU",
        type: "website",
        ...(image ? { images: [{ url: image, alt: name }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default function ProductPage() {
  return (
    <>
      <Navbar />
      <ProductClient />
      <ThemeToggle />
      <Footer />
    </>
  )
}
