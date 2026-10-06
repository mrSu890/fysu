import HeroSliderDashboard from "@/components/Admin/HeroSliderDashboard"
import HomeCarouselManager from "@/components/Admin/HomeCarouselManager"

// La coque de l'admin (menu + barre du haut) est ajoutée par app/admin/layout.tsx
export default function HomeImagesAdminPage() {
  return (
    <div className="space-y-8">
      <HeroSliderDashboard />
      <HomeCarouselManager />
    </div>
  )
}
