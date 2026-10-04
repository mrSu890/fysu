"use client";

import { useEffect, useState } from "react";
import { Tag, Spin, Empty } from "antd";
import { motion } from "framer-motion";
import { useFormatter, useLocale, useTranslations } from "next-intl";

type OrderItem = {
  product_id?: number;
  quantity?: number;
  product?: {
    id: number;
    name: string;
    price: number;
    category: string;
    gender: string;
    product_images?: { url: string }[];
  } | null;
  description?: string;
};

type Order = {
  id: string;
  status: string;
  total: number; // cents
  createdAt?: string;
  tracking_number?: string | null;
  items: OrderItem[] | string;
};

// Étiquettes de statut lisibles (fr / en ; les autres langues voient l'anglais)
const STATUS_COPY = {
  fr: {
    pending: "En attente de paiement",
    paid: "Commande confirmée",
    shipped: "Expédiée",
    cancelled: "Annulée",
    refunded: "Remboursée",
    tracking: "Numéro de suivi",
    track: "Suivre mon colis",
    preparing: "Ta commande est en préparation.",
    onTheWay: "Ton colis est en route.",
  },
  en: {
    pending: "Awaiting payment",
    paid: "Order confirmed",
    shipped: "Shipped",
    cancelled: "Cancelled",
    refunded: "Refunded",
    tracking: "Tracking number",
    track: "Track my parcel",
    preparing: "Your order is being prepared.",
    onTheWay: "Your parcel is on its way.",
  },
} as const;

export default function UserOrders() {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const sc = locale === "fr" ? STATUS_COPY.fr : STATUS_COPY.en;
  const format = useFormatter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrders() {
    // Ton endpoint "sans paramètres" doit être un GET (comme l’API que tu as prise)
    const res = await fetch("/api/getUserOrders", { method: "GET" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || t("fetchOrdersError"));
    }
    return res.json() as Promise<{ orders: Order[] }>;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { orders } = await fetchOrders();
        if (!cancelled) setOrders(orders ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t("unknownError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function statusTag(status: string) {
    const s = (status || "").toLowerCase();
    let color: "blue" | "green" | "orange" | "red" = "blue";
    if (s === "paid") color = "green";
    if (s === "pending") color = "orange";
    if (s === "cancelled" || s === "refunded") color = "red";
    if (s === "shipped") color = "blue";
    const label = (sc as Record<string, string>)[s] ?? s;
    return <Tag color={color}>{label}</Tag>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-11/12 max-w-7xl mx-auto py-10 relative top-44"
    >
        <h1 className="text-2xl mb-6 font-dior">{t("orders")}</h1>
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : error ? (
        <Empty description={error} />
      ) : orders.length === 0 ? (
          <p>{t("noOrders")}</p>
      ) : (
        <div className="flex sm:flex-row flex-col gap-4">
          {orders.map((order, idx) => {
            // items: string JSON ou array
            let items: any[] = [];
            try {
              if (typeof order.items === "string") items = JSON.parse(order.items);
              else if (Array.isArray(order.items)) items = order.items;
            } catch {
              items = [];
            }
            

            const created = order.createdAt ?? "";
            const createdLabel = created
              ? format.dateTime(new Date(created), {
                  dateStyle: "medium",
                })
              : "";

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl bg-white shadow-md border border-gray-100 p-6 w-full sm:w-fit"
              >
                {/* Header commande */}
                <div className="flex flex-col items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400">
                      {t("order")} #{order.id.slice(0, 8)}
                    </p>
                    {createdLabel && (
                      <p className="text-sm text-gray-500">{createdLabel}</p>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-base font-semibold">
                      €{((order.total ?? 0) / 100).toFixed(2)}
                    </p>
                    {statusTag(order.status)}
                  </div>
                </div>

                {/* Suivi de la commande */}
                {order.status?.toLowerCase() === "paid" && (
                  <p className="mb-3 text-sm text-gray-500">{sc.preparing}</p>
                )}
                {order.status?.toLowerCase() === "shipped" && (
                  <div className="mb-3 rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-gray-600">{sc.onTheWay}</p>
                    {order.tracking_number && (
                      <p className="mt-1">
                        <span className="text-gray-500">{sc.tracking} : </span>
                        <span className="font-medium">{order.tracking_number}</span>
                        {" · "}
                        <a
                          href={`https://parcelsapp.com/${locale === "fr" ? "fr" : "en"}/tracking/${encodeURIComponent(order.tracking_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {sc.track}
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* Liste des items */}
                <div className="flex gap-4 overflow-x-auto py-2">
                {items.map((item, i) => {
                  const p = item?.product;


                  const imgUrl = p?.product_images?.[0]?.url ?? "/placeholder.png";
                  const name = p?.name ?? item?.description ?? "Produit";
                  const category = p?.category ?? "—";
                  const gender = p?.gender ?? "—";
                  const price = p?.price ?? null; // price stocké en double (EUR)
                  const qty = item?.quantity ?? 1;

                  return (
                    <motion.div
                      key={`${order.id}-${item?.product_id ?? item?.id ?? i}`}
                      className="min-w-[180px] rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm"
                    >
                      <img
                        src={imgUrl}
                        alt={name}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                      />
                      <div className="p-3 space-y-1">
                        <p className="font-medium text-sm truncate">{name}</p>

                        <p className="text-xs text-gray-500">
                          {category} • {gender}
                        </p>

                        <p className="text-sm font-semibold">
                          {price != null ? `€${Number(price).toFixed(2)}` : "—"}
                        </p>

                        <p className="text-xs text-gray-400">{t("quantityShort")}: {qty}</p>
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
