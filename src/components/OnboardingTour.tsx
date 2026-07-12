import { useState } from "react";
import { ChevronRight, X, Sprout, CreditCard, User } from "lucide-react";

const STORAGE_KEY = "coopavec_onboarding_seen_v1";

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

const STEPS = [
  { icon: Sprout, color: "bg-green-600", title: "Bienvenue sur COOPAVEC 🌾", text: "Enregistrez vos champs avec leur position GPS réelle, en marchant tout le tour pour mesurer la surface automatiquement." },
  { icon: User, color: "bg-amber-500", title: "Bokanmin — votre épargne", text: "Cotisez 1 500 FCFA chaque semaine. Cet argent forme un fonds commun déposé en banque, qui sert de garantie pour tous les bénéficiaires." },
  { icon: CreditCard, color: "bg-violet-600", title: "Bon de financement participatif", text: "Plus vous cotisez régulièrement, plus votre plafond de financement augmente. Une fois demandé, un agent de la coopérative valide et débloque le financement." },
];

export default function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const finish = () => { localStorage.setItem(STORAGE_KEY, "1"); onClose(); };
  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-fade-up">
        <div className="flex justify-end">
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
