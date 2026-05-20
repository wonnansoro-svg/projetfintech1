import { useState } from "react";
import { Mail, Lock, Building2, User, Eye, EyeOff, LogIn, Loader, AlertCircle, CheckCircle2, Wifi, WifiOff, Languages, ChevronLeft, Home, Cloud, Sprout, Wallet, AlertTriangle, Shield, TreePine, Coins, ArrowUpRight, ArrowDownLeft, Clock, Phone, QrCode, MapPin } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { t, LANGS, type Lang, getGreeting } from "./i18n";
import { Mail, Lock, Leaf, Building2, /* ... le reste de tes icônes ... */ } from "lucide-react";

// ==================== COMPOSANTS RÉUTILISABLES ====================

function Tile({ emoji, label, sub, onClick, color = "green", badge, size = "lg" }: {
  emoji?: string;
  label: string;
  sub?: string;
  onClick?: () => void;
  color?: string;
  badge?: any;
  size?: string;
}) {
  const COLORS: Record<string, string> = {
    green: "bg-green-600 active:bg-green-700 text-white",
    amber: "bg-amber-500 active:bg-amber-600 text-white",
    sky: "bg-sky-500 active:bg-sky-600 text-white",
    rose: "bg-rose-500 active:bg-rose-600 text-white",
    violet: "bg-violet-600 active:bg-violet-700 text-white",
    emerald: "bg-emerald-500 active:bg-emerald-600 text-white",
    orange: "bg-orange-500 active:bg-orange-600 text-white",
    indigo: "bg-indigo-600 active:bg-indigo-700 text-white",
  };
  const sizeCls = size === "lg" ? "p-5 gap-3" : "p-4 gap-2";
  const textSize = size === "lg" ? "text-lg" : "text-base";
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center rounded-3xl shadow-md active:scale-95 transition-transform ${COLORS[color]} ${sizeCls}`}>
      {badge !== undefined && <span className="absolute top-2 right-2 bg-white text-green-800 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{badge}</span>}
      <div className="bg-white/25 rounded-2xl w-14 h-14 flex items-center justify-center">
        {emoji && <span className="text-3xl">{emoji}</span>}
      </div>
      <div className={`${textSize} font-bold leading-tight text-center`}>{label}</div>
      {sub && <div className="text-xs opacity-90 text-center leading-tight">{sub}</div>}
    </button>
  );
}

function Money({ value, size = "md" }: { value: number; size?: string }) {
  const formatted = new Intl.NumberFormat("fr-FR").format(value);
  const cls = size === "lg" ? "text-4xl font-extrabold" : size === "md" ? "text-2xl font-bold" : "text-base font-semibold";
  return <span className={`${cls} tabular-nums`}>{formatted} <span className="text-[0.6em] font-semibold opacity-80">FCFA</span></span>;
}

function Avatar({ name, size = "md" }: { name: string; size?: string }) {
  const PALETTE = ["from-orange-400 to-pink-500", "from-emerald-400 to-teal-500", "from-sky-400 to-indigo-500", "from-amber-400 to-rose-500"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const bg = PALETTE[Math.abs(h) % PALETTE.length];
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-11 h-11 text-base", lg: "w-14 h-14 text-xl", xl: "w-20 h-20 text-3xl" };
  return <div className={`rounded-full bg-gradient-to-br ${bg} ${sizes[size as keyof typeof sizes]} flex items-center justify-center font-extrabold text-white shadow-md`}>{name.trim().charAt(0).toUpperCase()}</div>;
}

function Toast() {
  const { toasts } = useApp();
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto animate-slide-in border-2 rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3 ${
          t.tone === "success" ? "bg-emerald-50 border-emerald-200" : t.tone === "warn" ? "bg-amber-50 border-amber-200" : "bg-sky-50 border-sky-200"
        }`}>
          <div className="pt-0.5">
            {t.tone === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : t.tone === "warn" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <AlertCircle className="w-5 h-5 text-sky-600" />}
          </div>
          <div className="flex-1">
            <div className="font-bold text-stone-900 text-sm">{t.title}</div>
            {t.message && <div className="text-xs text-stone-700 mt-0.5">{t.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== PAGES ====================

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // <-- Permet de basculer entre Connexion et Inscription
  const { login, signup } = useAuth(); // <-- On récupère signup
  const { lang, setLang } = useApp();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(t("loginError", lang) || "Erreur d'authentification. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-emerald-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in">
        <div className="bg-green-600 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 flex gap-2">
            {(["fr", "en", "dyu"] as const).map(l => (
              <button 
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs font-bold px-2 py-1 rounded ${lang === l ? "bg-white text-green-700" : "bg-green-700 text-white"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">AgriFinance</h1>
          <p className="text-green-100 opacity-90">{isLogin ? "Bienvenue" : "Créez votre compte"}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  placeholder="contact@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  placeholder="••••••••"
                  required      
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isLogin ? "Se connecter" : "S'inscrire"}
          </button>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-sm font-medium text-green-600 hover:text-green-700 underline"
            >
              {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { lang, userName, balance, insuranceTriggered, carbonCredits } = useApp();
  const progress = Math.min(100, Math.round((balance / 100000) * 100));
  const greeting = getGreeting(lang);

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up flex items-start gap-3 mb-4">
        <Avatar name={userName} size="lg" />
        <div className="flex-1 pt-1">
          <div className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{greeting}</div>
          <div className="text-2xl font-black text-stone-900 leading-tight">{userName} 👋</div>
          <div className="text-sm text-stone-600 mt-0.5">{t("readyToWork", lang)}</div>
        </div>
      </div>

      <div className="animate-fade-up delay-2 relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-90 font-semibold">💚 {t("yourBalance", lang)}</div>
          <div className="text-4xl font-black tracking-tight">{balance.toLocaleString("fr-FR")} F</div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="opacity-90 font-medium">🎯 {t("savingsGoal", lang)}</span>
              <span className="font-black">{progress}%</span>
            </div>
            <div className="h-2.5 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {insuranceTriggered && (
        <button onClick={() => onNavigate("insurance")} className="animate-fade-up delay-3 w-full bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 text-rose-900 rounded-2xl p-4 mb-4 flex items-center gap-3 text-left shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl">🚨</div>
          <div className="flex-1"><div className="font-extrabold text-sm">{t("triggered", lang)}</div><div className="text-xs text-rose-700 mt-0.5">{t("droughtAlert", lang)}</div></div>
          <span className="text-rose-600 font-black text-xl">→</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="animate-fade-up delay-3"><Tile emoji="🤝" label={t("susu", lang)} sub={t("group", lang)} color="amber" onClick={() => onNavigate("susu")} /></div>
        <div className="animate-fade-up delay-4"><Tile emoji="☁️" label={t("weather", lang)} sub="28°C ☀️" color="sky" onClick={() => onNavigate("weather")} /></div>
        <div className="animate-fade-up delay-5"><Tile emoji="🌾" label={t("parcelles", lang)} sub="3" color="green" onClick={() => onNavigate("parcelles")} badge={3} /></div>
        <div className="animate-fade-up delay-6"><Tile emoji="💳" label={t("credit", lang)} sub="50k" color="violet" onClick={() => onNavigate("credit")} /></div>
        <div className="animate-fade-up delay-7"><Tile emoji="🛡️" label={t("insurance", lang)} sub={insuranceTriggered ? "!" : ""} color="rose" onClick={() => onNavigate("insurance")} badge={insuranceTriggered ? "!" : undefined} /></div>
        <div className="animate-fade-up delay-8"><Tile emoji="🍃" label={t("carbon", lang)} sub={`${carbonCredits}`} color="emerald" onClick={() => onNavigate("carbon")} badge={carbonCredits} /></div>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <Tile emoji="💸" label={t("payments", lang)} color="indigo" onClick={() => onNavigate("payments")} size="md" />
          <Tile emoji="🆔" label={t("identity", lang)} color="orange" onClick={() => onNavigate("identity")} size="md" />
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-stone-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-stone-600">{t("worksOffline", lang)}</span>
        </div>
        <div className="mt-3 text-[11px] text-stone-400 font-medium">{t("madeWithLove", lang)}</div>
      </div>
    </div>
  );
}

function SusuPage() {
  const { lang, balance, susuMembers, addTx, pushToast } = useApp();
  const [amount, setAmount] = useState(5000);
  const [showConfetti, setShowConfetti] = useState(false);
  const paidCount = susuMembers.filter((m) => m.paid).length;

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-xs opacity-90 font-semibold uppercase tracking-wide">{t("myGroup", lang)}</div>
            <div className="text-2xl font-black mb-1">Kër Gox 👨‍👩‍👧‍👦</div>
            <div className="text-sm opacity-95">{susuMembers.length} {t("members", lang)} · {paidCount} {t("paid", lang)}</div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-2 bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[2000, 5000, 10000, 20000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`py-2.5 rounded-xl text-sm font-extrabold transition-all ${
              amount === v ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
            }`}>
              {v / 1000}k
            </button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl p-4 text-center mb-3 border border-amber-100">
          <Money value={amount} size="md" />
        </div>
        <button onClick={() => {
          addTx({ type: "deposit", amount, label: `${t("susu", lang)} — Épargne` });
          pushToast({ tone: "success", title: t("wellDone", lang), message: `${amount.toLocaleString("fr-FR")} F` });
          setShowConfetti(true);
        }} className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600">
          {t("confirm", lang)} ✓
        </button>
      </div>
    </div>
  );
}

function WeatherPage() {
  const { lang, userVillage } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-90 font-semibold uppercase tracking-wide flex items-center gap-1">📍 {userVillage}, Sénégal</div>
          <div className="flex items-end justify-between mt-2">
            <div><div className="text-6xl font-black tracking-tight leading-none">28°</div><div className="text-lg font-bold opacity-95 mt-1">☀️ Soleil</div></div>
            <div className="text-7xl leading-none">☀️</div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-1 bg-gradient-to-br from-emerald-50 to-lime-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-5xl animate-bounce-soft">🌱</div>
          <div className="flex-1"><div className="font-bold text-emerald-900">{t("advice", lang)}</div><div className="text-sm text-emerald-900 font-medium leading-relaxed mt-1">Belle journée pour planter ! Pluie jeudi.</div></div>
        </div>
      </div>

      <div className="animate-fade-up delay-2 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1"><div className="font-extrabold text-amber-900">{t("floodAlert", lang)} 💧</div><div className="text-sm text-amber-800 mt-0.5">Jeudi et vendredi : fortes pluies.</div></div>
        </div>
      </div>
    </div>
  );
}

function ParcellesPage() {
  const { lang, parcels } = useApp();
  const cropEmoji = { maize: "🌽", millet: "🌾", rice: "🍚" };
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className={`animate-fade-up bg-white rounded-2xl p-4 shadow-sm border border-stone-200`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="text-4xl">{cropEmoji[p.crop]}</div>
              <div className="flex-1 min-w-0"><div className="font-black text-stone-800 truncate">{p.name}</div><div className="text-sm text-stone-600">📏 {p.hectares} ha</div></div>
            </div>
            <div className="bg-gradient-to-br from-stone-50 to-sky-50 rounded-xl p-3 flex items-center justify-between gap-2 border border-stone-200">
              <div className="flex items-center gap-2 min-w-0 flex-1"><MapPin className="w-5 h-5 text-sky-600 flex-shrink-0" />{p.gps ? <div className="text-xs font-mono text-stone-700 truncate font-bold">{p.gps.lat.toFixed(4)}, {p.gps.lng.toFixed(4)}</div> : <div className="text-xs text-stone-500 font-semibold">Location not set</div>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditPage() {
  const { lang, creditAmount, addTx, pushToast } = useApp();
  const [request, setRequest] = useState(25000);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><div className="text-3xl">💳</div><div className="font-black text-lg">{t("credit", lang)}</div></div>
        </div>
        <div className="relative"><div className="text-xs opacity-90 font-semibold">{t("creditAmount", lang)}</div><div className="text-4xl font-black mt-1">{creditAmount.toLocaleString("fr-FR")} <span className="text-base font-bold opacity-80">F</span></div></div>
      </div>

      <div className="animate-fade-up delay-2 bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="font-black text-stone-900 mb-3">➕ Demander un crédit</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[10000, 25000, 50000, 100000].map((v) => (
            <button key={v} onClick={() => setRequest(v)} className={`py-2.5 rounded-xl text-xs font-black transition-all ${
              request === v ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
            }`}>
              {v / 1000}k
            </button>
          ))}
        </div>
        <button onClick={() => {
          addTx({ type: "receive", amount: request, label: `${t("credit", lang)} — Nouveau` });
          pushToast({ tone: "success", title: t("received", lang) + " 🎉", message: `${request.toLocaleString("fr-FR")} F` });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2500);
        }} disabled={showSuccess} className={`w-full py-4 rounded-2xl font-black text-white transition-all ${
          showSuccess ? "bg-stone-300" : "bg-gradient-to-br from-emerald-500 to-green-600"
        }`}>
          {showSuccess ? "✓ Reçu !" : t("confirm", lang)}
        </button>
      </div>
    </div>
  );
}

function InsurancePage() {
  const { lang, insuranceTriggered, addTx, pushToast } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-rose-500 via-pink-600 to-red-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><Shield className="w-7 h-7" /><div className="font-black text-lg">{t("insurance", lang)}</div></div>
        </div>
      </div>

      {insuranceTriggered ? (
        <div className="animate-fade-up delay-1 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-7 h-7 text-amber-700" /></div>
            <div className="flex-1"><div className="font-black text-amber-900 text-lg">{t("triggered", lang)} 🚨</div><div className="text-sm text-amber-800 mt-1">45 jours sans pluie détectés.</div><div className="bg-white rounded-xl p-3 my-3 text-center border border-amber-200"><Money value={15000} size="md" /></div>
              <button onClick={() => {
                addTx({ type: "payout", amount: 15000, label: `${t("payout", lang)} — Sécheresse` });
                pushToast({ tone: "success", title: t("received", lang) + " 🎉", message: "15 000 F versés" });
              }} className="w-full bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl py-3 font-black shadow-lg">
                {t("claim", lang)} · 15 000 F
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-up delay-1 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          <div className="font-black text-emerald-900">Tout va bien 💚</div>
        </div>
      )}
    </div>
  );
}

function CarbonPage() {
  const { lang, carbonCredits, co2Saved } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><Coins className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">Crédits carbone</div><div className="text-2xl font-black">{carbonCredits}</div></div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><TreePine className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">CO₂ économisé</div><div className="text-2xl font-black">{co2Saved}t</div></div>
        </div>
      </div>
      <button className="w-full bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl py-4 font-black shadow-lg flex items-center justify-center gap-2">
        💰 {t("earn", lang)} — Vendre
      </button>
    </div>
  );
}

function IdentityPage() {
  const { lang } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><div className="font-black">{t("idCard", lang)}</div></div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Avatar name="Mamadou Diop" size="xl" />
            <div className="flex-1"><div className="text-xl font-black leading-tight">Mamadou Diop</div><div className="text-xs opacity-90 flex items-center gap-1 mt-1.5 font-medium">
              <Phone className="w-3 h-3" /> +221 77 123 45 67
            </div></div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-1 bg-white rounded-2xl p-4 shadow-sm border border-stone-200 mb-4">
        <div className="flex items-center gap-2 mb-3"><QrCode className="w-5 h-5 text-orange-700" /><div className="text-xs text-stone-500 uppercase font-black tracking-wide">QR Code</div></div>
        <div className="bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl p-4 flex flex-col items-center border border-stone-200">
          <div className="w-40 h-40 bg-white border-4 border-stone-800 rounded-2xl grid grid-cols-8 gap-0.5 p-2">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className={((i * 7 + 3) % 3 === 0) || (i < 8 || (i % 8 === 0) || (i > 55)) ? "bg-stone-900 rounded-sm" : "bg-white"} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentsPage() {
  const { lang, balance, transactions, addTx, pushToast } = useApp();
  const [mode, setMode] = useState<"send" | "receive">("send");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(5000);
  const [sent, setSent] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative"><div className="text-xs opacity-90 font-semibold">💚 {t("yourBalance", lang)}</div><Money value={balance} size="lg" /></div>
      </div>

      <div className="animate-fade-up delay-1 bg-white rounded-2xl p-4 shadow-sm border border-stone-200 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setMode("send")} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${
            mode === "send" ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md" : "bg-stone-100 text-stone-600"
          }`}>
            <ArrowUpRight className="w-5 h-5" /> {t("send", lang)}
          </button>
        </div>

        <div className="mb-3"><label className="block text-xs font-black text-stone-600 mb-1.5">{t("phoneNumber", lang)}</label><div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-3"><Phone className="w-5 h-5 text-stone-500" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221 7X XXX XX XX" className="bg-transparent flex-1 outline-none font-semibold" /></div></div>

        <div className="text-xs text-stone-500 mb-2 font-bold">{t("amount", lang)}</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[1000, 2000, 5000, 10000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`py-2.5 rounded-xl text-sm font-black transition-all ${
              amount === v ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
            }`}>
              {v / 1000}k
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-br from-stone-50 to-violet-50 rounded-xl p-3 text-center mb-3 border border-stone-200">
          <Money value={amount} size="md" />
        </div>

        <button onClick={() => {
          if (phone && amount > 0) {
            addTx({ type: "send", amount, label: `→ ${phone}` });
            pushToast({ tone: "success", title: t("sentSuccess", lang), message: `${amount.toLocaleString("fr-FR")} F` });
            setSent(true);
            setShowConfetti(true);
            setTimeout(() => setSent(false), 2200);
          }
        }} disabled={sent} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2 ${
          sent ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-rose-500 to-pink-600"
        }`}>
          {sent ? <><CheckCircle2 className="w-5 h-5" /> {t("confirm", lang)} ✓</> : <>{t("confirm", lang)} ✓</>}
        </button>
      </div>

      <div className="animate-fade-up delay-2 bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-stone-600" /><div className="text-xs text-stone-500 uppercase font-black tracking-wide">{t("recentTxs", lang)}</div></div>
        <div className="space-y-2">
          {transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className={`flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-stone-50 transition-colors`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  (tx.type === "send" || tx.type === "withdraw") ? "bg-rose-100" : "bg-emerald-100"
                }`}>
                  {(tx.type === "send" || tx.type === "withdraw") ? <ArrowUpRight className="w-4 h-4 text-rose-600" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="min-w-0"><div className="font-bold text-stone-800 text-sm truncate">{tx.label}</div><div className="text-xs text-stone-500 font-medium">{tx.date}</div></div>
              </div>
              <div className={`font-black text-sm ${(tx.type === "send" || tx.type === "withdraw") ? "text-rose-700" : "text-emerald-700"}`}>
                {tx.type === "send" || tx.type === "withdraw" ? "-" : "+"}
                {tx.amount.toLocaleString("fr-FR")} F
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== TOP BAR ====================

function TopBar({ title, onBack, userName, onLogout }: any) {
  const { lang, setLang, online } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-xl mx-auto flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {onBack ? (
              <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-stone-100 active:bg-stone-200 text-stone-700" aria-label="Retour">
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-extrabold shadow-sm">
                {userName?.charAt(0) || "A"}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-stone-900 text-sm tracking-tight">{title || "AgriSusu"}</span>
              <span className="text-[10px] text-stone-500 flex items-center gap-1">
                {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                {online ? "Connecté" : "Hors ligne"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700">
              <Languages className="w-4 h-4" />
              {LANGS.find((l) => l.code === lang)?.flag}
            </button>
            {onLogout && (
              <button onClick={onLogout} className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700">
                🚪
              </button>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-3 shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 text-stone-500 text-xs uppercase tracking-wider font-bold">Language / Langue</div>
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => { setLang(l.code as Lang); setOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left ${
                lang === l.code ? "bg-emerald-50 text-emerald-800" : "hover:bg-stone-50"
              }`}>
                <span className="text-2xl">{l.flag}</span>
                <span className="font-extrabold text-base flex-1">{l.label}</span>
                {lang === l.code && <span className="text-emerald-600 text-lg">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ==================== BOTTOM NAV ====================

type PageKey = "home" | "weather" | "parcelles" | "payments" | "identity";

function BottomNav({ current, onChange }: { current: PageKey; onChange: (p: PageKey) => void }) {
  const { lang } = useApp();
  const items: { key: PageKey; icon: any; labelKey: string }[] = [
    { key: "home", icon: Home, labelKey: "home" },
    { key: "weather", icon: Cloud, labelKey: "weather" },
    { key: "parcelles", icon: Sprout, labelKey: "parcelles" },
    { key: "payments", icon: Wallet, labelKey: "payments" },
    { key: "identity", icon: User, labelKey: "identity" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-stone-200/60 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
      <div className="max-w-xl mx-auto grid grid-cols-5">
        {items.map((it) => {
          const active = current === it.key;
          const Icon = it.icon;
          return (
            <button key={it.key} onClick={() => onChange(it.key)} className="relative flex flex-col items-center justify-center py-2 gap-0.5">
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-b-full" />}
              <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-emerald-100 scale-110" : ""}`}>
                <Icon className="w-6 h-6" style={{ color: active ? "#059669" : "#78716c" }} strokeWidth={active ? 2.8 : 2} />
              </div>
              <span className={`text-[10px] leading-tight ${active ? "font-extrabold text-emerald-700" : "font-semibold text-stone-500"}`}>
                {t(it.labelKey as any, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ==================== MAIN SHELL ====================

function Shell() {
  const { lang } = useApp();
  const { user } = useAuth();
  const [page, setPage] = useState<PageKey | string>("home");
  const [pageKey, setPageKey] = useState(0);

  if (!user) {
  return <LoginPage />;
}

  const bottomPages = new Set(["home", "weather", "parcelles", "payments", "identity"]);
  const bottomKey: PageKey = (bottomPages.has(page) ? page : "home") as PageKey;

  const goHome = () => { setPage("home"); setPageKey((k) => k + 1); };
  const navigate = (p: string) => { setPage(p); setPageKey((k) => k + 1); };

  const render = () => {
    switch (page) {
      case "home": return <Dashboard onNavigate={navigate} />;
      case "susu": return <SusuPage />;
      case "weather": return <WeatherPage />;
      case "parcelles": return <ParcellesPage />;
      case "credit": return <CreditPage />;
      case "insurance": return <InsurancePage />;
      case "carbon": return <CarbonPage />;
      case "identity": return <IdentityPage />;
      case "payments": return <PaymentsPage />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  const showBack = page !== "home";
  const titles: Record<string, string> = {
    susu: t("susu", lang),
    weather: t("weather", lang),
    parcelles: t("parcelles", lang),
    credit: t("credit", lang),
    insurance: t("insurance", lang),
    carbon: t("carbon", lang),
    identity: t("identity", lang),
    payments: t("payments", lang),
  };

  return (
    <div className="min-h-screen max-w-xl mx-auto relative shadow-2xl bg-gradient-to-b from-amber-50/40 to-emerald-50/40">
      <TopBar title={titles[page]} onBack={showBack ? goHome : undefined} userName={user.name} onLogout={() => window.location.reload()} />
      <main key={pageKey} className="pb-20 animate-fade-in">{render()}</main>
      <BottomNav current={bottomKey} onChange={navigate} />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </AuthProvider>
  );
}
