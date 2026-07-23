/**
 * Ne garde que les chiffres, et retire l'indicatif Côte d'Ivoire (+225/225) s'il
 * est présent — pour que "+225 07 00 00 00 00" et "07 00 00 00 00" (même numéro,
 * écrit différemment selon l'utilisateur ou l'écran) se normalisent à l'identique.
 * Un numéro local ivoirien fait 10 chiffres ; on ne retire "225" que s'il y a
 * plus de 10 chiffres, pour ne jamais tronquer un numéro purement local.
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("225") ? digits.slice(3) : digits;
}

export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}

/** Même schéma que les comptes créés côté admin (`createProfileAsAdmin`) — permet une connexion sans email réel. */
export function syntheticEmailForPhone(phone: string): string {
  return `${normalizePhone(phone)}@coopavec.local`;
}

/** Retrouve le numéro à partir d'un email synthétique "{digits}@coopavec.local" — sert à pré-remplir le profil après une inscription par téléphone. */
export function phoneFromSyntheticEmail(email: string | null | undefined): string {
  const match = email?.match(/^(\d+)@coopavec\.local$/);
  return match ? match[1] : "";
}
