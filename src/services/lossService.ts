import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import type { GeoPointLike, LossClaim } from "../types/firestore";

const LOSS_CLAIMS = "lossClaims";

export async function submitLossClaim(input: {
  userId: string; comment: string; gps: GeoPointLike | null; photoUrls: string[];
}): Promise<string> {
  const now = Date.now();
  const claim: Omit<LossClaim, "id"> = { ...input, status: "submitted", createdAt: now };
  const ref = await addDoc(collection(db, LOSS_CLAIMS), claim);
  return ref.id;
}
