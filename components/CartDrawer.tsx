import { useCart } from "../context/CartContext"
import { X, Trash2, Plus, Minus } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"

// Contenu du panier. L'enveloppe (la pastille qui s'agrandit) est gérée par la Navbar.
export default function CartDrawer() {
  const t = useTranslations("Cart")
  const {
    cart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    setIsCartOpen,
  } = useCart()

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="px-6 pb-6 pt-2 flex flex-col max-h-[70vh]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold font-dior">{t("title")}</h2>
        <button onClick={() => setIsCartOpen(false)} type="button">
          <X size={20} />
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {cart.length === 0 ? (
          <p className="text-sm font-dior">{t("empty")}</p>
        ) : (
          cart.map((item) => (
            <div
              key={`${item.id}-${item.selectedSizeId}`}
              className="flex items-center justify-between gap-4 border-b border-white/20 pb-4"
            >
              {/* IMAGE + INFOS */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-20 bg-neutral-100 rounded overflow-hidden shrink-0">
                  <Image
                    src={item.product_images?.[0]?.url}
                    alt={item.name}
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>

                <div className="text-left">
                  <p className="font-medium text-sm font-sans">{item.name}</p>

                  <p className="text-xs mt-1">
                    <span className="inline-block px-2 py-0.5 bg-white/10 rounded text-[10px] tracking-wide">
                      {item.selectedSizeLabel}
                    </span>
                  </p>

                  <p className="text-xs mt-1 font-sans">
                    €{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      decreaseQuantity(item.id, item.selectedSizeId)
                    }
                    className="p-[3px] rounded-full bg-white/10 hover:bg-white/20 duration-300"
                    type="button"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="text-sm font-sans">{item.quantity}</span>

                  <button
                    onClick={() =>
                      increaseQuantity(item.id, item.selectedSizeId)
                    }
                    className="p-[3px] rounded-full bg-white/10 hover:bg-white/20 duration-300"
                    type="button"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id, item.selectedSizeId)}
                  className="opacity-40 hover:opacity-100 duration-300"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      {cart.length > 0 && (
        <div className="pt-4 mt-4 space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span>{t("total")}</span>
            <span>€{total.toFixed(2)}</span>
          </div>

          <Link href="/checkout" onClick={() => setIsCartOpen(false)}>
            <button
              className="w-full bg-black/60 py-2 rounded-md hover:bg-black/80 duration-300"
              type="button"
            >
              {t("checkout")}
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
