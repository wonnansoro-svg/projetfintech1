import { addDoc, collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { GeoPointLike, LossClaim } from "../types/firestore";

const LOSS_CLAIMS = "lossClaims";

export async function submitLossClaim(input: {
  userId: string; comment: string; gps: GeoPointLike | null; photoUrls: string[];
  lossKg?: number | null; estimatedValueFcfa?: number | null;
}): Promise<string> {
  const now = Date.now();
  const claim: Omit<LossClaim, "id"> = {
    ...input,
    lossKg: input.lossKg ?? null,
    estimatedValueFcfa: input.estimatedValueFcfa ?? null,
    status: "submitted", createdAt: now,
  };
  const ref = await addDoc(collection(db, LOSS_CLAIMS), claim);
  return ref.id;
}

/** Somme des valeurs de pertes déclarées par le bénéficiaire — sert de base au score de financement. */
export async function getUserLossValueFcfa(userId: string): Promise<number> {
  const q = query(collection(db, LOSS_CLAIMS), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => sum + ((d.data() as LossClaim).estimatedValueFcfa ?? 0), 0);
}

export function subscribeToUserLossClaims(userId: string, onChange: (claims: LossClaim[]) => void) {
  const q = query(collection(db, LOSS_CLAIMS), where("userId", "==", userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LossClaim))));
}
