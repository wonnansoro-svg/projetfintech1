export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}

/** Même schéma que les comptes créés côté admin (`createProfileAsAdmin`) — permet une connexion sans email réel. */
export function syntheticEmailForPhone(phone: string): string {
  return `${normalizePhone(phone)}@coopavec.local`;
}
