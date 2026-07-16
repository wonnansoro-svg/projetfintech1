import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import type { SusuGroup } from "../types/firestore";

const GROUPS = "susuGroups";

export interface NewGroupInput {
  name: string;
  cooperativeId: string;
  contributionAmount: number;
  memberIds: string[];
}

/** Crée un groupe de cotisation Bokanmin — l'ordre de rotation initial suit l'ordre de sélection des membres. */
export async function createGroup(input: NewGroupInput): Promise<string> {
  const now = Date.now();
  const group: Omit<SusuGroup, "id"> = {
    name: input.name,
    cooperativeId: input.cooperativeId,
    contributionAmount: input.contributionAmount,
    memberIds: input.memberIds,
    rotationOrder: input.memberIds,
    currentTurnIndex: 0,
    cycleStartDate: now,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(collection(db, GROUPS), group);
  return ref.id;
}

export function subscribeToGroupsByCooperative(cooperativeId: string, onChange: (groups: SusuGroup[]) => void) {
  const q = query(collection(db, GROUPS), where("cooperativeId", "==", cooperativeId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SusuGroup)));
  });
}

export interface GroupEditInput {
  name: string;
  contributionAmount: number;
  memberIds: string[];
}

export async function updateGroup(groupId: string, input: GroupEditInput): Promise<void> {
  await updateDoc(doc(db, GROUPS, groupId), {
    name: input.name,
    contributionAmount: input.contributionAmount,
    memberIds: input.memberIds,
    rotationOrder: input.memberIds,
    updatedAt: Date.now(),
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, GROUPS, groupId));
}
