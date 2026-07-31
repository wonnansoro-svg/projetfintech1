import { useEffect, useState } from "react";
import { ChevronRight, X, Sprout, CreditCard, User, Volume2 } from "lucide-react";
import { speak } from "../lib/speech";
import { useApp } from "../context/AppContext";

const STORAGE_KEY = "coopavec_onboarding_seen_v1";

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

const STEPS = [
  {
    icon: Sprout, color: "bg-green-600", title: "Bienvenue 🌾",
    text: "Marchez autour de votre champ pour l'enregistrer.",
    voice: "Bienvenue sur Coopavec. Marchez tout autour de votre champ pour l'enregistrer automatiquement.",
  },
  {
    icon: User, color: "bg-amber-500", title: "Bokanmin 🤝",
    text: "Cotisez chaque semaine pour épargner ensemble.",
    voice: "Bokanmin, c'est votre épargne. Cotisez un peu chaque semaine avec votre groupe.",
  },
  {
    icon: CreditCard, color: "bg-violet-600", title: "Bon de financement 💳",
    text: "Plus vous cotisez, plus vous pouvez recevoir de financement.",
    voice: "Plus vous cotisez régulièrement, plus le financement que vous pouvez recevoir augmente.",
  },
];

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const { voiceEnabled } = useApp();
  const [step, setStep] = useState(0);
  const finish = () => { localStorage.setItem(STORAGE_KEY, "1"); onClose(); };
  const s = STEPS[step];
  const Icon = s.icon;

  useEffect(() => { if (voiceEnabled) speak(s.voice); }, [step]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-fade-up">
        <div className="flex justify-between items-center">
          <button onClick={() => speak(s.voice)} className="p-1.5 bg-emerald-50 rounded-full text-emerald-700" aria-label="Écouter">
            <Volume2 className="w-4 h-4" />
          </button>
          <button onClick={finish} className="p-1 text-stone-400 hover:text-stone-600" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4 mx-auto shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <div className="font-black text-stone-900 text-lg mb-2">{s.title}</div>
          <p className="text-sm text-stone-600 leading-relaxed">{s.text}</p>
        </div>
        <div className="flex justify-center gap-1.5 mt-5 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-green-600" : "w-1.5 bg-stone-200"}`} />
          ))}
        </div>
        <button onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
          className="w-full py-3.5 rounded-2xl font-black text-white bg-green-600 flex items-center justify-center gap-2">
          {step < STEPS.length - 1 ? <>Suivant <ChevronRight className="w-4 h-4" /></> : "C'est parti !"}
        </button>
      </div>
    </div>
  );
}
