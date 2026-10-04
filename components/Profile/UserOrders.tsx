"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";

type Order = {
  id: string;
  status: string;
  total: number; // cents
  createdAt?: string;
  tracking_number?: string | null;
  items: any[] | string;
};

// Étiquettes de statut lisibles (fr / en ; les autres langues voient l'anglais)
const STATUS_COPY = {
  fr: {
    pending: "En attente de paiement",
    paid: "Confirmée",
    shipped: "Expédiée",
    cancelled: "Annulée",
    refunded: "Remboursée",
    tracking: "Suivi",
    track: "Suivre mon colis",
    preparing: "Ta commande est en préparation.",
    onTheWay: "Ton colis est en route.",
  },
  en: {
    pending: "Awaiting payment",
    paid: "Confirmed",
    shipped: "Shipped",
    cancelled: "Cancelled",
    refunded: "Refunded",
    tracking: "Tracking",
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/getUserOrders", { method: "GET" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || t("fetchOrdersError"));
        }
        const json = await res.json();
        if (!cancelled) setOrders(json?.orders ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t("unknownError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm font-light text-foreground/55">{t("loading")}</p>;
  if (error) return <p className="text-sm font-light text-foreground/55">{error}</p>;
  if (orders.length === 0)
    return <p className="border-t border-foreground/15 pt-6 text-sm font-light text-foreground/55">{t("noOrders")}</p>;

  return (
    <div className="border-t border-foreground/15">
      {orders.map((order) => {
        let items: any[] = [];
        try {
          if (typeof order.items === "string") items = JSON.parse(order.items);
          else if (Array.isArray(order.items)) items = order.items;
        } catch {
          items = [];
        }
        const s = (order.status || "").toLowerCase();
        const label = (sc as Record<string, string>)[s] ?? s;
        const created = order.createdAt
          ? format.dateTime(new Date(order.createdAt), { dateStyle: "medium" })
          : "";

        return (
          <div key={order.id} className="border-b border-foreground/15 py-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-light uppercase tracking-[0.18em] text-foreground/55">
                  #{order.id.slice(0, 8)}
                  {created && <span> · {created}</span>}
                </p>
                <p className="mt-2 text-[11px] font-light uppercase tracking-[0.18em]">{label}</p>
              </div>
              <p className="font-info text-xl font-light tabular-nums">€{((order.total ?? 0) / 100).toFixed(2)}</p>
            </div>

            {s === "paid" && <p className="mt-4 text-sm font-light text-foreground/60">{sc.preparing}</p>}
            {s === "shipped" && (
              <p className="mt-4 text-sm font-light text-foreground/60">
                {sc.onTheWay}
                {order.tracking_number && (
                  <>
                    {" "}
                    {sc.tracking} : <span className="text-foreground">{order.tracking_number}</span>
                    {" · "}
                    <a
                      href={`https://parcelsapp.com/${locale === "fr" ? "fr" : "en"}/tracking/${encodeURIComponent(order.tracking_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {sc.track}
                    </a>
                  </>
                )}
              </p>
            )}

            {items.length > 0 && (
              <div className="mt-5 flex gap-4 overflow-x-auto">
                {items.map((item, i) => {
                  const p = item?.product;
                  const img = p?.product_images?.[0]?.url;
                  const name = p?.name ?? item?.description ?? "Produit";
                  const qty = item?.quantity ?? 1;
                  return (
                    <div key={`${order.id}-${item?.product_id ?? i}`} className="w-20 shrink-0">
                      <div className="aspect-[3/4] bg-foreground/5">
                        {img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={name} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <p className="mt-2 truncate text-[10px] font-light uppercase tracking-[0.14em]">
                        {name}
                        {qty > 1 && <span className="text-foreground/50"> ×{qty}</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
