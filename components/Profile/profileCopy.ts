export type PCopy = {
  memberSince: string
  editProfile: string
  noBio: string
  addBio: string
  welcomeTitle: string
  welcomeText: string
  editTitle: string
  avatar: string
  chooseAvatar: string
  uploadPhoto: string
  removeAvatar: string
  username: string
  usernameHint: string
  displayName: string
  bio: string
  bioHint: string
  color: string
  save: string
  saving: string
  later: string
  close: string
  saved: string
  error: string
  badges: string
  badgesIntro: string
  earned: string
  locked: string
  claim: string
  claiming: string
  yourCode: string
  validUntil: string
  copy: string
  copied: string
  closet: string
  closetIntro: string
  closetEmpty: string
  closetPieces: (n: number) => string
  stats: { orders: string; pieces: string; favorites: string }
}

const fr: PCopy = {
  memberSince: "Membre depuis",
  editProfile: "Modifier mon profil",
  noBio: "Ajoute une petite phrase pour te présenter.",
  addBio: "Ajouter une bio",
  welcomeTitle: "Bienvenue dans ton univers FYSU",
  welcomeText: "Choisis un avatar et un pseudo pour créer ton profil. Tu pourras tout changer plus tard.",
  editTitle: "Mon profil",
  avatar: "Avatar",
  chooseAvatar: "Choisis un avatar FYSU",
  uploadPhoto: "Envoyer ma photo",
  removeAvatar: "Retirer",
  username: "Pseudo",
  usernameHint: "3 à 20 caractères : lettres, chiffres, _ et .",
  displayName: "Prénom ou nom affiché",
  bio: "Bio",
  bioHint: "160 caractères maximum",
  color: "Ma couleur",
  save: "Enregistrer",
  saving: "Enregistrement…",
  later: "Plus tard",
  close: "Fermer",
  saved: "Profil enregistré",
  error: "Une erreur est survenue",
  badges: "Mes badges",
  badgesIntro: "Gagne des badges en explorant FYSU. Certains débloquent un code promo.",
  earned: "Gagné",
  locked: "À débloquer",
  claim: "Récupérer mon code",
  claiming: "Création…",
  yourCode: "Ton code",
  validUntil: "valable jusqu'au",
  copy: "Copier",
  copied: "Copié",
  closet: "Ma garde-robe FYSU",
  closetIntro: "Les pièces que tu possèdes déjà.",
  closetEmpty: "Ta garde-robe se remplira avec tes premières commandes.",
  closetPieces: (n) => `${n} pièce${n > 1 ? "s" : ""}`,
  stats: { orders: "Commandes", pieces: "Pièces", favorites: "Favoris" },
}

const en: PCopy = {
  memberSince: "Member since",
  editProfile: "Edit my profile",
  noBio: "Add a short line to introduce yourself.",
  addBio: "Add a bio",
  welcomeTitle: "Welcome to your FYSU universe",
  welcomeText: "Pick an avatar and a username to create your profile. You can change everything later.",
  editTitle: "My profile",
  avatar: "Avatar",
  chooseAvatar: "Pick a FYSU avatar",
  uploadPhoto: "Upload my photo",
  removeAvatar: "Remove",
  username: "Username",
  usernameHint: "3 to 20 characters: letters, numbers, _ and .",
  displayName: "Display name",
  bio: "Bio",
  bioHint: "160 characters max",
  color: "My color",
  save: "Save",
  saving: "Saving…",
  later: "Later",
  close: "Close",
  saved: "Profile saved",
  error: "Something went wrong",
  badges: "My badges",
  badgesIntro: "Earn badges by exploring FYSU. Some unlock a promo code.",
  earned: "Earned",
  locked: "To unlock",
  claim: "Get my code",
  claiming: "Creating…",
  yourCode: "Your code",
  validUntil: "valid until",
  copy: "Copy",
  copied: "Copied",
  closet: "My FYSU wardrobe",
  closetIntro: "The pieces you already own.",
  closetEmpty: "Your wardrobe will fill up with your first orders.",
  closetPieces: (n) => `${n} piece${n > 1 ? "s" : ""}`,
  stats: { orders: "Orders", pieces: "Pieces", favorites: "Favorites" },
}

export const profileCopy = (locale: string): PCopy => (locale === "fr" ? fr : en)
