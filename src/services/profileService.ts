import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, adminCreateAuth } from "../firebase";
import { generateVerificationCode, generateTempPassword } from "../lib/qr";
import { normalizePhone, looksLikeEmail, syntheticEmailForPhone } from "../lib/phoneAuth";
import type { Crop, InvestorProfileType, Profile, Role } from "../types/firestore";

const PROFILES = "profiles";
const WALLETS = "wallets";
const PHONE_INDEX = "phoneIndex";

export interface NewProfileInput {
  fullName: string;
  phone: string;
  email: string;
  village: string;
  region: string;
  cooperativeId: string;
  crops: Crop[];
  role?: Role;
  /** Uniquement si role === "investor". */
  investorProfile?: InvestorProfileType | null;
  /** Superviseur responsable (renseigné automatiquement quand la création vient de l'espace superviseur). */
  supervisorId?: string | null;
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, PROFILES, uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

/**
 * Le profil pilote le routage par rôle (admin/investor/agent/farmer) — des
 * arbres d'interface entièrement différents. Le cache local persistant
 * (`firebase.ts`, activé pour le hors-ligne sur le terrain) peut renvoyer une
 * version PÉRIMÉE de ce document dès la première réponse `onSnapshot` (ex. un
 * compte promu admin en console après avoir été mis en cache sur cet
 * appareil en tant que "farmer") — le serveur corrige ensuite avec un second
 * événement, ce qui produit un flash visible vers le mauvais espace. Tant
 * qu'on est en ligne, on ignore ce premier instantané "cache seul" et on
 * attend la confirmation serveur ; hors-ligne, on l'utilise quand même
 * (mieux vaut une donnée peut-être légèrement ancienne que rien).
 */
export function subscribeToProfile(uid: string, onChange: (profile: Profile | null) => void) {
  return onSnapshot(doc(db, PROFILES, uid), { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.fromCache && navigator.onLine) return;
    onChange(snap.exists() ? (snap.data() as Profile) : null);
  });
}

async function writeProfileDocs(uid: string, input: NewProfileInput): Promise<Profile> {
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
    supervisorId: input.supervisorId ?? null,
    permissions: null,
    investorProfile: input.investorProfile ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, PROFILES, uid), profile);
  await setDoc(doc(db, WALLETS, uid), {
    uid, balance: 0, totalContributed: 0, contributionsLast12m: 0, carbonCreditsRedeemed: 0, updatedAt: now,
  });
  const digits = normalizePhone(input.phone);
  if (digits) await setDoc(doc(db, PHONE_INDEX, digits), { email: input.email });
  return profile;
}

/**
 * Recalcule et réécrit l'entrée `phoneIndex` de ce profil à partir de son
 * numéro actuellement enregistré — corrige les comptes créés avant
 * l'amélioration de la normalisation du téléphone (voir `lib/phoneAuth.ts`),
 * dont la connexion par téléphone pouvait échouer malgré un compte valide.
 */
export async function regeneratePhoneIndex(uid: string): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) throw new Error("Profil introuvable.");
  const digits = normalizePhone(profile.phone);
  if (!digits) throw new Error("Numéro de téléphone invalide sur ce profil.");
  await setDoc(doc(db, PHONE_INDEX, digits), { email: profile.email });
}

/** Résout un identifiant de connexion (email ou téléphone) vers l'email Firebase Auth réel. */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  if (looksLikeEmail(identifier)) return identifier;
  const digits = normalizePhone(identifier);
  if (!digits) throw new Error("Identifiant invalide.");
  const snap = await getDoc(doc(db, PHONE_INDEX, digits));
  if (!snap.exists()) throw new Error("Aucun compte associé à ce numéro de téléphone.");
  return (snap.data() as { email: string }).email;
}

/** Crée le profil bénéficiaire (onboarding réel ou migration d'un compte Auth existant sans profil). */
export async function createProfile(uid: string, input: NewProfileInput): Promise<Profile> {
  return writeProfileDocs(uid, input);
}

export interface AdminCreatedAccount {
  uid: string;
  email: string;
  tempPassword: string;
  profile: Profile;
}

/**
 * Crée un compte de connexion + profil pour un bénéficiaire qui ne peut pas
 * s'inscrire lui-même sur le terrain. Utilise une instance Firebase séparée
 * (`adminCreateAuth`) pour que la création du compte ne déconnecte pas l'admin.
 */
export async function createProfileAsAdmin(input: Omit<NewProfileInput, "email">): Promise<AdminCreatedAccount> {
  if (!normalizePhone(input.phone)) throw new Error("Numéro de téléphone invalide.");
  const email = syntheticEmailForPhone(input.phone);
  const tempPassword = generateTempPassword();

  const cred = await createUserWithEmailAndPassword(adminCreateAuth, email, tempPassword);
  const uid = cred.user.uid;
  await signOut(adminCreateAuth);

  const profile = await writeProfileDocs(uid, { ...input, email });
  return { uid, email, tempPassword, profile };
}

export async function updateProfile(uid: string, patch: Partial<Profile>): Promise<void> {
  await updateDoc(doc(db, PROFILES, uid), { ...patch, updatedAt: Date.now() });
}

/** Liste tous les profils — utilisé par l'espace admin et l'espace superviseur (terrain). */
export async function listProfiles(): Promise<Profile[]> {
  const snap = await getDocs(collection(db, PROFILES));
  return snap.docs.map((d) => d.data() as Profile);
}
