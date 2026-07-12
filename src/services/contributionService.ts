import { collection, doc, runTransaction } from "firebase/firestore";
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
export async function recordContribution(userId: string, amount: number, kind: ContributionKind = "susu"): Promise<void> {
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
      label: kind === "guarantee_fund" ? "Cotisation — Fonds de garantie" : "Cotisation AgriSusu",
      relatedContributionId: contributionRef.id, createdAt: now,
    });
  });
}
