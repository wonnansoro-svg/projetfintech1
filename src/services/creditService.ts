import {
  collection, doc, getCountFromServer, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc, where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getProfile } from "./profileService";
import { DEFAULT_GUARANTEE_FUND, FUND_DOC, getGuaranteeFund, getCreditSettings } from "./fundService";
import { computeCreditCeiling, computeFinancingScore, buildRepaymentSchedule } from "../lib/credit";
import { getUserLossValueFcfa } from "./lossService";
import { buildNotification } from "./notificationService";
import type { BondInvestment, Credit, GuaranteeFund, Wallet } from "../types/firestore";

const CREDITS = "credits";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const NOTIFICATIONS = "notifications";
const BOND_INVESTMENTS = "bondInvestments";

/**
 * L'admin génère un bon pour un bénéficiaire précis (le fermier ne demande
 * plus lui-même) : le plafond calculé (fonds de garantie + cotisations +
 * score de financement) sert d'indication, pas de blocage — l'admin fixe le
 * montant librement. Le bon attend l'approbation du bénéficiaire avant
 * d'être proposé aux investisseurs (`approveBondByBeneficiary`).
 */
export async function createBondForFarmer(adminId: string, farmerId: string, amount: number): Promise<string> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const [walletSnap, profile, fund, settings, lossValue] = await Promise.all([
    getDoc(doc(db, WALLETS, farmerId)), getProfile(farmerId), getGuaranteeFund(), getCreditSettings(), getUserLossValueFcfa(farmerId),
  ]);
  if (!profile) throw new Error("Bénéficiaire introuvable.");
  const wallet = walletSnap.exists() ? (walletSnap.data() as Wallet) : null;
  const financingScore = computeFinancingScore(lossValue);
  const { ceiling, fundShareCap, regulatoryCap } = computeCreditCeiling({
    personalContribution12m: wallet?.contributionsLast12m ?? 0, fund, settings, kycStatus: profile.kycStatus, financingScore,
  });

  const now = Date.now();
  const creditRef = doc(collection(db, CREDITS));
  const credit: Credit = {
    id: creditRef.id, userId: farmerId, createdBy: adminId,
    requestedAmount: amount, approvedAmount: amount, status: "pending",
    investedAmount: 0, creditedAmount: 0,
    interestRatePerMonth: settings.monthlyRate, termMonths: settings.termMonths, schedule: [],
    calculationSnapshot: {
      personalContribution12m: wallet?.contributionsLast12m ?? 0,
      fundAvailableAtDecision: fund.availableForCredit,
      fundShareCap, regulatoryCap, kycLevelUsed: profile.kycStatus, ceiling, financingScore,
    },
    rejectionReason: null, requestedAt: now, decidedAt: null, decidedBy: null,
  };
  await setDoc(creditRef, credit);

  const notif = buildNotification(farmerId, "Nouveau bon de financement proposé", `La coopérative vous propose un bon de ${amount.toLocaleString("fr-FR")} F — à approuver.`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);

  return creditRef.id;
}

/** Le bénéficiaire accepte les termes du bon — aucun mouvement d'argent, le rend visible aux investisseurs. */
export async function approveBondByBeneficiary(creditId: string, farmerId: string): Promise<void> {
  const creditRef = doc(db, CREDITS, creditId);
  const snap = await getDoc(creditRef);
  if (!snap.exists()) throw new Error("Bon introuvable.");
  const credit = snap.data() as Credit;
  if (credit.userId !== farmerId) throw new Error("Ce bon ne vous appartient pas.");
  if (credit.status !== "pending") throw new Error("Ce bon a déjà été traité.");

  const schedule = buildRepaymentSchedule(credit.approvedAmount ?? 0, credit.interestRatePerMonth, credit.termMonths);
  await setDoc(creditRef, { ...credit, status: "approved", schedule, decidedAt: Date.now(), decidedBy: farmerId });
}

export async function rejectBondByBeneficiary(creditId: string, farmerId: string, reason: string): Promise<void> {
  const creditRef = doc(db, CREDITS, creditId);
  const snap = await getDoc(creditRef);
  if (!snap.exists()) throw new Error("Bon introuvable.");
  const credit = snap.data() as Credit;
  if (credit.userId !== farmerId) throw new Error("Ce bon ne vous appartient pas.");
  if (credit.status !== "pending") throw new Error("Ce bon a déjà été traité.");

  await setDoc(creditRef, { ...credit, status: "rejected", rejectionReason: reason, decidedAt: Date.now(), decidedBy: farmerId });
}

export async function getCredit(creditId: string): Promise<Credit | null> {
  const snap = await getDoc(doc(db, CREDITS, creditId));
  return snap.exists() ? (snap.data() as Credit) : null;
}

export function subscribeToUserCredits(userId: string, onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("userId", "==", userId), orderBy("requestedAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Credit)));
}

/** Bons générés par l'admin encore en attente de décision du bénéficiaire — lecture seule côté admin. */
export function subscribeToPendingCredits(onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Credit)));
}

export async function countActiveCredits(): Promise<number> {
  const q = query(collection(db, CREDITS), where("status", "==", "active"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/** Tous les bons de financement — réservé à l'espace admin (rapports). */
export async function listAllCredits(): Promise<Credit[]> {
  const snap = await getDocs(collection(db, CREDITS));
  return snap.docs.map((d) => d.data() as Credit);
}

/** Bons disponibles à l'investissement : approuvés par le bénéficiaire, pas encore intégralement financés. */
export function subscribeToInvestableBonds(onChange: (credits: Credit[]) => void) {
  const q = query(collection(db, CREDITS), where("status", "==", "approved"));
  return onSnapshot(q, (snap) => {
    const credits = snap.docs.map((d) => d.data() as Credit);
    onChange(credits.filter((c) => c.investedAmount < (c.approvedAmount ?? 0)));
  });
}

/**
 * L'investisseur paie sa part d'un bon : son solde est débité immédiatement,
 * mais l'argent reste "en attente" — ni le fonds de garantie ni le solde du
 * bénéficiaire ne bougent tant que l'admin n'a pas validé ce paiement
 * (`reviewBondInvestment`).
 */
export async function investInBond(investorId: string, creditId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const creditRef = doc(db, CREDITS, creditId);
  const walletRef = doc(db, WALLETS, investorId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const [creditSnap, walletSnap] = await Promise.all([tx.get(creditRef), tx.get(walletRef)]);
    if (!creditSnap.exists()) throw new Error("Bon introuvable.");
    const credit = creditSnap.data() as Credit;
    if (credit.status !== "approved") throw new Error("Ce bon n'est pas ouvert à l'investissement.");
    const remaining = (credit.approvedAmount ?? 0) - credit.investedAmount;
    if (amount > remaining) throw new Error(`Montant supérieur au reste à financer (${remaining.toLocaleString("fr-FR")} F).`);

    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: investorId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    if (wallet.balance < amount) throw new Error("Solde insuffisant.");

    tx.set(creditRef, { ...credit, investedAmount: credit.investedAmount + amount });
    tx.set(walletRef, { ...wallet, balance: wallet.balance - amount, updatedAt: now });

    const investmentRef = doc(collection(db, BOND_INVESTMENTS));
    const investment: BondInvestment = { id: investmentRef.id, creditId, investorId, farmerId: credit.userId, amount, status: "pending", reviewedBy: null, createdAt: now };
    tx.set(investmentRef, investment);

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: investorId, type: "send", amount,
      label: "Paiement bon de financement — en attente de validation", relatedCreditId: creditId, createdAt: now,
    });
  });
}

export function subscribeToInvestorBonds(investorId: string, onChange: (investments: BondInvestment[]) => void) {
  const q = query(collection(db, BOND_INVESTMENTS), where("investorId", "==", investorId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as BondInvestment)));
}

/** File de revue admin : paiements investisseurs pas encore validés. */
export function subscribeToPendingBondInvestments(onChange: (investments: BondInvestment[]) => void) {
  const q = query(collection(db, BOND_INVESTMENTS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as BondInvestment)));
}

/**
 * L'admin valide (ou rejette) le paiement d'un investisseur.
 * - Approuvé : le montant est crédité sur le solde du bénéficiaire (retirable) ; le bon passe "active"
 *   dès que la part validée cumulée atteint le montant du bon.
 * - Rejeté : l'investisseur est remboursé, la capacité engagée du bon est libérée.
 */
export async function reviewBondInvestment(investmentId: string, adminId: string, action: "approve" | "reject"): Promise<void> {
  const investmentRef = doc(db, BOND_INVESTMENTS, investmentId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const investmentSnap = await tx.get(investmentRef);
    if (!investmentSnap.exists()) throw new Error("Investissement introuvable.");
    const investment = investmentSnap.data() as BondInvestment;
    if (investment.status !== "pending") throw new Error("Ce paiement a déjà été traité.");

    const creditRef = doc(db, CREDITS, investment.creditId);
    const creditSnap = await tx.get(creditRef);
    if (!creditSnap.exists()) throw new Error("Bon introuvable.");
    const credit = creditSnap.data() as Credit;

    if (action === "approve") {
      const walletRef = doc(db, WALLETS, investment.farmerId);
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.exists()
        ? (walletSnap.data() as Wallet)
        : { uid: investment.farmerId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };

      const newCreditedAmount = credit.creditedAmount + investment.amount;
      tx.set(walletRef, { ...wallet, balance: wallet.balance + investment.amount, updatedAt: now });
      tx.set(creditRef, {
        ...credit, creditedAmount: newCreditedAmount,
        status: newCreditedAmount >= (credit.approvedAmount ?? 0) ? "active" : credit.status,
      });
      tx.set(investmentRef, { ...investment, status: "approved", reviewedBy: adminId });

      const txRef = doc(collection(db, TRANSACTIONS));
      tx.set(txRef, {
        id: txRef.id, userId: investment.farmerId, type: "credit_disbursement", amount: investment.amount,
        label: "Bon de financement — versé (investisseur)", relatedCreditId: credit.id, createdAt: now,
      });
      const notif = buildNotification(investment.farmerId, "Bon de financement crédité 🎉", `${investment.amount.toLocaleString("fr-FR")} F ont été versés sur votre solde.`);
      tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
    } else {
      const walletRef = doc(db, WALLETS, investment.investorId);
      const walletSnap = await tx.get(walletRef);
      const wallet = walletSnap.exists()
        ? (walletSnap.data() as Wallet)
        : { uid: investment.investorId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };

      tx.set(walletRef, { ...wallet, balance: wallet.balance + investment.amount, updatedAt: now });
      tx.set(creditRef, { ...credit, investedAmount: Math.max(0, credit.investedAmount - investment.amount) });
      tx.set(investmentRef, { ...investment, status: "rejected", reviewedBy: adminId });

      const txRef = doc(collection(db, TRANSACTIONS));
      tx.set(txRef, {
        id: txRef.id, userId: investment.investorId, type: "receive", amount: investment.amount,
        label: "Remboursement — paiement de bon refusé", relatedCreditId: credit.id, createdAt: now,
      });
      const notif = buildNotification(investment.investorId, "Paiement de bon refusé", `Votre paiement de ${investment.amount.toLocaleString("fr-FR")} F a été refusé et remboursé sur votre solde.`);
      tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
    }
  });
}
