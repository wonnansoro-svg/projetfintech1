import { Volume2 } from "lucide-react";
import { speak, isSpeechSupported } from "../lib/speech";

/** Petit bouton "écouter" pour les textes explicatifs denses — utile pour les utilisateurs peu à l'aise avec la lecture. */
export default function SpeakButton({ text, className = "" }: { text: string; className?: string }) {
  if (!isSpeechSupported()) return null;
  return (
    <button type="button" onClick={() => speak(text)} aria-label="Écouter"
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex-shrink-0 ${className}`}>
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );
}
