import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type ProductImageRow = {
  url: string | null;
  color: string | null;
};

type ProductSizeRow = {
  size: string;
  stock: number;
  is_active: boolean;
  display_order: number | null;
};

type ProductInfoBlockRow = {
  image_url: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  display_order: number | null;
};

type ProductSuggestionRow = {
  suggested_product_id: number;
  display_order: number | null;
};

type DuplicableProduct = {
  name: string;
  description: string | null;
  price: number;
  gender: string | null;
  product_type: string | null;
  category_id: number | null;
  details: string | null;
  size_fit: string | null;
  colors: number | null;
  care_instructions: string | null;
  shipping: string | null;
  size_guide_image_url: string | null;
  product_images?: ProductImageRow[];
  product_sizes?: ProductSizeRow[];
  product_info_blocks?: ProductInfoBlockRow[];
  product_suggestions?: ProductSuggestionRow[];
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueSlug(baseName: string) {
  const baseSlug = slugify(baseName) || "produit";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;

    slug = `${baseSlug}-${counter++}`;
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(
        `
        *,
        product_images (*),
        product_sizes (*),
        product_info_blocks (*),
        product_suggestions!product_suggestions_product_id_fkey (
          suggested_product_id,
          display_order
        )
      `
      )
      .eq("id", id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: productError?.message ?? "Produit introuvable" },
        { status: 404 }
      );
    }

    const sourceProduct = product as DuplicableProduct;
    const copyName = `${sourceProduct.name} (copie)`;
    const slug = await generateUniqueSlug(copyName);

    const { data: duplicatedProduct, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({
        name: copyName,
        description: sourceProduct.description,
        price: sourceProduct.price,
        slug,
        gender: sourceProduct.gender,
        product_type: sourceProduct.product_type ?? "clothing",
        category_id: sourceProduct.category_id,
        details: sourceProduct.details,
        size_fit: sourceProduct.size_fit,
        colors: sourceProduct.colors,
        care_instructions: sourceProduct.care_instructions,
        shipping: sourceProduct.shipping,
        size_guide_image_url: sourceProduct.size_guide_image_url,
      })
      .select()
      .single();

    if (insertError || !duplicatedProduct) {
      return NextResponse.json(
        { error: insertError?.message ?? "Erreur lors de la duplication" },
        { status: 500 }
      );
    }

    const newProductId = duplicatedProduct.id;

    const images =
      sourceProduct.product_images
        ?.filter((image) => image.url && image.color)
        .map((image) => ({
          productId: newProductId,
          url: image.url,
          color: image.color,
        })) ?? [];

    if (images.length) {
      const { error } = await supabaseAdmin.from("product_images").insert(images);
      if (error) throw error;
    }

    const sizes =
      sourceProduct.product_sizes?.map((size, index) => ({
        product_id: newProductId,
        size: size.size,
        stock: size.stock,
        is_active: size.is_active,
        display_order: size.display_order ?? index,
      })) ?? [];

    if (sizes.length) {
      const { error } = await supabaseAdmin.from("product_sizes").insert(sizes);
      if (error) throw error;
    }

    const infoBlocks =
      sourceProduct.product_info_blocks?.map((block, index) => ({
        product_id: newProductId,
        image_url: block.image_url,
        title: block.title,
        subtitle: block.subtitle,
        content: block.content,
        display_order: block.display_order ?? index,
      })) ?? [];

    if (infoBlocks.length) {
      const { error } = await supabaseAdmin
        .from("product_info_blocks")
        .insert(infoBlocks);
      if (error) throw error;
    }

    const suggestions =
      sourceProduct.product_suggestions?.map((suggestion, index) => ({
        product_id: newProductId,
        suggested_product_id: suggestion.suggested_product_id,
        display_order: suggestion.display_order ?? index,
      })) ?? [];

    if (suggestions.length) {
      const { error } = await supabaseAdmin
        .from("product_suggestions")
        .insert(suggestions);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, product: duplicatedProduct });
  } catch (error: unknown) {
    console.error("Duplicate product error:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
