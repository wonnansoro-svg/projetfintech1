import {
  collection, doc, getCountFromServer, getDoc, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getProfile } from "./profileService";
import { DEFAULT_GUARANTEE_FUND, DEFAULT_CREDIT_SETTINGS, FUND_DOC, CREDIT_SETTINGS_DOC, getGuaranteeFund, getCreditSettings } from "./fundService";
import { computeCreditCeiling, isEligibleForCredit, buildRepaymentSchedule } from "../lib/credit";
import type { Credit, CreditSettings, GuaranteeFund, Wallet } from "../types/firestore";

const CREDITS = "credits";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const CONTRIBUTIONS = "contributions";

async function countConfirmedContributions(userId: string): Promise<number> {
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "==", userId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/** Dépose une demande de crédit ; calcule et enregistre un aperçu du plafond (statut "pending"). */
export async function requestCredit(userId: string, requestedAmount: number): Promise<string> {
  const walletSnap = await getDoc(doc(db, WALLETS, userId));
  const wallet = walletSnap.exists() ? (walletSnap.data() as Wallet) : null;
  const profile = await getProfile(userId);
  if (!profile) throw new Error("Profil bénéficiaire introuvable.");

  const [fund, settings, contributionsCount] = await Promise.all([
    getGuaranteeFund(), getCreditSettings(), countConfirmedContributions(userId),
  ]);

  const { ceiling, fundShareCap, regulatoryCap } = computeCreditCeiling({
    personalContribution12m: wallet?.contributionsLast12m ?? 0, fund, settings, kycStatus: profile.kycStatus,
  });
  const { eligible, reason } = isEligibleForCredit({ contributionsCount, ceiling, settings });
  if (!eligible) throw new Error(reason ?? "Non éligible au crédit pour le moment.");

  const now = Date.now();
  const creditRef = doc(collection(db, CREDITS));
  const credit: Credit = {
    id: creditRef.id, userId, requestedAmount, approvedAmount: null, status: "pending",
    interestRatePerMonth: settings.monthlyRate, termMonths: settings.termMonths, schedule: [],
    calculationSnapshot: {
      personalContribution12m: wallet?.contributionsLast12m ?? 0,
      fundAvailableAtDecision: fund.availableForCredit,
      fundShareCap, regulatoryCap, kycLevelUsed: profile.kycStatus, ceiling,
    },
    rejectionReason: null, requestedAt: now, decidedAt: null, decidedBy: null,
  };
  await setDoc(creditRef, credit);
  return creditRef.id;
}

export function subscribeToUserCredits(userId: string, onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("userId", "==", userId), orderBy("requestedAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Credit)));
}

export function subscribeToPendingCredits(onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Credit)));
}

export async function countActiveCredits(): Promise<number> {
  const q = query(collection(db, CREDITS), where("status", "==", "active"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/** Valide une demande de crédit : recalcule le plafond avec l'état du fonds au moment de la décision, puis décaisse. */
export async function approveCredit(creditId: string, adminUid: string): Promise<void> {
  const creditRef = doc(db, CREDITS, creditId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const creditSnap = await tx.get(creditRef);
    if (!creditSnap.exists()) throw new Error("Demande de crédit introuvable.");
    const credit = creditSnap.data() as Credit;
    if (credit.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

    const walletRef = doc(db, WALLETS, credit.userId);
    const [walletSnap, fundSnap, settingsSnap] = await Promise.all([tx.get(walletRef), tx.get(FUND_DOC), tx.get(CREDIT_SETTINGS_DOC)]);
    const wallet = walletSnap.exists() ? (walletSnap.data() as Wallet) : { uid: credit.userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    const fund = fundSnap.exists() ? (fundSnap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND;
    const settings = settingsSnap.exists() ? (settingsSnap.data() as CreditSettings) : DEFAULT_CREDIT_SETTINGS;

    const profile = await getProfile(credit.userId);
    const { ceiling, fundShareCap, regulatoryCap } = computeCreditCeiling({
      personalContribution12m: wallet.contributionsLast12m, fund, settings, kycStatus: profile?.kycStatus ?? "pending",
    });

    const approvedAmount = Math.min(credit.requestedAmount, ceiling);
    if (approvedAmount < settings.minLoanAmount) {
      tx.set(creditRef, {
        ...credit, status: "rejected",
        rejectionReason: "Plafond insuffisant au moment de la validation (fonds de garantie trop sollicité).",
        decidedAt: now, decidedBy: adminUid,
      });
      return { disbursed: false };
    }

    const schedule = buildRepaymentSchedule(approvedAmount, settings.monthlyRate, settings.termMonths);
    const newFundDisbursed = fund.totalDisbursedAsCredits + approvedAmount;
    const newAvailable = fund.totalDeposited * (1 - fund.reserveRatio) - newFundDisbursed;

    tx.set(creditRef, {
      ...credit, status: "active", approvedAmount, schedule,
      calculationSnapshot: { personalContribution12m: wallet.contributionsLast12m, fundAvailableAtDecision: fund.availableForCredit, fundShareCap, regulatoryCap, kycLevelUsed: profile?.kycStatus ?? "pending", ceiling },
      decidedAt: now, decidedBy: adminUid,
    });
    tx.set(walletRef, { ...wallet, balance: wallet.balance + approvedAmount, updatedAt: now });
    tx.set(FUND_DOC, { ...fund, totalDisbursedAsCredits: newFundDisbursed, availableForCredit: Math.max(0, newAvailable), updatedAt: now });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: credit.userId, type: "credit_disbursement", amount: approvedAmount,
      label: "Crédit agricole accordé", relatedCreditId: credit.id, createdAt: now,
    });
    return { disbursed: true };
  });
}

export async function rejectCredit(creditId: string, adminUid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, CREDITS, creditId), {
    status: "rejected", rejectionReason: reason, decidedAt: Date.now(), decidedBy: adminUid,
  });
}
