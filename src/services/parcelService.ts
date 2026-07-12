import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Parcel } from "../types/firestore";

const PARCELS = "parcels";

export type NewParcelInput = Omit<Parcel, "id" | "createdAt" | "updatedAt">;

export async function addParcel(input: NewParcelInput): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, PARCELS), { ...input, createdAt: now, updatedAt: now });
  return ref.id;
}

export function subscribeToParcelsByOwner(ownerId: string, onChange: (parcels: Parcel[]) => void) {
  const q = query(collection(db, PARCELS), where("ownerId", "==", ownerId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Parcel)));
  });
}

export async function listAllParcels(): Promise<Parcel[]> {
  const snap = await getDocs(collection(db, PARCELS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Parcel));
}

export async function deleteParcel(parcelId: string): Promise<void> {
  await deleteDoc(doc(db, PARCELS, parcelId));
}
