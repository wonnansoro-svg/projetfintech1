import { collection, doc, getDocs, query, runTransaction, where } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_GUARANTEE_FUND, FUND_DOC } from "./fundService";
import type { Contribution, ContributionKind, GuaranteeFund, Wallet } from "../types/firestore";

const CONTRIBUTIONS = "contributions";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";

/** Frais de gestion fixe par cotisation Bokanmin, quel que soit le montant — incite à anticiper/regrouper les cotisations plutôt que grignoter par petits montants. */
const MANAGEMENT_FEE_FLAT = 800;

/**
 * Enregistre une cotisation réelle et met à jour, dans la même transaction
 * Firestore, le portefeuille du bénéficiaire ET le fonds de garantie
 * collectif (l'argent déposé qui sert d'assurance pour les crédits agricoles).
 *
 * Pour les cotisations Bokanmin (`kind === "guarantee_fund"`), 800 F fixes
 * sont prélevés comme frais de gestion (revenu de fonctionnement de la
 * coopérative, ne rejoint jamais le fonds prêtable) ; le reste alimente le
 * fonds de garantie. Le bénéficiaire ne voit que son montant total cotisé ;
 * seul l'admin voit la répartition (`getContributionSplitTotals`).
 */
export async function recordContribution(userId: string, amount: number, kind: ContributionKind = "susu", label?: string): Promise<void> {
  if (amount <= 0) throw new Error("Le montant de la cotisation doit être positif.");

  const managementFeePart = kind === "guarantee_fund" ? Math.min(MANAGEMENT_FEE_FLAT, amount) : 0;
  const insurancePart = amount - managementFeePart;

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

    const newFundTotal = fund.totalDeposited + insurancePart;
    const newAvailable = newFundTotal * (1 - fund.reserveRatio) - fund.totalDisbursedAsCredits;

    const contribution: Contribution = {
      id: contributionRef.id, userId, groupId: null, amount, insurancePart, managementFeePart, kind, status: "confirmed", createdAt: now,
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
      label: label ?? (kind === "guarantee_fund" ? "Cotisation — Fonds de garantie" : "Cotisation Bokanmin"),
      relatedContributionId: contributionRef.id, createdAt: now,
    });
  });
}

/** Totaux assurance / frais de gestion sur toutes les cotisations Bokanmin — réservé à l'espace admin. */
export async function getContributionSplitTotals(): Promise<{ insurance: number; managementFee: number }> {
  const q = query(collection(db, CONTRIBUTIONS), where("kind", "==", "guarantee_fund"));
  const snap = await getDocs(q);
  return snap.docs.reduce(
    (acc, d) => {
      const c = d.data() as Contribution;
      acc.insurance += c.insurancePart;
      acc.managementFee += c.managementFeePart;
      return acc;
    },
    { insurance: 0, managementFee: 0 },
  );
}

/** Somme des cotisations (montant total, pas la répartition) des utilisateurs donnés — max 30 (limite Firestore `in`). */
export async function getContributionsTotalForUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "in", userIds.slice(0, 30)));
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data() as Contribution).amount, 0);
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
