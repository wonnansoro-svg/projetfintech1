import type { CreditSettings, GuaranteeFund, KycStatus, RepaymentInstallment } from "../types/firestore";

export interface CreditCeilingInput {
  personalContribution12m: number;
  fund: GuaranteeFund;
  settings: CreditSettings;
  kycStatus: KycStatus;
}

export interface CreditCeilingResult {
  ceiling: number;
  fundShareCap: number;
  regulatoryCap: number;
  personalCap: number;
}

/**
 * Plafond de crédit = min(k × cotisation personnelle, quote-part du fonds
 * de garantie disponible, plafond réglementaire selon le niveau KYC).
 */
export function computeCreditCeiling({ personalContribution12m, fund, settings, kycStatus }: CreditCeilingInput): CreditCeilingResult {
  const personalCap = settings.multiplierK * personalContribution12m;
  const fundShareCap = Math.max(0, settings.maxFundSharePct * fund.availableForCredit);
  const regulatoryCap = settings.regulatoryCapByKyc[kycStatus] ?? 0;
  const ceiling = Math.max(0, Math.min(personalCap, fundShareCap, regulatoryCap));
  return { ceiling, fundShareCap, regulatoryCap, personalCap };
}

export interface EligibilityInput {
  contributionsCount: number;
  ceiling: number;
  settings: CreditSettings;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string | null;
}

export function isEligibleForCredit({ contributionsCount, ceiling, settings }: EligibilityInput): EligibilityResult {
  if (contributionsCount < settings.minContributionsRequired) {
    return { eligible: false, reason: `Il faut au moins ${settings.minContributionsRequired} cotisations confirmées pour devenir éligible.` };
  }
  if (ceiling < settings.minLoanAmount) {
    return { eligible: false, reason: "Le plafond calculé est inférieur au montant minimum de crédit. Cotisez davantage pour augmenter votre plafond." };
  }
  return { eligible: true, reason: null };
}

/** Échéancier à intérêt simple, réparti à parts égales sur la durée du crédit. */
export function buildRepaymentSchedule(approvedAmount: number, monthlyRate: number, termMonths: number, startDate = new Date()): RepaymentInstallment[] {
  const total = approvedAmount * (1 + monthlyRate * termMonths);
  const installment = Math.round(total / termMonths);
  return Array.from({ length: termMonths }, (_, i) => {
    const due = new Date(startDate);
    due.setMonth(due.getMonth() + i + 1);
    return { dueDate: due.toISOString().slice(0, 10), amount: installment, status: "upcoming" as const };
  });
}
