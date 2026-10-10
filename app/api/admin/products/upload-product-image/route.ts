import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;
    const productId = formData.get("productId") as string;
    const color = formData.get("color") as string;

    if (!file || !productId || !color) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const MIME: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
      gif: "image/gif", avif: "image/avif", svg: "image/svg+xml",
      heic: "image/heic", heif: "image/heif",
    };
    // type vide ou générique (fréquent avec les photos iPad/iPhone) -> on le déduit de l'extension
    const contentType = file.type && file.type.startsWith("image/") ? file.type : MIME[fileExt] ?? "image/jpeg";
    if (/heic|heif/.test(contentType)) {
      return NextResponse.json(
        { error: "Format HEIC non supporté par le site : enregistre la photo en JPG ou PNG." },
        { status: 400 }
      );
    }
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("products")
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from("products")
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: data.publicUrl,
      color
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}