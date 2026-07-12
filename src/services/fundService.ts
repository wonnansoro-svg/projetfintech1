import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { CreditSettings, GuaranteeFund } from "../types/firestore";

const FUND_DOC = doc(db, "guaranteeFund", "global");
const CREDIT_SETTINGS_DOC = doc(db, "settings", "credit");

export const DEFAULT_GUARANTEE_FUND: GuaranteeFund = {
  totalDeposited: 0,
  totalDisbursedAsCredits: 0,
  reserveRatio: 0.2,
  availableForCredit: 0,
  updatedAt: Date.now(),
};

export const DEFAULT_CREDIT_SETTINGS: CreditSettings = {
  multiplierK: 3,
  maxFundSharePct: 0.05,
  regulatoryCapByKyc: { pending: 0, level1: 150000, level2: 500000 },
  minContributionsRequired: 4,
  minLoanAmount: 5000,
  monthlyRate: 0.03,
  termMonths: 6,
};

export async function getGuaranteeFund(): Promise<GuaranteeFund> {
  const snap = await getDoc(FUND_DOC);
  if (snap.exists()) return snap.data() as GuaranteeFund;
  await setDoc(FUND_DOC, DEFAULT_GUARANTEE_FUND);
  return DEFAULT_GUARANTEE_FUND;
}

export function subscribeToGuaranteeFund(onChange: (fund: GuaranteeFund) => void) {
  return onSnapshot(FUND_DOC, (snap) => {
    onChange(snap.exists() ? (snap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND);
  });
}

export async function getCreditSettings(): Promise<CreditSettings> {
  const snap = await getDoc(CREDIT_SETTINGS_DOC);
  if (snap.exists()) return snap.data() as CreditSettings;
  await setDoc(CREDIT_SETTINGS_DOC, DEFAULT_CREDIT_SETTINGS);
  return DEFAULT_CREDIT_SETTINGS;
}

export function subscribeToCreditSettings(onChange: (settings: CreditSettings) => void) {
  return onSnapshot(CREDIT_SETTINGS_DOC, (snap) => {
    onChange(snap.exists() ? (snap.data() as CreditSettings) : DEFAULT_CREDIT_SETTINGS);
  });
}

export { FUND_DOC, CREDIT_SETTINGS_DOC };
