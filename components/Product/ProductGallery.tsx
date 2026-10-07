import Image from "next/image"
import { useMemo } from "react"
import { ProductType } from "@/types/product"

type Props = {
  product: ProductType
  selectedColor: string | null
}

export default function ProductGallery({ product, selectedColor }: Props) {
  const filteredImages = useMemo(() => {
    if (!product.product_images) return []
    if (!selectedColor) return product.product_images

    return product.product_images.filter(
      (img) =>
        img.color &&
        img.color.toLowerCase() === selectedColor.toLowerCase()
    )
  }, [product, selectedColor])

  const mainImage = filteredImages[0]?.url
  const otherImages = filteredImages.slice(1)

  return (
    <div className="space-y-6 sm:space-y-8 sm:h-auto h-[66vh] overflow-y-scroll sm:overflow-visible">
      {mainImage && (
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-3xl sm:rounded-none">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {otherImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {otherImages.map((img) => (
            <div key={img.id} className="relative aspect-[3/4] overflow-hidden">
              <Image
                src={img.url}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}