import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { buildNotification } from "./notificationService";
import type { Donation, DonationChannel } from "../types/firestore";

const DONATIONS = "donations";
const NOTIFICATIONS = "notifications";
const ADMIN_BROADCAST = "admins";

/** Montant à partir duquel un justificatif de provenance des fonds est exigé (voir le document de référence). */
export const DONATION_PROOF_THRESHOLD_FCFA = 2_000_000;

/**
 * Don libre d'un Membre d'Honneur — sans retour financier, ne crédite jamais le solde du donateur.
 * Via la plateforme : en attente de validation admin (comme les cotisations Bokanmin). Via
 * virement/chèque, le paiement a déjà eu lieu hors plateforme : seul l'admin peut l'enregistrer,
 * directement confirmé.
 */
export async function submitDonation(donorId: string, amount: number, channel: DonationChannel, note: string): Promise<void> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const now = Date.now();
  const ref = doc(collection(db, DONATIONS));
  const donation: Donation = {
    id: ref.id, donorId, amount, channel, note,
    status: "pending", confirmedAt: null, confirmedBy: null, createdAt: now,
  };
  await setDoc(ref, donation);

  const notif = buildNotification(ADMIN_BROADCAST, "Nouveau don — Membre d'Honneur", `${amount.toLocaleString("fr-FR")} F via ${channel} — en attente de confirmation.`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

/** L'admin enregistre directement un don déjà reçu hors plateforme (virement/chèque) — confirmé d'emblée. */
export async function recordDonation(donorId: string, amount: number, channel: "virement" | "cheque", note: string, adminId: string): Promise<void> {
  if (amount <= 0) throw new Error("Le montant doit être positif.");
  const now = Date.now();
  const ref = doc(collection(db, DONATIONS));
  const donation: Donation = {
    id: ref.id, donorId, amount, channel, note,
    status: "confirmed", confirmedAt: now, confirmedBy: adminId, createdAt: now,
  };
  await setDoc(ref, donation);
}

export async function confirmDonation(donationId: string, adminId: string): Promise<void> {
  await setDoc(doc(db, DONATIONS, donationId), { confirmedAt: Date.now(), confirmedBy: adminId, status: "confirmed" }, { merge: true });
}

export function subscribeToUserDonations(donorId: string, onChange: (items: Donation[]) => void) {
  const q = query(collection(db, DONATIONS), where("donorId", "==", donorId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Donation)));
}

export function subscribeToPendingDonations(onChange: (items: Donation[]) => void) {
  const q = query(collection(db, DONATIONS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Donation)));
}

/** Total des dons confirmés — reporting admin. */
export async function getDonationsTotalConfirmed(): Promise<number> {
  const q = query(collection(db, DONATIONS), where("status", "==", "confirmed"));
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + (d.data() as Donation).amount, 0);
}
