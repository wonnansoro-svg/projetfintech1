import { CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

/**
 * Écran de confirmation plein écran pour les succès importants initiés par le
 * fermier (voir `pushToast({..., big: true})`) — un petit toast texte qui
 * disparaît en 3 secondes ne suffit pas à rassurer quelqu'un qui ne peut pas
 * forcément le relire à temps.
 */
export default function BigConfirmation() {
  const { bigConfirmation } = useApp();
  if (!bigConfirmation) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-emerald-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl mb-6 animate-fade-up">
        <CheckCircle2 className="w-14 h-14 text-emerald-600" strokeWidth={2.5} />
      </div>
      <div className="text-white font-black text-2xl leading-tight mb-2">{bigConfirmation.title}</div>
      {bigConfirmation.message && (
        <div className="text-white/90 font-semibold text-base">{bigConfirmation.message}</div>
      )}
    </div>
  );
}
