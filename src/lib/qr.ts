import type { Profile } from "../types/firestore";

function randomCode(length: number, alphabet: string): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Génère un code de vérification aléatoire (8 caractères alphanumériques),
 * utilisé comme "secret partagé" simple pour le QR d'identité (pas une
 * signature cryptographique — cf. limite documentée dans le plan).
 */
export function generateVerificationCode(): string {
  return randomCode(8, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"); // sans caractères ambigus (0/O, 1/I)
}

/** Mot de passe temporaire pour un compte créé par un admin — à communiquer une seule fois au bénéficiaire. */
export function generateTempPassword(): string {
  return randomCode(10, "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789");
}

/**
 * Construit le payload encodé dans le QR d'identité d'un bénéficiaire.
 * Un agent scannant ce QR peut vérifier l'identité en comparant `uid` +
 * `verificationCode` au document `profiles/{uid}` dans Firestore.
 */
export function buildIdentityPayload(profile: Pick<Profile, "uid" | "verificationCode">): string {
  return `COOPAVEC:v1:${profile.uid}:${profile.verificationCode}`;
}
