import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { CooperativeInfo } from "../types/firestore";

const COOPERATIVE_DOC = doc(db, "settings", "cooperative");

export const DEFAULT_COOPERATIVE_INFO: CooperativeInfo = {
  name: "COOPAVEC", phone: "", email: "", address: "", region: "", updatedAt: 0,
};

export async function getCooperativeInfo(): Promise<CooperativeInfo> {
  const snap = await getDoc(COOPERATIVE_DOC);
  return snap.exists() ? (snap.data() as CooperativeInfo) : DEFAULT_COOPERATIVE_INFO;
}

export function subscribeToCooperativeInfo(onChange: (info: CooperativeInfo) => void) {
  return onSnapshot(COOPERATIVE_DOC, (snap) => {
    onChange(snap.exists() ? (snap.data() as CooperativeInfo) : DEFAULT_COOPERATIVE_INFO);
  });
}

export async function updateCooperativeInfo(patch: Omit<CooperativeInfo, "updatedAt">): Promise<void> {
  await setDoc(COOPERATIVE_DOC, { ...patch, updatedAt: Date.now() });
}
