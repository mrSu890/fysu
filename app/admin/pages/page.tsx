"use client"

import { useState } from "react"
import { PageHeader } from "@/components/Admin/ui/kit"
import PagesPanel from "@/components/Admin/Pages/PagesPanel"
import CollectionsPanel from "@/components/Admin/Pages/CollectionsPanel"
import RowsPanel from "@/components/Admin/Pages/RowsPanel"

/* ====================================================================
   COLLECTIONS & PAGES
   - Pages : For her, For him… (avec des rangées de produits)
   - Rangées : les lignes de produits de chaque page (ordre fixe par type)
   - Collections : The Wave, Kiban Collector… (une liste de produits)
   ==================================================================== */

const TABS = [
  { id: "pages", label: "Pages" },
  { id: "rows", label: "Rangées" },
  { id: "collections", label: "Collections" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function AdminPages() {
  const [tab, setTab] = useState<TabId>("pages")
  const [rowsPage, setRowsPage] = useState("")

  return (
    <div>
      <PageHeader
        eyebrow="Contenu du site"
        title="Collections & pages"
        description="Crée tes pages, remplis leurs rangées de produits et gère tes collections."
      />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-full bg-[#171717]/[0.05] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-5 py-2 text-sm transition ${
                tab === t.id
                  ? "bg-white font-medium text-[#171717] shadow-sm"
                  : "text-[#7a756d] hover:text-[#171717]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "pages" && (
        <PagesPanel
          onOpenRows={(pageId) => {
            setRowsPage(pageId)
            setTab("rows")
          }}
        />
      )}
      {tab === "rows" && <RowsPanel initialPageId={rowsPage} />}
      {tab === "collections" && <CollectionsPanel />}
    </div>
  )
}
