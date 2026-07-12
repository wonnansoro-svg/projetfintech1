import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction, TxType, Wallet } from "../types/firestore";

const TRANSACTIONS = "transactions";
const WALLETS = "wallets";

const CREDIT_TYPES = new Set<TxType>(["deposit", "receive", "payout", "credit_disbursement"]);

/** Enregistre un mouvement d'argent réel (paiement, indemnité...) et met à jour le solde du portefeuille. */
export async function recordTransaction(userId: string, input: { type: TxType; amount: number; label: string }): Promise<void> {
  const walletRef = doc(db, WALLETS, userId);
  const txRef = doc(collection(db, TRANSACTIONS));
  const now = Date.now();
  const signedDelta = CREDIT_TYPES.has(input.type) ? input.amount : -input.amount;

  await runTransaction(db, async (tx) => {
    const walletSnap = await tx.get(walletRef);
    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now };

    tx.set(walletRef, { ...wallet, balance: Math.max(0, wallet.balance + signedDelta), updatedAt: now });
    tx.set(txRef, { id: txRef.id, userId, type: input.type, amount: input.amount, label: input.label, createdAt: now });
  });
}

export function subscribeToTransactionsByUser(userId: string, onChange: (txs: Transaction[]) => void) {
  const q = query(collection(db, TRANSACTIONS), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data() as Transaction)));
}

export async function listRecentTransactions(max = 50): Promise<Transaction[]> {
  const q = query(collection(db, TRANSACTIONS), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Transaction);
}
