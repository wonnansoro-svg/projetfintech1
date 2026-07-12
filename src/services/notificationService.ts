import { collection, doc, getDocs, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import type { AppNotification } from "../types/firestore";

const NOTIFICATIONS = "notifications";

export function subscribeToNotifications(userId: string, onChange: (items: AppNotification[]) => void) {
  const q = query(collection(db, NOTIFICATIONS), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => d.data() as AppNotification).sort((a, b) => b.createdAt - a.createdAt);
    onChange(items);
  });
}

export async function markAllRead(userId: string): Promise<void> {
  const q = query(collection(db, NOTIFICATIONS), where("userId", "==", userId), where("read", "==", false));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(doc(db, NOTIFICATIONS, d.id), { read: true }));
  await batch.commit();
}

/** Utilisé en interne par les services qui déclenchent des événements notifiables (décision de crédit, etc.). */
export function buildNotification(userId: string, title: string, message: string): AppNotification & { id: string } {
  return { id: crypto.randomUUID(), userId, title, message, read: false, createdAt: Date.now() };
}
