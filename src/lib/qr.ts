import type { Profile } from "../types/firestore";

/**
 * Génère un code de vérification aléatoire (8 caractères alphanumériques),
 * utilisé comme "secret partagé" simple pour le QR d'identité (pas une
 * signature cryptographique — cf. limite documentée dans le plan).
 */
export function generateVerificationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus (0/O, 1/I)
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Construit le payload encodé dans le QR d'identité d'un bénéficiaire.
 * Un agent scannant ce QR peut vérifier l'identité en comparant `uid` +
 * `verificationCode` au document `profiles/{uid}` dans Firestore.
 */
export function buildIdentityPayload(profile: Pick<Profile, "uid" | "verificationCode">): string {
  return `COOPAVEC:v1:${profile.uid}:${profile.verificationCode}`;
}
