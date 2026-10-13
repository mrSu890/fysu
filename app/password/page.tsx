import type { Metadata } from "next"
import PreLaunchGate from "@/components/PreLaunchGate"
import { OPEN_AT } from "@/lib/preLaunch"

// Page d'attente avant l'ouverture : jamais indexée par Google
export const metadata: Metadata = {
  title: "FYSU",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function PasswordPage() {
  return <PreLaunchGate openAt={OPEN_AT} />
}
