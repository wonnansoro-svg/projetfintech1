import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Wallet } from "../types/firestore";

const WALLETS = "wallets";

export async function getWallet(uid: string): Promise<Wallet | null> {
  const snap = await getDoc(doc(db, WALLETS, uid));
  return snap.exists() ? (snap.data() as Wallet) : null;
}

export function subscribeToWallet(uid: string, onChange: (wallet: Wallet | null) => void) {
  return onSnapshot(doc(db, WALLETS, uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as Wallet) : null);
  });
}
