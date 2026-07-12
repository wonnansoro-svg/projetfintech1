import { collection, doc, getDocs, query, runTransaction, where } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_GUARANTEE_FUND, FUND_DOC } from "./fundService";
import type { Contribution, ContributionKind, GuaranteeFund, Wallet } from "../types/firestore";

const CONTRIBUTIONS = "contributions";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";

/**
 * Enregistre une cotisation réelle et met à jour, dans la même transaction
 * Firestore, le portefeuille du bénéficiaire ET le fonds de garantie
 * collectif (l'argent déposé qui sert d'assurance pour les crédits agricoles).
 */
export async function recordContribution(userId: string, amount: number, kind: ContributionKind = "susu", label?: string): Promise<void> {
  if (amount <= 0) throw new Error("Le montant de la cotisation doit être positif.");

  const walletRef = doc(db, WALLETS, userId);
  const contributionRef = doc(collection(db, CONTRIBUTIONS));
  const txRef = doc(collection(db, TRANSACTIONS));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const [walletSnap, fundSnap] = await Promise.all([tx.get(walletRef), tx.get(FUND_DOC)]);

    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    const fund = fundSnap.exists() ? (fundSnap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND;

    const newFundTotal = fund.totalDeposited + amount;
    const newAvailable = newFundTotal * (1 - fund.reserveRatio) - fund.totalDisbursedAsCredits;

    const contribution: Contribution = {
      id: contributionRef.id, userId, groupId: null, amount, kind, status: "confirmed", createdAt: now,
    };

    tx.set(contributionRef, contribution);
    tx.set(walletRef, {
      ...wallet,
      balance: wallet.balance + amount,
      totalContributed: wallet.totalContributed + amount,
      contributionsLast12m: wallet.contributionsLast12m + amount,
      updatedAt: now,
    });
    tx.set(FUND_DOC, { ...fund, totalDeposited: newFundTotal, availableForCredit: Math.max(0, newAvailable), updatedAt: now });
    tx.set(txRef, {
      id: txRef.id, userId, type: "deposit", amount,
      label: label ?? (kind === "guarantee_fund" ? "Cotisation — Fonds de garantie" : "Cotisation AgriSusu"),
      relatedContributionId: contributionRef.id, createdAt: now,
    });
  });
}

/** Index de semaine (lundi UTC) — incrémente de 1 chaque semaine, sert de clé pour la régularité. */
function weekKey(ts: number): number {
  const d = new Date(ts);
  const dayOffset = (d.getUTCDay() + 6) % 7; // 0 = lundi
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOffset);
  return Math.floor(monday / (7 * 24 * 3600 * 1000));
}

/** Nombre de semaines ISO consécutives (jusqu'à la semaine courante incluse) avec au moins une cotisation confirmée. */
export async function computeWeeklyStreak(userId: string): Promise<number> {
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "==", userId));
  const snap = await getDocs(q);
  const weeks = new Set(snap.docs.map((d) => weekKey((d.data() as Contribution).createdAt)));

  let streak = 0;
  let w = weekKey(Date.now());
  while (weeks.has(w)) { streak++; w--; }
  return streak;
}
