import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getProductType, isProductType } from "@/lib/productTypes"

export const runtime = "nodejs"

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function generateUniqueSlug(baseName: string) {
  const baseSlug = slugify(baseName) || "produit"
  let slug = baseSlug
  let counter = 1

  while (true) {
    const { data } = await supabaseAdmin.from("products").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    slug = `${baseSlug}-${counter++}`
  }
}

// Crée un produit vide (avec les tailles du type choisi) puis l'admin le complète dans la fiche
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const price = Number(body.price)
    const productType = isProductType(body.product_type) ? body.product_type : "clothing"
    const categoryId = body.category_id == null || body.category_id === "" ? null : Number(body.category_id)
    const gender = typeof body.gender === "string" ? body.gender : ""

    if (!name) return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 })
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 })
    }

    const slug = await generateUniqueSlug(name)

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        description: "",
        details: "",
        size_fit: "",
        care_instructions: "",
        shipping: "",
        price,
        slug,
        gender,
        category_id: categoryId,
        colors: 0,
        product_type: productType,
      })
      .select("id")
      .single()

    if (error || !product) {
      return NextResponse.json({ error: error?.message ?? "Erreur lors de la création" }, { status: 500 })
    }

    // Une première couleur "Unique" (à renommer dans la fiche) qui porte les tailles
    const { data: color, error: colorError } = await supabaseAdmin
      .from("product_colors")
      .insert({ product_id: product.id, name: "Unique", hex: "#000000", display_order: 0 })
      .select("id")
      .single()

    if (colorError || !color) {
      console.error("Création de la couleur :", colorError)
    } else {
      const presets = getProductType(productType).presets
      if (presets.length) {
        const { error: sizesError } = await supabaseAdmin.from("product_sizes").insert(
          presets.map((size, index) => ({
            product_id: product.id,
            color_id: color.id,
            size,
            stock: 0,
            is_active: true,
            display_order: index,
          }))
        )
        if (sizesError) console.error("Création des tailles :", sizesError)
      }
    }

    return NextResponse.json({ id: product.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
