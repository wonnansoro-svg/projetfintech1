import { useState, useEffect, useRef } from "react";
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader, AlertCircle, CheckCircle2,
  Wifi, WifiOff, Languages, ChevronLeft, Home, Cloud, Sprout, Wallet,
  AlertTriangle, Shield, TreePine, Coins, ArrowUpRight, ArrowDownLeft,
  Clock, Phone, QrCode, MapPin, User, Leaf, Users, Truck, Warehouse,
  Recycle, FileText, Camera, BarChart2, CreditCard, Building2,
  Package, BadgeCheck, ChevronRight, Star, TrendingUp, Banknote,
  LogOut, Settings, Bell, PieChart, Activity, DollarSign, X, UserPlus,
  UsersRound, Plus, Pencil, Trash2,
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { t, LANGS, type Lang, getGreeting } from "./i18n";
import BeneficiaryOnboardingForm from "./components/BeneficiaryOnboardingForm";
import AddParcelForm from "./components/AddParcelForm";
import IdentityQRCode from "./components/IdentityQRCode";
import { getCurrentLocation, type GeoPoint } from "./lib/geolocation";
import { subscribeToGuaranteeFund, subscribeToCreditSettings, getGuaranteeFund, getCreditSettings } from "./services/fundService";
import { recordContribution, computeWeeklyStreak, getContributionSplitTotals, getContributionsTotalForUsers } from "./services/contributionService";
import { subscribeToWallet, getWallet } from "./services/walletService";
import {
  subscribeToUserCredits, subscribeToPendingCredits, countActiveCredits,
  createBondForFarmer, approveBondByBeneficiary, rejectBondByBeneficiary,
  subscribeToInvestableBonds, subscribeToInvestorBonds, investInBond, getCredit,
  subscribeToPendingBondInvestments, reviewBondInvestment,
} from "./services/creditService";
import { computeCreditCeiling, computeFinancingScore } from "./lib/credit";
import { listProfiles, updateProfile, getProfile, resolveLoginEmail } from "./services/profileService";
import { looksLikeEmail, syntheticEmailForPhone } from "./lib/phoneAuth";
import { createGroup, updateGroup, deleteGroup, subscribeToGroupsByCooperative } from "./services/groupService";
import { hasPermission } from "./lib/permissions";
import { uploadKycPhoto, uploadLossPhoto } from "./services/storageService";
import { submitLossClaim, getUserLossValueFcfa } from "./services/lossService";
import DocumentPreviewModal from "./components/DocumentPreviewModal";
import type { PdfDocumentData } from "./lib/pdf";
import { buildIdentityPayload } from "./lib/qr";
import { vibrate } from "./lib/haptics";
import ConfirmButton from "./components/ConfirmButton";
import { SkeletonList } from "./components/Skeleton";
import SpeakButton from "./components/SpeakButton";
import WavePaymentBanner from "./components/WavePaymentBanner";
import OnboardingTour, { hasSeenOnboarding } from "./components/OnboardingTour";
import { describeAuthError } from "./lib/authErrors";
import { subscribeToNotifications, markAllRead } from "./services/notificationService";
import type { AppNotification } from "./types/firestore";
import AddBeneficiaryForm from "./components/AddBeneficiaryForm";
import MemberDetailPanel from "./components/MemberDetailPanel";
import { listRecentTransactions } from "./services/transactionService";
import { getAgriculturalAdvice } from "./lib/weather";
import { useBackGuard } from "./lib/backGuard";
import type { GuaranteeFund, CreditSettings, Credit, Profile, Transaction, SusuGroup, BondInvestment } from "./types/firestore";

// ==================== COMPOSANTS RÉUTILISABLES ====================

function Tile({ emoji, label, sub, onClick, color = "green", badge, size = "lg" }: {
  emoji?: string; label: string; sub?: string; onClick?: () => void;
  color?: string; badge?: any; size?: string;
}) {
  const COLORS: Record<string, string> = {
    green:   "bg-green-600 active:bg-green-700",
    amber:   "bg-amber-500 active:bg-amber-600",
    sky:     "bg-sky-500 active:bg-sky-600",
    rose:    "bg-rose-500 active:bg-rose-600",
    violet:  "bg-violet-600 active:bg-violet-700",
    emerald: "bg-emerald-500 active:bg-emerald-600",
    orange:  "bg-orange-500 active:bg-orange-600",
    indigo:  "bg-indigo-600 active:bg-indigo-700",
    teal:    "bg-teal-600 active:bg-teal-700",
    lime:    "bg-lime-600 active:bg-lime-700",
    cyan:    "bg-cyan-600 active:bg-cyan-700",
    fuchsia: "bg-fuchsia-600 active:bg-fuchsia-700",
    slate:   "bg-slate-600 active:bg-slate-700",
    brown:   "bg-amber-800 active:bg-amber-900",
  };
  return (
    <button onClick={onClick}
      className={`relative flex flex-col justify-between text-white rounded-2xl shadow active:scale-95 transition-transform p-3.5 min-h-[90px] ${COLORS[color] ?? COLORS.green}`}>
      {badge !== undefined && (
        <span className="absolute top-2 right-2 bg-white text-rose-600 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow">
          {badge}
        </span>
      )}
      <span className="text-2xl leading-none">{emoji}</span>
      <div>
        <div className="text-sm font-black leading-tight">{label}</div>
        {sub && <div className="text-[10px] opacity-80 mt-0.5 leading-tight">{sub}</div>}
      </div>
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
  const [identifier, setIdentifier] = useState("");
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
      if (isLogin) {
        const email = await resolveLoginEmail(identifier);
        await login(email, password);
      } else {
        const email = looksLikeEmail(identifier) ? identifier : syntheticEmailForPhone(identifier);
        await signup(email, password);
      }
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-stone-100 to-green-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Brand */}
        <div className="p-6 pb-0 text-center">
          <div className="flex justify-end mb-4 gap-2">
            {(["fr", "en"] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${lang === l ? "bg-green-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-3 shadow-lg">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">COOPAVEC</h1>
          <p className="text-stone-500 text-xs mt-0.5">AgriFinance Pay · Côte d'Ivoire 🇨🇮</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl mb-2">
            {[{v:true,l:"Connexion"},{v:false,l:"Inscription"}].map(it=>(
              <button key={String(it.v)} type="button" onClick={() => setIsLogin(it.v)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isLogin === it.v ? "bg-white shadow text-stone-900" : "text-stone-500"}`}>
                {it.l}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email ou téléphone</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="contact@exemple.com ou 07 00 00 00 00" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isLogin ? "Se connecter" : "S'inscrire"}
          </button>

          <div className="text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-medium text-green-600 hover:text-green-700 underline">
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
    { emoji: "🤝", label: "Bokanmin",         sub: "Épargne",    color: "amber",   page: "susu" },
    { emoji: "💳", label: "Bon de financement",sub: "Participatif",color: "violet",  page: "credit" },
    // Ligne 3 — Protection
    { emoji: "🛡️", label: "Assurance",        sub: insuranceTriggered ? "Alerte !" : "Active", color: "rose", page: "insurance", badge: insuranceTriggered ? "!" : undefined },
    { emoji: "📸", label: "AgriProtect",      sub: "Photo perte",color: "fuchsia", page: "agriprotect" },
    // Ligne 4 — Évaluation & Certification
    { emoji: "📉", label: "Éval. Pertes",     sub: "Sinistres",  color: "slate",   page: "losses" },
    { emoji: "📜", label: "Certificat",       sub: "Numérique",  color: "teal",    page: "certificate" },
    // Ligne 5 — Collectivité & Finance
    { emoji: "🏛️", label: "COOPAVEC",         sub: "Coopérative",color: "indigo",  page: "coopavec" },
    { emoji: "🛒", label: "Marketplace",      sub: "Commandes",  color: "orange",  page: "marketplace" },
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
        <SpeakButton text={`${greeting}, ${userName}. Votre solde disponible est de ${balance.toLocaleString("fr-FR")} francs CFA.`} className="mt-1" />
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

      {/* Raccourcis rapides – pleine largeur */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <button onClick={() => onNavigate("payments")}
          className="flex items-center gap-3 bg-indigo-600 active:bg-indigo-700 text-white rounded-2xl p-3.5 shadow active:scale-95 transition-transform">
          <span className="text-2xl">💸</span>
          <div className="text-left"><div className="font-black text-sm leading-tight">Paiements</div><div className="text-[10px] opacity-75">Wave · Orange · MTN</div></div>
        </button>
        <button onClick={() => onNavigate("weather")}
          className="flex items-center gap-3 bg-sky-500 active:bg-sky-600 text-white rounded-2xl p-3.5 shadow active:scale-95 transition-transform">
          <span className="text-2xl">☁️</span>
          <div className="text-left"><div className="font-black text-sm leading-tight">Météo</div><div className="text-[10px] opacity-75">Alertes & Conseils</div></div>
        </button>
      </div>

      {/* Section: Identité & Champs */}
      <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Identité & Champs</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {modules.slice(0,2).map(m => (
          <Tile key={m.page} emoji={m.emoji} label={m.label} sub={m.sub} color={m.color}
            onClick={() => onNavigate(m.page)} badge={(m as any).badge} />
        ))}
      </div>

      {/* Section: Finance */}
      <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Finance & Épargne</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {modules.slice(2,4).map(m => (
          <Tile key={m.page} emoji={m.emoji} label={m.label} sub={m.sub} color={m.color}
            onClick={() => onNavigate(m.page)} badge={(m as any).badge} />
        ))}
      </div>

      {/* Section: Protection */}
      <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Protection & Sinistres</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {modules.slice(4,8).map(m => (
          <Tile key={m.page} emoji={m.emoji} label={m.label} sub={m.sub} color={m.color}
            onClick={() => onNavigate(m.page)} badge={(m as any).badge} />
        ))}
      </div>

      {/* Section: Coopérative */}
      <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Coopérative & Marché</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {modules.slice(8,13).map(m => (
          <Tile key={m.page} emoji={m.emoji} label={m.label} sub={m.sub} color={m.color}
            onClick={() => onNavigate(m.page)} badge={(m as any).badge} />
        ))}
      </div>

      {/* Section: Durabilité */}
      <p className="text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Durabilité</p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {modules.slice(13,15).map(m => (
          <Tile key={m.page} emoji={m.emoji} label={m.label} sub={m.sub} color={m.color}
            onClick={() => onNavigate(m.page)} badge={(m as any).badge} />
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Hors ligne disponible · USSD actif · 🇨🇮
      </div>
    </div>
  );
}

// ==================== MODULE 1 : MON ID AGRICOLE ====================

function IdentityPage({ onLogout }: { onLogout?: () => void }) {
  const [tab, setTab] = useState<"profil" | "kyc" | "gps">("profil");
  const { user, profile } = useAuth();
  const { pushToast, textScale, setTextScale } = useApp();
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const idPhotoInputRef = useRef<HTMLInputElement>(null);
  const [idCardPreview, setIdCardPreview] = useState<PdfDocumentData | null>(null);
  const [showTour, setShowTour] = useState(false);

  const handleIdPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadingId(true);
    try {
      const url = await uploadKycPhoto(user.id, file);
      await updateProfile(user.id, { kycIdPhotoUrl: url });
      pushToast({ tone: "success", title: "Photo enregistrée", message: "Votre pièce d'identité a été transmise pour vérification." });
    } catch (err) {
      console.error("Erreur upload pièce d'identité :", err);
      pushToast({ tone: "warn", title: "Échec de l'envoi", message: "Vérifiez votre connexion et réessayez." });
    } finally {
      setUploadingId(false);
    }
  };

  const refreshLocation = async () => {
    setLocating(true);
    setGpsError("");
    try {
      setGps(await getCurrentLocation());
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : "Impossible d'obtenir la position GPS.");
    } finally {
      setLocating(false);
    }
  };

  const kycLabel = profile?.kycStatus === "level2" ? "KYC Niveau 2 validé"
    : profile?.kycStatus === "level1" ? "KYC Niveau 1 validé"
    : "KYC en attente de validation";

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      {/* Header Card */}
      <div className="animate-fade-up relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-start gap-4 mb-4">
          <Avatar name={profile?.fullName || "?"} size="xl" />
          <div className="flex-1">
            <div className="text-xl font-black">{profile?.fullName}</div>
            <div className="text-xs opacity-90 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {profile?.phone}</div>
            <div className="mt-2 inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
              <BadgeCheck className="w-3.5 h-3.5" /> {kycLabel}
            </div>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl py-2.5 text-sm font-bold transition-colors active:scale-95">
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
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

      {tab === "profil" && profile && (
        <div className="space-y-3">
          {[
            { label: "Nom complet",    value: profile.fullName, icon: "👤" },
            { label: "Téléphone",      value: profile.phone, icon: "📞" },
            { label: "Coopérative",    value: profile.cooperativeId, icon: "🏛️" },
            { label: "Région",         value: `${profile.village}, ${profile.region}`, icon: "📍" },
            { label: "Cultures",       value: profile.crops.join(" · ") || "—", icon: "🌾" },
          ].map(row => (
            <div key={row.label} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-3">
              <span className="text-2xl">{row.icon}</span>
              <div><div className="text-xs text-stone-500 font-semibold">{row.label}</div><div className="font-bold text-stone-800">{row.value}</div></div>
            </div>
          ))}

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="text-xs text-stone-500 font-semibold mb-2">Taille du texte</div>
            <div className="grid grid-cols-3 gap-2">
              {([["sm", "A⁻", "Petit"], ["md", "A", "Normal"], ["lg", "A⁺", "Grand"]] as const).map(([scale, symbol, name]) => (
                <button key={scale} onClick={() => setTextScale(scale)}
                  className={`py-2.5 rounded-xl text-sm font-black transition-all ${
                    textScale === scale ? "bg-orange-500 text-white shadow" : "bg-stone-100 text-stone-600"
                  }`}>
                  {symbol}<div className="text-[10px] font-semibold mt-0.5">{name}</div>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setShowTour(true)}
            className="w-full py-3 bg-white border border-stone-200 rounded-2xl font-bold text-sm text-stone-600 flex items-center justify-center gap-2">
            🎓 Revoir le tutoriel
          </button>
        </div>
      )}

      {tab === "kyc" && profile && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><User className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">Pièce d'identité</span></div>
            <input ref={idPhotoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdPhotoSelected} />
            <button type="button" onClick={() => idPhotoInputRef.current?.click()} disabled={uploadingId}
              className="w-full bg-stone-50 rounded-xl p-6 text-center border-2 border-dashed border-stone-300 disabled:opacity-60">
              {profile.kycIdPhotoUrl ? (
                <img src={profile.kycIdPhotoUrl} alt="Pièce d'identité" className="max-h-40 mx-auto rounded-lg mb-2 object-contain" />
              ) : uploadingId ? (
                <Loader className="w-10 h-10 text-stone-400 mx-auto mb-2 animate-spin" />
              ) : (
                <Camera className="w-10 h-10 text-stone-400 mx-auto mb-2" />
              )}
              <div className="text-sm text-stone-500 font-medium">
                {uploadingId ? "Envoi en cours…" : profile.kycIdPhotoUrl ? "Photo CNI / Passeport — appuyez pour remplacer" : "Appuyez pour photographier votre CNI / Passeport"}
              </div>
              {profile.kycStatus === "pending" ? (
                <div className="mt-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-3 py-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {profile.kycIdPhotoUrl ? "En attente de vérification par un agent" : "Photo requise"}
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Validée — {kycLabel}
                </div>
              )}
            </button>
          </div>

          {/* Plafonds réglementaires BCEAO liés au niveau KYC */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">Plafonds selon niveau KYC</span></div>
            <div className="space-y-2">
              {[
                { key: "level1", level: "Niveau 1", tx: "100 000 F", month: "500 000 F", solde: "300 000 F" },
                { key: "level2", level: "Niveau 2", tx: "500 000 F", month: "2 000 000 F", solde: "1 500 000 F" },
              ].map((r) => {
                const active = profile.kycStatus === r.key;
                return (
                  <div key={r.key} className={`rounded-xl p-3 border ${active ? "bg-orange-50 border-orange-200" : "bg-stone-50 border-stone-200"}`}>
                    <div className={`text-xs font-black mb-1 ${active ? "text-orange-700" : "text-stone-500"}`}>{r.level}{active ? " (actuel)" : ""}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="text-[10px] text-stone-500">Par transaction</div><div className="font-bold text-stone-800 text-xs">{r.tx}</div></div>
                      <div><div className="text-[10px] text-stone-500">Par mois</div><div className="font-bold text-stone-800 text-xs">{r.month}</div></div>
                      <div><div className="text-[10px] text-stone-500">Solde max</div><div className="font-bold text-stone-800 text-xs">{r.solde}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><QrCode className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">QR Code de vérification</span></div>
            <div className="flex justify-center mb-3">
              <IdentityQRCode profile={profile} />
            </div>
            <button onClick={() => setIdCardPreview({
              title: "Carte d'Identité Agricole",
              subtitle: "Coopérative COOPAVEC",
              farmer: { fullName: profile.fullName, phone: profile.phone, village: profile.village, region: profile.region, cooperativeId: profile.cooperativeId },
              fields: [
                { label: "Statut KYC", value: kycLabel },
                { label: "Cultures", value: profile.crops.join(" · ") || "—" },
              ],
              qrPayload: buildIdentityPayload(profile),
            })}
              className="w-full py-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Télécharger ma carte d'identité (PDF)
            </button>
          </div>
        </div>
      )}

      {tab === "gps" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><MapPin className="w-5 h-5 text-orange-500" /><span className="font-black text-stone-800">Adresse GPS</span></div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
            <div className="text-xs text-stone-500 font-semibold mb-1">Coordonnées</div>
            {gps ? (
              <div className="font-mono font-bold text-stone-800">{gps.lat.toFixed(5)}° N, {gps.lng.toFixed(5)}° E</div>
            ) : (
              <div className="text-sm text-stone-500">Position non capturée</div>
            )}
            <div className="text-xs text-stone-500 mt-2">{profile ? `${profile.village}, ${profile.region} — Côte d'Ivoire` : ""}</div>
            {gpsError && <div className="text-xs text-red-600 mt-2">{gpsError}</div>}
          </div>
          <button onClick={refreshLocation} disabled={locating}
            className="mt-3 w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {locating ? <Loader className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Actualiser ma position
          </button>
        </div>
      )}

      {idCardPreview && (
        <DocumentPreviewModal data={idCardPreview} filename="Carte_Identite_Agricole.pdf"
          onClose={() => setIdCardPreview(null)}
          onValidated={() => setIdCardPreview(null)} />
      )}
      {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}
    </div>
  );
}

// ==================== MODULE 2 : MES CHAMPS ====================

function ParcellesPage() {
  const { parcels, parcelsLoading } = useApp();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const cropEmoji: Record<string, string> = { maize: "🌽", millet: "🌾", rice: "🍚", anacarde: "🥜", cacao: "🍫", manioc: "🥔" };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="font-black text-stone-800 text-lg">🌾 Mes Parcelles</div>
        <button onClick={() => setShowAdd(true)} className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-bold">+ Ajouter</button>
      </div>
      {parcelsLoading && <SkeletonList rows={2} />}
      {!parcelsLoading && parcels.length === 0 && (
        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
          <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <div className="text-sm text-stone-500 font-medium">Aucune parcelle enregistrée</div>
          <div className="text-xs text-stone-400 mt-1">Ajoutez une parcelle avec sa position GPS réelle</div>
        </div>
      )}
      <div className="space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className="animate-fade-up bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-4xl">{cropEmoji[p.crop] ?? "🌱"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-stone-800 truncate">{p.name}</div>
                <div className="text-sm text-stone-600">📏 {p.hectares} ha</div>
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
      {showAdd && user && (
        <AddParcelForm ownerId={user.id} onClose={() => setShowAdd(false)} onDone={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// ==================== MODULE 3 : AGRISUSU (Épargne & Cotisations) ====================

const WEEKLY_CONTRIBUTION = 1500;

function SusuPage() {
  const { pushToast } = useApp();
  const { user } = useAuth();
  const [weeks, setWeeks] = useState(1);
  const amount = WEEKLY_CONTRIBUTION * weeks;
  const [tab, setTab] = useState<"epargne" | "fonds">("epargne");
  const [fund, setFund] = useState<GuaranteeFund | null>(null);
  const [myContribution, setMyContribution] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToGuaranteeFund(setFund);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToWallet(user.id, (w) => setMyContribution(w?.totalContributed ?? 0));
    return () => unsubscribe();
  }, [user?.id]);

  const refreshStreak = () => { if (user) computeWeeklyStreak(user.id).then(setStreak); };
  useEffect(refreshStreak, [user?.id]);

  const confirmContribution = async () => {
    if (!user) return;
    try {
      await recordContribution(user.id, amount, "guarantee_fund");
      pushToast({ tone: "success", title: "Cotisation enregistrée !", message: `${amount.toLocaleString("fr-FR")} F` });
      refreshStreak();
    } catch (err) {
      console.error("Erreur cotisation :", err);
      pushToast({ tone: "warn", title: "Échec de la cotisation", message: "Réessayez, vérifiez votre connexion." });
      throw err;
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center justify-between">
          <div className="text-xs opacity-90 font-semibold uppercase tracking-wide">Bokanmin — Fonds de garantie</div>
          {streak > 0 && (
            <div className="bg-white/25 rounded-full px-2.5 py-1 text-xs font-black flex items-center gap-1">🔥 {streak} semaine{streak > 1 ? "s" : ""}</div>
          )}
        </div>
        <div className="text-2xl font-black mb-1">Épargne collective 🤝</div>
        <div className="text-sm opacity-95">L'argent cotisé par tous les bénéficiaires devient l'assurance qui débloque les crédits agricoles</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Fonds commun</div><div className="font-black text-lg">{(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Ma cotisation totale</div><div className="font-black text-lg">{myContribution.toLocaleString("fr-FR")} F</div></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["epargne", "fonds"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              tab === t ? "bg-amber-500 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {t === "epargne" ? "💰 Cotiser" : "🏦 Le fonds commun"}
          </button>
        ))}
      </div>

      {tab === "epargne" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 mb-3">
            Cotisation fixe de <span className="font-black text-stone-700">1 500 FCFA / semaine</span>. Cotiser régulièrement rend éligible aux crédits agricoles et à l'assurance agricole.
          </p>
          <div className="flex items-center justify-center gap-3 mb-3">
            <button onClick={() => setWeeks((w) => Math.max(1, w - 1))}
              className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-black text-lg">−</button>
            <div className="text-center">
              <div className="text-2xl font-black text-stone-800">{weeks}</div>
              <div className="text-[10px] text-stone-500 font-semibold uppercase">semaine{weeks > 1 ? "s" : ""}</div>
            </div>
            <button onClick={() => setWeeks((w) => w + 1)}
              className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-black text-lg">+</button>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center mb-3 border border-amber-100">
            <Money value={amount} size="md" />
          </div>
          <div className="mb-3">
            <WavePaymentBanner amount={amount} />
          </div>
          <ConfirmButton onConfirm={confirmContribution} label="Confirmer ✓"
            className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600" />
        </div>
      )}

      {tab === "fonds" && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <div className="text-xs text-stone-500 font-semibold">Déposé en banque</div>
              <div className="font-black text-stone-800">{(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <div className="text-xs text-stone-500 font-semibold">Déjà prêté (crédits)</div>
              <div className="font-black text-stone-800">{(fund?.totalDisbursedAsCredits ?? 0).toLocaleString("fr-FR")} F</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 col-span-2">
              <div className="text-xs text-emerald-700 font-semibold">Disponible pour de nouveaux crédits</div>
              <div className="font-black text-emerald-800 text-lg">{(fund?.availableForCredit ?? 0).toLocaleString("fr-FR")} F</div>
            </div>
          </div>
          <p className="text-xs text-stone-500 flex items-start gap-2">
            <span>Chaque cotisation renforce le fonds commun. Ce fonds sert de garantie auprès de la banque : plus il est important, plus les bénéficiaires peuvent accéder à des crédits agricoles importants.</span>
            <SpeakButton text="Chaque cotisation renforce le fonds commun. Ce fonds sert de garantie auprès de la banque. Plus il est important, plus les bénéficiaires peuvent accéder à des crédits agricoles importants." />
          </p>
        </div>
      )}
    </div>
  );
}

// ==================== MODULE 4 : CRÉDIT (Financement Participatif inclus) ====================

function CreditPage() {
  const { pushToast } = useApp();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"mesbons" | "remboursement">("mesbons");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [fund, setFund] = useState<GuaranteeFund | null>(null);
  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [contribution12m, setContribution12m] = useState(0);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [lossValue, setLossValue] = useState(0);

  useEffect(() => { const u = subscribeToGuaranteeFund(setFund); return () => u(); }, []);
  useEffect(() => { const u = subscribeToCreditSettings(setSettings); return () => u(); }, []);
  useEffect(() => {
    if (!user) return;
    const u = subscribeToWallet(user.id, (w) => setContribution12m(w?.contributionsLast12m ?? 0));
    return () => u();
  }, [user?.id]);
  useEffect(() => {
    if (!user) { setCredits([]); return; }
    const u = subscribeToUserCredits(user.id, setCredits);
    return () => u();
  }, [user?.id]);
  useEffect(() => { if (user) getUserLossValueFcfa(user.id).then(setLossValue); }, [user?.id]);

  const financingScore = computeFinancingScore(lossValue);

  const ceilingResult = fund && settings && profile
    ? computeCreditCeiling({ personalContribution12m: contribution12m, fund, settings, kycStatus: profile.kycStatus, financingScore })
    : null;
  const ceiling = ceilingResult?.ceiling ?? 0;

  const progressHint = (() => {
    if (!ceilingResult || !settings) return null;
    const { personalCap, fundShareCap, regulatoryCap } = ceilingResult;
    const limiter = Math.min(personalCap, fundShareCap, regulatoryCap);
    if (limiter === personalCap && personalCap < fundShareCap && personalCap < regulatoryCap) {
      return "Votre plafond est limité par vos cotisations — cotisez régulièrement sur Bokanmin pour l'augmenter.";
    }
    if (limiter === fundShareCap) {
      return "Votre plafond est limité par le fonds de garantie collectif — plus de cotisations de la coopérative l'augmenteront pour tous.";
    }
    return null;
  })();

  const latestCredit = credits[0] ?? null;
  const pendingBonds = credits.filter((c) => c.status === "pending");

  const decideBond = async (creditId: string, action: "approve" | "reject") => {
    if (!user) return;
    setDecidingId(creditId);
    try {
      if (action === "approve") {
        await approveBondByBeneficiary(creditId, user.id);
        pushToast({ tone: "success", title: "Bon approuvé !", message: "Il est maintenant visible par les investisseurs." });
      } else {
        await rejectBondByBeneficiary(creditId, user.id, "Refusé par le bénéficiaire.");
        pushToast({ tone: "info", title: "Bon refusé", message: "" });
      }
    } catch (err) {
      console.error("Erreur décision bon :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez, vérifiez votre connexion." });
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><CreditCard className="w-6 h-6" /><div className="font-black text-lg">Bon de Financement Participatif</div></div>
        <div className="text-xs opacity-90">Plafond estimé (fonds de garantie + cotisations)</div>
        <div className="text-4xl font-black mt-1">{ceiling.toLocaleString("fr-FR")} <span className="text-base font-bold opacity-80">F</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Taux</div><div className="font-black">{settings ? `${(settings.monthlyRate * 100).toFixed(0)}% / mois` : "—"}</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Durée</div><div className="font-black">{settings ? `${settings.termMonths} mois` : "—"}</div></div>
        </div>
        {progressHint && <div className="mt-3 text-xs bg-white/15 rounded-xl px-3 py-2">💡 {progressHint}</div>}
        {financingScore > 0 && (
          <div className="mt-3 text-xs bg-white/15 rounded-xl px-3 py-2">💡 Score de financement : {financingScore}/100 — boosté par vos pertes déclarées</div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(["mesbons", "remboursement"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t ? "bg-violet-600 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {t === "mesbons" ? "💳 Mes bons" : "📆 Remboursement"}
          </button>
        ))}
      </div>

      {tab === "mesbons" && (
        <div className="space-y-3">
          {pendingBonds.length === 0 && credits.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
              <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <div className="text-sm text-stone-500 font-medium">Aucun bon proposé par la coopérative pour l'instant</div>
            </div>
          )}
          {credits.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-black text-stone-900">{(c.approvedAmount ?? 0).toLocaleString("fr-FR")} F</div>
                <span className={`text-xs font-black rounded-full px-3 py-1 ${
                  c.status === "active" ? "bg-emerald-100 text-emerald-700" :
                  c.status === "approved" ? "bg-sky-100 text-sky-700" :
                  c.status === "pending" ? "bg-amber-100 text-amber-700" :
                  c.status === "rejected" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600"
                }`}>{c.status}</span>
              </div>
              {c.status === "pending" && (
                <>
                  <p className="text-xs text-stone-500">La coopérative vous propose ce bon — approuvez-le pour qu'il devienne visible aux investisseurs, ou refusez-le.</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => decideBond(c.id, "reject")} disabled={decidingId === c.id}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs disabled:opacity-50">Refuser</button>
                    <button onClick={() => decideBond(c.id, "approve")} disabled={decidingId === c.id}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">Approuver</button>
                  </div>
                </>
              )}
              {(c.status === "approved" || c.status === "active") && (
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span>{c.creditedAmount.toLocaleString("fr-FR")} F versés</span>
                    <span>{c.investedAmount.toLocaleString("fr-FR")} F engagés / {(c.approvedAmount ?? 0).toLocaleString("fr-FR")} F</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 rounded-full" style={{ width: `${Math.round((c.creditedAmount / (c.approvedAmount || 1)) * 100)}%` }} />
                  </div>
                </div>
              )}
              {c.status === "rejected" && c.rejectionReason && (
                <div className="text-xs text-red-600">{c.rejectionReason}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "remboursement" && (
        <div className="space-y-3">
          {!latestCredit && (
            <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
              <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <div className="text-sm text-stone-500 font-medium">Aucun bon de financement pour l'instant</div>
            </div>
          )}
          {latestCredit && (
            <>
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-black text-stone-800">Statut de votre créance</div>
                  <span className={`text-xs font-black rounded-full px-3 py-1 ${
                    latestCredit.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    latestCredit.status === "pending" ? "bg-amber-100 text-amber-700" :
                    latestCredit.status === "rejected" ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600"
                  }`}>{latestCredit.status}</span>
                </div>
                <div className="text-xs text-stone-500 mb-1">Demandé : {latestCredit.requestedAmount.toLocaleString("fr-FR")} F</div>
                {latestCredit.approvedAmount !== null && (
                  <div className="text-xs text-stone-500">Accordé : {latestCredit.approvedAmount.toLocaleString("fr-FR")} F</div>
                )}
                {latestCredit.rejectionReason && (
                  <div className="text-xs text-red-600 mt-2">{latestCredit.rejectionReason}</div>
                )}
              </div>

              {latestCredit.schedule.length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                  <div className="font-black text-stone-800 mb-3">Échéancier</div>
                  {latestCredit.schedule.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
                      <div><div className="font-bold text-stone-800 text-sm">Échéance {i + 1}</div><div className="text-xs text-stone-400">{e.dueDate}</div></div>
                      <div className="text-right">
                        <div className="font-black text-stone-800 text-sm">{e.amount.toLocaleString("fr-FR")} F</div>
                        <div className={`text-xs font-bold ${e.status === "paid" ? "text-emerald-600" : e.status === "late" ? "text-amber-600" : "text-stone-400"}`}>{e.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null]);
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    getCurrentLocation().then(setGps).catch((err) => setGpsError(err instanceof Error ? err.message : "Position GPS indisponible"));
  }, []);

  const handlePhotoSelected = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotos((prev) => { const next = [...prev]; next[i] = file; return next; });
    setPreviews((prev) => { const next = [...prev]; next[i] = URL.createObjectURL(file); return next; });
  };

  const hasPhoto = photos.some(Boolean);

  const handleSubmit = async () => {
    if (!user || !hasPhoto) return;
    setSubmitting(true);
    try {
      const photoUrls = await Promise.all(
        photos.filter((f): f is File => f !== null).map((f, i) => uploadLossPhoto(user.id, f, i))
      );
      await submitLossClaim({ userId: user.id, comment: comment.trim(), gps, photoUrls });
      setSubmitted(true);
      pushToast({ tone: "success", title: "Déclaration envoyée 📸", message: "Un expert vous contactera sous 48h" });
      setTimeout(() => { setSubmitted(false); setComment(""); setPhotos([null, null, null]); setPreviews([null, null, null]); }, 2500);
    } catch (err) {
      console.error("Erreur soumission sinistre :", err);
      pushToast({ tone: "warn", title: "Échec de l'envoi", message: "Vérifiez votre connexion et réessayez." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-500 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Camera className="w-6 h-6" /><div className="font-black text-lg">Agri-Protect Photo</div></div>
        <p className="text-sm opacity-90">Déclarez un sinistre avec photos et géolocalisation automatique.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">📸 Nouvelle déclaration</div>

        {/* Zone photos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <input ref={photoInputRefs[i]} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected(i)} />
              <button type="button" onClick={() => photoInputRefs[i].current?.click()}
                className="w-full aspect-square bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-fuchsia-50 hover:border-fuchsia-300 transition-colors overflow-hidden">
                {previews[i] ? (
                  <img src={previews[i]!} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-stone-400" />
                    <span className="text-xs text-stone-400 mt-1">Photo {i + 1}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Commentaire */}
        <div className="mb-3">
          <label className="block text-xs font-black text-stone-600 mb-1">Commentaire</label>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Décrivez le sinistre..." className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-fuchsia-400 resize-none" />
        </div>

        {/* Géolocalisation */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-3 border border-sky-100 mb-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-sky-600" />
          <div>
            <div className="text-xs font-bold text-sky-800">Géolocalisation automatique</div>
            <div className="text-xs text-sky-700 font-mono">
              {gps ? `${gps.lat.toFixed(4)}° N · ${gps.lng.toFixed(4)}° E · ${new Date().toLocaleDateString("fr-FR")}` : gpsError || "Localisation en cours…"}
            </div>
          </div>
        </div>

        {!hasPhoto && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            Ajoutez au moins une photo du sinistre avant de soumettre.
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitted || submitting || !hasPhoto}
          className={`w-full py-4 rounded-2xl font-black text-white shadow-lg disabled:opacity-60 ${submitted ? "bg-emerald-500" : "bg-gradient-to-br from-fuchsia-600 to-rose-500"}`}>
          {submitted ? "✓ Déclaration envoyée !" : submitting ? "Envoi en cours…" : "Soumettre la déclaration"}
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
  const { profile } = useAuth();
  const { pushToast } = useApp();
  const [qty, setQty] = useState(500);
  const pricePerKg = 600; // FCFA/kg anacarde — estimation de valeur marché pour le rapport PDF
  const financingBasePerKg = 100; // FCFA/kg — base du score de financement, distincte de la valeur marché
  const [preview, setPreview] = useState<PdfDocumentData | null>(null);

  const openPreview = async () => {
    if (!profile) return;
    try {
      await submitLossClaim({
        userId: profile.uid, comment: "", gps: null, photoUrls: [],
        lossKg: qty, estimatedValueFcfa: qty * financingBasePerKg,
      });
    } catch (err) {
      console.error("Erreur déclaration de perte :", err);
      pushToast({ tone: "warn", title: "Échec de l'enregistrement", message: "La perte n'a pas pu être déclarée. Réessayez." });
      return;
    }
    setPreview({
      title: "Rapport d'Évaluation des Pertes",
      subtitle: "Coopérative COOPAVEC — Moteur d'évaluation automatique",
      farmer: { fullName: profile.fullName, phone: profile.phone, village: profile.village, region: profile.region, cooperativeId: profile.cooperativeId },
      fields: [
        { label: "Quantité perdue", value: `${qty} kg` },
        { label: "Prix marché", value: `${pricePerKg.toLocaleString("fr-FR")} FCFA/kg` },
        { label: "Valeur estimée", value: `${(qty * pricePerKg).toLocaleString("fr-FR")} F` },
        { label: "Date", value: new Date().toLocaleDateString("fr-FR") },
      ],
      qrPayload: buildIdentityPayload(profile),
    });
  };

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

        <button onClick={openPreview}
          className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg flex items-center justify-center gap-2">
          <FileText className="w-5 h-5" /> Générer le rapport automatique
        </button>
      </div>

      {preview && (
        <DocumentPreviewModal data={preview} filename="Rapport_Evaluation_Pertes.pdf"
          onClose={() => setPreview(null)}
          onValidated={() => setPreview(null)} />
      )}
    </div>
  );
}

// ==================== MODULE 9 : CERTIFICAT NUMÉRIQUE ====================

function CertificatePage() {
  const { profile } = useAuth();
  const [type, setType] = useState<"perte" | "production">("perte");
  const [sinistre, setSinistre] = useState("");
  const [parcelle, setParcelle] = useState("");
  const [saison, setSaison] = useState(String(new Date().getFullYear()));
  const [quantite, setQuantite] = useState("");
  const [preview, setPreview] = useState<PdfDocumentData | null>(null);

  const canGenerate = type === "perte" ? sinistre.trim().length > 0 : quantite.trim().length > 0;

  const openPreview = () => {
    if (!profile || !canGenerate) return;
    const farmer = { fullName: profile.fullName, phone: profile.phone, village: profile.village, region: profile.region, cooperativeId: profile.cooperativeId };
    if (type === "perte") {
      setPreview({
        title: "Certificat de Perte",
        subtitle: "Coopérative COOPAVEC — Agri-Protect",
        farmer,
        fields: [
          { label: "Sinistre", value: sinistre },
          { label: "Parcelle", value: parcelle || "—" },
          { label: "Date", value: new Date().toLocaleDateString("fr-FR") },
        ],
        qrPayload: buildIdentityPayload(profile),
      });
    } else {
      setPreview({
        title: "Attestation de Production",
        subtitle: "Coopérative COOPAVEC",
        farmer,
        fields: [
          { label: "Saison", value: saison },
          { label: "Quantité produite", value: `${quantite} t` },
        ],
        qrPayload: buildIdentityPayload(profile),
      });
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><BadgeCheck className="w-6 h-6" /><div className="font-black text-lg">Certificat Numérique</div></div>
        <p className="text-sm opacity-90">Générez un certificat avec vos informations réelles et un QR code de vérification, après prévisualisation.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="flex gap-2 mb-4">
          {([{ k: "perte", l: "Certificat de Perte" }, { k: "production", l: "Attestation Production" }] as const).map((t) => (
            <button key={t.k} onClick={() => setType(t.k)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${type === t.k ? "bg-teal-600 text-white shadow" : "bg-stone-100 text-stone-600"}`}>
              {t.l}
            </button>
          ))}
        </div>

        {type === "perte" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-stone-600 mb-1">Sinistre</label>
              <input value={sinistre} onChange={(e) => setSinistre(e.target.value)} placeholder="Ex : Sécheresse — Champ Anacarde"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-600 mb-1">Parcelle concernée (optionnel)</label>
              <input value={parcelle} onChange={(e) => setParcelle(e.target.value)} placeholder="Ex : Parcelle Nord"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-stone-600 mb-1">Saison</label>
              <input value={saison} onChange={(e) => setSaison(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-600 mb-1">Quantité produite (tonnes)</label>
              <input type="number" min="0" step="0.1" value={quantite} onChange={(e) => setQuantite(e.target.value)} placeholder="Ex : 3.2"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
        )}

        <button onClick={openPreview} disabled={!canGenerate}
          className="mt-4 w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
          <FileText className="w-5 h-5" /> Prévisualiser le certificat
        </button>
      </div>

      {preview && (
        <DocumentPreviewModal data={preview} filename={`${preview.title.replace(/\s+/g, "_")}.pdf`}
          onClose={() => setPreview(null)}
          onValidated={() => setPreview(null)} />
      )}
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

// ==================== MODULE : MARKETPLACE AGRICOLE (SOP-02) ====================

function MarketplacePage() {
  const { pushToast } = useApp();
  const [tab, setTab] = useState<"offres" | "commande" | "suivi">("offres");
  const [qty, setQty]     = useState(500);
  const [price, setPrice] = useState(350);
  const [published, setPublished] = useState(false);

  const orderSteps = [
    { label: "Offre publiée & validée",         sub: "Contrôle qualité back-office", done: true,  time: "01/07 09:00" },
    { label: "Commande passée par l'acheteur",  sub: "Bon de commande digital",      done: true,  time: "02/07 14:20" },
    { label: "Confirmation automatique",        sub: "Notif. vendeur + logisticien", done: true,  time: "02/07 14:21" },
    { label: "Préparation de la marchandise",   sub: "Conditionnement",              done: true,  time: "03/07 08:00" },
    { label: "Collecte par le logisticien",     sub: "Bon de collecte + pesée",      done: false, time: "04/07 (prévu)" },
    { label: "Contrôle qualité à la collecte",  sub: "Fiche contrôle qualité",       done: false, time: "—" },
    { label: "Livraison à l'acheteur",          sub: "Bon de livraison signé",       done: false, time: "—" },
    { label: "Confirmation réception",          sub: "Accusé de réception digital",  done: false, time: "—" },
    { label: "Paiement vendeur déclenché",      sub: "Agrifinance Pay · J3–J5",       done: false, time: "—" },
  ];
  const doneCount = orderSteps.filter(s => s.done).length;

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Package className="w-6 h-6" /><div className="font-black text-lg">Marketplace Agricole</div></div>
        <p className="text-sm opacity-90">Publiez vos récoltes, suivez vos commandes jusqu'au paiement.</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-[10px] opacity-80">Délai moyen</div><div className="font-black text-sm">≤ 3 j</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-[10px] opacity-80">Livrées à temps</div><div className="font-black text-sm">≥ 90%</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-[10px] opacity-80">Litiges</div><div className="font-black text-sm">≤ 5%</div></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(["offres", "commande", "suivi"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t ? "bg-orange-500 text-white shadow" : "bg-white border border-stone-200 text-stone-600"
            }`}>
            {t === "offres" ? "📢 Publier" : t === "commande" ? "🧾 Commandes" : "📍 Suivi"}
          </button>
        ))}
      </div>

      {tab === "offres" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
          <div className="font-black text-stone-800">Publier une offre</div>
          <div className="text-xs text-stone-500 -mt-2">Validée par le back-office marketplace avant mise en ligne (contrôle qualité & conformité).</div>
          <div>
            <div className="text-xs font-bold text-stone-600 mb-1.5">Quantité disponible (kg)</div>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 2000].map(v => (
                <button key={v} onClick={() => setQty(v)} className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                  qty === v ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
                }`}>{v} kg</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-stone-600 mb-1.5">Prix par kg (FCFA)</div>
            <div className="grid grid-cols-4 gap-2">
              {[250, 350, 500, 700].map(v => (
                <button key={v} onClick={() => setPrice(v)} className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                  price === v ? "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
                }`}>{v} F</button>
              ))}
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
            <div className="text-xs text-stone-500 font-semibold">Valeur totale estimée</div>
            <Money value={qty * price} size="md" />
          </div>
          <button onClick={() => {
            setPublished(true);
            pushToast({ tone: "success", title: "Offre soumise !", message: "En attente de validation back-office (J0→J1)" });
          }} disabled={published} className={`w-full py-4 rounded-2xl font-black text-white transition-all ${
            published ? "bg-emerald-500" : "bg-gradient-to-br from-orange-500 to-amber-600"
          }`}>
            {published ? "✓ Offre soumise" : "Publier l'offre"}
          </button>
        </div>
      )}

      {tab === "commande" && (
        <div className="space-y-3">
          {[
            { buyer: "Transformateur ANACOOP", item: "Anacarde Grade A", qty: "1 200 kg", status: "Confirmée", color: "bg-emerald-100 text-emerald-700" },
            { buyer: "Revendeur Marché Bouaké", item: "Maïs sec",        qty: "800 kg",   status: "En préparation", color: "bg-amber-100 text-amber-700" },
            { buyer: "Restaurateur Abidjan",    item: "Manioc frais",    qty: "300 kg",   status: "Livrée", color: "bg-sky-100 text-sky-700" },
          ].map((o, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <div className="font-black text-stone-800 text-sm">{o.buyer}</div>
                <span className={`text-[10px] font-black rounded-full px-2 py-1 ${o.color}`}>{o.status}</span>
              </div>
              <div className="text-xs text-stone-500">{o.item} · {o.qty}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "suivi" && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-black text-stone-800">Cycle de la commande</div>
            <span className="text-xs font-black text-orange-600">{doneCount}/{orderSteps.length}</span>
          </div>
          {orderSteps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-stone-100 last:border-0">
              <div className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-emerald-500" : "bg-stone-200"}`}>
                {s.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-stone-400 rounded-full" />}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${s.done ? "text-stone-800" : "text-stone-400"}`}>{s.label}</div>
                <div className="text-xs text-stone-400">{s.sub}</div>
              </div>
              <div className="text-xs text-stone-400 font-medium whitespace-nowrap">{s.time}</div>
            </div>
          ))}
        </div>
      )}
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
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="font-black text-stone-800 mb-3">Suivi en temps réel</div>
            {[
              { label: "Récolte déclarée",    done: true,  time: "28/06 09:00" },
              { label: "Transporteur affecté", done: true,  time: "28/06 10:30" },
              { label: "En cours de collecte", done: false, time: "30/06 08:00" },
              { label: "Contrôle qualité (pesée)", done: false, time: "—" },
              { label: "Réception entrepôt · lot QR généré", done: false, time: "—" },
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
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><QrCode className="w-5 h-5 text-amber-700" /><span className="font-black text-stone-800">Traçabilité du lot</span></div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white border-4 border-stone-800 rounded-xl grid grid-cols-6 gap-0.5 p-1.5 flex-shrink-0">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className={((i * 5 + 2) % 3 === 0) || (i < 6 || (i % 6 === 0) || (i > 29)) ? "bg-stone-900 rounded-sm" : "bg-white"} />
                ))}
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div><span className="text-stone-400">Code lot :</span> <span className="font-mono font-bold text-stone-800">LOT-CI-260630-0842</span></div>
                <div><span className="text-stone-400">Rotation :</span> <span className="font-bold text-stone-800">FIFO</span></div>
                <div><span className="text-stone-400">Statut :</span> <span className="font-bold text-emerald-700">En attente réception</span></div>
              </div>
            </div>
          </div>
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
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-black text-stone-800">📋 Inventaire actuel</div>
          <span className="text-[10px] font-black bg-cyan-100 text-cyan-700 rounded-full px-2 py-1">Rotation FIFO</span>
        </div>
        {[
          { produit: "Anacarde brut",    qte: "2 400 kg", lot: "L-2026-06", statut: "Bon",      qr: true,  entree: "12/06" },
          { produit: "Maïs grain",       qte: "1 620 kg", lot: "L-2026-05", statut: "Bon",      qr: true,  entree: "28/05" },
          { produit: "Cacao sec",        qte: "800 kg",   lot: "L-2026-04", statut: "Contrôle", qr: true,  entree: "14/05" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div className="flex items-center gap-2">
              {item.qr && <QrCode className="w-4 h-4 text-stone-400 flex-shrink-0" />}
              <div>
                <div className="font-bold text-stone-800 text-sm">{item.produit}</div>
                <div className="text-xs text-stone-500">Lot {item.lot} · entrée {item.entree}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-black text-stone-800 text-sm">{item.qte}</div>
              <div className={`text-xs font-bold ${item.statut === "Bon" ? "text-emerald-600" : "text-amber-600"}`}>{item.statut}</div>
            </div>
          </div>
        ))}
        <div className="mt-3 text-[11px] text-stone-400">Sortie prioritaire : le lot le plus ancien (L-2026-04, entré le 14/05) sort en premier selon la règle FIFO.</div>
      </div>
    </div>
  );
}

// ==================== MODULE 14 : RECYCLAGE DES DÉCHETS ====================

function RecyclagePage() {
  const { pushToast } = useApp();
  const dechetsCibles = ["Manioc 🥔", "Cacao 🍫", "Anacarde 🥜", "Maïs 🌽", "Palmier 🌴"];
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    getCurrentLocation().then(setGps).catch((err) => setGpsError(err instanceof Error ? err.message : "Position GPS indisponible"));
  }, []);

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
              <div className="text-xs text-emerald-700 font-mono">
                {gps ? `${gps.lat.toFixed(4)}° N · ${gps.lng.toFixed(4)}° E` : gpsError || "Localisation en cours…"}
              </div>
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

// ==================== MODULE MÉTÉO du champs ====================

function WeatherPage() {
  const { userVillage, weather, weatherForecast, weatherError } = useApp();

  if (weatherError && !weather) {
    return (
      <div className="p-4 pb-24 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
          <Cloud className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <div className="text-sm text-stone-500 font-medium">{weatherError}</div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="p-4 pb-24 max-w-xl mx-auto flex justify-center py-10">
        <Loader className="w-6 h-6 text-sky-500 animate-spin" />
      </div>
    );
  }

  const advice = getAgriculturalAdvice(weather);

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      {weatherError && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {weatherError} — dernier relevé connu affiché.
        </div>
      )}
      <div className="animate-fade-up relative bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white rounded-3xl p-5 shadow-xl mb-4 overflow-hidden">
        <div className="relative">
          <div className="text-xs opacity-90 font-semibold uppercase tracking-wide flex items-center gap-1">📍 {userVillage || "Côte d'Ivoire"}</div>
          <div className="flex items-end justify-between mt-2">
            <div><div className="text-6xl font-black tracking-tight leading-none">{weather.temperature}°</div><div className="text-lg font-bold opacity-95 mt-1">Humidité {weather.humidity}% · Vent {weather.windSpeed} km/h</div></div>
            <div className="text-7xl leading-none">{weather.description}</div>
          </div>
        </div>
      </div>

      {weatherForecast && weatherForecast.length > 0 && (
        <div className="animate-fade-up delay-1 flex gap-2 overflow-x-auto pb-2 mb-4">
          {weatherForecast.slice(0, 5).map((d) => (
            <div key={d.date} className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm text-center min-w-[72px]">
              <div className="text-[10px] text-stone-500 font-semibold">{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short" })}</div>
              <div className="text-2xl my-1">{d.icon}</div>
              <div className="text-xs font-bold text-stone-800">{d.tempMax}°/{d.tempMin}°</div>
            </div>
          ))}
        </div>
      )}

      <div className="animate-fade-up delay-1 bg-gradient-to-br from-emerald-50 to-lime-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-5xl">🌱</div>
          <div className="flex-1">
            <div className="font-bold text-emerald-900">Conseil agronomique</div>
            <div className="text-sm text-emerald-900 font-medium leading-relaxed mt-1">
              {advice.canPlant ? "Conditions favorables pour semer." : "Conditions défavorables pour semer actuellement."}{" "}
              {advice.canHarvest ? "Bonne fenêtre pour récolter." : ""}
            </div>
          </div>
        </div>
      </div>

      {advice.warning && (
        <div className="animate-fade-up delay-2 bg-gradient-to-br from-amber-50 to-rose-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-700" />
            </div>
            <div className="flex-1"><div className="font-extrabold text-amber-900">Alerte météo</div><div className="text-sm text-amber-800 mt-0.5">{advice.warning}</div></div>
          </div>
        </div>
      )}
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
  const [otpStage, setOtpStage] = useState<"idle" | "sent" | "verified">("idle");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");

  const operators = [
    { id: "wave",   label: "Wave",         color: "bg-blue-500" },
    { id: "orange", label: "Orange Money", color: "bg-orange-500" },
    { id: "mtn",    label: "MTN Money",    color: "bg-yellow-400" },
    { id: "moov",   label: "Moov Money",   color: "bg-green-500" },
  ];

  // Plafonds réglementaires BCEAO — Compte de base (KYC niveau 1)
  const PLAFOND_TX = 100000;
  const PLAFOND_MOIS = 500000;
  const OUTGOING_TYPES = new Set(["withdraw", "send", "credit_repayment"]);
  const now = new Date();
  const depenseMois = transactions
    .filter((tx) => OUTGOING_TYPES.has(tx.type) && new Date(tx.createdAt).getMonth() === now.getMonth() && new Date(tx.createdAt).getFullYear() === now.getFullYear())
    .reduce((sum, tx) => sum + tx.amount, 0);
  const overLimit = amount > PLAFOND_TX;

  const requestOtp = () => {
    if (!phone || amount <= 0 || overLimit) return;
    setOtpStage("sent");
    setOtpError("");
    pushToast({ tone: "info", title: "Code OTP envoyé", message: `SMS envoyé au ${phone || "numéro associé"}` });
  };

  const verifyOtp = () => {
    if (otpValue.trim().length < 4) { setOtpError("Code OTP invalide (4 chiffres minimum)."); return; }
    setOtpStage("verified");
    addTx({ type: mode === "send" ? "send" : "receive", amount, label: mode === "send" ? `→ ${phone} (${operator.toUpperCase()})` : `← ${phone}` });
    pushToast({ tone: "success", title: mode === "send" ? "Envoi réussi ✓" : "Réception confirmée ✓", message: `${amount.toLocaleString("fr-FR")} F` });
    setSent(true);
    setTimeout(() => { setSent(false); setOtpStage("idle"); setOtpValue(""); }, 2200);
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="text-xs opacity-90 font-semibold">💚 Solde disponible</div>
        <Money value={balance} size="lg" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-[10px] opacity-80">Plafond / transaction</div><div className="font-black text-sm">{PLAFOND_TX.toLocaleString("fr-FR")} F</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-[10px] opacity-80">Utilisé ce mois</div><div className="font-black text-sm">{depenseMois.toLocaleString("fr-FR")} / {PLAFOND_MOIS.toLocaleString("fr-FR")} F</div></div>
        </div>
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

        {overLimit && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-3 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Montant supérieur au plafond par transaction (Niveau KYC 1 : {PLAFOND_TX.toLocaleString("fr-FR")} F).
          </div>
        )}

        {otpStage === "idle" && (
          <button onClick={requestOtp} disabled={overLimit || !phone || amount <= 0}
            className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${
              mode === "send" ? "bg-gradient-to-br from-rose-500 to-pink-600" : "bg-gradient-to-br from-emerald-500 to-green-600"
            }`}>
            Confirmer ✓
          </button>
        )}

        {otpStage === "sent" && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <div className="text-xs font-black text-indigo-800 mb-2">Saisissez le code OTP reçu par SMS</div>
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2">
              ⚠️ Mode démonstration — aucune passerelle SMS réelle n'est encore connectée. N'importe quel code à 4 chiffres est accepté.
            </div>
            <input type="tel" inputMode="numeric" maxLength={6} value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
              placeholder="• • • •" className="w-full text-center tracking-[0.5em] font-black text-xl bg-white border border-indigo-200 rounded-xl py-2.5 mb-2 outline-none" />
            {otpError && <div className="text-xs text-rose-600 font-bold mb-2">{otpError}</div>}
            <button onClick={verifyOtp} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black">Valider le code</button>
          </div>
        )}

        {sent && (
          <div className="w-full py-4 rounded-2xl font-black text-white text-lg shadow-lg flex items-center justify-center gap-2 bg-emerald-500">
            <CheckCircle2 className="w-5 h-5" /> Confirmé ✓
          </div>
        )}
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
                  <div className="text-xs text-stone-500 font-medium">{new Date(tx.createdAt).toLocaleDateString("fr-FR")}</div>
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToNotifications(user.id, setNotifs);
    return () => u();
  }, [user?.id]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const openNotifs = () => {
    setNotifOpen(true);
    if (user && unreadCount > 0) markAllRead(user.id);
  };

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
            {user && (
              <button onClick={openNotifs} className="relative p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700" aria-label="Notifications">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
            )}
            <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700">
              <Languages className="w-4 h-4" />
              {LANGS.find((l) => l.code === lang)?.flag}
            </button>
            {onLogout && (
              <button onClick={onLogout}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sortir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {notifOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setNotifOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-stone-500 text-xs uppercase tracking-wider font-bold">Notifications</span>
              <button onClick={() => setNotifOpen(false)} className="p-1 text-stone-400"><X className="w-4 h-4" /></button>
            </div>
            {notifs.length === 0 && (
              <div className="py-8 text-center text-sm text-stone-400">Aucune notification pour le moment</div>
            )}
            {notifs.map((n) => (
              <div key={n.id} className={`px-3 py-3 rounded-2xl mb-1 ${n.read ? "" : "bg-emerald-50"}`}>
                <div className="font-bold text-stone-800 text-sm">{n.title}</div>
                <div className="text-xs text-stone-600 mt-0.5">{n.message}</div>
                <div className="text-[10px] text-stone-400 mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
  | "entrepots" | "recyclage" | "carbon" | "marketplace";

const PAGE_TITLES: Record<string, string> = {
  home:        "COOPAVEC",
  susu:        "Bokanmin",
  weather:     "Météo & Alertes",
  parcelles:   "Mes Champs",
  credit:      "Bon de Financement Participatif",
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
  marketplace: "Marketplace Agricole",
};

// ==================== ADMIN SPACE ====================

function AdminSpace({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"dash" | "clients" | "credits" | "txns" | "settings">("dash");
  const { online } = useApp();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fund, setFund] = useState<GuaranteeFund | null>(null);
  const [activeCreditsCount, setActiveCreditsCount] = useState(0);
  const [pendingCredits, setPendingCredits] = useState<Credit[]>([]);
  const [pendingInvestments, setPendingInvestments] = useState<BondInvestment[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [txsLoading, setTxsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGenerateBond, setShowGenerateBond] = useState(false);
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);
  const [splitTotals, setSplitTotals] = useState({ insurance: 0, managementFee: 0 });

  const refreshProfiles = () => { listProfiles().then((p) => { setProfiles(p); setProfilesLoading(false); }); };
  useEffect(refreshProfiles, []);
  useEffect(() => { const u = subscribeToGuaranteeFund(setFund); return () => u(); }, []);
  useEffect(() => { const u = subscribeToPendingCredits(setPendingCredits); return () => u(); }, []);
  useEffect(() => { const u = subscribeToPendingBondInvestments(setPendingInvestments); return () => u(); }, []);
  useEffect(() => { countActiveCredits().then(setActiveCreditsCount); }, [pendingInvestments]);
  useEffect(() => { listRecentTransactions(8).then((t) => { setRecentTxs(t); setTxsLoading(false); }); }, []);
  useEffect(() => { getContributionSplitTotals().then(setSplitTotals); }, []);

  const nameByUid = new Map(profiles.map((p) => [p.uid, p.fullName]));

  const kpis = [
    { label: "Bénéficiaires enregistrés", val: profiles.length.toLocaleString("fr-FR"), icon: Users },
    { label: "Fonds de garantie déposé",  val: `${(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F`, icon: DollarSign },
    { label: "Disponible pour crédits",   val: `${(fund?.availableForCredit ?? 0).toLocaleString("fr-FR")} F`, icon: Activity },
    { label: "Crédits actifs",            val: activeCreditsCount.toLocaleString("fr-FR"), icon: CreditCard },
    { label: "Total cotisations — assurance",       val: `${splitTotals.insurance.toLocaleString("fr-FR")} F`, icon: Shield },
    { label: "Total cotisations — frais de gestion", val: `${splitTotals.managementFee.toLocaleString("fr-FR")} F`, icon: Banknote },
  ];

  const reviewInvestment = async (investmentId: string, action: "approve" | "reject") => {
    if (!user) return;
    setDecidingId(investmentId);
    try {
      await reviewBondInvestment(investmentId, user.id, action);
    } catch (err) {
      console.error("Erreur revue investissement :", err);
    } finally {
      setDecidingId(null);
    }
  };

  const navItems = [
    { id: "dash",     icon: PieChart,  label: "Vue d'ensemble" },
    { id: "clients",  icon: Users,     label: "Membres"         },
    { id: "credits",  icon: CreditCard,label: "Bons de financement" },
    { id: "txns",     icon: Activity,  label: "Transactions"    },
    { id: "settings", icon: Settings,  label: "Paramètres"      },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-black text-stone-900 text-sm">COOPAVEC Admin</div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                {online ? "En ligne" : "Hors ligne"}
              </div>
            </div>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl px-3 py-2 text-xs font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      {/* Sub-nav */}
      <div className="sticky top-[57px] z-20 bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-3 flex gap-1 py-2 overflow-x-auto">
          {navItems.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            return (
              <button key={it.id} onClick={() => setTab(it.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active ? "bg-violet-600 text-white" : "text-stone-500 hover:bg-stone-100"
                }`}>
                <Icon className="w-3.5 h-3.5" />{it.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">

        {/* ── DASHBOARD ── */}
        {tab === "dash" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-stone-900">Tableau de bord</h2>
              <p className="text-xs text-stone-400 mt-0.5">Données en temps réel</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="font-black text-stone-900 text-xl">{k.val}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{k.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Activité récente */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center">
                <span className="font-bold text-stone-800 text-sm">Activité récente</span>
              </div>
              {recentTxs.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-stone-400">Aucune transaction pour le moment</div>
              )}
              {recentTxs.map((tx) => {
                const pos = ["deposit", "receive", "payout", "credit_disbursement"].includes(tx.type);
                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3 border-b border-stone-50 last:border-0">
                    <Avatar name={nameByUid.get(tx.userId) ?? "?"} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-800 text-sm truncate">{nameByUid.get(tx.userId) ?? tx.userId}</div>
                      <div className="text-xs text-stone-500">{tx.label} · {new Date(tx.createdAt).toLocaleString("fr-FR")}</div>
                    </div>
                    <div className={`text-sm font-black flex-shrink-0 ${pos ? "text-emerald-600" : "text-rose-600"}`}>
                      {pos ? "+" : "-"}{tx.amount.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                );
              })}
            </div>

            {pendingCredits.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <p className="text-xs text-stone-700 font-medium">{pendingCredits.length} demande(s) de bon de financement en attente de validation</p>
              </div>
            )}
          </div>
        )}

        {/* ── MEMBRES ── */}
        {tab === "clients" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900">Membres</h2>
              <button onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 bg-violet-600 text-white rounded-xl px-3 py-2 text-xs font-bold">
                <UserPlus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>
            {profilesLoading && <SkeletonList rows={4} />}
            {!profilesLoading && profiles.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Aucun bénéficiaire enregistré</div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {profiles.map((m) => (
                <button key={m.uid} onClick={() => setSelectedMemberUid(m.uid)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-stone-50 last:border-0 text-left hover:bg-stone-50">
                  <Avatar name={m.fullName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 text-sm">{m.fullName}</div>
                    <div className="text-xs text-stone-500">{m.role} · {m.village}, {m.region}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.kycStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}>{m.kycStatus === "pending" ? "KYC en attente" : m.kycStatus}</span>
                  {!m.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">Inactif</span>}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-stone-400">{profiles.length} membre(s) enregistré(s)</p>
          </div>
        )}

        {/* ── BONS DE FINANCEMENT ── */}
        {tab === "credits" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900">Bons de financement</h2>
              <button onClick={() => setShowGenerateBond(true)}
                className="flex items-center gap-1.5 bg-violet-600 text-white rounded-xl px-3 py-2 text-xs font-bold">
                <Plus className="w-3.5 h-3.5" /> Générer un bon
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-700">Paiements investisseurs en attente de validation</h3>
              {pendingInvestments.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                  <CreditCard className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <div className="text-sm text-stone-500 font-medium">Aucun paiement en attente</div>
                </div>
              )}
              {pendingInvestments.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2">
                  <div className="text-xs text-stone-500">
                    <span className="font-bold text-stone-800">{nameByUid.get(inv.investorId) ?? inv.investorId}</span> → <span className="font-bold text-stone-800">{nameByUid.get(inv.farmerId) ?? inv.farmerId}</span>
                  </div>
                  <div className="font-black text-stone-900 text-lg">{inv.amount.toLocaleString("fr-FR")} F</div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => reviewInvestment(inv.id, "reject")} disabled={decidingId === inv.id}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs disabled:opacity-50">Rejeter</button>
                    <button onClick={() => reviewInvestment(inv.id, "approve")} disabled={decidingId === inv.id}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">Approuver & créditer</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-700">Bons en attente d'approbation du bénéficiaire</h3>
              {pendingCredits.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                  <div className="text-sm text-stone-500 font-medium">Aucun bon en attente</div>
                </div>
              )}
              {pendingCredits.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-sm flex items-center gap-3">
                  <Avatar name={nameByUid.get(c.userId) ?? "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 text-sm">{nameByUid.get(c.userId) ?? c.userId}</div>
                    <div className="text-xs text-stone-500">Généré le {new Date(c.requestedAt).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <div className="font-black text-stone-800 text-sm flex-shrink-0">{(c.approvedAmount ?? 0).toLocaleString("fr-FR")} F</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "txns" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Transactions</h2>
            {txsLoading && <SkeletonList rows={5} />}
            {!txsLoading && recentTxs.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <Activity className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Aucune transaction enregistrée</div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {recentTxs.map((tx) => {
                const entree = ["deposit", "receive", "payout", "credit_disbursement"].includes(tx.type);
                return (
                  <div key={tx.id} className="px-4 py-3.5 flex items-center gap-3 border-b border-stone-50 last:border-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${entree ? "bg-emerald-100" : "bg-rose-100"}`}>
                      {entree ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-800 text-sm truncate">{nameByUid.get(tx.userId) ?? tx.userId} — {tx.label}</div>
                      <div className="text-xs text-stone-400">{new Date(tx.createdAt).toLocaleString("fr-FR")}</div>
                    </div>
                    <div className={`font-black text-sm flex-shrink-0 ${entree ? "text-emerald-600" : "text-rose-600"}`}>
                      {entree ? "+" : "-"}{tx.amount.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PARAMÈTRES ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Paramètres</h2>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {[
                { icon: Bell,       label: "Notifications",    desc: "Alertes système"         },
                { icon: Shield,     label: "Sécurité & accès", desc: "Rôles et permissions"    },
                { icon: FileText,   label: "Rapports",         desc: "Générer des exports"     },
                { icon: Building2,  label: "Coopérative",      desc: "Informations structure"  },
              ].map((it, i) => {
                const Icon = it.icon;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-stone-50 last:border-0 hover:bg-stone-50 cursor-pointer">
                    <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm">{it.label}</div>
                      <div className="text-xs text-stone-500">{it.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300" />
                  </div>
                );
              })}
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
              <p className="text-sm font-bold text-red-700 mb-3">Zone dangereuse</p>
              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white transition-colors">
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          </div>
        )}
      </main>
      {showAddMember && (
        <AddBeneficiaryForm onClose={() => setShowAddMember(false)}
          onDone={() => { setShowAddMember(false); refreshProfiles(); }} />
      )}
      {selectedMemberUid && (
        <MemberDetailPanel uid={selectedMemberUid} allProfiles={profiles} onClose={() => { setSelectedMemberUid(null); refreshProfiles(); }} />
      )}
      {showGenerateBond && user && (
        <GenerateBondModal adminId={user.id} farmers={profiles.filter((p) => p.role === "farmer")}
          onClose={() => setShowGenerateBond(false)} onDone={() => setShowGenerateBond(false)} />
      )}
    </div>
  );
}

function GenerateBondModal({ adminId, farmers, onClose, onDone }: {
  adminId: string; farmers: Profile[]; onClose: () => void; onDone: () => void;
}) {
  useBackGuard(true, onClose);
  const [farmerId, setFarmerId] = useState("");
  const [amount, setAmount] = useState(25000);
  const [ceilingHint, setCeilingHint] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!farmerId) { setCeilingHint(null); return; }
    let cancelled = false;
    (async () => {
      const [wallet, profile, fund, settings, lossValue] = await Promise.all([
        getWallet(farmerId), getProfile(farmerId), getGuaranteeFund(), getCreditSettings(), getUserLossValueFcfa(farmerId),
      ]);
      if (cancelled || !profile) return;
      const financingScore = computeFinancingScore(lossValue);
      const { ceiling } = computeCreditCeiling({ personalContribution12m: wallet?.contributionsLast12m ?? 0, fund, settings, kycStatus: profile.kycStatus, financingScore });
      setCeilingHint(ceiling);
    })();
    return () => { cancelled = true; };
  }, [farmerId]);

  const valid = farmerId.length > 0 && amount > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await createBondForFarmer(adminId, farmerId, amount);
      onDone();
    } catch (err) {
      console.error("Erreur génération bon :", err);
      setError("Impossible de générer le bon. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">💳 Générer un bon de financement</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Bénéficiaire</label>
            <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-violet-400">
              <option value="">— Sélectionner —</option>
              {farmers.map((f) => <option key={f.uid} value={f.uid}>{f.fullName}</option>)}
            </select>
            {ceilingHint !== null && (
              <div className="text-xs text-violet-600 mt-1.5">💡 Plafond estimé pour ce bénéficiaire : {ceilingHint.toLocaleString("fr-FR")} F (indicatif, non bloquant)</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Montant du bon (F)</label>
            <input type="number" min={0} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
          </div>

          <button onClick={handleSubmit} disabled={!valid || saving}
            className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-violet-600 to-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Générer le bon
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CLIENT SPACE ====================

function ClientSpace({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"apercu" | "projets" | "rapports" | "profil">("apercu");
  const { online, transactions } = useApp();
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [bonds, setBonds] = useState<Credit[]>([]);
  const [farmerNames, setFarmerNames] = useState<Record<string, string>>({});
  const [myInvestments, setMyInvestments] = useState<BondInvestment[]>([]);
  const [investmentCredits, setInvestmentCredits] = useState<Record<string, Credit>>({});
  const [investingBond, setInvestingBond] = useState<Credit | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const u = subscribeToWallet(profile.uid, (w) => setBalance(w?.balance ?? 0));
    return () => u();
  }, [profile?.uid]);

  useEffect(() => { const u = subscribeToInvestableBonds(setBonds); return () => u(); }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const u = subscribeToInvestorBonds(profile.uid, setMyInvestments);
    return () => u();
  }, [profile?.uid]);

  const bondFarmerIds = bonds.map((b) => b.userId).join(",");
  useEffect(() => {
    const ids = Array.from(new Set(bonds.map((b) => b.userId)));
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => getProfile(id))).then((profiles) => {
      setFarmerNames((prev) => ({ ...prev, ...Object.fromEntries(profiles.filter((p): p is Profile => p !== null).map((p) => [p.uid, p.fullName])) }));
    });
  }, [bondFarmerIds]);

  const investmentCreditIds = myInvestments.map((i) => i.creditId).join(",");
  useEffect(() => {
    const ids = Array.from(new Set(myInvestments.map((i) => i.creditId))).filter((id) => !investmentCredits[id]);
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => getCredit(id))).then((credits) => {
      setInvestmentCredits((prev) => ({ ...prev, ...Object.fromEntries(credits.filter((c): c is Credit => c !== null).map((c) => [c.id, c])) }));
    });
  }, [investmentCreditIds]);

  const totalInvested = myInvestments.reduce((sum, i) => sum + i.amount, 0);
  const activeBondCount = new Set(myInvestments.map((i) => i.creditId)).size;

  const navItems = [
    { id: "apercu",   icon: Home,       label: "Accueil"  },
    { id: "projets",  icon: TrendingUp, label: "Projets"  },
    { id: "rapports", icon: BarChart2,  label: "Rapports" },
    { id: "profil",   icon: User,       label: "Profil"   },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-600 rounded-xl flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-black text-stone-900 text-sm">Espace Client</div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                COOPAVEC · Investisseur
              </div>
            </div>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl px-3 py-2 text-xs font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-stone-200 z-30">
        <div className="max-w-xl mx-auto grid grid-cols-4">
          {navItems.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            return (
              <button key={it.id} onClick={() => setTab(it.id as any)}
                className="relative flex flex-col items-center justify-center py-2.5 gap-0.5">
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-500 rounded-b-full" />}
                <div className={`p-1.5 rounded-xl ${active ? "bg-sky-100" : ""}`}>
                  <Icon className="w-5 h-5" style={{ color: active ? "#0284c7" : "#78716c" }} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] ${active ? "font-extrabold text-sky-700" : "font-medium text-stone-500"}`}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-5 pb-24">

        {/* ── APERÇU ── */}
        {tab === "apercu" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={profile?.fullName || "?"} size="lg" />
              <div>
                <div className="text-xs text-stone-400 font-medium">Bonjour 👋</div>
                <div className="font-black text-stone-900 text-xl">{profile?.fullName}</div>
                <div className="text-xs text-stone-500">Investisseur · {profile?.region}</div>
              </div>
            </div>

            {/* Portfolio */}
            <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 rounded-3xl p-5 text-white shadow-xl">
              <div className="text-xs opacity-75 font-medium mb-1">Mon portefeuille</div>
              <div className="text-4xl font-black tracking-tight">{balance.toLocaleString("fr-FR")} <span className="text-lg opacity-70">F</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white/15 rounded-xl p-3"><div className="text-xs opacity-75">Total investi</div><div className="font-black text-lg mt-0.5">{totalInvested.toLocaleString("fr-FR")} F</div></div>
                <div className="bg-white/15 rounded-xl p-3"><div className="text-xs opacity-75">Bons financés</div><div className="font-black text-lg mt-0.5">{activeBondCount} bon{activeBondCount > 1 ? "s" : ""}</div></div>
              </div>
            </div>

            {/* Mes investissements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-stone-800 text-sm">Mes investissements</p>
                <button onClick={() => setTab("projets")} className="text-xs text-sky-600 font-bold">Tout voir</button>
              </div>
              {myInvestments.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                  <TrendingUp className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <div className="text-sm text-stone-500 font-medium">Aucun investissement pour l'instant</div>
                </div>
              )}
              <div className="space-y-2.5">
                {myInvestments.slice(0, 5).map((inv) => {
                  const credit = investmentCredits[inv.creditId];
                  const estimatedReturn = credit ? Math.round(inv.amount * credit.interestRatePerMonth * credit.termMonths) : null;
                  return (
                    <div key={inv.id} className="bg-white rounded-2xl p-3.5 border border-stone-100 shadow-sm flex items-center gap-3">
                      <span className="text-2xl">🌾</span>
                      <div className="flex-1">
                        <div className="font-bold text-stone-800 text-sm">{farmerNames[inv.farmerId] ?? "Agriculteur"}</div>
                        <div className="text-xs text-stone-500">{inv.amount.toLocaleString("fr-FR")} F investi</div>
                      </div>
                      {estimatedReturn !== null && (
                        <div className="text-right">
                          <div className="font-black text-emerald-600 text-sm">+{estimatedReturn.toLocaleString("fr-FR")} F</div>
                          <div className="text-xs text-emerald-500 font-bold">estimé</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activité */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-50 font-bold text-stone-800 text-sm">Activité récente</div>
              {transactions.length === 0 && <div className="px-4 py-4 text-sm text-stone-400">Aucune transaction</div>}
              {transactions.slice(0, 6).map((tx) => {
                const pos = ["deposit", "receive", "payout", "credit_disbursement"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-0">
                    <span className="text-lg">{pos ? "💰" : "📤"}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-stone-800">{tx.label}</div>
                      <div className="text-xs text-stone-400">{new Date(tx.createdAt).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div className={`text-sm font-bold ${pos ? "text-emerald-600" : "text-rose-600"}`}>{pos ? "+" : "-"}{tx.amount.toLocaleString("fr-FR")} F</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROJETS ── */}
        {tab === "projets" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Bons disponibles</h2>
            {bonds.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <TrendingUp className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Aucun bon disponible pour le moment</div>
              </div>
            )}
            {bonds.map((b) => {
              const target = b.approvedAmount ?? 0;
              const pct = target > 0 ? Math.round((b.investedAmount / target) * 100) : 0;
              const complet = b.investedAmount >= target;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-3xl">🌾</span>
                      <div className="flex-1">
                        <div className="font-black text-stone-900">{farmerNames[b.userId] ?? "Agriculteur"}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${complet ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{complet ? "Complet" : "En cours"}</span>
                          <span className="text-xs text-stone-400">{b.termMonths} mois</span>
                        </div>
                      </div>
                      <div className="bg-lime-50 border border-lime-200 rounded-xl px-2.5 py-1.5 text-center">
                        <div className="font-black text-lime-700 text-sm">{(b.interestRatePerMonth * 100).toFixed(0)}%</div>
                        <div className="text-[9px] text-lime-600">/mois</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1.5">
                      <span>{b.investedAmount.toLocaleString("fr-FR")} F financés</span>
                      <span className="font-black text-stone-700">{pct}% sur {target.toLocaleString("fr-FR")} F</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {!complet && (
                      <button onClick={() => setInvestingBond(b)} className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl font-bold text-sm">
                        Investir dans ce bon
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── RAPPORTS ── */}
        {tab === "rapports" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Mes rapports</h2>
            <div className="grid grid-cols-3 gap-2">
              {[{ l:"Investi",    v:"80 000 F" },{ l:"Rendements", v:"9 000 F" },{ l:"ROI",v:"+11.2%" }].map((s,i)=>(
                <div key={i} className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="font-black text-stone-900 text-base">{s.v}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="font-bold text-stone-800 text-sm mb-3">Performance 6 mois</div>
              <div className="flex items-end gap-1.5 h-24">
                {[40,55,45,70,65,80].map((h,i)=>(
                  <div key={i} className="flex-1 bg-gradient-to-t from-sky-500 to-indigo-400 rounded-t-lg opacity-80" style={{ height:`${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-2">
                {["Jan","Fév","Mar","Avr","Mai","Jun"].map(m=><span key={m}>{m}</span>)}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-50 font-bold text-stone-800 text-sm">Documents</div>
              {[
                { label:"Rapport S1 2026",           date:"25 juin 2026" },
                { label:"Relevé de compte — Juin",   date:"28 juin 2026" },
                { label:"Attestation investissement", date:"01 jan 2026"  },
              ].map((d,i)=>(
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-stone-50 last:border-0">
                  <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-stone-800 text-sm">{d.label}</div>
                    <div className="text-xs text-stone-400">{d.date}</div>
                  </div>
                  <button className="text-xs font-bold bg-sky-50 text-sky-600 border border-sky-200 rounded-lg px-2 py-1">PDF</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFIL ── */}
        {tab === "profil" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Mon profil</h2>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-5">
                <Avatar name={profile?.fullName || "?"} size="xl" />
                <div>
                  <div className="font-black text-stone-900 text-lg">{profile?.fullName}</div>
                  <div className="text-sm text-stone-500">Investisseur · {profile?.region}</div>
                  {profile?.kycStatus !== "pending" && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full px-3 py-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> Compte vérifié
                    </div>
                  )}
                </div>
              </div>
              {[
                { label:"Email",        value: profile?.email || "—",      icon: Mail   },
                { label:"Téléphone",    value: profile?.phone || "—",      icon: Phone  },
                { label:"Coopérative",  value: profile?.cooperativeId || "—", icon: BadgeCheck },
                { label:"Région",       value: `${profile?.village ?? ""}, ${profile?.region ?? ""}`, icon: MapPin },
              ].map((r,i)=>{
                const Icon = r.icon;
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-stone-50 last:border-0">
                    <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-stone-400">{r.label}</div>
                      <div className="font-bold text-stone-800 text-sm">{r.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-rose-100 text-rose-600 py-4 rounded-2xl font-bold text-sm hover:bg-rose-50 transition-colors shadow-sm">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        )}
      </main>

      {investingBond && profile && (
        <InvestBondModal bond={investingBond} investorId={profile.uid} balance={balance}
          farmerName={farmerNames[investingBond.userId] ?? "Agriculteur"}
          onClose={() => setInvestingBond(null)}
          onDone={() => setInvestingBond(null)} />
      )}
    </div>
  );
}

function InvestBondModal({ bond, investorId, balance, farmerName, onClose, onDone }: {
  bond: Credit; investorId: string; balance: number; farmerName: string; onClose: () => void; onDone: () => void;
}) {
  useBackGuard(true, onClose);
  const { pushToast } = useApp();
  const remaining = (bond.approvedAmount ?? 0) - bond.investedAmount;
  const [amount, setAmount] = useState(Math.min(10000, remaining));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = amount > 0 && amount <= remaining && amount <= balance;

  const handleInvest = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await investInBond(investorId, bond.id, amount);
      pushToast({ tone: "success", title: "Investissement confirmé !", message: `${amount.toLocaleString("fr-FR")} F` });
      onDone();
    } catch (err) {
      console.error("Erreur investissement bon :", err);
      setError(err instanceof Error ? err.message : "Impossible d'investir. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">🌱 Investir — {farmerName}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 grid grid-cols-2 gap-2 text-center text-xs">
            <div><div className="text-stone-500">Reste à financer</div><div className="font-black text-stone-800">{remaining.toLocaleString("fr-FR")} F</div></div>
            <div><div className="text-stone-500">Mon solde</div><div className="font-black text-stone-800">{balance.toLocaleString("fr-FR")} F</div></div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Montant à investir (F)</label>
            <input type="number" min={0} max={Math.min(remaining, balance)} step={500} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
          </div>

          <button onClick={handleInvest} disabled={!valid || saving}
            className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-sky-500 to-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmer l'investissement
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== AGENT TERRAIN SPACE ====================

function SupervisorSpace({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"beneficiaires" | "collecte" | "groupes">("beneficiaires");
  const { online, pushToast } = useApp();
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [weeks, setWeeks] = useState(1);
  const [groups, setGroups] = useState<SusuGroup[]>([]);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SusuGroup | null>(null);
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);
  const [myTotal, setMyTotal] = useState(0);

  const canCreateBeneficiary = hasPermission(profile, "beneficiary_create");
  const canEditBeneficiary = hasPermission(profile, "beneficiary_edit");
  const canDeactivateBeneficiary = hasPermission(profile, "beneficiary_deactivate");
  const canCollect = hasPermission(profile, "contribution_collect");
  const canCreateGroup = hasPermission(profile, "group_create");
  const canEditGroup = hasPermission(profile, "group_edit");
  const canDeleteGroup = hasPermission(profile, "group_delete");

  const refreshProfiles = () => { listProfiles().then((p) => { setProfiles(p); setProfilesLoading(false); }); };
  useEffect(refreshProfiles, []);

  useEffect(() => {
    if (!profile?.cooperativeId) return;
    const u = subscribeToGroupsByCooperative(profile.cooperativeId, setGroups);
    return () => u();
  }, [profile?.cooperativeId]);

  const beneficiaries = profiles.filter((p) => p.role === "farmer" && p.cooperativeId === profile?.cooperativeId);
  const myBeneficiaries = beneficiaries.filter((p) => p.supervisorId === profile?.uid);
  const nameByUid = new Map(profiles.map((p) => [p.uid, p.fullName]));
  const amount = WEEKLY_CONTRIBUTION * weeks;

  useEffect(() => {
    const ids = myBeneficiaries.map((p) => p.uid);
    if (ids.length === 0) { setMyTotal(0); return; }
    getContributionsTotalForUsers(ids).then(setMyTotal);
  }, [myBeneficiaries.map((p) => p.uid).join(",")]);

  const selectBeneficiary = (p: Profile) => {
    setSelected(p);
    setWeeks(1);
    setTab("collecte");
  };

  const confirmCollection = async () => {
    if (!selected) return;
    try {
      await recordContribution(selected.uid, amount, "guarantee_fund", "Cotisation Bokanmin — collectée par agent (Wave)");
      pushToast({ tone: "success", title: "Cotisation enregistrée !", message: `${selected.fullName} · ${amount.toLocaleString("fr-FR")} F` });
    } catch (err) {
      console.error("Erreur collecte cotisation :", err);
      pushToast({ tone: "warn", title: "Échec de la cotisation", message: "Réessayez, vérifiez votre connexion." });
      throw err;
    }
  };

  const navItems = [
    { id: "beneficiaires", icon: Users,      label: "Bénéficiaires" },
    { id: "collecte",      icon: QrCode,     label: "Collecte"      },
    { id: "groupes",       icon: UsersRound, label: "Groupes"       },
  ] as const;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sky-600 rounded-xl flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-black text-stone-900 text-sm">Superviseur</div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                {online ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                COOPAVEC · {profile?.cooperativeId}
              </div>
            </div>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl px-3 py-2 text-xs font-bold transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-stone-200 z-30">
        <div className="max-w-xl mx-auto grid grid-cols-3">
          {navItems.map(it => {
            const Icon = it.icon;
            const active = tab === it.id;
            return (
              <button key={it.id} onClick={() => setTab(it.id)}
                className="relative flex flex-col items-center justify-center py-2.5 gap-0.5">
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sky-500 rounded-b-full" />}
                <div className={`p-1.5 rounded-xl ${active ? "bg-sky-100" : ""}`}>
                  <Icon className="w-5 h-5" style={{ color: active ? "#0284c7" : "#78716c" }} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] ${active ? "font-extrabold text-sky-700" : "font-medium text-stone-500"}`}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-xl mx-auto px-4 py-5 pb-24">
        {tab === "beneficiaires" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900">Bénéficiaires de mon secteur</h2>
              {canCreateBeneficiary && (
                <button onClick={() => setShowAddBeneficiary(true)}
                  className="flex items-center gap-1.5 bg-sky-600 text-white rounded-xl px-3 py-2 text-xs font-bold">
                  <UserPlus className="w-3.5 h-3.5" /> Ajouter
                </button>
              )}
            </div>
            <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
              <div className="text-xs text-sky-700 font-semibold">Total cotisé par mes bénéficiaires ({myBeneficiaries.length})</div>
              <div className="font-black text-sky-900 text-xl">{myTotal.toLocaleString("fr-FR")} F</div>
            </div>
            {profilesLoading && <SkeletonList rows={4} />}
            {!profilesLoading && beneficiaries.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Aucun bénéficiaire dans votre coopérative</div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {beneficiaries.map((b) => (
                <div key={b.uid} className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-stone-50 last:border-0">
                  <button onClick={() => selectBeneficiary(b)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <Avatar name={b.fullName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-900 text-sm">{b.fullName}</div>
                      <div className="text-xs text-stone-500">{b.village}, {b.region} · {b.phone}</div>
                    </div>
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    b.kycStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}>{b.kycStatus === "pending" ? "KYC en attente" : b.kycStatus}</span>
                  <button onClick={() => setSelectedMemberUid(b.uid)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 flex-shrink-0" aria-label="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "collecte" && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-stone-900">Collecte de cotisation</h2>
            {!selected ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <QrCode className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Sélectionnez un bénéficiaire dans l'onglet « Bénéficiaires »</div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-3">
                  <Avatar name={selected.fullName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 text-sm">{selected.fullName}</div>
                    <div className="text-xs text-stone-500">{selected.village}, {selected.region}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                  <div className="text-xs text-stone-500 mb-3 font-bold">Cotisation Bokanmin</div>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <button onClick={() => setWeeks((w) => Math.max(1, w - 1))}
                      className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-black text-lg">−</button>
                    <div className="text-center">
                      <div className="text-2xl font-black text-stone-800">{weeks}</div>
                      <div className="text-[10px] text-stone-500 font-semibold uppercase">semaine{weeks > 1 ? "s" : ""}</div>
                    </div>
                    <button onClick={() => setWeeks((w) => w + 1)}
                      className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-black text-lg">+</button>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center mb-3 border border-amber-100">
                    <Money value={amount} size="md" />
                  </div>
                </div>

                <WavePaymentBanner amount={amount} />

                {canCollect ? (
                  <ConfirmButton onConfirm={confirmCollection} label="J'ai vérifié la réception — Confirmer"
                    className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600" />
                ) : (
                  <div className="text-center text-xs text-stone-400 font-medium py-2">Droit "Collecter une cotisation" non accordé par l'admin.</div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "groupes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-900">Groupes Bokanmin</h2>
              {canCreateGroup && (
                <button onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1.5 bg-sky-600 text-white rounded-xl px-3 py-2 text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" /> Créer
                </button>
              )}
            </div>
            {groups.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                <UsersRound className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <div className="text-sm text-stone-500 font-medium">Aucun groupe créé dans votre coopérative</div>
              </div>
            )}
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-bold text-stone-900 text-sm">{g.name}</div>
                    <div className="flex items-center gap-1">
                      {canEditGroup && (
                        <button onClick={() => setEditingGroup(g)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400" aria-label="Modifier le groupe">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteGroup && (
                        <button onClick={() => deleteGroup(g.id)} className="p-1 rounded-lg hover:bg-red-50 text-red-400" aria-label="Supprimer le groupe">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-stone-500 mb-2">{g.memberIds.length} membre{g.memberIds.length > 1 ? "s" : ""} · {g.contributionAmount.toLocaleString("fr-FR")} F / semaine</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.memberIds.map((uid) => (
                      <span key={uid} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                        {nameByUid.get(uid) ?? uid}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAddBeneficiary && (
        <AddBeneficiaryForm allowedRoles={["farmer"]} supervisorId={profile?.uid ?? null} onClose={() => setShowAddBeneficiary(false)}
          onDone={() => { setShowAddBeneficiary(false); refreshProfiles(); }} />
      )}
      {showCreateGroup && profile && (
        <CreateGroupModal cooperativeId={profile.cooperativeId} beneficiaries={beneficiaries}
          onClose={() => setShowCreateGroup(false)}
          onDone={() => { setShowCreateGroup(false); pushToast({ tone: "success", title: "Groupe créé !", message: "" }); }} />
      )}
      {editingGroup && profile && (
        <CreateGroupModal cooperativeId={profile.cooperativeId} beneficiaries={beneficiaries} existingGroup={editingGroup}
          onClose={() => setEditingGroup(null)}
          onDone={() => { setEditingGroup(null); pushToast({ tone: "success", title: "Groupe modifié !", message: "" }); }} />
      )}
      {selectedMemberUid && (
        <MemberDetailPanel uid={selectedMemberUid} variant="supervisor" canEdit={canEditBeneficiary} canDeactivate={canDeactivateBeneficiary} canCollect={canCollect}
          onClose={() => { setSelectedMemberUid(null); refreshProfiles(); }} />
      )}
    </div>
  );
}

function CreateGroupModal({ cooperativeId, beneficiaries, existingGroup, onClose, onDone }: {
  cooperativeId: string; beneficiaries: Profile[]; existingGroup?: SusuGroup; onClose: () => void; onDone: () => void;
}) {
  useBackGuard(true, onClose);
  const [name, setName] = useState(existingGroup?.name ?? "");
  const [contributionAmount, setContributionAmount] = useState(existingGroup?.contributionAmount ?? WEEKLY_CONTRIBUTION);
  const [memberIds, setMemberIds] = useState<string[]>(existingGroup?.memberIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleMember = (uid: string) => {
    setMemberIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  };

  const valid = name.trim().length > 0 && contributionAmount > 0 && memberIds.length > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      if (existingGroup) {
        await updateGroup(existingGroup.id, { name: name.trim(), contributionAmount, memberIds });
      } else {
        await createGroup({ name: name.trim(), cooperativeId, contributionAmount, memberIds });
      }
      onDone();
    } catch (err) {
      console.error("Erreur enregistrement groupe :", err);
      setError("Impossible d'enregistrer le groupe. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">{existingGroup ? "✏️ Modifier le groupe" : "🤝 Nouveau groupe Bokanmin"}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Nom du groupe</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-sm"
              placeholder="Ex : Groupe Village Nord" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Cotisation hebdomadaire (F)</label>
            <input type="number" min={0} step={100} value={contributionAmount}
              onChange={(e) => setContributionAmount(Number(e.target.value))}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-sm" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Membres ({memberIds.length} sélectionné{memberIds.length > 1 ? "s" : ""})</label>
            <div className="bg-stone-50 border border-stone-200 rounded-xl divide-y divide-stone-200 max-h-56 overflow-y-auto">
              {beneficiaries.length === 0 && (
                <div className="p-3 text-xs text-stone-500 text-center">Aucun bénéficiaire disponible</div>
              )}
              {beneficiaries.map((b) => (
                <button key={b.uid} type="button" onClick={() => toggleMember(b.uid)}
                  className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left">
                  <div className={`w-4.5 h-4.5 rounded-md border flex-shrink-0 flex items-center justify-center ${
                    memberIds.includes(b.uid) ? "bg-sky-600 border-sky-600" : "bg-white border-stone-300"
                  }`}>
                    {memberIds.includes(b.uid) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-stone-700">{b.fullName}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={!valid || saving}
            className="w-full py-4 rounded-2xl font-black text-white bg-sky-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {existingGroup ? "Enregistrer les modifications" : "Créer le groupe"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN SHELL ====================

function Shell() {
  const { user, profile, profileLoading, logout } = useAuth();
  const [page, setPage] = useState<AllPages>("home");
  const [pageKey, setPageKey] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const navigate = (p: string) => { setPage(p as AllPages); setPageKey((k) => k + 1); };
  const goHome   = () => navigate("home");
  // Appelé inconditionnellement (règle des Hooks) — no-op tant que page === "home"
  // (donc no-op pour tous les rôles autres que farmer, qui n'utilisent jamais `page`).
  useBackGuard(page !== "home", goHome);

  if (!user) return <LoginPage />;

  const handleLogout = () => { logout(); };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader className="w-6 h-6 text-green-600 animate-spin" />
      </div>
    );
  }

  // Compte Auth sans profil bénéficiaire (nouvelle inscription ou compte
  // existant migré) : on force l'enregistrement réel avant tout accès.
  if (!profile) {
    return <BeneficiaryOnboardingForm uid={user.id} email={user.email} onDone={() => {}} />;
  }

  const role = profile.role;

  if (role === "admin")  return <AdminSpace  onLogout={handleLogout} />;
  if (role === "investor") return <ClientSpace onLogout={handleLogout} />;
  if (role === "agent")    return <SupervisorSpace onLogout={handleLogout} />;

  // ── FARMER ──
  const bottomPages = new Set<string>(["home", "weather", "parcelles", "payments", "identity"]);
  const bottomKey: PageKey = (bottomPages.has(page) ? page : "home") as PageKey;

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
      case "marketplace": return <MarketplacePage />;
      case "crowdfund":   return <CrowdfundPage />;
      case "collecte":    return <CollectePage />;
      case "entrepots":   return <EntrepotsPage />;
      case "recyclage":   return <RecyclagePage />;
      case "carbon":      return <CarbonPage />;
      case "identity":    return <IdentityPage onLogout={handleLogout} />;
      case "payments":    return <PaymentsPage />;
      default:            return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen max-w-xl mx-auto relative shadow-2xl bg-stone-50">
      <TopBar
        title={PAGE_TITLES[page]}
        onBack={page !== "home" ? goHome : undefined}
        userName={user.name}
        onLogout={handleLogout}
      />
      <main key={pageKey} className="pb-20 animate-fade-in">{render()}</main>
      <BottomNav current={bottomKey} onChange={navigate} />
      <Toast />
      {showOnboarding && <OnboardingTour onClose={() => setShowOnboarding(false)} />}
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