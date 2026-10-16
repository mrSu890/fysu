"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Input,
  InputNumber,
  Button,
  Form,
  Divider,
  Select,
  Upload,
  Image,
  Popconfirm,
  Tooltip,
  Empty,
} from "antd";
import { DeleteOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import { ProductType } from "../../../types/product";
import { uploadInfoBlockMedia } from "@/lib/infoBlockUpload";

type ColorSet = {
  color: string;
  images: { id?: number; url: string }[];
};

type SizeState = {
  id?: string;
  size: string;
  stock: number;
  is_active: boolean;
  display_order: number;
};

type InfoBlockState = {
  id?: string;
  image_url: string | null;
  title: string;
  subtitle: string;
  content: string;
};

type ProductEditPayload = ProductType & {
  sizes: SizeState[];
  images: { url: string; color: string }[];
  colors: number;
  info_blocks: InfoBlockState[];
  suggested_product_ids: number[];
};

type Props = {
  open: boolean;
  product: ProductType | null;
  products: ProductType[];
  categories: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (data: ProductEditPayload) => void;
};

export default function ProductEditModal({
  open,
  product,
  products,
  categories,
  onClose,
  onSubmit,
}: Props) {
  const [form] = Form.useForm();

  const [infoBlocks, setInfoBlocks] = useState<InfoBlockState[]>([]);

  const [sizes, setSizes] = useState<SizeState[]>([]);

  const [colorSets, setColorSets] = useState<ColorSet[]>([]);
  const [sizeGuideImageUrl, setSizeGuideImageUrl] = useState<string | null>(null);

  const [suggestedProducts, setSuggestedProducts] =
    useState<number[]>([]);

  /* ================= INIT ================= */

  useEffect(() => {
    if (!product) return;

    form.setFieldsValue({
      ...product,
      price: Number(product.price),
    });

    const productSizes = (product.product_sizes || []) as Array<
      ProductType["product_sizes"][number] & { display_order?: number | null }
    >;

    setSizes(
      productSizes.map((s, index) => ({
        ...s,
        display_order: s.display_order ?? index
      } as SizeState))
    );

    const grouped: ColorSet[] =
    Object.values(
      (product.product_images || []).reduce(
        (acc: Record<string, ColorSet>, img) => {
          const color = img.color || "#000000";

          if (!acc[color]) {
            acc[color] = { color, images: [] };
          }
  
          acc[color].images.push({
            id: img.id,
            url: img.url,
          });
  
          return acc;
        },
        {}
      )
    );
    
    setColorSets(grouped);

    setInfoBlocks(
      (product.product_info_blocks || []).map((b) => ({
        id: b.id,
        image_url: b.image_url,
        title: b.title,
        subtitle: b.subtitle,
        content: b.content,
      }))
    );
    setSizeGuideImageUrl(product.size_guide_image_url ?? null)

    setSuggestedProducts(
      product.product_suggestions?.map((p) => p.id) ?? []
    );
  }, [product, form]);

  /* ================= IMAGE UPLOAD ================= */

  // Size guide image upload
  const handleSizeGuideUpload = async (file: File) => {
    if (!product) return;
  
    if (!file.type.startsWith("image/")) {
      alert("File must be an image");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", product.id.toString());
  
      const res = await fetch(
        "/api/admin/products/upload-size-guide",
        {
          method: "POST",
          body: formData,
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        alert(data.error || "Upload error");
        return;
      }
  
      setSizeGuideImageUrl(data.url);
  
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductImageUpload = async (
    file: File,
    colorIndex: number
  ) => {

    if (!product) return;
  
    const color = normalizeColor(colorSets[colorIndex].color);
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productId", product!.id.toString());
    formData.append("color", color);
  
    const res = await fetch("/api/admin/products/upload-product-image", {
      method: "POST",
      body: formData,
    });
  
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Upload error");
      return;
    }

    const updated = [...colorSets];
    updated[colorIndex].images.push({
      id: data.id,
      url: data.url
    });

    setColorSets(updated);
  };

  const normalizeColor = (color: string) =>
    color.trim().toLowerCase() || "#000000";

  const getColorPickerValue = (color: string) =>
    /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : "#000000";

  const updateColor = (colorIndex: number, color: string) => {
    setColorSets((current) =>
      current.map((set, index) =>
        index === colorIndex ? { ...set, color } : set
      )
    );
  };

  const removeColor = (colorIndex: number) => {
    setColorSets((current) => current.filter((_, index) => index !== colorIndex));
  };

  const removeImage = (colorIndex: number, imageIndex: number) => {
    setColorSets((current) =>
      current.map((set, index) => {
        if (index !== colorIndex) return set;

        return {
          ...set,
          images: set.images.filter((_, imgIndex) => imgIndex !== imageIndex),
        };
      })
    );
  };

  const moveImage = (
    fromColorIndex: number,
    imageIndex: number,
    toColorIndex: number
  ) => {
    if (fromColorIndex === toColorIndex) return;

    setColorSets((current) => {
      const image = current[fromColorIndex]?.images[imageIndex];
      if (!image) return current;

      return current.map((set, index) => {
        if (index === fromColorIndex) {
          return {
            ...set,
            images: set.images.filter((_, imgIndex) => imgIndex !== imageIndex),
          };
        }

        if (index === toColorIndex) {
          return {
            ...set,
            images: [...set.images, image],
          };
        }

        return set;
      });
    });
  };

  /* ================= SUBMIT ================= */

  const handleFinish = (values: Record<string, unknown>) => {
    if (!product) return;

    const colorSetsWithImages = colorSets.filter((set) => set.images.length > 0);
    const images = colorSets.flatMap((set) =>
      set.images.map((img) => ({
        url: img.url,
        color: normalizeColor(set.color),
      }))
    );

    onSubmit({
      ...product,
      ...values,
      price: Number(values.price),
      sizes,
      images,
      colors: colorSetsWithImages.length,
      info_blocks: infoBlocks,
      size_guide_image_url: sizeGuideImageUrl,
      suggested_product_ids: suggestedProducts,
    });

    onClose();
    form.resetFields();
  };

  /* ========================================================= */

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={800}
      className="[&_.ant-modal-content]:rounded-2xl"
    >
      {product && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <h2 className="text-xl font-semibold mb-6">
            Modifier le produit
          </h2>

          <Form.Item label="Nom" name="name">
            <Input />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input />
          </Form.Item>

          <Form.Item label="Détails" name="details">
            <Input />
          </Form.Item>

          <Form.Item label="Size fit" name="size_fit">
            <Input />
          </Form.Item>

          <Form.Item label="Size guide image">
            <div className="flex flex-col gap-4">

              {sizeGuideImageUrl && (
                <img
                  src={sizeGuideImageUrl}
                  alt="Guide des tailles"
                  className="w-48 rounded-lg border"
                />
              )}

              <label className="cursor-pointer px-4 py-2 border rounded-md w-fit">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSizeGuideUpload(file);
                  }}
                />
              </label>

            </div>
          </Form.Item>

          <Form.Item label="Care instructions" name="care_instructions">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item label="Shipping" name="shipping">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Prix (€)"
            name="price"
            rules={[{ required: true }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              className="w-full"
            />
          </Form.Item>

          <Form.Item label="Catégorie" name="category_id">
            <Select
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          </Form.Item>

          <Form.Item label="Genre" name="gender">
            <Input />
          </Form.Item>

          <Divider />

          <h3 className="text-lg font-medium mb-4">
            Images produit
          </h3>

          <div className="flex flex-col gap-6">

          {colorSets.map((set, colorIndex) => (
            <div
              key={colorIndex}
              className="w-full rounded-xl border border-neutral-200 bg-white p-4"
            >

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={getColorPickerValue(set.color)}
                    onChange={(e) => updateColor(colorIndex, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-neutral-200"
                  />

                  <Input
                    value={set.color}
                    onChange={(e) => updateColor(colorIndex, e.target.value)}
                    className="w-32"
                    aria-label="Code couleur"
                  />

                  <span className="text-xs text-neutral-500">
                    {set.images.length} image{set.images.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Upload
                    multiple
                    showUploadList={false}
                    beforeUpload={(file) => {
                      handleProductImageUpload(file, colorIndex);
                      return false;
                    }}
                  >
                    <Button
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                    >
                      Ajouter images
                    </Button>
                  </Upload>

                  <Popconfirm
                    title="Supprimer cette couleur ?"
                    description="Les images de cette couleur seront retirées du produit au prochain enregistrement."
                    okText="Supprimer"
                    cancelText="Annuler"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeColor(colorIndex)}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    >
                      Supprimer couleur
                    </Button>
                  </Popconfirm>
                </div>

              </div>

              {set.images.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Aucune image pour cette couleur"
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {set.images.map((img, imgIndex) => (
                    <div
                      key={`${img.url}-${imgIndex}`}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 p-2"
                    >
                      <Image
                        src={img.url}
                        alt={`Image ${imgIndex + 1} - ${set.color}`}
                        className="h-36 w-full rounded-lg object-cover"
                      />

                      <div className="mt-3 flex items-center gap-2">
                        <Tooltip title="Déplacer vers une autre couleur">
                          <Select
                            size="small"
                            value={colorIndex}
                            suffixIcon={<SwapOutlined />}
                            className="min-w-0 flex-1"
                            options={colorSets.map((colorSet, index) => ({
                              value: index,
                              label: colorSet.color,
                              disabled: index === colorIndex,
                            }))}
                            onChange={(targetIndex) =>
                              moveImage(colorIndex, imgIndex, targetIndex)
                            }
                          />
                        </Tooltip>

                        <Popconfirm
                          title="Supprimer cette image ?"
                          description="Elle sera retirée du produit au prochain enregistrement."
                          okText="Supprimer"
                          cancelText="Annuler"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeImage(colorIndex, imgIndex)}
                        >
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() =>
              setColorSets([
                ...colorSets,
                { color: "#000000", images: [] }
              ])
            }
          >
            Ajouter une couleur
          </Button>
          </div>
          <Divider />

          <h3 className="text-lg font-medium mb-4">Tailles</h3>

          <div className="space-y-4">
            {sizes.map((s, index) => (
              <div
                key={s.id ?? index}
                className="flex items-center gap-4 border border-neutral-200 p-4 rounded-xl"
              >
                {/* SIZE NAME */}
                <Input
                  placeholder="Taille (ex: S, M, 42...)"
                  value={s.size}
                  onChange={(e) => {
                    const newSizes = [...sizes];
                    newSizes[index].size = e.target.value;
                    setSizes(newSizes);
                  }}
                  className="w-24"
                />

                {/* STOCK */}
                <InputNumber
                  min={0}
                  value={s.stock}
                  onChange={(value) => {
                    const newSizes = [...sizes];
                    newSizes[index].stock = Number(value ?? 0);
                    setSizes(newSizes);
                  }}
                />

                <InputNumber
                  min={0}
                  value={s.display_order}
                  onChange={(value) => {
                    const newSizes = [...sizes];
                    newSizes[index].display_order = Number(value ?? 0);
                    setSizes(newSizes);
                  }}
                />

                {/* ACTIVE */}
                <Select
                  value={s.is_active ? "active" : "inactive"}
                  onChange={(value) => {
                    const newSizes = [...sizes];
                    newSizes[index].is_active = value === "active";
                    setSizes(newSizes);
                  }}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  className="w-32"
                />

                {/* DELETE */}
                <Button
                  danger
                  onClick={() => {
                    setSizes(sizes.filter((_, i) => i !== index));
                  }}
                >
                  Supprimer
                </Button>
              </div>
            ))}

            {/* ADD NEW SIZE */}
            <Button
              type="dashed"
              block
              onClick={() =>
                setSizes([
                  ...sizes,
                  {
                    size: "",
                    stock: 0,
                    is_active: true,
                    display_order: sizes.length
                  }
                ])
              }
            >
              + Ajouter une taille
            </Button>
          </div>

          <Divider />

          <h3 className="text-lg font-medium mb-4">
            Blocs d&apos;information
          </h3>

          <div className="space-y-6">

          {infoBlocks.map((block, index) => (
            <div
              key={block.id ?? index}
              className="border border-neutral-200 rounded-2xl p-6 space-y-4"
            >

              <Input
                placeholder="Titre"
                value={block.title}
                onChange={(e) => {
                  const newBlocks = [...infoBlocks];
                  newBlocks[index].title = e.target.value;
                  setInfoBlocks(newBlocks);
                }}
              />

              <Input
                placeholder="Sous titre"
                value={block.subtitle}
                onChange={(e) => {
                  const newBlocks = [...infoBlocks];
                  newBlocks[index].subtitle = e.target.value;
                  setInfoBlocks(newBlocks);
                }}
              />

              <Input.TextArea
                rows={4}
                placeholder="Texte"
                value={block.content}
                onChange={(e) => {
                  const newBlocks = [...infoBlocks];
                  newBlocks[index].content = e.target.value;
                  setInfoBlocks(newBlocks);
                }}
              />

              {/* IMAGE */}
              <div className="flex flex-col gap-4">

                {block.image_url && (
                  <img
                    src={block.image_url}
                    alt={block.title || "Bloc d'information"}
                    className="w-48 rounded-lg border"
                  />
                )}

                <label className="cursor-pointer px-4 py-2 border rounded-md w-fit">
                  Upload image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadInfoBlockMedia(file, product!.id);
                        const newBlocks = [...infoBlocks];
                        newBlocks[index].image_url = url;
                        setInfoBlocks(newBlocks);
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Upload error");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>

              </div>

              <Button
                danger
                onClick={() =>
                  setInfoBlocks(infoBlocks.filter((_, i) => i !== index))
                }
              >
                Supprimer ce bloc
              </Button>

            </div>
          ))}

          <Button
            type="dashed"
            block
            onClick={() =>
              setInfoBlocks([
                ...infoBlocks,
                {
                  image_url: null,
                  title: "",
                  subtitle: "",
                  content: "",
                },
              ])
            }
          >
            + Ajouter un bloc
          </Button>

          </div>

          <Divider />

          {/* ================= SUGGESTIONS ================= */}

            <Form.Item label="Produits recommandés">
            <Select
                mode="multiple"
                value={suggestedProducts}
                onChange={setSuggestedProducts}
                optionFilterProp="label"
                showSearch
                options={Array.from(
                new Map(products.map((p) => [p.id, p])).values()
                )
                .filter((p) => p.id !== product?.id)
                .map((p) => ({
                    value: p.id,
                    label: (
                    <div className="flex items-center gap-3">
                        <img
                        src={
                            p.product_images?.[0]?.url ||
                            "/placeholder.png"
                        }
                        alt={p.name}
                        className="w-8 h-10 object-cover rounded"
                        />
                        {p.name}
                    </div>
                    ),
                }))}
            />
            </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            className="mt-6 h-11 rounded-full"
          >
            Enregistrer
          </Button>
        </Form>
      )}
    </Modal>
  );
}
