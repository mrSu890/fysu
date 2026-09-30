"use client"

import ProductForm from "@/components/Admin/Catalog/ProductForm"
import { AdminButton } from "@/components/Admin/ui/kit"
import { ArrowLeft } from "lucide-react"

// Création d'un produit (le formulaire actuel est conservé, il sera refait à l'étape suivante)
export default function NewProductPage() {
  return (
    <>
      <div className="mb-4">
        <AdminButton href="/admin/catalog" variant="ghost" icon={ArrowLeft}>
          Retour aux produits
        </AdminButton>
      </div>
      <ProductForm />
      <p className="mt-4 text-center text-xs text-[#9a948a]">
        Après l&apos;ajout, retrouve le produit dans la liste pour compléter les tailles, le stock et les infos.
      </p>
    </>
  )
}
