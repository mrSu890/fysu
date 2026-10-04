export type SCopy = {
  friends: string
  friendsIntro: string
  needUsername: string
  search: string
  add: string
  requested: string
  alreadyFriends: string
  incoming: string
  accept: string
  decline: string
  pending: string
  cancel: string
  noFriends: string
  remove: string
  noResult: string
  inbox: string
  inboxIntro: string
  inboxEmpty: string
  from: string
  newTag: string
  viewPiece: string
  shareTitle: string
  shareButton: string
  shareTo: string
  shareMessage: string
  shareSend: string
  sharing: string
  shareDone: string
  shareNoFriends: string
  shareLogin: string
  shareCopyLink: string
  shareLinkCopied: string
  close: string
  error: string
  // page /u/pseudo
  privateProfile: string
  notFound: string
  addFriend: string
  requestSent: string
  friendsNow: string
  acceptRequest: string
  loginToAdd: string
  badges: string
  closet: string
  wishlist: string
  empty: string
  backShop: string
  memberSince: string
}

const fr: SCopy = {
  friends: "Mes amis",
  friendsIntro: "Cherche un pseudo pour ajouter un ami, partage-lui tes coups de cœur FYSU.",
  needUsername: "Choisis d'abord un pseudo (Modifier mon profil) pour utiliser les amis.",
  search: "Chercher un pseudo",
  add: "Ajouter",
  requested: "Demandé",
  alreadyFriends: "Ami",
  incoming: "Demandes reçues",
  accept: "Accepter",
  decline: "Refuser",
  pending: "Demandes envoyées",
  cancel: "Annuler",
  noFriends: "Pas encore d'amis : cherche un pseudo ci-dessus.",
  remove: "Retirer",
  noResult: "Aucun pseudo trouvé",
  inbox: "Boîte de réception",
  inboxIntro: "Les pièces que tes amis t'envoient.",
  inboxEmpty: "Rien pour l'instant. Quand un ami te partage une pièce, elle apparaît ici.",
  from: "De",
  newTag: "Nouveau",
  viewPiece: "Voir la pièce",
  shareTitle: "Partager à un ami",
  shareButton: "Partager",
  shareTo: "Envoyer à",
  shareMessage: "Un petit mot (facultatif)",
  shareSend: "Envoyer",
  sharing: "Envoi…",
  shareDone: "Envoyé !",
  shareNoFriends: "Tu n'as pas encore d'amis. Ajoute-en depuis My FYSU.",
  shareLogin: "Connecte-toi pour partager cette pièce avec tes amis.",
  shareCopyLink: "Copier le lien de la pièce",
  shareLinkCopied: "Lien copié",
  close: "Fermer",
  error: "Une erreur est survenue",
  privateProfile: "Ce profil est privé.",
  notFound: "Profil introuvable.",
  addFriend: "Ajouter en ami",
  requestSent: "Demande envoyée",
  friendsNow: "Vous êtes amis",
  acceptRequest: "Accepter la demande",
  loginToAdd: "Connecte-toi pour ajouter en ami",
  badges: "Badges",
  closet: "Garde-robe",
  wishlist: "Coups de cœur",
  empty: "Rien à montrer pour l'instant.",
  backShop: "Découvrir FYSU",
  memberSince: "Membre depuis",
}

const en: SCopy = {
  friends: "My friends",
  friendsIntro: "Search a username to add a friend and share your FYSU favorites.",
  needUsername: "Pick a username first (Edit my profile) to use friends.",
  search: "Search a username",
  add: "Add",
  requested: "Requested",
  alreadyFriends: "Friend",
  incoming: "Requests received",
  accept: "Accept",
  decline: "Decline",
  pending: "Requests sent",
  cancel: "Cancel",
  noFriends: "No friends yet: search a username above.",
  remove: "Remove",
  noResult: "No username found",
  inbox: "Inbox",
  inboxIntro: "Pieces your friends send you.",
  inboxEmpty: "Nothing yet. When a friend shares a piece with you, it shows up here.",
  from: "From",
  newTag: "New",
  viewPiece: "View piece",
  shareTitle: "Share with a friend",
  shareButton: "Share",
  shareTo: "Send to",
  shareMessage: "A short note (optional)",
  shareSend: "Send",
  sharing: "Sending…",
  shareDone: "Sent!",
  shareNoFriends: "You have no friends yet. Add some from My FYSU.",
  shareLogin: "Sign in to share this piece with your friends.",
  shareCopyLink: "Copy piece link",
  shareLinkCopied: "Link copied",
  close: "Close",
  error: "Something went wrong",
  privateProfile: "This profile is private.",
  notFound: "Profile not found.",
  addFriend: "Add as friend",
  requestSent: "Request sent",
  friendsNow: "You are friends",
  acceptRequest: "Accept request",
  loginToAdd: "Sign in to add as friend",
  badges: "Badges",
  closet: "Wardrobe",
  wishlist: "Favorites",
  empty: "Nothing to show yet.",
  backShop: "Discover FYSU",
  memberSince: "Member since",
}

export const socialCopy = (locale: string): SCopy => (locale === "fr" ? fr : en)
