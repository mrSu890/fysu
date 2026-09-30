"use client"

import { use } from "react"
import ProductEditor from "@/components/Admin/Catalog/ProductEditor"

export default function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProductEditor id={id} />
}
