"use client";

import { useEffect, useState } from "react";

const COPY = {
  fr: { title: "Parraine un ami", text: (f: number, r: number) => `Ton ami a ${f} % sur sa première commande. Quand il a payé, tu reçois un code de ${r} % par e-mail.`, copy: "Copier mon lien", copied: "Lien copié", count: (n: number) => `${n} ami${n > 1 ? "s" : ""} parrainé${n > 1 ? "s" : ""}` },
  en: { title: "Refer a friend", text: (f: number, r: number) => `Your friend gets ${f}% off their first order. Once they've paid, you receive a ${r}% code by email.`, copy: "Copy my link", copied: "Link copied", count: (n: number) => `${n} friend${n > 1 ? "s" : ""} referred` },
} as const;

export default function ReferralCard({ locale }: { locale: string }) {
  const t = locale === "fr" ? COPY.fr : COPY.en;
  const [d, setD] = useState<{ link: string; friendPercent: number; rewardPercent: number; count: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/referral").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);
  if (!d) return null;

  async function copy() {
    try { await navigator.clipboard.writeText(d!.link); } catch { window.prompt(t.copy, d!.link); }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <div className="mb-10 border border-foreground/15 p-6">
      <p className="text-[11px] font-light uppercase tracking-[0.22em]">{t.title}</p>
      <p className="mt-3 max-w-md text-sm font-light text-foreground/70">{t.text(d.friendPercent, d.rewardPercent)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <button type="button" onClick={copy} className="text-[11px] font-light uppercase tracking-[0.18em] underline underline-offset-4">{done ? t.copied : t.copy}</button>
        {d.count > 0 && <span className="text-[11px] font-light uppercase tracking-[0.18em] text-foreground/50">{t.count(d.count)}</span>}
      </div>
    </div>
  );
}
