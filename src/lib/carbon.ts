import type { Crop, Parcel } from "../types/firestore";

/**
 * Crédits carbone par hectare et par an, selon la culture — reflète que les
 * cultures pérennes/arborées (cacao, hévéa, palmier, anacarde) séquestrent
 * davantage de carbone que les cultures annuelles (maïs, mil, riz, manioc).
 * Valeurs indicatives pour la démonstration du produit, pas un audit carbone
 * certifié.
 */
export const CARBON_RATE_PER_HECTARE: Record<Crop, number> = {
  cacao: 3,
  hevea: 3,
  anacarde: 2.5,
  palmier: 2.5,
  vivrier: 1.5,
  manioc: 1,
  maize: 0.8,
  millet: 0.8,
  rice: 0.6,
  autre: 1,
};

/** 1 crédit carbone ≈ 0,5 tonne de CO₂ (affichage informatif). */
export const CO2_TONNES_PER_CREDIT = 0.5;

/** Prix de rachat d'un crédit carbone par la coopérative, en FCFA. */
export const CARBON_CREDIT_PRICE_FCFA = 500;

/** Total de crédits carbone gagnés grâce aux parcelles enregistrées (verdissement du champ). */
export function computeCarbonCredits(parcels: Parcel[]): number {
  const total = parcels.reduce((sum, p) => sum + p.hectares * (CARBON_RATE_PER_HECTARE[p.crop] ?? CARBON_RATE_PER_HECTARE.autre), 0);
  return Math.round(total * 10) / 10;
}
