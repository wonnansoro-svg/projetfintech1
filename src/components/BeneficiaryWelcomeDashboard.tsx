import { useEffect, useState } from "react";
import {
  Sprout, Droplets, ShieldCheck, X, PhoneCall, ArrowRight,
  CloudRain, PartyPopper, ClipboardList, Sparkles,
} from "lucide-react";

/**
 * Tableau de bord d'accueil "humanisé" pour l'espace bénéficiaire.
 * Auto-porteur (données de démonstration réalistes en interne) pour être
 * dropé tel quel ; passer `userName`/`onPrimaryAction`/`onAskHelp` pour le
 * brancher sur de vraies données (profil, cotisations, statut du bon).
 */

type Tone = "success" | "warning" | "info";

interface Tip {
  id: string;
  tone: Tone;
  icon: typeof CloudRain;
  title: string;
  message: string;
}

const DEFAULT_TIPS: Tip[] = [
  {
    id: "rain",
    tone: "warning",
    icon: CloudRain,
    title: "Pluie prévue demain",
    message: "Pensez à protéger vos jeunes semis avant la fin de journée.",
  },
  {
    id: "streak",
    tone: "success",
    icon: PartyPopper,
    title: "6 semaines d'affilée !",
    message: "Votre régularité renforce votre dossier pour un futur bon de financement.",
  },
  {
    id: "kyc",
    tone: "info",
    icon: ClipboardList,
    title: "Vérification presque terminée",
    message: "Il ne manque qu'une photo de votre pièce d'identité.",
  },
];

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function Gauge({ label, pct, value, colorClass, icon: Icon }: {
  label: string; pct: number; value: string; colorClass: string; icon: typeof Sprout;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const animatedPct = useCountUp(pct, 1100);
  const offset = c - (animatedPct / 100) * c;

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-[#e7ded0] transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:ring-[#d8cbb0]">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#EAE3D3" strokeWidth="7" />
          <circle
            cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
            className={colorClass}
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <span className="mt-0.5 font-[ui-rounded] text-sm font-bold tabular-nums text-[#22281F]">{animatedPct}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-[#22281F]">{label}</div>
        <div className="text-[11px] text-[#6b6455]">{value}</div>
      </div>
    </div>
  );
}

const TONE_STYLES: Record<Tone, { bg: string; ring: string; icon: string; badge: string }> = {
  success: { bg: "bg-[#EFF6EE]", ring: "ring-[#cfe3cd]", icon: "text-[#2E6B4C]", badge: "bg-[#2E6B4C]" },
  warning: { bg: "bg-[#FBF1E1]", ring: "ring-[#eeddbb]", icon: "text-[#B9791A]", badge: "bg-[#D6A13E]" },
  info:    { bg: "bg-[#EAF3F4]", ring: "ring-[#c9dfe2]", icon: "text-[#3E7E8C]", badge: "bg-[#3E7E8C]" },
};

export default function BeneficiaryWelcomeDashboard({
  userName = "Awa",
  tips = DEFAULT_TIPS,
  onPrimaryAction,
  onAskHelp,
}: {
  userName?: string;
  tips?: Tip[];
  onPrimaryAction?: () => void;
  onAskHelp?: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [ctaPulsed, setCtaPulsed] = useState(false);
  const visibleTips = tips.filter((t) => !dismissed.has(t.id));

  return (
    <div className="mx-auto max-w-md rounded-[28px] bg-[#F6F2E9] p-5 font-sans text-[#22281F] shadow-xl ring-1 ring-[#e7ded0]">
      {/* Header */}
      <header className="relative mb-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E6B4C] to-[#234f39] p-4 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 animate-[breathe_5s_ease-in-out_infinite] rounded-full bg-white/10" />
        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold font-[ui-rounded]">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="relative min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70">
            <Sparkles className="h-3 w-3" /> Ravi de vous revoir
          </div>
          <div className="truncate font-[ui-rounded] text-lg font-bold leading-tight">Bonjour, {userName} 👋</div>
          <div className="text-xs text-white/80">Votre ferme progresse bien cette semaine.</div>
        </div>
      </header>

      {/* État actuel */}
      <section aria-label="Votre état actuel" className="mb-5">
        <h2 className="mb-2.5 px-0.5 font-[ui-rounded] text-sm font-bold text-[#22281F]">Votre état, en un coup d'œil</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <Gauge label="Épargne Bokanmin" value="6 sem. d'affilée" pct={78} colorClass="text-[#2E6B4C]" icon={Droplets} />
          <Gauge label="Bon de financement" value="En attente" pct={45} colorClass="text-[#D6A13E]" icon={Sprout} />
          <Gauge label="Vérification" value="Presque fini" pct={85} colorClass="text-[#3E7E8C]" icon={ShieldCheck} />
        </div>
      </section>

      {/* Conseils / alertes */}
      <section aria-label="Conseils et alertes" className="mb-5">
        <h2 className="mb-2.5 px-0.5 font-[ui-rounded] text-sm font-bold text-[#22281F]">Conseils pour vous</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {visibleTips.length === 0 && (
            <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-[#d8cbb0] py-6 text-xs text-[#8a8271]">
              Tout est calme — aucune alerte pour l'instant.
            </div>
          )}
          {visibleTips.map((tip) => {
            const s = TONE_STYLES[tip.tone];
            const Icon = tip.icon;
            return (
              <div key={tip.id}
                className={`relative w-56 flex-shrink-0 rounded-2xl ${s.bg} p-3.5 ring-1 ${s.ring} transition-transform duration-200 hover:-translate-y-0.5`}>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(tip.id))}
                  aria-label="Ignorer ce conseil"
                  className="absolute right-2 top-2 rounded-full p-1 text-[#8a8271] transition-colors hover:bg-black/5 hover:text-[#22281F]">
                  <X className="h-3 w-3" />
                </button>
                <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${s.badge}/15`}>
                  <Icon className={`h-4 w-4 ${s.icon}`} />
                </div>
                <div className="pr-4 text-[13px] font-bold leading-tight text-[#22281F]">{tip.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#544e42]">{tip.message}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => { setCtaPulsed(true); setTimeout(() => setCtaPulsed(false), 260); onPrimaryAction?.(); }}
          className={`group flex items-center justify-center gap-2 rounded-2xl bg-[#2E6B4C] py-4 font-[ui-rounded] text-[15px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(46,107,76,0.55)] transition-all duration-200 hover:bg-[#275c41] hover:shadow-[0_10px_24px_-6px_rgba(46,107,76,0.65)] active:scale-[0.98] ${ctaPulsed ? "scale-95" : ""}`}>
          Cotiser cette semaine
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
        <button
          onClick={onAskHelp}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#d8cbb0] bg-white/60 py-3 text-sm font-semibold text-[#544e42] transition-colors hover:bg-white">
          <PhoneCall className="h-4 w-4" /> Demander de l'aide
        </button>
      </div>

      <style>{`
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: .6; } 50% { transform: scale(1.15); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
