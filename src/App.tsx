import { useState } from "react";
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader, AlertCircle, CheckCircle2,
  Wifi, WifiOff, Languages, ChevronLeft, Home, Cloud, Sprout, Wallet,
  AlertTriangle, Shield, TreePine, Coins, ArrowUpRight, ArrowDownLeft,
  Clock, Phone, QrCode, MapPin, User, Leaf, Users, Truck, Warehouse,
  Recycle, FileText, Camera, BarChart2, CreditCard, Building2,
  Package, BadgeCheck, ChevronRight, Star, TrendingUp, Banknote,
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { t, LANGS, type Lang, getGreeting } from "./i18n";

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
    green:   "bg-green-600 active:bg-green-700 text-white",
    amber:   "bg-amber-500 active:bg-amber-600 text-white",
    sky:     "bg-sky-500 active:bg-sky-600 text-white",
    rose:    "bg-rose-500 active:bg-rose-600 text-white",
    violet:  "bg-violet-600 active:bg-violet-700 text-white",
    emerald: "bg-emerald-500 active:bg-emerald-600 text-white",
    orange:  "bg-orange-500 active:bg-orange-600 text-white",
    indigo:  "bg-indigo-600 active:bg-indigo-700 text-white",
    teal:    "bg-teal-600 active:bg-teal-700 text-white",
    lime:    "bg-lime-600 active:bg-lime-700 text-white",
    cyan:    "bg-cyan-600 active:bg-cyan-700 text-white",
    fuchsia: "bg-fuchsia-600 active:bg-fuchsia-700 text-white",
    slate:   "bg-slate-600 active:bg-slate-700 text-white",
    brown:   "bg-amber-800 active:bg-amber-900 text-white",
  };
  const sizeCls = size === "lg" ? "p-5 gap-3" : "p-4 gap-2";
  const textSize = size === "lg" ? "text-lg" : "text-base";
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center rounded-3xl shadow-md active:scale-95 transition-transform ${COLORS[color] ?? COLORS.green} ${sizeCls}`}>
      {badge !== undefined && (
        <span className="absolute top-2 right-2 bg-white text-green-800 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {badge}
        </span>
      )}
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
  const cls =
    size === "lg" ? "text-4xl font-extrabold" :
    size === "md" ? "text-2xl font-bold" :
    "text-base font-semibold";
  return (
    <span className={`${cls} tabular-nums`}>
      {formatted} <span className="text-[0.6em] font-semibold opacity-80">FCFA</span>
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: string }) {
  const PALETTE = [
    "from-orange-400 to-pink-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-indigo-500",
    "from-amber-400 to-rose-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const bg = PALETTE[Math.abs(h) % PALETTE.length];
  const sizes: Record<string, string> = {
    sm: "w-8 h-8 text-sm",
    md: "w-11 h-11 text-base",
    lg: "w-14 h-14 text-xl",
    xl: "w-20 h-20 text-3xl",
  };
  return (
    <div className={`rounded-full bg-gradient-to-br ${bg} ${sizes[size]} flex items-center justify-center font-extrabold text-white shadow-md`}>
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Toast() {
  const { toasts } = useApp();
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto animate-slide-in border-2 rounded-2xl px-4 py-3 shadow-lg flex items-start gap-3 ${
          t.tone === "success" ? "bg-emerald-50 border-emerald-200" :
          t.tone === "warn"    ? "bg-amber-50 border-amber-200" :
          "bg-sky-50 border-sky-200"
        }`}>
          <div className="pt-0.5">
            {t.tone === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
             t.tone === "warn"    ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
             <AlertCircle className="w-5 h-5 text-sky-600" />}
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

// ==================== LOGIN PAGE ====================

function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin]   = useState(true);
  const [showPwd, setShowPwd]   = useState(false);
  const { login, signup }       = useAuth();
  const { lang, setLang }       = useApp();
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else         await signup(email, password);
    } catch {
      setError("Erreur d'authentification. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-emerald-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-600 to-teal-700 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 flex gap-2">
            {(["fr", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`text-xs font-bold px-2 py-1 rounded ${lang === l ? "bg-white text-green-700" : "bg-green-700 text-white"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1">COOPAVEC</h1>
          <p className="text-green-100 text-sm">AgriFinance Pay</p>
          <p className="text-green-200 opacity-80 text-xs mt-1">
            {isLogin ? "Bienvenue — Connectez-vous" : "Créez votre compte agricole"}
          </p>
        </div>

        {/* Form */}
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
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="contact@exemple.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70">
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isLogin ? "Se connecter" : "S'inscrire"}
          </button>

          <div className="text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-green-600 hover:text-green-700 underline">
              {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================

function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { lang, userName, balance, insuranceTriggered, carbonCredits } = useApp();
  const progress = Math.min(100, Math.round((balance / 100000) * 100));
  const greeting = getGreeting(lang);

  // Modules regroupés par catégorie
  const modules = [
    // Ligne 1 — Core
    { emoji: "🆔", label: "Mon ID Agricole", sub: "KYC · OTP", color: "orange",  page: "identity" },
    { emoji: "🌾", label: "Mes Champs",       sub: "Parcelles",  color: "green",   page: "parcelles" },
    // Ligne 2 — Finance
    { emoji: "🤝", label: "AgriSusu",         sub: "Épargne",    color: "amber",   page: "susu" },
    { emoji: "💳", label: "Crédit",           sub: "Financement",color: "violet",  page: "credit" },
    // Ligne 3 — Protection
    { emoji: "🛡️", label: "Assurance",        sub: insuranceTriggered ? "Alerte !" : "Active", color: "rose", page: "insurance", badge: insuranceTriggered ? "!" : undefined },
    { emoji: "📸", label: "AgriProtect",      sub: "Photo perte",color: "fuchsia", page: "agriprotect" },
    // Ligne 4 — Évaluation & Certification
    { emoji: "📉", label: "Éval. Pertes",     sub: "Sinistres",  color: "slate",   page: "losses" },
    { emoji: "📜", label: "Certificat",       sub: "Numérique",  color: "teal",    page: "certificate" },
    // Ligne 5 — Collectivité & Finance
    { emoji: "🏛️", label: "COOPAVEC",         sub: "Coopérative",color: "indigo",  page: "coopavec" },
    { emoji: "🌱", label: "Fin. Participatif",sub: "Investisseurs",color:"lime",   page: "crowdfund" },
    // Ligne 6 — Logistique
    { emoji: "🚜", label: "Collecte",         sub: "Récolte",    color: "brown",   page: "collecte" },
    { emoji: "🏭", label: "Entrepôts",        sub: "Stocks",     color: "cyan",    page: "entrepots" },
    // Ligne 7 — Durabilité
    { emoji: "♻️", label: "Recyclage",        sub: "Déchets",    color: "emerald", page: "recyclage" },
    { emoji: "🍃", label: "Carbone",          sub: `${carbonCredits} crédits`, color: "green", page: "carbon", badge: carbonCredits },
  ];

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      {/* Greeting */}
      <div className="animate-fade-up flex items-start gap-3 mb-4">
        <Avatar name={userName} size="lg" />
        <div className="flex-1 pt-1">
          <div className="text-xs text-stone-500 font-semibold uppercase tracking-wide">{greeting}</div>
          <div className="text-2xl font-black text-stone-900 leading-tight">{userName} 👋</div>
          <div className="text-sm text-stone-600 mt-0.5">Plateforme AgriFinance Pay</div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="animate-fade-up delay-2 relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-90 font-semibold">💚 Solde disponible</div>
          <div className="text-4xl font-black tracking-tight">{balance.toLocaleString("fr-FR")} F</div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="opacity-90 font-medium">🎯 Objectif épargne</span>
              <span className="font-black">{progress}%</span>
            </div>
            <div className="h-2.5 bg-white/25 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-300 to-yellow-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full" />
      </div>

      {/* Alerte assurance déclenchée */}
      {insuranceTriggered && (
        <button onClick={() => onNavigate("insurance")}
          className="animate-fade-up delay-3 w-full bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 text-rose-900 rounded-2xl p-4 mb-4 flex items-center gap-3 text-left shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-2xl">🚨</div>
          <div className="flex-1">
            <div className="font-extrabold text-sm">Assurance déclenchée !</div>
            <div className="text-xs text-rose-700 mt-0.5">Alerte sécheresse — Appuyer pour réclamer</div>
          </div>
          <ChevronRight className="w-5 h-5 text-rose-600" />
        </button>
      )}

      {/* Grille modules */}
      <div className="grid grid-cols-2 gap-3">
        {modules.map((m, i) => (
          <div key={m.page} className={`animate-fade-up delay-${(i % 8) + 3}`}>
            <Tile
              emoji={m.emoji}
              label={m.label}
              sub={m.sub}
              color={m.color}
              onClick={() => onNavigate(m.page)}
              badge={(m as any).badge}
            />
          </div>
        ))}
        {/* Paiements pleine largeur */}
        <div className="col-span-2">
          <Tile emoji="💸" label="Paiements Mobile Money" sub="Wave · Orange · MTN · Moov"
            color="indigo" onClick={() => onNavigate("payments")} size="md" />
        </div>
        {/* Météo pleine largeur */}
        <div className="col-span-2">
          <Tile emoji="☁️" label="Météo & Alertes" sub="Conseils agronomiques"
            color="sky" onClick={() => onNavigate("weather")} size="md" />
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-stone-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-stone-600">Fonctionne hors ligne · USSD disponible</span>
        </div>
        <div className="mt-3 text-[11px] text-stone-400 font-medium">COOPAVEC AgriFinance Pay · Côte d'Ivoire 🇨🇮</div>
      </div>
    </div>
  );
}

// ==================== MODULE 1 : MON ID AGRICOLE ====================

function IdentityPage() {
  const [tab, setTab] = useState<"profil" | "kyc" | "gps">("profil");

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      {/* Header Card */}
      <div className="animate-fade-up relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-4 mb-3">
          <Avatar name="SORO Wonnan" size="xl" />
          <div>
            <div className="text-xl font-black">SORO Wonnan</div>
            <div className="text-xs opacity-90 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> +225 07 78 01 45 37</div>
            <div className="mt-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
              <BadgeCheck className="w-3.5 h-3.5" /> KYC Validé
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["profil", "kyc", "gps"] as const).map(tab_ => (
          <button key={tab_} onClick={() => setTab(tab_)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
              tab === tab_ ? "bg-orange-500 text-white shadow-md" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {tab_ === "profil" ? "👤 Profil" : tab_ === "kyc" ? "🪪 Pièce" : "📍 GPS"}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <div className="space-y-3">
          {[
            { label: "Nom complet",    value: "SORO Wonnan",    icon: "👤" },
            { label: "Téléphone",      value: "+225 07 78 01 45 37", icon: "📞" },
            { label: "Coopérative",    value: "Coop. Anacarde Nord", icon: "🏛️" },
            { label: "Région",         value: "Hambol, Côte d'Ivoire", icon: "📍" },
            { label: "Cultures",       value: "Anacarde · Maïs · Cacao", icon: "🌾" },
          ].map(row => (
            <div key={row.label} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-3">
              <span className="text-2xl">{row.icon}</span>
              <div><div className="text-xs text-stone-500 font-semibold">{row.label}</div><div className="font-bold text-stone-800">{row.value}</div></div>
            </div>
          ))}
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><User className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">Pièce d'identité</span></div>
            <div className="bg-stone-50 rounded-xl p-6 text-center border-2 border-dashed border-stone-300">
              <Camera className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              <div className="text-sm text-stone-500 font-medium">Photo CNI / Passeport</div>
              <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-3 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Validée
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><QrCode className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">QR Code de vérification</span></div>
            <div className="flex justify-center">
              <div className="w-40 h-40 bg-white border-4 border-stone-800 rounded-2xl grid grid-cols-8 gap-0.5 p-2">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className={((i * 7 + 3) % 3 === 0) || (i < 8 || (i % 8 === 0) || (i > 55)) ? "bg-stone-900 rounded-sm" : "bg-white"} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "gps" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><MapPin className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">Adresse GPS</span></div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <div className="text-xs text-stone-500 font-semibold mb-1">Coordonnées</div>
            <div className="font-mono font-bold text-stone-800">8.4167° N, -5.0167° O</div>
            <div className="text-xs text-stone-500 mt-2">Hambol, Katiola — Côte d'Ivoire</div>
          </div>
          <button className="mt-3 w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> Actualiser ma position
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== MODULE 2 : MES CHAMPS ====================

function ParcellesPage() {
  const { lang, parcels } = useApp();
  const cropEmoji: Record<string, string> = { maize: "🌽", millet: "🌾", rice: "🍚", anacarde: "🥜", cacao: "🍫", manioc: "🥔" };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="font-black text-stone-800 text-lg">🌾 Mes Parcelles</div>
        <button className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold">+ Ajouter</button>
      </div>
      <div className="space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className="animate-fade-up bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-4xl">{cropEmoji[p.crop] ?? "🌱"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-stone-800 truncate">{p.name}</div>
                <div className="text-sm text-stone-600">📏 {p.hectares} ha</div>
                <div className="text-xs text-emerald-700 font-semibold mt-1">Production estimée : {(p.hectares * 1.2).toFixed(1)} t</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-stone-50 rounded-xl p-3 text-center border border-stone-200">
                <div className="text-xs text-stone-500 font-semibold">Culture</div>
                <div className="font-bold text-stone-800 capitalize">{p.crop}</div>
              </div>
              <div className="bg-sky-50 rounded-xl p-3 flex items-center gap-1.5 border border-sky-100">
                <MapPin className="w-4 h-4 text-sky-600 flex-shrink-0" />
                {p.gps ? (
                  <div className="text-xs font-mono text-stone-700 truncate">{p.gps.lat.toFixed(4)}, {p.gps.lng.toFixed(4)}</div>
                ) : (
                  <div className="text-xs text-stone-500 font-semibold">GPS non défini</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MODULE 3 : AGRISUSU (Épargne & Cotisations) ====================

function SusuPage() {
  const { lang, balance, susuMembers, addTx, pushToast } = useApp();
  const [amount, setAmount] = useState(5000);
  const [tab, setTab] = useState<"epargne" | "membres" | "retrait">("epargne");
  const paidCount = susuMembers.filter((m: any) => m.paid).length;

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="text-xs opacity-90 font-semibold uppercase tracking-wide">Mon Groupe</div>
        <div className="text-2xl font-black mb-1">Kër Gox 👨‍👩‍👧‍👦</div>
        <div className="text-sm opacity-95">{susuMembers.length} membres · {paidCount} ont cotisé</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Cagnotte</div><div className="font-black text-lg">{(paidCount * amount).toLocaleString("fr-FR")} F</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Bénéficiaire</div><div className="font-black text-lg">Tour 4</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["epargne", "membres", "retrait"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              tab === t ? "bg-amber-500 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {t === "epargne" ? "💰 Épargne" : t === "membres" ? "👥 Membres" : "📤 Retrait"}
          </button>
        ))}
      </div>

      {tab === "epargne" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[2000, 5000, 10000, 20000].map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={`py-2.5 rounded-xl text-sm font-extrabold transition-all ${
                amount === v ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
              }`}>{v / 1000}k</button>
            ))}
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center mb-3 border border-amber-100">
            <Money value={amount} size="md" />
          </div>
          <button onClick={() => {
            addTx({ type: "deposit", amount, label: "AgriSusu — Épargne" });
            pushToast({ tone: "success", title: "Cotisation enregistrée !", message: `${amount.toLocaleString("fr-FR")} F` });
          }} className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600">
            Confirmer ✓
          </button>
        </div>
      )}

      {tab === "membres" && (
        <div className="space-y-2">
          {susuMembers.map((m: any, i: number) => (
            <div key={m.id ?? i} className="bg-white rounded-2xl p-3 border border-stone-200 flex items-center gap-3">
              <Avatar name={m.name} size="sm" />
              <div className="flex-1"><div className="font-bold text-stone-800 text-sm">{m.name}</div></div>
              <div className={`text-xs font-black px-2 py-1 rounded-full ${m.paid ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                {m.paid ? "✓ Cotisé" : "En attente"}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "retrait" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🔒</div>
            <div className="font-black text-stone-800">Retrait disponible au Tour 7</div>
            <div className="text-sm text-stone-500 mt-1">3 tours restants avant votre rotation</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MODULE 4 : CRÉDIT (Financement Participatif inclus) ====================

function CreditPage() {
  const { lang, creditAmount, addTx, pushToast } = useApp();
  const [request, setRequest] = useState(25000);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tab, setTab] = useState<"credit" | "invest">("credit");

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><CreditCard className="w-6 h-6" /><div className="font-black text-lg">Financement Agricole</div></div>
        <div className="text-xs opacity-90">Encours de crédit</div>
        <div className="text-4xl font-black mt-1">{creditAmount.toLocaleString("fr-FR")} <span className="text-base font-bold opacity-80">F</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Taux</div><div className="font-black">3% / mois</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Durée</div><div className="font-black">6 mois</div></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["credit", "invest"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t ? "bg-violet-600 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {t === "credit" ? "💳 Crédit" : "🌱 Investisseurs"}
          </button>
        ))}
      </div>

      {tab === "credit" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
          <div className="font-black text-stone-900 mb-3">➕ Demander un crédit</div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[10000, 25000, 50000, 100000].map((v) => (
              <button key={v} onClick={() => setRequest(v)} className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                request === v ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
              }`}>{v / 1000}k</button>
            ))}
          </div>
          <div className="bg-violet-50 rounded-xl p-3 mb-3 text-center border border-violet-100">
            <Money value={request} size="md" />
          </div>
          <button onClick={() => {
            addTx({ type: "receive", amount: request, label: "Crédit Agricole" });
            pushToast({ tone: "success", title: "Crédit accordé 🎉", message: `${request.toLocaleString("fr-FR")} F` });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
          }} disabled={showSuccess} className={`w-full py-4 rounded-2xl font-black text-white transition-all ${
            showSuccess ? "bg-emerald-500" : "bg-gradient-to-br from-violet-600 to-purple-600"
          }`}>
            {showSuccess ? "✓ Accordé !" : "Soumettre la demande"}
          </button>
        </div>
      )}

      {tab === "invest" && (
        <div className="space-y-3">
          {[
            { name: "Projet Anacarde Hambol", target: 500000, raised: 310000, investors: 12, return: "12%" },
            { name: "Irrigation Maïs Bouaké",  target: 200000, raised: 180000, investors: 8,  return: "10%" },
          ].map((proj, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
              <div className="font-black text-stone-800 mb-1">{proj.name}</div>
              <div className="flex gap-4 text-xs text-stone-500 mb-2">
                <span>👥 {proj.investors} investisseurs</span>
                <span>📈 Rendement {proj.return}</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full mb-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full" style={{ width: `${Math.round(proj.raised / proj.target * 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>{proj.raised.toLocaleString("fr-FR")} F</span>
                <span>sur {proj.target.toLocaleString("fr-FR")} F</span>
              </div>
              <button className="mt-3 w-full py-2.5 bg-lime-600 text-white rounded-xl font-bold text-sm">Investir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MODULE 5 : ASSURANCE AGRICOLE ====================

function InsurancePage() {
  const { lang, insuranceTriggered, addTx, pushToast } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-rose-500 via-pink-600 to-red-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-3"><Shield className="w-7 h-7" /><div className="font-black text-lg">Assurance Agricole</div></div>
        <div className="grid grid-cols-3 gap-2">
          {["Sécheresse", "Inondation", "Maladie"].map(r => (
            <div key={r} className="bg-white/20 rounded-xl p-2 text-center">
              <div className="text-lg">{r === "Sécheresse" ? "☀️" : r === "Inondation" ? "🌊" : "🦠"}</div>
              <div className="text-xs font-bold mt-1">{r}</div>
            </div>
          ))}
        </div>
      </div>

      {insuranceTriggered ? (
        <div className="animate-fade-up delay-1 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-7 h-7 text-amber-700" />
            </div>
            <div className="flex-1">
              <div className="font-black text-amber-900 text-lg">Sinistre déclenché 🚨</div>
              <div className="text-sm text-amber-800 mt-1">45 jours sans pluie détectés par satellite.</div>
              <div className="bg-white rounded-xl p-3 my-3 text-center border border-amber-200">
                <Money value={15000} size="md" />
              </div>
              <button onClick={() => {
                addTx({ type: "payout", amount: 15000, label: "Indemnité — Sécheresse" });
                pushToast({ tone: "success", title: "Indemnité reçue 🎉", message: "15 000 F versés" });
              }} className="w-full bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl py-3 font-black shadow-lg">
                Réclamer l'indemnité · 15 000 F
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-up delay-1 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          <div className="font-black text-emerald-900">Tout va bien — Aucun sinistre 💚</div>
        </div>
      )}

      {/* Polices souscrites */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
        <div className="font-black text-stone-800 mb-3">📋 Mes polices</div>
        {[
          { name: "Assurance Sécheresse", parcelle: "Champ Anacarde", prime: 3500, statut: "Active" },
          { name: "Assurance Inondation", parcelle: "Rizière Nord",   prime: 2500, statut: "Active" },
        ].map((pol, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div>
              <div className="font-bold text-stone-800 text-sm">{pol.name}</div>
              <div className="text-xs text-stone-500">{pol.parcelle} · Prime {pol.prime.toLocaleString("fr-FR")} F/mois</div>
            </div>
            <div className="text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-1">{pol.statut}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MODULE 7 : AGRI-PROTECT PHOTO ====================

function AgriProtectPage() {
  const { pushToast } = useApp();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-500 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Camera className="w-6 h-6" /><div className="font-black text-lg">Agri-Protect Photo</div></div>
        <p className="text-sm opacity-90">Déclarez un sinistre avec photos, vidéos et géolocalisation automatique.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">📸 Nouvelle déclaration</div>

        {/* Zone photos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="aspect-square bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-fuchsia-50 hover:border-fuchsia-300 transition-colors">
              <Camera className="w-6 h-6 text-stone-400" />
              <span className="text-xs text-stone-400 mt-1">{i === 0 ? "Photo 1" : i === 1 ? "Photo 2" : "Vidéo"}</span>
            </div>
          ))}
        </div>

        {/* Commentaire */}
        <div className="mb-3">
          <label className="block text-xs font-black text-stone-600 mb-1">Commentaire</label>
          <textarea rows={3} placeholder="Décrivez le sinistre..." className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-fuchsia-400 resize-none" />
        </div>

        {/* Géolocalisation */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-3 border border-sky-100 mb-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-sky-600" />
          <div>
            <div className="text-xs font-bold text-sky-800">Géolocalisation automatique</div>
            <div className="text-xs text-sky-700 font-mono">8.4167° N · -5.0167° O · 28/06/2026</div>
          </div>
        </div>

        <button onClick={() => {
          setSubmitted(true);
          pushToast({ tone: "success", title: "Déclaration envoyée 📸", message: "Un expert vous contactera sous 48h" });
        }} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg ${submitted ? "bg-emerald-500" : "bg-gradient-to-br from-fuchsia-600 to-rose-500"}`}>
          {submitted ? "✓ Déclaration envoyée !" : "Soumettre la déclaration"}
        </button>
      </div>

      {/* Historique sinistres */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
        <div className="font-black text-stone-800 mb-3">📋 Historique sinistres</div>
        {[
          { date: "12/05/2026", type: "Sécheresse",    statut: "Indemnisé",   montant: 15000 },
          { date: "03/02/2026", type: "Maladie plants", statut: "En expertise", montant: null },
        ].map((s, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div>
              <div className="font-bold text-stone-800 text-sm">{s.type}</div>
              <div className="text-xs text-stone-500">{s.date}</div>
            </div>
            <div className={`text-xs font-bold rounded-full px-2 py-1 ${s.statut === "Indemnisé" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {s.statut}{s.montant ? ` · ${s.montant.toLocaleString("fr-FR")} F` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MODULE 8 : ÉVALUATION DES PERTES ====================

function LossesPage() {
  const { pushToast } = useApp();
  const [qty, setQty] = useState(500);
  const pricePerKg = 600; // FCFA/kg anacarde

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><BarChart2 className="w-6 h-6" /><div className="font-black text-lg">Évaluation des Pertes</div></div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/15 rounded-xl p-3"><div className="text-xs opacity-80">Quantité perdue</div><div className="text-2xl font-black">{qty} kg</div></div>
          <div className="bg-white/15 rounded-xl p-3"><div className="text-xs opacity-80">Valeur estimée</div><div className="text-2xl font-black">{(qty * pricePerKg).toLocaleString("fr-FR")} F</div></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">📊 Moteur d'évaluation</div>
        <div className="mb-3">
          <label className="block text-xs font-black text-stone-600 mb-2">Quantité perdue (kg)</label>
          <input type="range" min={0} max={5000} step={50} value={qty} onChange={e => setQty(Number(e.target.value))}
            className="w-full accent-slate-700" />
          <div className="flex justify-between text-xs text-stone-500 mt-1"><span>0 kg</span><span className="font-black text-slate-700">{qty} kg</span><span>5 000 kg</span></div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-3">
          <div className="text-xs text-stone-500 font-semibold mb-1">Valeur financière estimée</div>
          <Money value={qty * pricePerKg} size="lg" />
          <div className="text-xs text-stone-400 mt-1">Prix marché : {pricePerKg.toLocaleString("fr-FR")} FCFA/kg</div>
        </div>

        <button onClick={() => pushToast({ tone: "success", title: "Rapport généré !", message: "PDF disponible dans Certificat Numérique" })}
          className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg flex items-center justify-center gap-2">
          <FileText className="w-5 h-5" /> Générer le rapport automatique
        </button>
      </div>
    </div>
  );
}

// ==================== MODULE 9 : CERTIFICAT NUMÉRIQUE ====================

function CertificatePage() {
  const { pushToast } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><BadgeCheck className="w-6 h-6" /><div className="font-black text-lg">Certificat Numérique</div></div>
        <p className="text-sm opacity-90">Générez vos certificats de perte avec signature numérique et QR Code de vérification.</p>
      </div>

      {/* Certificats disponibles */}
      <div className="space-y-3 mb-4">
        {[
          { type: "Certificat de Perte", date: "12/05/2026", sinistre: "Sécheresse · Champ Anacarde", statut: "Signé" },
          { type: "Attestation Production", date: "01/01/2026", sinistre: "Saison 2025 · 3.2t", statut: "Signé" },
        ].map((cert, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-black text-stone-800">{cert.type}</div>
                <div className="text-xs text-stone-500 mt-0.5">{cert.sinistre}</div>
                <div className="text-xs text-stone-400">{cert.date}</div>
              </div>
              <div className="bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-2 py-1 flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> {cert.statut}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => pushToast({ tone: "info", title: "Téléchargement PDF", message: cert.type })}
                className="py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button className="py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-1">
                <QrCode className="w-4 h-4" /> QR Code
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => pushToast({ tone: "success", title: "Certificat généré 📜", message: "Disponible en PDF et QR Code" })}
        className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg flex items-center justify-center gap-2">
        <FileText className="w-5 h-5" /> Générer un nouveau certificat
      </button>
    </div>
  );
}

// ==================== MODULE 11 : COOPAVEC (Coopérative) ====================

function CoopavecPage() {
  const { pushToast } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 via-blue-700 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Building2 className="w-6 h-6" /><div className="font-black text-lg">COOPAVEC</div></div>
        <p className="text-sm opacity-90">Tableau de bord de votre coopérative agricole</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/20 rounded-xl p-3"><div className="text-xs opacity-80">Membres</div><div className="text-2xl font-black">47</div></div>
          <div className="bg-white/20 rounded-xl p-3"><div className="text-xs opacity-80">Cagnotte coop</div><div className="text-2xl font-black">1.2M F</div></div>
        </div>
      </div>

      {/* Tabs */}
      {[
        { icon: Users, label: "Gestion membres", count: "47 membres actifs" },
        { icon: TrendingUp, label: "Production collective", count: "142 t cette saison" },
        { icon: Coins, label: "Épargne coopérative", count: "1 200 000 F" },
        { icon: CreditCard, label: "Crédit groupe", count: "3 dossiers en cours" },
      ].map((item, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <item.icon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="font-black text-stone-800">{item.label}</div>
            <div className="text-xs text-stone-500">{item.count}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </div>
      ))}
    </div>
  );
}

// ==================== MODULE 12 : COLLECTE AGRICOLE ====================

function CollectePage() {
  const { pushToast } = useApp();
  const [step, setStep] = useState<"declare" | "request" | "track">("declare");

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-800 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Truck className="w-6 h-6" /><div className="font-black text-lg">Collecte Agricole</div></div>
        <p className="text-sm opacity-90">Déclarez votre récolte et planifiez le transport vers l'entrepôt.</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(["declare", "request", "track"] as const).map(s => (
          <button key={s} onClick={() => setStep(s)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              step === s ? "bg-amber-700 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {s === "declare" ? "📋 Récolte" : s === "request" ? "🚜 Collecte" : "📍 Suivi"}
          </button>
        ))}
      </div>

      {step === "declare" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
          <div className="font-black text-stone-800">Déclaration de récolte</div>
          {[
            { label: "Culture", value: "Anacarde" },
            { label: "Quantité (kg)", value: "2 400 kg" },
            { label: "Qualité", value: "Grade A" },
            { label: "Parcelle", value: "Champ Nord · 3.2 ha" },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-sm text-stone-500 font-semibold">{row.label}</span>
              <span className="text-sm font-black text-stone-800">{row.value}</span>
            </div>
          ))}
          <button onClick={() => { setStep("request"); pushToast({ tone: "success", title: "Récolte déclarée !", message: "2 400 kg d'anacarde" }); }}
            className="w-full py-3 bg-amber-700 text-white rounded-xl font-black">Confirmer la déclaration</button>
        </div>
      )}

      {step === "request" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
          <div className="font-black text-stone-800">Demande de collecte</div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="text-xs font-semibold text-amber-800">Transporteur affecté</div>
            <div className="font-black text-stone-800 mt-1">Koné Mamadou · 🚜 Camion 5t</div>
            <div className="text-xs text-stone-500">Arrivée prévue : 30/06/2026 · 08h00</div>
          </div>
          <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black">Confirmer la demande</button>
        </div>
      )}

      {step === "track" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <div className="font-black text-stone-800 mb-3">Suivi en temps réel</div>
          {[
            { label: "Récolte déclarée",    done: true,  time: "28/06 09:00" },
            { label: "Transporteur affecté", done: true,  time: "28/06 10:30" },
            { label: "En cours de collecte", done: false, time: "30/06 08:00" },
            { label: "Réception entrepôt",   done: false, time: "—" },
          ].map((s_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${s_.done ? "bg-emerald-500" : "bg-stone-200"}`}>
                {s_.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-stone-400 rounded-full" />}
              </div>
              <div className="flex-1"><div className={`text-sm font-bold ${s_.done ? "text-stone-800" : "text-stone-400"}`}>{s_.label}</div></div>
              <div className="text-xs text-stone-400 font-medium">{s_.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MODULE 13 : ENTREPÔTS ====================

function EntrepotsPage() {
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-cyan-600 via-teal-600 to-sky-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Warehouse className="w-6 h-6" /><div className="font-black text-lg">Entrepôts</div></div>
        <p className="text-sm opacity-90">Gestion des stocks, entrées, sorties et inventaires.</p>
      </div>

      {/* Dashboard entrepôt */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: "Stock total", value: "4 820 kg", icon: "📦", color: "bg-cyan-50 border-cyan-200" },
          { label: "Capacité", value: "78%", icon: "🏭", color: "bg-sky-50 border-sky-200" },
          { label: "Entrées (juin)", value: "2 400 kg", icon: "⬇️", color: "bg-emerald-50 border-emerald-200" },
          { label: "Sorties (juin)", value: "1 100 kg", icon: "⬆️", color: "bg-amber-50 border-amber-200" },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-2xl p-3 border shadow-sm ${stat.color}`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xs text-stone-500 font-semibold">{stat.label}</div>
            <div className="font-black text-stone-800 text-lg">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Inventaire */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
        <div className="font-black text-stone-800 mb-3">📋 Inventaire actuel</div>
        {[
          { produit: "Anacarde brut",    qte: "2 400 kg", lot: "L-2026-06", statut: "Bon" },
          { produit: "Maïs grain",       qte: "1 620 kg", lot: "L-2026-05", statut: "Bon" },
          { produit: "Cacao sec",        qte: "800 kg",   lot: "L-2026-04", statut: "Contrôle" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div>
              <div className="font-bold text-stone-800 text-sm">{item.produit}</div>
              <div className="text-xs text-stone-500">Lot {item.lot}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-stone-800 text-sm">{item.qte}</div>
              <div className={`text-xs font-bold ${item.statut === "Bon" ? "text-emerald-600" : "text-amber-600"}`}>{item.statut}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MODULE 14 : RECYCLAGE DES DÉCHETS ====================

function RecyclagePage() {
  const { pushToast } = useApp();
  const dechetsCibles = ["Manioc 🥔", "Cacao 🍫", "Anacarde 🥜", "Maïs 🌽", "Palmier 🌴"];

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Recycle className="w-6 h-6" /><div className="font-black text-lg">Recyclage des Déchets</div></div>
        <p className="text-sm opacity-90">Déclarez vos déchets agricoles pour collecte et valorisation.</p>
      </div>

      {/* Déchets ciblés */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">🌱 Déchets ciblés</div>
        <div className="flex flex-wrap gap-2">
          {dechetsCibles.map(d => (
            <div key={d} className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1.5 text-sm font-bold">{d}</div>
          ))}
        </div>
      </div>

      {/* Formulaire déclaration */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">📋 Déclaration de déchets</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-black text-stone-600 mb-1 block">Type de déchet</label>
            <select className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Coques d'anacarde</option>
              <option>Rafles de maïs</option>
              <option>Cabosse de cacao</option>
              <option>Régimes palmier</option>
              <option>Épluchures manioc</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-stone-600 mb-1 block">Quantité estimée (kg)</label>
            <input type="number" defaultValue={50} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs font-bold text-emerald-800">Localisation automatique</div>
              <div className="text-xs text-emerald-700 font-mono">8.4167° N · -5.0167° O</div>
            </div>
          </div>
        </div>
        <button onClick={() => pushToast({ tone: "success", title: "Déclaration enregistrée ♻️", message: "Collecte planifiée sous 72h" })}
          className="mt-4 w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-emerald-600 to-green-700 shadow-lg">
          Déclarer pour collecte
        </button>
      </div>

      {/* Registre */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
        <div className="font-black text-stone-800 mb-3">📊 Registre déchets agricoles</div>
        {[
          { type: "Coques anacarde", qte: "120 kg", statut: "Collecté", valorisation: "Biomasse" },
          { type: "Rafles maïs",     qte: "85 kg",  statut: "En attente", valorisation: "Compost" },
        ].map((r, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div>
              <div className="font-bold text-stone-800 text-sm">{r.type} · {r.qte}</div>
              <div className="text-xs text-stone-500">Valorisation : {r.valorisation}</div>
            </div>
            <div className={`text-xs font-bold rounded-full px-2 py-1 ${r.statut === "Collecté" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.statut}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MODULE CARBONE ====================

function CarbonPage() {
  const { carbonCredits, co2Saved } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="relative grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><Coins className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">Crédits carbone</div><div className="text-2xl font-black">{carbonCredits}</div></div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><TreePine className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">CO₂ économisé</div><div className="text-2xl font-black">{co2Saved}t</div></div>
        </div>
      </div>
      <button className="w-full bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl py-4 font-black shadow-lg flex items-center justify-center gap-2">
        💰 Vendre mes crédits carbone
      </button>
    </div>
  );
}

// ==================== MODULE MÉTÉO ====================

function WeatherPage() {
  const { lang, userVillage } = useApp();
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-90 font-semibold uppercase tracking-wide flex items-center gap-1">📍 {userVillage ?? "Katiola"}, Côte d'Ivoire</div>
          <div className="flex items-end justify-between mt-2">
            <div><div className="text-6xl font-black tracking-tight leading-none">32°</div><div className="text-lg font-bold opacity-95 mt-1">☀️ Soleil</div></div>
            <div className="text-7xl leading-none">☀️</div>
          </div>
        </div>
      </div>
      <div className="animate-fade-up delay-1 bg-gradient-to-br from-emerald-50 to-lime-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-5xl">🌱</div>
          <div className="flex-1"><div className="font-bold text-emerald-900">Conseil agronomique</div><div className="text-sm text-emerald-900 font-medium leading-relaxed mt-1">Bonne période pour semer. Pluies attendues jeudi — préparez vos champs.</div></div>
        </div>
      </div>
      <div className="animate-fade-up delay-2 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1"><div className="font-extrabold text-amber-900">Alerte fortes pluies 💧</div><div className="text-sm text-amber-800 mt-0.5">Jeudi et vendredi : risque d'inondation.</div></div>
        </div>
      </div>
    </div>
  );
}

// ==================== MODULE PAIEMENTS ====================

function PaymentsPage() {
  const { lang, balance, transactions, addTx, pushToast } = useApp();
  const [mode, setMode]     = useState<"send" | "receive">("send");
  const [phone, setPhone]   = useState("");
  const [amount, setAmount] = useState(5000);
  const [operator, setOperator] = useState("wave");
  const [sent, setSent]     = useState(false);

  const operators = [
    { id: "wave",   label: "Wave",         color: "bg-blue-500" },
    { id: "orange", label: "Orange Money", color: "bg-orange-500" },
    { id: "mtn",    label: "MTN Money",    color: "bg-yellow-400" },
    { id: "moov",   label: "Moov Money",   color: "bg-green-500" },
  ];

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="text-xs opacity-90 font-semibold">💚 Solde disponible</div>
        <Money value={balance} size="lg" />
      </div>

      {/* Opérateurs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {operators.map(op => (
          <button key={op.id} onClick={() => setOperator(op.id)}
            className={`py-2 rounded-xl text-white text-xs font-black transition-all ${op.color} ${operator === op.id ? "scale-105 shadow-lg" : "opacity-60"}`}>
            {op.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up delay-1 bg-white rounded-2xl p-4 shadow-sm border border-stone-200 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setMode("send")} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${
            mode === "send" ? "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md" : "bg-stone-100 text-stone-600"
          }`}><ArrowUpRight className="w-5 h-5" /> Envoyer</button>
          <button onClick={() => setMode("receive")} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${
            mode === "receive" ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md" : "bg-stone-100 text-stone-600"
          }`}><ArrowDownLeft className="w-5 h-5" /> Recevoir</button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-black text-stone-600 mb-1.5">Numéro {mode === "send" ? "du destinataire" : "de l'expéditeur"}</label>
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-3">
            <Phone className="w-5 h-5 text-stone-500" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07 XX XX XX XX" className="bg-transparent flex-1 outline-none font-semibold" />
          </div>
        </div>

        <div className="text-xs text-stone-500 mb-2 font-bold">Montant</div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[1000, 2000, 5000, 10000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`py-2.5 rounded-xl text-sm font-black transition-all ${
              amount === v ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
            }`}>{v / 1000}k</button>
          ))}
        </div>

        <div className="bg-violet-50 rounded-xl p-3 text-center mb-3 border border-stone-200">
          <Money value={amount} size="md" />
        </div>

        <button onClick={() => {
          if (phone && amount > 0) {
            addTx({ type: mode === "send" ? "send" : "receive", amount, label: mode === "send" ? `→ ${phone} (${operator.toUpperCase()})` : `← ${phone}` });
            pushToast({ tone: "success", title: mode === "send" ? "Envoi réussi ✓" : "Réception confirmée ✓", message: `${amount.toLocaleString("fr-FR")} F` });
            setSent(true);
            setTimeout(() => setSent(false), 2200);
          }
        }} disabled={sent} className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2 ${
          sent ? "bg-emerald-500" : mode === "send" ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-emerald-500 to-green-600"
        }`}>
          {sent ? <><CheckCircle2 className="w-5 h-5" /> Confirmé ✓</> : <>Confirmer ✓</>}
        </button>
      </div>

      {/* Historique */}
      <div className="animate-fade-up delay-2 bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-5 h-5 text-stone-600" /><div className="text-xs text-stone-500 uppercase font-black tracking-wide">Transactions récentes</div></div>
        <div className="space-y-2">
          {transactions.slice(0, 6).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 px-2 rounded-xl hover:bg-stone-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  (tx.type === "send" || tx.type === "withdraw") ? "bg-rose-100" : "bg-emerald-100"
                }`}>
                  {(tx.type === "send" || tx.type === "withdraw") ? <ArrowUpRight className="w-4 h-4 text-rose-600" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm truncate">{tx.label}</div>
                  <div className="text-xs text-stone-500 font-medium">{tx.date}</div>
                </div>
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

// ==================== FINANCEMENT PARTICIPATIF (Module 10) ====================

function CrowdfundPage() {
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-lime-600 via-green-600 to-emerald-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-6 h-6" /><div className="font-black text-lg">Financement Participatif</div></div>
        <p className="text-sm opacity-90">Plateforme pour investisseurs et agriculteurs.</p>
      </div>
      <div className="space-y-3">
        {[
          { name: "Projet Anacarde Hambol",    target: 500000, raised: 310000, investors: 12, return: "12%", culture: "🥜 Anacarde" },
          { name: "Irrigation Maïs Bouaké",    target: 200000, raised: 180000, investors: 8,  return: "10%", culture: "🌽 Maïs" },
          { name: "Cacao Bio Daloa",            target: 800000, raised: 240000, investors: 5,  return: "15%", culture: "🍫 Cacao" },
        ].map((proj, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div><div className="font-black text-stone-800">{proj.name}</div><div className="text-xs text-stone-500 mt-0.5">{proj.culture}</div></div>
              <div className="bg-lime-100 text-lime-700 text-xs font-black rounded-full px-2 py-1">{proj.return} /an</div>
            </div>
            <div className="flex gap-4 text-xs text-stone-500 mb-2">
              <span>👥 {proj.investors} investisseurs</span>
              <span>🎯 {Math.round(proj.raised / proj.target * 100)}% financé</span>
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full mb-1 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full" style={{ width: `${Math.round(proj.raised / proj.target * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold text-stone-600 mb-3">
              <span>{proj.raised.toLocaleString("fr-FR")} F</span>
              <span>sur {proj.target.toLocaleString("fr-FR")} F</span>
            </div>
            <button className="w-full py-2.5 bg-lime-600 text-white rounded-xl font-bold text-sm">Investir dans ce projet</button>
          </div>
        ))}
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
                {userName?.charAt(0) || "C"}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold text-stone-900 text-sm tracking-tight">{title || "COOPAVEC"}</span>
              <span className="text-[10px] text-stone-500 flex items-center gap-1">
                {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                {online ? "Connecté" : "Hors ligne"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700">
              <Languages className="w-4 h-4" />
              {LANGS.find((l) => l.code === lang)?.flag}
            </button>
            {onLogout && (
              <button onClick={onLogout} className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700">
                🚪
              </button>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
  const items: { key: PageKey; icon: any; label: string }[] = [
    { key: "home",     icon: Home,    label: "Accueil" },
    { key: "weather",  icon: Cloud,   label: "Météo" },
    { key: "parcelles",icon: Sprout,  label: "Champs" },
    { key: "payments", icon: Wallet,  label: "Paiements" },
    { key: "identity", icon: User,    label: "Mon ID" },
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
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ==================== MAIN SHELL ====================

type AllPages =
  | PageKey
  | "susu" | "credit" | "insurance" | "agriprotect" | "losses"
  | "certificate" | "coopavec" | "crowdfund" | "collecte"
  | "entrepots" | "recyclage" | "carbon";

const PAGE_TITLES: Record<string, string> = {
  home:        "COOPAVEC",
  susu:        "AgriSusu",
  weather:     "Météo & Alertes",
  parcelles:   "Mes Champs",
  credit:      "Crédit & Financement",
  insurance:   "Assurance Agricole",
  agriprotect: "Agri-Protect Photo",
  losses:      "Évaluation des Pertes",
  certificate: "Certificat Numérique",
  coopavec:    "COOPAVEC Coop.",
  crowdfund:   "Fin. Participatif",
  collecte:    "Collecte Agricole",
  entrepots:   "Entrepôts",
  recyclage:   "Recyclage Déchets",
  carbon:      "Crédits Carbone",
  identity:    "Mon ID Agricole",
  payments:    "Paiements Mobile",
};

function Shell() {
  const { user }   = useAuth();
  const [page, setPage] = useState<AllPages>("home");
  const [pageKey, setPageKey] = useState(0);

  if (!user) return <LoginPage />;

  const bottomPages = new Set<string>(["home", "weather", "parcelles", "payments", "identity"]);
  const bottomKey: PageKey = (bottomPages.has(page) ? page : "home") as PageKey;

  const navigate = (p: string) => { setPage(p as AllPages); setPageKey((k) => k + 1); };
  const goHome   = () => navigate("home");

  const render = () => {
    switch (page) {
      case "home":        return <Dashboard onNavigate={navigate} />;
      case "susu":        return <SusuPage />;
      case "weather":     return <WeatherPage />;
      case "parcelles":   return <ParcellesPage />;
      case "credit":      return <CreditPage />;
      case "insurance":   return <InsurancePage />;
      case "agriprotect": return <AgriProtectPage />;
      case "losses":      return <LossesPage />;
      case "certificate": return <CertificatePage />;
      case "coopavec":    return <CoopavecPage />;
      case "crowdfund":   return <CrowdfundPage />;
      case "collecte":    return <CollectePage />;
      case "entrepots":   return <EntrepotsPage />;
      case "recyclage":   return <RecyclagePage />;
      case "carbon":      return <CarbonPage />;
      case "identity":    return <IdentityPage />;
      case "payments":    return <PaymentsPage />;
      default:            return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen max-w-xl mx-auto relative shadow-2xl bg-gradient-to-b from-amber-50/40 to-emerald-50/40">
      <TopBar
        title={PAGE_TITLES[page]}
        onBack={page !== "home" ? goHome : undefined}
        userName={user.name}
        onLogout={() => window.location.reload()}
      />
      <main key={pageKey} className="pb-20 animate-fade-in">{render()}</main>
      <BottomNav current={bottomKey} onChange={navigate} />
      <Toast />
    </div>
  );
}

// ==================== EXPORT ====================

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </AuthProvider>
  );
}