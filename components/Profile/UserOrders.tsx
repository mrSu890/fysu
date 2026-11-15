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
const RETURN_COPY = {
  fr: { btn: "Retourner un article", title: "Quels articles retournes-tu ?", why: "Pourquoi ?", reasons: { size_small: "Trop petit", size_big: "Trop grand", not_liked: "Ne me plaît pas", defect: "Défaut", other: "Autre" }, comment: "Un mot de plus (facultatif)", send: "Envoyer la demande", sent: "Demande envoyée. Nous revenons vers toi très vite.", pick: "Choisis au moins un article.", status: { requested: "Retour demandé", approved: "Retour accepté : regarde ta boîte mail", received: "Retour reçu", refunded: "Retour remboursé", rejected: "Retour refusé" }, window: "Retour possible 21 jours après l'expédition." },
  en: { btn: "Return an item", title: "Which items are you returning?", why: "Why?", reasons: { size_small: "Too small", size_big: "Too big", not_liked: "Don't like it", defect: "Defect", other: "Other" }, comment: "Anything to add (optional)", send: "Send request", sent: "Request sent. We'll get back to you very soon.", pick: "Pick at least one item.", status: { requested: "Return requested", approved: "Return accepted: check your inbox", received: "Return received", refunded: "Return refunded", rejected: "Return declined" }, window: "Returns are possible within 21 days of shipping." },
} as const;

function ReturnPanel({ order, items, rc, onDone }: { order: Order; items: any[]; rc: (typeof RETURN_COPY)["fr"] | (typeof RETURN_COPY)["en"]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [reason, setReason] = useState("size_small");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    if (picked.length === 0) { setMsg(rc.pick); return; }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, indexes: picked, reason, comment }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Error");
      setMsg(rc.sent);
      setOpen(false);
      onDone();
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4">{rc.btn}</button>
      ) : (
        <div className="border border-foreground/15 p-4">
          <p className="text-[11px] font-light uppercase tracking-[0.18em]">{rc.title}</p>
          <div className="mt-3 space-y-2">
            {items.map((item, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3 text-sm font-light">
                <input type="checkbox" checked={picked.includes(i)} onChange={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))} />
                <span>{item?.product?.name ?? item?.description ?? "Item"}{item?.size_label ? ` · ${item.size_label}` : ""}{(item?.quantity ?? 1) > 1 ? ` ×${item.quantity}` : ""}</span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-light uppercase tracking-[0.18em]">{rc.why}</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 w-full border-b border-foreground/30 bg-transparent py-2 text-sm font-light outline-none">
            {Object.entries(rc.reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={comment} onChange={(e) => setComment(e.target.value.slice(0, 600))} placeholder={rc.comment} className="mt-3 w-full border-b border-foreground/30 bg-transparent py-2 text-sm font-light outline-none placeholder:opacity-50" />
          <div className="mt-4 flex items-center gap-4">
            <button type="button" disabled={busy} onClick={submit} className="text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4 disabled:opacity-40">{rc.send}</button>
            <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-light uppercase tracking-[0.18em] opacity-50">×</button>
          </div>
          <p className="mt-3 text-[11px] font-light opacity-50">{rc.window}</p>
        </div>
      )}
      {msg && <p className="mt-2 text-sm font-light text-foreground/60">{msg}</p>}
    </div>
  );
}

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
  const [rets, setRets] = useState<Record<string, string>>({});
  const rc = locale === "fr" ? RETURN_COPY.fr : RETURN_COPY.en;
  const loadRets = () => fetch("/api/returns").then((r) => (r.ok ? r.json() : { requests: [] })).then((j) => setRets(Object.fromEntries((j.requests ?? []).map((x: any) => [x.order_id, x.status])))).catch(() => {});

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
        loadRets();
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

            {rets[order.id] && rets[order.id] !== "rejected" && (
              <p className="mt-3 text-[11px] font-light uppercase tracking-[0.18em]">{(rc.status as Record<string, string>)[rets[order.id]] ?? rets[order.id]}</p>
            )}
            {s === "shipped" && (!rets[order.id] || rets[order.id] === "rejected") && items.length > 0 && Date.now() - new Date((order as any).shipped_at ?? order.createdAt ?? 0).getTime() < 21 * 24 * 3600 * 1000 && (
              <ReturnPanel order={order} items={items} rc={rc} onDone={loadRets} />
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
