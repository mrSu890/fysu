import type { Metadata } from "next"
import AdminShell from "@/components/Admin/ui/AdminShell"

export const metadata: Metadata = {
  title: "Fysu · Admin",
  robots: { index: false, follow: false },
}

// Toutes les pages /admin/... sont affichées dans cette coque (menu latéral + barre du haut)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
