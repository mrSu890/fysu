import { redirect } from "next/navigation"

// Les avatars sont masqués pour l'instant
export default function AvatarPage() {
  redirect("/games")
}
