/**
 * Ne garde que les 9 derniers chiffres significatifs du numéro (le numéro
 * d'abonné ivoirien, sans indicatif +225 ni le "0" initial).
 *
 * Pourquoi les 9 derniers plutôt que de repérer/retirer "+225" : selon que le
 * "0" initial est conservé ou non à l'international (les usages varient selon
 * qui saisit le numéro — un admin qui tape "+225 07 00 00 00 00" en gardant le
 * 0, quelqu'un d'autre qui tape "+225 7 00 00 00 00" en le laissant tomber, un
 * bénéficiaire qui se reconnecte en local "07 00 00 00 00"), une détection
 * fixe du préfixe "225" produisait des clés différentes pour le même numéro
 * selon la façon dont il avait été écrit — empêchant la connexion par
 * téléphone pour des comptes pourtant correctement créés. Les 9 derniers
 * chiffres, eux, désignent toujours le même abonné quelle que soit l'écriture
 * (locale, +225 avec ou sans le 0 initial).
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
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
