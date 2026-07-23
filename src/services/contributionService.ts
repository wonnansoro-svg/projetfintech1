import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_GUARANTEE_FUND, FUND_DOC } from "./fundService";
import { buildNotification } from "./notificationService";
import type { Contribution, ContributionKind, GuaranteeFund, Wallet } from "../types/firestore";

const CONTRIBUTIONS = "contributions";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const NOTIFICATIONS = "notifications";
/** Pseudo-destinataire pour les notifications diffusées à tous les admins (aucun uid individuel requis). */
const ADMIN_BROADCAST = "admins";

/** Frais de gestion fixe par cotisation Bokanmin, quel que soit le montant — incite à anticiper/regrouper les cotisations plutôt que grignoter par petits montants. */
const MANAGEMENT_FEE_FLAT = 800;

function splitAmount(amount: number, kind: ContributionKind): { insurancePart: number; managementFeePart: number } {
  const managementFeePart = kind === "guarantee_fund" ? Math.min(MANAGEMENT_FEE_FLAT, amount) : 0;
  return { insurancePart: amount - managementFeePart, managementFeePart };
}

/**
 * Enregistre une cotisation déjà validée sur place (collecte en espèces/Wave par
 * un admin ou un superviseur qui témoigne du paiement) et met à jour, dans la
 * même transaction Firestore, le portefeuille du bénéficiaire ET le fonds de
 * garantie collectif. `confirmedBy` = uid de la personne qui collecte (admin ou
 * superviseur), distinct du bénéficiaire `userId`.
 */
export async function recordContribution(userId: string, amount: number, kind: ContributionKind = "susu", label?: string, confirmedBy?: string): Promise<void> {
  if (amount <= 0) throw new Error("Le montant de la cotisation doit être positif.");
  const { insurancePart, managementFeePart } = splitAmount(amount, kind);

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
      id: contributionRef.id, userId, groupId: null, amount, insurancePart, managementFeePart, kind,
      status: "confirmed", confirmedAt: now, confirmedBy: confirmedBy ?? userId, createdAt: now,
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

/**
 * Le bénéficiaire envoie sa cotisation via Wave (Bokanmin ou montant libre) :
 * aucun mouvement d'argent immédiat — juste une demande "pending". Les admins
 * sont notifiés (canal diffusé, sans connaître leur uid) ; c'est
 * `confirmContributionRequest` qui crédite réellement le compte, une fois
 * l'admin passé par là (délai indicatif de 24h, non imposé techniquement).
 */
export async function submitContributionRequest(userId: string, amount: number, kind: ContributionKind = "guarantee_fund"): Promise<void> {
  if (amount <= 0) throw new Error("Le montant de la cotisation doit être positif.");
  const { insurancePart, managementFeePart } = splitAmount(amount, kind);
  const now = Date.now();

  const contributionRef = doc(collection(db, CONTRIBUTIONS));
  const contribution: Contribution = {
    id: contributionRef.id, userId, groupId: null, amount, insurancePart, managementFeePart, kind,
    status: "pending", confirmedAt: null, confirmedBy: null, createdAt: now,
  };
  await setDoc(contributionRef, contribution);

  const notif = buildNotification(ADMIN_BROADCAST, "Nouvelle cotisation à valider", `${amount.toLocaleString("fr-FR")} F envoyés via Wave — en attente de confirmation (sous 24h).`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

/** L'admin confirme une cotisation en attente : c'est CE moment qui crédite réellement le solde du bénéficiaire. */
export async function confirmContributionRequest(contributionId: string, adminId: string): Promise<void> {
  const contributionRef = doc(db, CONTRIBUTIONS, contributionId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const contribSnap = await tx.get(contributionRef);
    if (!contribSnap.exists()) throw new Error("Cotisation introuvable.");
    const contribution = contribSnap.data() as Contribution;
    if (contribution.status !== "pending") throw new Error("Cette cotisation a déjà été traitée.");

    const walletRef = doc(db, WALLETS, contribution.userId);
    const [walletSnap, fundSnap] = await Promise.all([tx.get(walletRef), tx.get(FUND_DOC)]);
    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: contribution.userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };
    const fund = fundSnap.exists() ? (fundSnap.data() as GuaranteeFund) : DEFAULT_GUARANTEE_FUND;

    const newFundTotal = fund.totalDeposited + contribution.insurancePart;
    const newAvailable = newFundTotal * (1 - fund.reserveRatio) - fund.totalDisbursedAsCredits;

    tx.set(contributionRef, { ...contribution, status: "confirmed", confirmedAt: now, confirmedBy: adminId });
    tx.set(walletRef, {
      ...wallet,
      balance: wallet.balance + contribution.amount,
      totalContributed: wallet.totalContributed + contribution.amount,
      contributionsLast12m: wallet.contributionsLast12m + contribution.amount,
      updatedAt: now,
    });
    tx.set(FUND_DOC, { ...fund, totalDeposited: newFundTotal, availableForCredit: Math.max(0, newAvailable), updatedAt: now });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: contribution.userId, type: "deposit", amount: contribution.amount,
      label: contribution.kind === "guarantee_fund" ? "Cotisation confirmée — Fonds de garantie" : "Cotisation confirmée",
      relatedContributionId: contribution.id, createdAt: now,
    });

    const notif = buildNotification(contribution.userId, "Cotisation confirmée ✅", `Votre cotisation de ${contribution.amount.toLocaleString("fr-FR")} F a été validée et créditée sur votre solde.`);
    tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
  });
}

/** L'admin rejette une cotisation en attente (ex. paiement Wave introuvable) — aucun mouvement d'argent. */
export async function rejectContributionRequest(contributionId: string, adminId: string, reason: string): Promise<void> {
  const contributionRef = doc(db, CONTRIBUTIONS, contributionId);
  const snap = await getDoc(contributionRef);
  if (!snap.exists()) throw new Error("Cotisation introuvable.");
  const contribution = snap.data() as Contribution;
  if (contribution.status !== "pending") throw new Error("Cette cotisation a déjà été traitée.");

  await setDoc(contributionRef, { ...contribution, status: "rejected", confirmedAt: Date.now(), confirmedBy: adminId });

  const notif = buildNotification(contribution.userId, "Cotisation non confirmée", reason);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

/** File de revue admin : cotisations envoyées par les bénéficiaires, pas encore traitées. */
export function subscribeToPendingContributions(onChange: (items: Contribution[]) => void) {
  const q = query(collection(db, CONTRIBUTIONS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Contribution)));
}

/** Historique (toutes statuts) d'un bénéficiaire — lui permet de voir ses envois en attente. */
export function subscribeToUserContributions(userId: string, onChange: (items: Contribution[]) => void) {
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Contribution)));
}

/** Totaux assurance / frais de gestion sur les cotisations Bokanmin CONFIRMÉES — réservé à l'espace admin. */
export async function getContributionSplitTotals(): Promise<{ insurance: number; managementFee: number }> {
  const q = query(collection(db, CONTRIBUTIONS), where("kind", "==", "guarantee_fund"));
  const snap = await getDocs(q);
  return snap.docs.reduce(
    (acc, d) => {
      const c = d.data() as Contribution;
      if (c.status !== "confirmed") return acc;
      acc.insurance += c.insurancePart;
      acc.managementFee += c.managementFeePart;
      return acc;
    },
    { insurance: 0, managementFee: 0 },
  );
}

/** Somme des cotisations CONFIRMÉES (montant total, pas la répartition) des utilisateurs donnés — max 30 (limite Firestore `in`). */
export async function getContributionsTotalForUsers(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "in", userIds.slice(0, 30)));
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => {
    const c = d.data() as Contribution;
    return c.status === "confirmed" ? sum + c.amount : sum;
  }, 0);
}

/** Index de semaine (lundi UTC) — incrémente de 1 chaque semaine, sert de clé pour la régularité. */
function weekKey(ts: number): number {
  const d = new Date(ts);
  const dayOffset = (d.getUTCDay() + 6) % 7; // 0 = lundi
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOffset);
  return Math.floor(monday / (7 * 24 * 3600 * 1000));
}

/** Nombre de semaines ISO consécutives (jusqu'à la semaine courante incluse) avec au moins une cotisation CONFIRMÉE. */
export async function computeWeeklyStreak(userId: string): Promise<number> {
  const q = query(collection(db, CONTRIBUTIONS), where("userId", "==", userId));
  const snap = await getDocs(q);
  const weeks = new Set(
    snap.docs
      .map((d) => d.data() as Contribution)
      .filter((c) => c.status === "confirmed")
      .map((c) => weekKey(c.createdAt)),
  );

  let streak = 0;
  let w = weekKey(Date.now());
  while (weeks.has(w)) { streak++; w--; }
  return streak;
}
