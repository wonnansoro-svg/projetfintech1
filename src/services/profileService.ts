import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { generateVerificationCode } from "../lib/qr";
import type { Crop, Profile, Role } from "../types/firestore";

const PROFILES = "profiles";
const WALLETS = "wallets";

export interface NewProfileInput {
  fullName: string;
  phone: string;
  email: string;
  village: string;
  region: string;
  cooperativeId: string;
  crops: Crop[];
  role?: Role;
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, PROFILES, uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export function subscribeToProfile(uid: string, onChange: (profile: Profile | null) => void) {
  return onSnapshot(doc(db, PROFILES, uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as Profile) : null);
  });
}

/** Crée le profil bénéficiaire (onboarding réel ou migration d'un compte Auth existant sans profil). */
export async function createProfile(uid: string, input: NewProfileInput): Promise<Profile> {
  const now = Date.now();
  const profile: Profile = {
    uid,
    role: input.role ?? "farmer",
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    village: input.village,
    region: input.region,
    cooperativeId: input.cooperativeId,
    crops: input.crops,
    kycStatus: "pending",
    kycIdPhotoUrl: null,
    verificationCode: generateVerificationCode(),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, PROFILES, uid), profile);
  await setDoc(doc(db, WALLETS, uid), {
    uid, balance: 0, totalContributed: 0, contributionsLast12m: 0, updatedAt: now,
  });
  return profile;
}

export async function updateProfile(uid: string, patch: Partial<Profile>): Promise<void> {
  await updateDoc(doc(db, PROFILES, uid), { ...patch, updatedAt: Date.now() });
}

/** Liste tous les profils — réservé à l'espace admin. */
export async function listProfiles(): Promise<Profile[]> {
  const snap = await getDocs(collection(db, PROFILES));
  return snap.docs.map((d) => d.data() as Profile);
}
