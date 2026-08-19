import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { updateProfile } from "./profileService";
import { buildNotification } from "./notificationService";
import type { InvestorProfileFlags, InvestorProfileType, InvestorRequest, Wallet } from "../types/firestore";

const REQUESTS = "investorRequests";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const NOTIFICATIONS = "notifications";
const ADMIN_BROADCAST = "admins";
const PROFILE_FLAGS_DOC = doc(db, "settings", "investorProfiles");

/** Membre d'Honneur seul actif tant que l'admin n'a pas ouvert GIE/Institutionnel (validation juridique en cours). */
export const DEFAULT_INVESTOR_PROFILE_FLAGS: InvestorProfileFlags = { honor: true, gie: false, institutional: false, updatedAt: 0 };

export async function getInvestorProfileFlags(): Promise<InvestorProfileFlags> {
  const snap = await getDoc(PROFILE_FLAGS_DOC);
  return snap.exists() ? (snap.data() as InvestorProfileFlags) : DEFAULT_INVESTOR_PROFILE_FLAGS;
}

export function subscribeToInvestorProfileFlags(onChange: (flags: InvestorProfileFlags) => void) {
  return onSnapshot(PROFILE_FLAGS_DOC, (snap) => {
    onChange(snap.exists() ? (snap.data() as InvestorProfileFlags) : DEFAULT_INVESTOR_PROFILE_FLAGS);
  });
}

export async function updateInvestorProfileFlags(patch: Omit<InvestorProfileFlags, "updatedAt">): Promise<void> {
  await setDoc(PROFILE_FLAGS_DOC, { ...patch, updatedAt: Date.now() });
}

export interface NewInvestorRequestInput {
  profileType: InvestorProfileType;
  phone: string;
  email: string;
  gieShareAmount?: number;
  institutionName?: string;
  institutionRepresentative?: string;
  fundAmount?: number;
  interestRatePct?: number;
  termMonths?: number;
  rules?: string;
}

const PROFILE_LABEL: Record<InvestorProfileType, string> = {
  honor: "Membre d'Honneur", gie: "Réseau CoopAvec GIE", institutional: "Partenaire Financier Institutionnel",
};

export async function submitInvestorRequest(userId: string, input: NewInvestorRequestInput): Promise<void> {
  const now = Date.now();
  const ref = doc(collection(db, REQUESTS));
  const request: InvestorRequest = {
    id: ref.id, userId, ...input,
    status: "pending", rejectionReason: null, createdAt: now, decidedAt: null, decidedBy: null,
  };
  await setDoc(ref, request);

  const notif = buildNotification(ADMIN_BROADCAST, "Nouvelle demande investisseur", `${PROFILE_LABEL[input.profileType]} — en attente de validation.`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

export function subscribeToUserInvestorRequests(userId: string, onChange: (items: InvestorRequest[]) => void) {
  const q = query(collection(db, REQUESTS), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as InvestorRequest)));
}

export function subscribeToPendingInvestorRequests(onChange: (items: InvestorRequest[]) => void) {
  const q = query(collection(db, REQUESTS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as InvestorRequest)));
}

/** Fait basculer le profil du fermier vers le statut Investisseur demandé — aucun mouvement d'argent. */
export async function approveInvestorRequest(requestId: string, adminId: string): Promise<void> {
  const ref = doc(db, REQUESTS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Demande introuvable.");
  const request = snap.data() as InvestorRequest;
  if (request.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

  await updateProfile(request.userId, {
    role: "investor",
    investorProfile: request.profileType,
    phone: request.phone,
    email: request.email,
    gieShareAmount: request.profileType === "gie" ? (request.gieShareAmount ?? 0) : null,
    institutionalConditions: request.profileType === "institutional"
      ? {
          fundAmount: request.fundAmount ?? 0,
          interestRatePct: request.interestRatePct ?? 0,
          termMonths: request.termMonths ?? 0,
          rules: request.rules ?? "",
        }
      : null,
  });

  await setDoc(ref, { ...request, status: "approved", decidedAt: Date.now(), decidedBy: adminId });

  const notif = buildNotification(request.userId, "Statut investisseur activé 🎉", `Vous êtes maintenant ${PROFILE_LABEL[request.profileType]}.`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

export async function rejectInvestorRequest(requestId: string, adminId: string, reason: string): Promise<void> {
  const ref = doc(db, REQUESTS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Demande introuvable.");
  const request = snap.data() as InvestorRequest;
  if (request.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

  await setDoc(ref, { ...request, status: "rejected", rejectionReason: reason, decidedAt: Date.now(), decidedBy: adminId });

  const notif = buildNotification(request.userId, "Demande investisseur non retenue", reason);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

/**
 * L'admin crédite le portefeuille d'un partenaire institutionnel après réception réelle d'un
 * virement bancaire (canal exclusif pour ce profil, hors plateforme) — même schéma que les
 * autres crédits de portefeuille de l'app (voir creditService.reviewBondInvestment).
 */
export async function creditInstitutionalFund(investorId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const walletRef = doc(db, WALLETS, investorId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const walletSnap = await tx.get(walletRef);
    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: investorId, balance: 0, totalContributed: 0, contributionsLast12m: 0, carbonCreditsRedeemed: 0, updatedAt: now };

    tx.set(walletRef, { ...wallet, balance: wallet.balance + amount, updatedAt: now });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, { id: txRef.id, userId: investorId, type: "deposit", amount, label: "Fonds vert reçu — virement bancaire", createdAt: now });
  });
}
