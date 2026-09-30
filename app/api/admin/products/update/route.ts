import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProductSizeInput = {
  size: string;
  stock: number;
  is_active: boolean;
  display_order: number;
};

type ProductImageInput = {
  url: string;
  color: string;
};

type ProductInfoBlockInput = {
  image_url: string | null;
  title: string;
  subtitle: string;
  content: string;
};

type ProductUpdatePayload = {
  id?: number;
  name?: string;
  description?: string;
  details?: string;
  size_fit?: string;
  price?: number;
  category_id?: number | null;
  gender?: string;
  product_type?: string;
  availability?: string;
  release_date?: string | null;
  colors?: number;
  images?: ProductImageInput[];
  care_instructions?: string;
  shipping?: string;
  size_guide_image_url?: string | null;
  sizes?: ProductSizeInput[];
  info_blocks?: ProductInfoBlockInput[];
  suggested_product_ids?: number[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProductUpdatePayload;

    const {
      id,
      name,
      description,
      details,
      size_fit,
      price,
      category_id,
      gender,
      product_type,
      availability,
      release_date,
      colors,
      images,
      care_instructions,
      shipping,
      size_guide_image_url,
      sizes,
      info_blocks,
      suggested_product_ids
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing product id" },
        { status: 400 }
      );
    }

    /* ================= PRODUCT ================= */

    const { error: productError } = await supabaseAdmin
      .from("products")
      .update({
        name,
        description,
        details,
        size_fit,
        price,
        category_id,
        gender,
        product_type,
        availability,
        release_date,
        colors,
        care_instructions,
        shipping,
        size_guide_image_url,
      })
      .eq("id", id);

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 500 }
      );
    }

    /* ================= SIZES ================= */

    await supabaseAdmin
      .from("product_sizes")
      .delete()
      .eq("product_id", id);

    if (sizes?.length) {
      const formattedSizes = sizes.map((s) => ({
        product_id: id,
        size: s.size,
        stock: s.stock,
        is_active: s.is_active,
        display_order: s.display_order
      }));

      const { error } = await supabaseAdmin
        .from("product_sizes")
        .insert(formattedSizes);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    /* ================= PRODUCT IMAGES ================= */

    await supabaseAdmin
      .from("product_images")
      .delete()
      .eq("productId", id);

    if (images?.length) {
      const formattedImages = images
        .filter((img) => img.url && img.color)
        .map((img) => ({
          productId: id,
          url: img.url,
          color: img.color
        }));

      const { error } = await supabaseAdmin
        .from("product_images")
        .insert(formattedImages);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    /* ================= INFO BLOCKS ================= */

    await supabaseAdmin
      .from("product_info_blocks")
      .delete()
      .eq("product_id", id);

    if (info_blocks?.length) {
      const formattedBlocks = info_blocks.map(
        (block, index) => ({
          product_id: id,
          image_url: block.image_url,
          title: block.title,
          subtitle: block.subtitle,
          content: block.content,
          display_order: index,
        })
      );

      const { error } = await supabaseAdmin
        .from("product_info_blocks")
        .insert(formattedBlocks);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    /* ================= SUGGESTIONS ================= */

    await supabaseAdmin
      .from("product_suggestions")
      .delete()
      .eq("product_id", id);

    if (suggested_product_ids?.length) {
      const formattedSuggestions = suggested_product_ids.map(
        (suggestedId: number, index: number) => ({
          product_id: id,
          suggested_product_id: suggestedId,
          display_order: index,
        })
      );

      const { error } = await supabaseAdmin
        .from("product_suggestions")
        .insert(formattedSuggestions);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
