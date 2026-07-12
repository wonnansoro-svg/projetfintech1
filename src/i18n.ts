// Traductions fr/en uniquement. Ton chaleureux, humain, proche.
export type Lang = "fr" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export const T = {
  appName:        { fr: "Bokanmin", en: "Bokanmin" },
  online:         { fr: "En ligne", en: "Online" },
  offline:        { fr: "Hors ligne", en: "Offline" },
  worksOffline:   { fr: "Fonctionne même sans internet ✨", en: "Works even without internet ✨" },

  // Salutations humaines selon l'heure
  morning:    { fr: "Bon matin", en: "Good morning" },
  afternoon:  { fr: "Bon après-midi", en: "Good afternoon" },
  evening:    { fr: "Bonsoir", en: "Good evening" },
  howAreYou:  { fr: "Comment allez-vous aujourd'hui ?", en: "How are you doing today?" },
  readyToWork: { fr: "Prêt·e à cultiver ?", en: "Ready to grow?" },

  // Navigation
  home:        { fr: "Accueil", en: "Home" },
  susu:        { fr: "Tontine", en: "Susu" },
  weather:     { fr: "Météo", en: "Weather" },
  parcelles:   { fr: "Mes champs", en: "My fields" },
  credit:      { fr: "Crédit", en: "Credit" },
  insurance:   { fr: "Assurance", en: "Insurance" },
  carbon:      { fr: "Carbone", en: "Carbon" },
  identity:    { fr: "Mon ID", en: "My ID" },
  payments:    { fr: "Paiements", en: "Payments" },

  // Actions
  listen:      { fr: "Écouter", en: "Listen" },
  save:        { fr: "Enregistrer", en: "Save" },
  cancel:      { fr: "Annuler", en: "Cancel" },
  confirm:     { fr: "Valider", en: "Confirm" },
  amount:      { fr: "Montant", en: "Amount" },
  date:        { fr: "Date", en: "Date" },
  today:       { fr: "Aujourd'hui", en: "Today" },
  deposit:     { fr: "Déposer", en: "Deposit" },
  withdraw:    { fr: "Retirer", en: "Withdraw" },
  send:        { fr: "Envoyer", en: "Send" },
  receive:     { fr: "Recevoir", en: "Receive" },

  // Tontine
  group:        { fr: "Groupe", en: "Group" },
  members:      { fr: "Membres", en: "Members" },
  nextPayout:   { fr: "Prochain tour", en: "Next payout" },
  weeklySavings:{ fr: "Épargne de la semaine", en: "This week's saving" },
  myGroup:      { fr: "Mon groupe", en: "My group" },
  days:         { fr: "jours", en: "days" },
  paid:         { fr: "Ont cotisé", en: "Have contributed" },

  // Météo
  rain:          { fr: "Pluie", en: "Rain" },
  sun:           { fr: "Soleil", en: "Sun" },
  wind:          { fr: "Vent", en: "Wind" },
  humidity:      { fr: "Humidité", en: "Humidity" },
  temperature:   { fr: "Température", en: "Temperature" },
  advice:        { fr: "Conseil du jour", en: "Today's tip" },
  plantAdvice:   { fr: "Belle journée pour planter", en: "Great day to plant" },
  harvestAdvice: { fr: "Belle journée pour récolter", en: "Great day to harvest" },
  weekForecast:  { fr: "Cette semaine", en: "This week" },

  // Champs
  myParcels:    { fr: "Mes parcelles", en: "My fields" },
  addParcel:    { fr: "Ajouter un champ", en: "Add a field" },
  hectares:     { fr: "hectares", en: "hectares" },
  crop:         { fr: "Culture", en: "Crop" },
  maize:        { fr: "Maïs", en: "Corn" },
  millet:       { fr: "Mil", en: "Millet" },
  rice:         { fr: "Riz", en: "Rice" },
  takePhoto:    { fr: "Prendre une photo", en: "Take a photo" },
  getGps:       { fr: "Localiser", en: "Locate" },
  history:      { fr: "Historique", en: "History" },
  totalArea:    { fr: "Surface totale", en: "Total area" },
  traceable:    { fr: "Traçable", en: "Traceable" },

  // Crédit
  creditAmount: { fr: "Montant du crédit", en: "Credit amount" },
  repay:        { fr: "Rembourser", en: "Repay" },
  dueDate:      { fr: "Échéance", en: "Due in" },
  requestCredit:{ fr: "Demander un crédit", en: "Request a credit" },
  interest:     { fr: "Intérêt", en: "Interest" },
  toRepay:      { fr: "À rembourser", en: "Total to repay" },
  received:     { fr: "Reçu !", en: "Received!" },

  // Assurance
  triggered:    { fr: "Alerte déclenchée", en: "Alert triggered" },
  payout:       { fr: "Indemnité", en: "Payout" },
  claim:        { fr: "Réclamer", en: "Claim" },
  howItWorks:   { fr: "Comment ça marche ?", en: "How it works?" },
  droughtAlert: { fr: "Alerte sécheresse", en: "Drought alert" },
  floodAlert:   { fr: "Alerte inondation", en: "Flood alert" },

  // Carbone
  carbonCredits:{ fr: "Crédits carbone", en: "Carbon credits" },
  co2Saved:     { fr: "CO₂ économisé", en: "CO₂ saved" },
  earn:         { fr: "Gagner", en: "Earn" },
  yourPractices:{ fr: "Vos bonnes pratiques", en: "Your good practices" },

  // Identité
  idCard:       { fr: "Ma carte d'identité", en: "My ID card" },
  verified:     { fr: "Vérifié", en: "Verified" },
  phoneNumber:  { fr: "Téléphone", en: "Phone" },
  village:      { fr: "Village", en: "Village" },
  uniqueId:     { fr: "Identifiant unique", en: "Unique ID" },
  scanToVerify: { fr: "À scanner pour vérifier", en: "Scan to verify" },

  // Paiements
  yourBalance:  { fr: "Votre solde", en: "Your balance" },
  recentTxs:    { fr: "Activité récente", en: "Recent activity" },
  savingsGoal:  { fr: "Mon objectif", en: "My goal" },

  // Messages chaleureux / feedback
  wellDone:     { fr: "Bien joué !", en: "Well done!" },
  thankYou:     { fr: "Merci !", en: "Thank you!" },
  keepGoing:    { fr: "Continue comme ça 💪", en: "Keep it up 💪" },
  smallStep:    { fr: "Un pas de plus vers ton objectif", en: "One more step toward your goal" },
  sentSuccess:  { fr: "Envoyé avec succès", en: "Successfully sent" },
  receivedOk:   { fr: "Bien reçu", en: "All set" },
  oops:         { fr: "Oups !", en: "Oops!" },
  comeBack:     { fr: "À bientôt !", en: "See you soon!" },
  madeWithLove: { fr: "Fait avec ❤️ pour les communautés rurales", en: "Made with ❤️ for rural communities" },

  // Tutoriels
  tutorial:     { fr: "Comment ça marche", en: "How it works" },
  step1:        { fr: "Inscris-toi avec ton numéro", en: "Sign up with your phone" },
  step2:        { fr: "Rejoins un groupe", en: "Join a group" },
  step3:        { fr: "Épargne chaque semaine", en: "Save every week" },
  step4:        { fr: "Reçois ton tour", en: "Get your turn" },

  // Phrases motivantes (rotation)
  quote1: { fr: "Chaque graine compte.", en: "Every seed counts." },
  quote2: { fr: "Ensemble on va plus loin.", en: "Together we go further." },
  quote3: { fr: "Ta terre, ton avenir.", en: "Your land, your future." },
  quote4: { fr: "Épargne un peu, récolte beaucoup.", en: "Save a little, harvest a lot." },

} as const;

export type TKey = keyof typeof T;

export function t(key: TKey, lang: Lang): string {
  return (T[key] as any)[lang] || (T[key] as any).fr;
}

// Récupère la salutation adaptée à l'heure du jour
export function getGreeting(lang: Lang): string {
  const h = new Date().getHours();
  if (h < 12) return t("morning", lang);
  if (h < 18) return t("afternoon", lang);
  return t("evening", lang);
}
