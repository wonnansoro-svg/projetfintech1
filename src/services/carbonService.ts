import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { CARBON_CREDIT_PRICE_FCFA } from "../lib/carbon";
import type { Wallet } from "../types/firestore";

const WALLETS = "wallets";
const TRANSACTIONS = "transactions";

/**
 * Convertit des crédits carbone disponibles en argent versé sur le solde.
 * `totalEarnedCredits` est calculé côté client à partir des parcelles
 * (`computeCarbonCredits`) — même schéma de confiance que le reste de l'app
 * (voir la limite documentée en tête de `firestore.rules`).
 */
export async function redeemCarbonCredits(userId: string, creditsToRedeem: number, totalEarnedCredits: number): Promise<void> {
  if (creditsToRedeem <= 0) throw new Error("Le nombre de crédits doit être positif.");
  const walletRef = doc(db, WALLETS, userId);
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const walletSnap = await tx.get(walletRef);
    const wallet = walletSnap.exists()
      ? (walletSnap.data() as Wallet)
      : { uid: userId, balance: 0, totalContributed: 0, contributionsLast12m: 0, carbonCreditsRedeemed: 0, updatedAt: now };

    const available = totalEarnedCredits - (wallet.carbonCreditsRedeemed ?? 0);
    if (creditsToRedeem > available) {
      throw new Error(`Vous n'avez que ${available.toLocaleString("fr-FR")} crédit(s) disponible(s).`);
    }

    const amount = Math.round(creditsToRedeem * CARBON_CREDIT_PRICE_FCFA);
    tx.set(walletRef, {
      ...wallet,
      balance: wallet.balance + amount,
      carbonCreditsRedeemed: (wallet.carbonCreditsRedeemed ?? 0) + creditsToRedeem,
      updatedAt: now,
    });

    const txRef = doc(collection(db, TRANSACTIONS));
    tx.set(txRef, {
      id: txRef.id, userId, type: "payout", amount,
      label: `Prime carbone — ${creditsToRedeem.toLocaleString("fr-FR")} crédit(s)`, createdAt: now,
    });
  });
}
