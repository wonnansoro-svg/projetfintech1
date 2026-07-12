/** Traduit les codes d'erreur Firebase Auth en messages clairs pour l'utilisateur. */
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Adresse email invalide.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Aucun compte ne correspond à ces identifiants.";
    case "auth/wrong-password":
      return "Mot de passe incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet email. Connectez-vous plutôt.";
    case "auth/weak-password":
      return "Mot de passe trop court (6 caractères minimum).";
    case "auth/network-request-failed":
      return "Pas de connexion internet. Vérifiez votre réseau et réessayez.";
    default:
      return "Erreur de connexion. Vérifiez vos identifiants et réessayez.";
  }
}
