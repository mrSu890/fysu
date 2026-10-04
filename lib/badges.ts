/* ====================================================================
   BADGES FYSU
   Calculés automatiquement à partir des commandes, des favoris, du
   profil et des jeux. Pour changer un badge ou une récompense, modifie
   la liste ci-dessous (reward = réduction offerte une seule fois).
   ==================================================================== */

export type Stats = {
  orders: number
  pieces: number
  wishlist: number
  birdBest: number
  profileComplete: boolean
  memberSince: string | null
}

export type BadgeDef = {
  id: string
  icon: string
  fr: { name: string; desc: string }
  en: { name: string; desc: string }
  test: (s: Stats) => boolean
  // progression affichée quand le badge n'est pas encore gagné
  progress?: (s: Stats) => { value: number; max: number }
  reward?: { percent: number; days: number }
}

export const BADGES: BadgeDef[] = [
  {
    id: "profile",
    icon: "🪪",
    fr: { name: "Identité", desc: "Complète ton profil : pseudo, avatar et bio." },
    en: { name: "Identity", desc: "Complete your profile: username, avatar and bio." },
    test: (s) => s.profileComplete,
    reward: { percent: 5, days: 30 },
  },
  {
    id: "first-order",
    icon: "📦",
    fr: { name: "Première pièce", desc: "Passe ta première commande." },
    en: { name: "First piece", desc: "Place your first order." },
    test: (s) => s.orders >= 1,
  },
  {
    id: "wishlist",
    icon: "🤍",
    fr: { name: "Coup de cœur", desc: "Ajoute 3 pièces à tes favoris." },
    en: { name: "Heart picks", desc: "Add 3 pieces to your favorites." },
    test: (s) => s.wishlist >= 3,
    progress: (s) => ({ value: s.wishlist, max: 3 }),
  },
  {
    id: "loyal",
    icon: "⭐",
    fr: { name: "Fidèle", desc: "Passe 3 commandes." },
    en: { name: "Loyal", desc: "Place 3 orders." },
    test: (s) => s.orders >= 3,
    progress: (s) => ({ value: s.orders, max: 3 }),
    reward: { percent: 10, days: 60 },
  },
  {
    id: "collector",
    icon: "🏛️",
    fr: { name: "Collectionneur", desc: "Possède 6 pièces FYSU." },
    en: { name: "Collector", desc: "Own 6 FYSU pieces." },
    test: (s) => s.pieces >= 6,
    progress: (s) => ({ value: s.pieces, max: 6 }),
  },
  {
    id: "arcade",
    icon: "🕹️",
    fr: { name: "Joueur", desc: "Atteins 50 points à FYSU Bird." },
    en: { name: "Player", desc: "Reach 50 points in FYSU Bird." },
    test: (s) => s.birdBest >= 50,
    progress: (s) => ({ value: s.birdBest, max: 50 }),
  },
  {
    id: "pioneer",
    icon: "🌅",
    fr: { name: "Première heure", desc: "Membre avant le 1er janvier 2027." },
    en: { name: "Early supporter", desc: "Member before 1 January 2027." },
    test: (s) => !!s.memberSince && new Date(s.memberSince) < new Date("2027-01-01T00:00:00Z"),
  },
]

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)
