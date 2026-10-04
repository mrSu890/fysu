import { NextResponse } from "next/server";
import { cleanSizeGuide } from "@/lib/sizeGuide";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isBrandId } from "@/lib/brands";
import { isFamilyId } from "@/lib/olfactive";

type SizeInput = {
  id?: string;
  size: string;
  stock: number;
  is_active: boolean;
};

type ColorInput = {
  id?: string;
  name: string;
  hex: string;
  images: string[];
  sizes: SizeInput[];
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
  brand?: string;
  wave_bg?: string | null;
  olfactive_family?: string | null;
  evocation?: string;
  care_instructions?: string;
  shipping?: string;
  size_guide_image_url?: string | null;
  size_guide?: unknown;
  colors?: ColorInput[];
  info_blocks?: ProductInfoBlockInput[];
  suggested_product_ids?: number[];
};

const HEX_RE = /^#[0-9a-f]{6}$/;

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
      brand,
      wave_bg,
      olfactive_family,
      evocation,
      care_instructions,
      shipping,
      size_guide_image_url,
      size_guide,
      colors,
      info_blocks,
      suggested_product_ids
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing product id" },
        { status: 400 }
      );
    }

    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json(
        { error: "Le produit doit avoir au moins une couleur" },
        { status: 400 }
      );
    }

    /* ================= VALIDATION DES COULEURS ================= */

    const hexes = new Set<string>();
    for (const c of colors) {
      const hex = (c.hex || "").trim().toLowerCase();
      if (!HEX_RE.test(hex)) {
        return NextResponse.json(
          { error: `Code couleur invalide : ${c.hex}` },
          { status: 400 }
        );
      }
      if (!c.name || !c.name.trim()) {
        return NextResponse.json(
          { error: "Une couleur n'a pas de nom" },
          { status: 400 }
        );
      }
      if (hexes.has(hex)) {
        return NextResponse.json(
          { error: "Deux couleurs ont le même code couleur" },
          { status: 400 }
        );
      }
      hexes.add(hex);
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
        brand: isBrandId(brand) ? brand : undefined,
        wave_bg: /^#[0-9a-f]{6}$/i.test(wave_bg ?? "") ? wave_bg!.toLowerCase() : wave_bg === undefined ? undefined : null,
        olfactive_family: isFamilyId(olfactive_family) ? olfactive_family : olfactive_family === null ? null : undefined,
        evocation,
        colors: colors.filter((c) => c.images?.length > 0).length,
        care_instructions,
        shipping,
        size_guide_image_url,
        size_guide: size_guide === undefined ? undefined : cleanSizeGuide(size_guide),
      })
      .eq("id", id);

    if (productError) {
      return NextResponse.json(
        { error: productError.message },
        { status: 500 }
      );
    }

    /* ================= COULEURS ================= */

    const { data: existingColors, error: existingColorsError } = await supabaseAdmin
      .from("product_colors")
      .select("id")
      .eq("product_id", id);

    if (existingColorsError) {
      return NextResponse.json(
        { error: existingColorsError.message },
        { status: 500 }
      );
    }

    const existingColorIds = new Set<string>((existingColors ?? []).map((c: any) => c.id as string));
    const keptColorIds = new Set(
      colors.map((c) => c.id).filter((cid): cid is string => !!cid && existingColorIds.has(cid))
    );

    // Couleurs retirées (leurs tailles disparaissent avec elles)
    const removedColorIds = Array.from(existingColorIds).filter((cid) => !keptColorIds.has(cid));
    if (removedColorIds.length) {
      const { error } = await supabaseAdmin
        .from("product_colors")
        .delete()
        .in("id", removedColorIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Mise à jour / création, dans l'ordre choisi
    const colorIds: string[] = [];
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const values = {
        name: c.name.trim(),
        hex: c.hex.trim().toLowerCase(),
        display_order: i,
      };

      if (c.id && existingColorIds.has(c.id)) {
        const { error } = await supabaseAdmin
          .from("product_colors")
          .update(values)
          .eq("id", c.id);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        colorIds.push(c.id);
      } else {
        const { data, error } = await supabaseAdmin
          .from("product_colors")
          .insert({ product_id: id, ...values })
          .select("id")
          .single();

        if (error || !data) {
          return NextResponse.json(
            { error: error?.message ?? "Erreur lors de la création d'une couleur" },
            { status: 500 }
          );
        }
        colorIds.push(data.id as string);
      }
    }

    /* ================= TAILLES (une ligne par couleur et par taille) ================= */

    const { data: existingSizes, error: existingSizesError } = await supabaseAdmin
      .from("product_sizes")
      .select("id")
      .eq("product_id", id);

    if (existingSizesError) {
      return NextResponse.json(
        { error: existingSizesError.message },
        { status: 500 }
      );
    }

    const existingSizeIds = new Set<string>((existingSizes ?? []).map((s: any) => s.id as string));
    const keptSizeIds = new Set<string>();

    for (let ci = 0; ci < colors.length; ci++) {
      const sizes = colors[ci].sizes ?? [];

      for (let si = 0; si < sizes.length; si++) {
        const s = sizes[si];
        const values = {
          product_id: id,
          color_id: colorIds[ci],
          size: s.size.trim(),
          stock: Math.max(0, Math.floor(Number(s.stock) || 0)),
          is_active: !!s.is_active,
          display_order: si,
        };

        if (s.id && existingSizeIds.has(s.id)) {
          // on garde le même identifiant : les paniers déjà remplis restent valides
          const { error } = await supabaseAdmin
            .from("product_sizes")
            .update(values)
            .eq("id", s.id);

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          keptSizeIds.add(s.id);
        } else {
          const { data, error } = await supabaseAdmin
            .from("product_sizes")
            .insert(values)
            .select("id")
            .single();

          if (error || !data) {
            return NextResponse.json(
              { error: error?.message ?? "Erreur lors de la création d'une taille" },
              { status: 500 }
            );
          }
          keptSizeIds.add(data.id as string);
        }
      }
    }

    const removedSizeIds = Array.from(existingSizeIds).filter((sid) => !keptSizeIds.has(sid));
    if (removedSizeIds.length) {
      const { error } = await supabaseAdmin
        .from("product_sizes")
        .delete()
        .in("id", removedSizeIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    /* ================= PRODUCT IMAGES ================= */

    await supabaseAdmin
      .from("product_images")
      .delete()
      .eq("productId", id);

    const formattedImages = colors.flatMap((c) =>
      (c.images ?? [])
        .filter(Boolean)
        .map((url) => ({
          productId: id,
          url,
          color: c.hex.trim().toLowerCase(),
        }))
    );

    if (formattedImages.length) {
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
