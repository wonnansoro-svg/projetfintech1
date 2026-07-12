import { useState } from "react";
import { Loader, CheckCircle2 } from "lucide-react";
import { vibrate } from "../lib/haptics";

/**
 * Bouton de confirmation avec retour visuel + haptique cohérent : idle → chargement →
 * bref état "succès" (vert, coche) avant de revenir à idle. En cas d'erreur, onConfirm
 * doit lancer/rejeter — le bouton revient simplement à idle sans afficher de succès
 * (l'appelant reste responsable d'afficher l'erreur, ex. via un toast).
 */
export default function ConfirmButton({ onConfirm, label, successLabel = "✓ Confirmé !", disabled, className = "" }: {
  onConfirm: () => Promise<void>;
  label: React.ReactNode;
  successLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await onConfirm();
      vibrate(15);
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button onClick={handleClick} disabled={disabled || state !== "idle"}
      className={`flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
        state === "success" ? "bg-emerald-500" : ""
      } ${className}`}>
      {state === "loading" && <Loader className="w-4 h-4 animate-spin" />}
      {state === "success" ? <><CheckCircle2 className="w-4 h-4" /> {successLabel}</> : label}
    </button>
  );
}
