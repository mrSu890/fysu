"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ProductType } from "@/types/product"
import { deliveryDays, FREE_SHIPPING_FROM_CENTS, SHIPPING_FEE_CENTS } from "@/lib/shipping"

/* ====================================================================
   APPLE PAY / GOOGLE PAY DIRECTEMENT SUR LA FICHE PRODUIT
   Le vrai bouton Apple Pay (ou Google Pay) de Stripe : un toucher, validation Face ID,
   et la commande est payée sans passer par le panier. Livraison (5 € ou gratuite dès 150 €)
   et adresse sont gérées dans la fenêtre Apple Pay.
   Il faut être connecté (comme pour le panier) : la commande est rangée dans ton compte.
   ==================================================================== */

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

declare global {
  interface Window {
    Stripe?: (key: string) => any
  }
}

let stripeScript: Promise<void> | null = null
function loadStripeJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.Stripe) return Promise.resolve()
  if (!stripeScript) {
    stripeScript = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = "https://js.stripe.com/v3/"
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error("Stripe.js failed to load"))
      document.head.appendChild(s)
    })
  }
  return stripeScript
}

const COPY = {
  en: {
    signIn: "Sign in to pay with Apple Pay in one tap.",
    signInLink: "Sign in",
    unavailable: "Apple Pay isn't available on this device — add to cart and pay by card.",
    failed: "The payment didn't go through. You haven't been charged.",
    delivery: "Standard delivery",
    free: "Free delivery",
  },
  fr: {
    signIn: "Connecte-toi pour payer avec Apple Pay en un geste.",
    signInLink: "Se connecter",
    unavailable: "Apple Pay n'est pas disponible sur cet appareil — ajoute au panier et paie par carte.",
    failed: "Le paiement n'a pas abouti. Tu n'as pas été débité.",
    delivery: "Livraison standard",
    free: "Livraison offerte",
  },
}

type Props = {
  product: ProductType
  selectedSizeId: string | null
}

export default function ExpressPay({ product, selectedSizeId }: Props) {
  const t = useTranslations("Product")
  const locale = useLocale()
  const copy = locale === "fr" ? COPY.fr : COPY.en

  const mountRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading")
  const [reason, setReason] = useState("")
  const [needLogin, setNeedLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // l'état le plus récent est lu par les écouteurs d'Apple Pay (créés une seule fois)
  const sizeRef = useRef(selectedSizeId)
  sizeRef.current = selectedSizeId
  const loggedInRef = useRef<boolean | null>(null)
  const selectSizeMessage = useRef(t("selectSize"))
  selectSizeMessage.current = t("selectSize")

  const unitCents = Math.round(Number(product.price) * 100)

  // connecté ou non, demandé au serveur (fiable même si la session du navigateur tarde)
  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/callback?me=1", { cache: "no-store" })
      .then((r) => {
        if (!cancelled) loggedInRef.current = r.ok
      })
      .catch(() => {
        if (!cancelled) loggedInRef.current = null
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!PUBLISHABLE_KEY || !mountRef.current) {
      setReason(!PUBLISHABLE_KEY ? "cle-publique-absente" : "zone-absente")
      setStatus("unavailable")
      return
    }

    let cancelled = false
    let expressEl: any = null

    const rateFor = (country: string | undefined, subtotal: number) => {
      const free = subtotal >= FREE_SHIPPING_FROM_CENTS
      const days = deliveryDays(country)
      return {
        id: free ? "free" : "standard",
        displayName: free ? copy.free : copy.delivery,
        amount: free ? 0 : SHIPPING_FEE_CENTS,
        ...(days
          ? {
              deliveryEstimate: {
                minimum: { unit: "business_day", value: days.min },
                maximum: { unit: "business_day", value: days.max },
              },
            }
          : {}),
      }
    }

    loadStripeJs()
      .then(() => {
        if (cancelled || !window.Stripe || !mountRef.current) return
        const stripe = window.Stripe(PUBLISHABLE_KEY)
        const elements = stripe.elements({
          mode: "payment",
          amount: unitCents,
          currency: "eur",
          paymentMethodTypes: ["card"],
          appearance: { theme: "stripe" },
        })

        expressEl = elements.create("expressCheckout", {
          buttonType: { applePay: "buy", googlePay: "buy" },
          buttonTheme: { applePay: "black", googlePay: "black" },
          buttonHeight: 46,
          paymentMethods: { applePay: "always", googlePay: "always", link: "never", amazonPay: "never", paypal: "never" },
        })

        expressEl.on("ready", (e: any) => {
          const m = e?.availablePaymentMethods
          setStatus(m && (m.applePay || m.googlePay) ? "ready" : "unavailable")
          if (!(m && (m.applePay || m.googlePay))) setReason("aucun-portefeuille:" + JSON.stringify(m ?? null))
        })

        expressEl.on("loaderror", (e: any) => {
          setReason("loaderror:" + (e?.error?.message || e?.error?.code || "inconnu"))
          setStatus("unavailable")
        })

        expressEl.on("click", (e: any) => {
          setError(null)
          if (!sizeRef.current) {
            alert(selectSizeMessage.current)
            return
          }
          if (loggedInRef.current === false) {
            setNeedLogin(true)
            return
          }
          setNeedLogin(false)
          e.resolve({
            emailRequired: true,
            phoneNumberRequired: true,
            shippingAddressRequired: true,
            shippingRates: [rateFor(undefined, unitCents)],
          })
        })

        expressEl.on("shippingaddresschange", (e: any) => {
          const rate = rateFor(e?.address?.country, unitCents)
          elements.update({ amount: unitCents + rate.amount })
          e.resolve({ shippingRates: [rate] })
        })

        expressEl.on("shippingratechange", (e: any) => {
          elements.update({ amount: unitCents + (e?.shippingRate?.amount ?? 0) })
          e.resolve({})
        })

        expressEl.on("confirm", async (e: any) => {
          try {
            const { error: submitError } = await elements.submit()
            if (submitError) {
              e.paymentFailed({ reason: "fail" })
              return
            }

            const res = await fetch("/api/checkout?express=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cart: [{ id: product.id, quantity: 1, selectedSizeId: sizeRef.current }],
                email: e.billingDetails?.email ?? null,
                phone: e.billingDetails?.phone ?? null,
                name: e.billingDetails?.name ?? null,
                shipping: e.shippingAddress ?? null,
              }),
            })

            if (res.status === 401) {
              e.paymentFailed({ reason: "fail" })
              setNeedLogin(true)
              return
            }
            if (!res.ok) {
              e.paymentFailed({ reason: "fail" })
              const data = await res.json().catch(() => null)
              setError(data?.error || copy.failed)
              return
            }

            const { clientSecret, id } = await res.json()
            const { error: payError } = await stripe.confirmPayment({
              elements,
              clientSecret,
              confirmParams: { return_url: `${window.location.origin}/success?payment_intent=${id}` },
              redirect: "if_required",
            })

            if (payError) {
              e.paymentFailed({ reason: "fail" })
              setError(copy.failed)
              return
            }

            window.location.href = `/success?payment_intent=${id}`
          } catch {
            e.paymentFailed({ reason: "fail" })
            setError(copy.failed)
          }
        })

        expressEl.mount(mountRef.current)
      })
      .catch((err: any) => {
        if (!cancelled) {
          setReason("erreur:" + (err?.message || "stripe.js"))
          setStatus("unavailable")
        }
      })

    return () => {
      cancelled = true
      try {
        expressEl?.destroy()
      } catch {}
    }
    // créé une seule fois par produit : les valeurs changeantes passent par des « ref »
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, unitCents])

  return (
    <div className="w-full">
      <div ref={mountRef} className={status === "ready" ? "" : "h-0 overflow-hidden"} />

      {status === "unavailable" && (
        <p className="text-center text-xs opacity-60">
          {copy.unavailable}
          {reason && <span className="mt-1 block break-all text-[10px] opacity-70">[{reason}]</span>}
        </p>
      )}

      {needLogin && (
        <p className="mt-2 text-center text-xs">
          {copy.signIn}{" "}
          <Link href="/auth/signin" className="underline">
            {copy.signInLink}
          </Link>
        </p>
      )}

      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}
