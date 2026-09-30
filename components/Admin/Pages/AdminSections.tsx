"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Select, Input, Switch } from "antd";
import toast from "react-hot-toast";
import { ROW_TYPES, cleanTitle, detectRowKind, getRowLabel, getRowKind, sortRows } from "@/lib/rowTypes";

const { Option } = Select;

type Product = {
    id: number;
    name: string;
    thumbnail_url?: string | null;
  };

type Page = {
  id: string;
  title: string;
  slug: string;
};

type Section = {
    id: string;
    title: string;
    slug: string;
    row_type?: string | null;
    is_active: boolean;
    section_products?: {
      product: Product;
    }[];
    section_pages?: {
      pages: Page;
    }[];
  };

export default function AdminSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<Page[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [rowType, setRowType] = useState<string>("auto");
  const [isActive, setIsActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const [editingSection, setEditingSection] = useState<Section | null>(null);

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    fetchSections();
    fetchProducts();
    fetchPages();
  }, []);

  async function fetchSections() {
    const res = await fetch("/api/admin/sections");
    const data = await res.json();
    setSections(data);
  }

  async function fetchProducts() {
    const res = await fetch("/api/fetchProducts");
    const data = await res.json();
    setProducts(data);
  }

  async function fetchPages() {
    const res = await fetch("/api/admin/pages");
    const data = await res.json();
    setPages(data);
  }

  /* ---------------- Save ---------------- */

  async function handleSave() {
    if (!title) return toast.error("Titre requis");
  
    const method = editingSection ? "PUT" : "POST";
  
    const payload = {
      id: editingSection?.id,
      title,
      slug,
      row_type: rowType === "auto" ? null : rowType,
      is_active: isActive,
      product_ids: selectedProducts,
      page_ids: selectedPages,
    };
  
    const res = await fetch("/api/admin/sections", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    if (res.ok) {
      toast.success(
        editingSection ? "Section modifiée" : "Section créée"
      );
  
      resetForm();
      fetchSections();
    } else {
      toast.error("Erreur sauvegarde section");
    }
  }

  function resetForm() {
    setEditingSection(null);
    setTitle("");
    setSlug("");
    setRowType("auto");
    setIsActive(true);
    setSelectedProducts([]);
    setSelectedPages([]);
  }

  /* ---------------- DELETE ---------------- */

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette section ?")) return;

    await fetch("/api/admin/sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    toast.success("Section supprimée");
    fetchSections();
  }

  /* EDIT */
  function handleEdit(section: any) {
    setEditingSection(section);
    setTitle(section.title);
    setSlug(section.slug ?? "");
    setRowType(section.row_type ?? "auto");
    setIsActive(section.is_active);
  
    // récupérer produits liés
    const productIds =
      section.section_products?.map((sp: any) => sp.product.id) ?? [];
    setSelectedProducts(productIds);
  
    // récupérer pages liées
    const pageIds =
      section.section_pages?.map((sp: any) => sp.pages.id) ?? [];
    setSelectedPages(pageIds);
  }

  /* ---------------- UI ---------------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative top-24 w-[95%] max-w-6xl mx-auto"
    >
      <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-xl shadow-sm p-10">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-10">
          <h2 className="text-2xl font-semibold">Sections</h2>
        </div>

        {/* CREATE FORM */}
        <div className="flex flex-col gap-4 mb-12">

          <Input
            placeholder="Titre section"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
          />

          <Input
            placeholder="Slug (optionnel)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-xl"
          />

          {/* TYPE DE RANGÉE : décide de la place sur la page (ordre fixe) */}
          <div>
            <Select
              value={rowType}
              onChange={setRowType}
              className="w-full"
              options={[
                {
                  value: "auto",
                  label: `Automatique (détecté : ${getRowLabel(detectRowKind(title))})`,
                },
                ...ROW_TYPES.map((t) => ({ value: t.id, label: t.label })),
              ]}
            />
            <p className="mt-1 text-xs text-gray-500">
              Sur les pages, les rangées s’affichent toujours dans cet ordre : vestes et manteaux, hauts,
              pantalons et jupes, robes, accessoires, chaussures. Plus besoin de « A. », « B. » dans le titre.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Active</span>
            <Switch checked={isActive} onChange={setIsActive} />
          </div>

          {/* PRODUCTS SELECT */}
          <Select
            mode="multiple"
            placeholder="Choisir produits"
            value={selectedProducts}
            onChange={setSelectedProducts}
            className="w-full"
            optionFilterProp="label" // important pour la recherche
            showSearch
          >
            {products.map((p) => (
                <Option
                    key={p.id}
                    value={p.id}
                    label={p.name} // pour la recherche
                    >
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {p.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                            src={p.thumbnail_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">
                            —
                            </div>
                        )}
                        </div>

                        <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                            {p.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">#{p.id}</p>
                        </div>
                    </div>
                    </Option>
            ))}
            </Select>

          {/* PAGES SELECT */}
          <Select
            mode="multiple"
            placeholder="Choisir pages"
            value={selectedPages}
            onChange={setSelectedPages}
            className="w-full"
            optionFilterProp="children"
          >
            {pages.map((page) => (
              <Option key={page.id} value={page.id}>
                {page.title} ({page.slug})
              </Option>
            ))}
          </Select>

            <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-5 py-3 text-sm font-medium hover:bg-gray-900 transition cursor-pointer text-center"
            >
                {editingSection ? (
                    <>
                        Modifier section
                    </>
                ) : (
                    <>
                        <Plus size={16} />
                        Créer section
                    </>
                )}
            </button>
        </div>

        {/* SECTIONS LIST */}
        <ul className="space-y-4">
          <AnimatePresence>
            {sortRows(sections).map((section) => (
              <motion.li
                key={section.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{cleanTitle(section.title)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Type : {getRowLabel(getRowKind(section))}
                    {section.row_type ? "" : " (automatique)"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pages:{" "}
                    {section.section_pages?.map((sp) => sp.pages.slug).join(", ") || "—"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleEdit(section)}
                        className="text-gray-400 hover:text-black transition"
                    >
                        Edit
                    </button>

                    <button
                        onClick={() => handleDelete(section.id)}
                        className="text-gray-400 hover:text-red-500 transition"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

      </div>
    </motion.div>
  );
}
