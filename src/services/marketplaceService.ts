import { collection, doc, onSnapshot, orderBy, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { buildNotification } from "./notificationService";
import type { Crop, MarketplaceListing, MarketplaceOrder, Wallet } from "../types/firestore";

const LISTINGS = "marketplaceListings";
const ORDERS = "marketplaceOrders";
const WALLETS = "wallets";
const TRANSACTIONS = "transactions";
const NOTIFICATIONS = "notifications";

export interface NewListingInput {
  crop: Crop;
  quantityKg: number;
  pricePerKgFcfa: number;
  description: string;
}

export async function createListing(farmerId: string, input: NewListingInput): Promise<string> {
  if (input.quantityKg <= 0 || input.pricePerKgFcfa <= 0) throw new Error("Quantité et prix doivent être positifs.");
  const now = Date.now();
  const ref = doc(collection(db, LISTINGS));
  const listing: MarketplaceListing = {
    id: ref.id, farmerId, crop: input.crop, quantityKg: input.quantityKg,
    pricePerKgFcfa: input.pricePerKgFcfa, description: input.description,
    status: "active", createdAt: now, updatedAt: now,
  };
  await setDoc(ref, listing);
  return ref.id;
}

export function subscribeToListingsByFarmer(farmerId: string, onChange: (items: MarketplaceListing[]) => void) {
  const q = query(collection(db, LISTINGS), where("farmerId", "==", farmerId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as MarketplaceListing)));
}

/** Annonces actives toutes fermes confondues — file admin pour enregistrer des commandes. */
export function subscribeToActiveListings(onChange: (items: MarketplaceListing[]) => void) {
  const q = query(collection(db, LISTINGS), where("status", "==", "active"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as MarketplaceListing)));
}

export async function cancelListing(listingId: string, farmerId: string): Promise<void> {
  const ref = doc(db, LISTINGS, listingId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Annonce introuvable.");
    const listing = snap.data() as MarketplaceListing;
    if (listing.farmerId !== farmerId) throw new Error("Cette annonce ne vous appartient pas.");
    if (listing.status !== "active") throw new Error("Cette annonce n'est plus active.");
    tx.set(ref, { ...listing, status: "cancelled", updatedAt: Date.now() });
  });
}

/** L'admin enregistre une commande pour un acheteur externe à l'app — clôt l'annonce (vente intégrale, pas de partiel en v1). */
export async function createOrder(listing: MarketplaceListing, buyerLabel: string): Promise<void> {
  if (!buyerLabel.trim()) throw new Error("Nom de l'acheteur requis.");
  const listingRef = doc(db, LISTINGS, listing.id);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists()) throw new Error("Annonce introuvable.");
    const current = listingSnap.data() as MarketplaceListing;
    if (current.status !== "active") throw new Error("Cette annonce n'est plus disponible.");

    tx.set(listingRef, { ...current, status: "sold", updatedAt: now });

    const orderRef = doc(collection(db, ORDERS));
    const order: MarketplaceOrder = {
      id: orderRef.id, listingId: current.id, farmerId: current.farmerId, buyerLabel: buyerLabel.trim(),
      quantityKg: current.quantityKg, totalAmountFcfa: Math.round(current.quantityKg * current.pricePerKgFcfa),
      status: "pending", createdAt: now, paidAt: null, paidBy: null,
    };
    tx.set(orderRef, order);

    const notif = buildNotification(current.farmerId, "Commande reçue 🛒", `Une commande de ${order.totalAmountFcfa.toLocaleString("fr-FR")} F a été enregistrée pour votre récolte.`);
    tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
  });
}

/** Valide le paiement d'une commande : crédite le solde du fermier. */
export async function markOrderPaid(orderId: string, adminId: string): Promise<void> {
  const orderRef = doc(db, ORDERS, orderId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error("Commande introuvable.");
    const order = orderSnap.data() as MarketplaceOrder;
    if (order.status !== "pending") throw new Error("Cette commande a déjà été traitée.");

    const walletRef = doc(db, WALLETS, order.farmerId);
    const walletSnap = await tx.get(walletRef);
    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: order.farmerId, balance: 0, totalContributed: 0, contributionsLast12m: 0, carbonCreditsRedeemed: 0, updatedAt: now };

    tx.set(walletRef, { ...wallet, balance: wallet.balance + order.totalAmountFcfa, updatedAt: now });
    tx.set(orderRef, { ...order, status: "paid", paidAt: now, paidBy: adminId });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId: order.farmerId, type: "payout", amount: order.totalAmountFcfa,
      label: `Marketplace — vente à ${order.buyerLabel}`, createdAt: now,
    });

    const notif = buildNotification(order.farmerId, "Vente payée 💰", `${order.totalAmountFcfa.toLocaleString("fr-FR")} F ont été versés sur votre solde.`);
    tx.set(doc(db, NOTIFICATIONS, notif.id), notif);
  });
}

/** Annule une commande pas encore payée — ré-ouvre l'annonce, aucun mouvement d'argent. */
export async function cancelOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, ORDERS, orderId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error("Commande introuvable.");
    const order = orderSnap.data() as MarketplaceOrder;
    if (order.status !== "pending") throw new Error("Cette commande a déjà été traitée.");

    const listingRef = doc(db, LISTINGS, order.listingId);
    const listingSnap = await tx.get(listingRef);
    if (listingSnap.exists()) {
      tx.set(listingRef, { ...(listingSnap.data() as MarketplaceListing), status: "active", updatedAt: now });
    }
    tx.set(orderRef, { ...order, status: "cancelled" });
  });
}

export function subscribeToOrdersByFarmer(farmerId: string, onChange: (items: MarketplaceOrder[]) => void) {
  const q = query(collection(db, ORDERS), where("farmerId", "==", farmerId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as MarketplaceOrder)));
}

export function subscribeToPendingOrders(onChange: (items: MarketplaceOrder[]) => void) {
  const q = query(collection(db, ORDERS), where("status", "==", "pending"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as MarketplaceOrder)));
}
