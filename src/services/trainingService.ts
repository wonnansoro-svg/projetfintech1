import { arrayUnion, collection, doc, getDoc, onSnapshot, query, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { TrainingModule, TrainingProgress } from "../types/firestore";

const MODULES = "trainingModules";
const PROGRESS = "trainingProgress";

export interface NewTrainingModuleInput {
  title: string;
  category: string;
  summary: string;
  content: string;
  durationMinutes: number;
}

export function subscribeToModules(onChange: (items: TrainingModule[]) => void) {
  const q = query(collection(db, MODULES));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as TrainingModule).sort((a, b) => a.category.localeCompare(b.category) || b.createdAt - a.createdAt);
    onChange(items);
  });
}

export async function createModule(adminId: string, input: NewTrainingModuleInput): Promise<void> {
  const now = Date.now();
  const ref = doc(collection(db, MODULES));
  const mod: TrainingModule = { id: ref.id, ...input, createdBy: adminId, createdAt: now, updatedAt: now };
  await setDoc(ref, mod);
}

export async function updateModule(moduleId: string, patch: Partial<NewTrainingModuleInput>): Promise<void> {
  await updateDoc(doc(db, MODULES, moduleId), { ...patch, updatedAt: Date.now() });
}

export async function deleteModule(moduleId: string): Promise<void> {
  await deleteDoc(doc(db, MODULES, moduleId));
}

export function subscribeToProgress(uid: string, onChange: (progress: TrainingProgress | null) => void) {
  return onSnapshot(doc(db, PROGRESS, uid), (snap) => onChange(snap.exists() ? (snap.data() as TrainingProgress) : null));
}

export async function markModuleComplete(uid: string, moduleId: string): Promise<void> {
  const ref = doc(db, PROGRESS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, completedIds: [moduleId], updatedAt: Date.now() });
    return;
  }
  await setDoc(ref, { uid, completedIds: arrayUnion(moduleId), updatedAt: Date.now() }, { merge: true });
}
