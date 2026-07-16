import {
  collection, doc, getCountFromServer, getDoc, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getProfile } from "./profileService";
import { DEFAULT_GUARANTEE_FUND, DEFAULT_CREDIT_SETTINGS, FUND_DOC, CREDIT_SETTINGS_DOC, getGuaranteeFund, getCreditSettings } from "./fundService";
import { computeCreditCeiling, computeFinancingScore, isEligibleForCredit, buildRepaymentSchedule } from "../lib/credit";
import { getUserLossValueFcfa } from "./lossService";
import { buildNotification } from "./notificationService";
import type { BondInvestment, Credit, CreditSettings, GuaranteeFund, Wallet } from "../types/firestore";

const CREDITS = "credits";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const CONTRIBUTIONS = "contributions";
const NOTIFICATIONS = "notifications";
const BOND_INVESTMENTS = "bondInvestments";

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

  const [fund, settings, contributionsCount, lossValue] = await Promise.all([
    getGuaranteeFund(), getCreditSettings(), countConfirmedContributions(userId), getUserLossValueFcfa(userId),
  ]);
  const financingScore = computeFinancingScore(lossValue);

  const { ceiling, fundShareCap, regulatoryCap } = computeCreditCeiling({
    personalContribution12m: wallet?.contributionsLast12m ?? 0, fund, settings, kycStatus: profile.kycStatus, financingScore,
  });
  const { eligible, reason } = isEligibleForCredit({ contributionsCount, ceiling, settings });
  if (!eligible) throw new Error(reason ?? "Non éligible au bon de financement pour le moment.");

  const now = Date.now();
  const creditRef = doc(collection(db, CREDITS));
  const credit: Credit = {
    id: creditRef.id, userId, requestedAmount, approvedAmount: null, status: "pending", investedAmount: 0,
    interestRatePerMonth: settings.monthlyRate, termMonths: settings.termMonths, schedule: [],
    calculationSnapshot: {
      personalContribution12m: wallet?.contributionsLast12m ?? 0,
      fundAvailableAtDecision: fund.availableForCredit,
      fundShareCap, regulatoryCap, kycLevelUsed: profile.kycStatus, ceiling, financingScore,
    },
    rejectionReason: null, requestedAt: now, decidedAt: null, decidedBy: null,
  };
  await setDoc(creditRef, credit);
  return creditRef.id;
}

export async function getCredit(creditId: string): Promise<Credit | null> {
  const snap = await getDoc(doc(db, CREDITS, creditId));
  return snap.exists() ? (snap.data() as Credit) : null;
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
    if (!creditSnap.exists()) throw new Error("Demande de bon de financement introuvable.");
    const credit = creditSnap.data() as Credit;
    if (credit.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

    const walletRef = doc(db, WALLETS, credit.userId);
    const [walletSnap, fundSnap, settingsSnap] = await Promise.all([tx.get(walletRef), tx.get(FUND_DOC), tx.get(CREDIT_SETTINGS_DOC)]);
    const wallet = walletSnap.exists() ? (walletSnap.data() as Wallet) : { uid: credit.userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    const fund = fundSnap.exists() ? (fundSnap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND;
    const settings = settingsSnap.exists() ? (settingsSnap.data() as CreditSettings) : DEFAULT_CREDIT_SETTINGS;

    const [profile, lossValue] = await Promise.all([getProfile(credit.userId), getUserLossValueFcfa(credit.userId)]);
    const financingScore = computeFinancingScore(lossValue);
    const { ceiling, fundShareCap, regulatoryCap } = computeCreditCeiling({
      personalContribution12m: wallet.contributionsLast12m, fund, settings, kycStatus: profile?.kycStatus ?? "pending", financingScore,
    });

    const approvedAmount = Math.min(credit.requestedAmount, ceiling);
    if (approvedAmount < settings.minLoanAmount) {
      const reason = "Plafond insuffisant au moment de la validation (fonds de garantie trop sollicité).";
      tx.set(creditRef, { ...credit, status: "rejected", rejectionReason: reason, decidedAt: now, decidedBy: adminUid });
      const notif = buildNotification(credit.userId, "Demande de bon de financement refusée", reason);
      tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
      return { disbursed: false };
    }

    const schedule = buildRepaymentSchedule(approvedAmount, settings.monthlyRate, settings.termMonths);
    const newFundDisbursed = fund.totalDisbursedAsCredits + approvedAmount;
    const newAvailable = fund.totalDeposited * (1 - fund.reserveRatio) - newFundDisbursed;

    tx.set(creditRef, {
      ...credit, status: "active", approvedAmount, schedule,
      calculationSnapshot: { personalContribution12m: wallet.contributionsLast12m, fundAvailableAtDecision: fund.availableForCredit, fundShareCap, regulatoryCap, kycLevelUsed: profile?.kycStatus ?? "pending", ceiling, financingScore },
      decidedAt: now, decidedBy: adminUid,
    });
    tx.set(walletRef, { ...wallet, balance: wallet.balance + approvedAmount, updatedAt: now });
    tx.set(FUND_DOC, { ...fund, totalDisbursedAsCredits: newFundDisbursed, availableForCredit: Math.max(0, newAvailable), updatedAt: now });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: credit.userId, type: "credit_disbursement", amount: approvedAmount,
      label: "Bon de financement accordé", relatedCreditId: credit.id, createdAt: now,
    });

    const notif = buildNotification(credit.userId, "Bon de financement accordé 🎉", `Votre bon de financement de ${approvedAmount.toLocaleString("fr-FR")} F a été validé et versé sur votre solde.`);
    tx.set(doc(db, NOTIFICATIONS, notif.id), notif);

    return { disbursed: true };
  });
}

/** Bons disponibles à l'investissement : demandes approuvées/actives pas encore entièrement financées par des investisseurs. */
export function subscribeToInvestableBonds(onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("status", "in", ["approved", "active"]));
  return onSnapshot(q, (snap) => {
    const credits = snap.docs.map((d) => d.data() as Credit);
    onChange(credits.filter((c) => c.investedAmount < (c.approvedAmount ?? 0)));
  });
}

/**
 * Un investisseur "achète" une part d'un bon déjà décaissé au fermier par le
 * fonds de garantie : son solde est débité, et le même montant réalimente le
 * fonds de garantie (donc la capacité de prêt de la coopérative) — le fermier
 * ne reçoit pas d'argent supplémentaire ici, il a déjà été payé à l'approbation.
 */
export async function investInBond(investorId: string, creditId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const creditRef = doc(db, CREDITS, creditId);
  const walletRef = doc(db, WALLETS, investorId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const [creditSnap, walletSnap, fundSnap] = await Promise.all([tx.get(creditRef), tx.get(walletRef), tx.get(FUND_DOC)]);
    if (!creditSnap.exists()) throw new Error("Bon introuvable.");
    const credit = creditSnap.data() as Credit;
    if (credit.approvedAmount === null) throw new Error("Ce bon n'est pas encore approuvé.");
    const remaining = credit.approvedAmount - credit.investedAmount;
    if (amount > remaining) throw new Error(`Montant supérieur au reste à financer (${remaining.toLocaleString("fr-FR")} F).`);

    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: investorId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    if (wallet.balance < amount) throw new Error("Solde insuffisant.");
    const fund = fundSnap.exists() ? (fundSnap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND;

    const newFundTotal = fund.totalDeposited + amount;
    const newAvailable = newFundTotal * (1 - fund.reserveRatio) - fund.totalDisbursedAsCredits;

    tx.set(creditRef, { ...credit, investedAmount: credit.investedAmount + amount });
    tx.set(walletRef, { ...wallet, balance: wallet.balance - amount, updatedAt: now });
    tx.set(FUND_DOC, { ...fund, totalDeposited: newFundTotal, availableForCredit: Math.max(0, newAvailable), updatedAt: now });

    const investmentRef = doc(collection(db, BOND_INVESTMENTS));
    const investment: BondInvestment = { id: investmentRef.id, creditId, investorId, farmerId: credit.userId, amount, createdAt: now };
    tx.set(investmentRef, investment);

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: investorId, type: "send", amount,
      label: "Achat de bon de financement participatif", relatedCreditId: creditId, createdAt: now,
    });
  });
}

export function subscribeToInvestorBonds(investorId: string, onChange: (investments: BondInvestment[]) => void) {
  const q = query(collection(db, BOND_INVESTMENTS), where("investorId", "==", investorId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as BondInvestment)));
}

export async function rejectCredit(creditId: string, adminUid: string, reason: string): Promise<void> {
  const creditSnap = await getDoc(doc(db, CREDITS, creditId));
  await updateDoc(doc(db, CREDITS, creditId), {
    status: "rejected", rejectionReason: reason, decidedAt: Date.now(), decidedBy: adminUid,
  });
  if (creditSnap.exists()) {
    const credit = creditSnap.data() as Credit;
    const notif = buildNotification(credit.userId, "Demande de crédit refusée", reason);
    await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
  }
}
