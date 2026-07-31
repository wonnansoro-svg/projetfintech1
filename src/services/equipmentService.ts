import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { createBondForFarmer, approveBondByBeneficiary } from "./creditService";
import { buildNotification } from "./notificationService";
import type { EquipmentCatalogItem, EquipmentRequest } from "../types/firestore";

const CATALOG = "equipmentCatalog";
const REQUESTS = "equipmentRequests";
const NOTIFICATIONS = "notifications";
const ADMIN_BROADCAST = "admins";

export interface NewEquipmentItemInput {
  name: string;
  category: string;
  estimatedPriceFcfa: number;
  description: string;
}

export function subscribeToEquipmentCatalog(onChange: (items: EquipmentCatalogItem[]) => void) {
  const q = query(collection(db, CATALOG));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as EquipmentCatalogItem)));
}

export async function createEquipmentItem(input: NewEquipmentItemInput): Promise<void> {
  const ref = doc(collection(db, CATALOG));
  const item: EquipmentCatalogItem = { id: ref.id, ...input, createdAt: Date.now() };
  await setDoc(ref, item);
}

export async function updateEquipmentItem(itemId: string, patch: Partial<NewEquipmentItemInput>): Promise<void> {
  await updateDoc(doc(db, CATALOG, itemId), patch);
}

export async function deleteEquipmentItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, CATALOG, itemId));
}

export interface NewEquipmentRequestInput {
  equipmentItemId: string | null;
  equipmentLabel: string;
  amount: number;
  termMonths: number;
  reason: string;
}

/** Le fermier soumet une demande de financement matériel — aucun mouvement d'argent tant que l'admin n'a pas approuvé. */
export async function submitEquipmentRequest(farmerId: string, input: NewEquipmentRequestInput): Promise<void> {
  if (input.amount <= 0) throw new Error("Le montant doit être positif.");
  if (!input.equipmentLabel.trim()) throw new Error("Nom de l'équipement requis.");
  const now = Date.now();
  const ref = doc(collection(db, REQUESTS));
  const request: EquipmentRequest = {
    id: ref.id, farmerId, equipmentItemId: input.equipmentItemId, equipmentLabel: input.equipmentLabel.trim(),
    amount: input.amount, termMonths: input.termMonths, reason: input.reason, status: "pending",
    linkedCreditId: null, rejectionReason: null, createdAt: now, decidedAt: null, decidedBy: null,
  };
  await setDoc(ref, request);

  const notif = buildNotification(ADMIN_BROADCAST, "Demande de financement matériel", `Une demande pour "${request.equipmentLabel}" (${input.amount.toLocaleString("fr-FR")} F) attend votre décision.`);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}

export function subscribeToUserEquipmentRequests(farmerId: string, onChange: (items: EquipmentRequest[]) => void) {
  const q = query(collection(db, REQUESTS), where("farmerId", "==", farmerId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as EquipmentRequest)));
}

export function subscribeToPendingEquipmentRequests(onChange: (items: EquipmentRequest[]) => void) {
  const q = query(collection(db, REQUESTS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as EquipmentRequest)));
}

/**
 * Approuve une demande : crée le bon de financement correspondant via le
 * moteur existant (`createBondForFarmer`), puis l'auto-approuve côté
 * bénéficiaire — celui-ci a déjà consenti en soumettant sa demande, pas de
 * double confirmation. Le bon suit ensuite exactement le même circuit
 * qu'un bon "cash" (marketplace investisseurs → validation admin).
 */
export async function approveEquipmentRequest(requestId: string, adminId: string): Promise<void> {
  const ref = doc(db, REQUESTS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Demande introuvable.");
  const request = snap.data() as EquipmentRequest;
  if (request.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

  const creditId = await createBondForFarmer(adminId, request.farmerId, request.amount, {
    purpose: "equipment", equipmentLabel: request.equipmentLabel, termMonths: request.termMonths,
  });
  await approveBondByBeneficiary(creditId, request.farmerId);

  await setDoc(ref, { ...request, status: "approved", linkedCreditId: creditId, decidedAt: Date.now(), decidedBy: adminId });
}

export async function rejectEquipmentRequest(requestId: string, adminId: string, reason: string): Promise<void> {
  const ref = doc(db, REQUESTS, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Demande introuvable.");
  const request = snap.data() as EquipmentRequest;
  if (request.status !== "pending") throw new Error("Cette demande a déjà été traitée.");

  await setDoc(ref, { ...request, status: "rejected", rejectionReason: reason, decidedAt: Date.now(), decidedBy: adminId });

  const notif = buildNotification(request.farmerId, "Demande de financement matériel refusée", reason);
  await setDoc(doc(db, NOTIFICATIONS, notif.id), notif);
}
