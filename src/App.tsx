import { useState, useEffect, useRef } from "react";
import {
  Mail, Lock, Eye, EyeOff, LogIn, Loader, AlertCircle, CheckCircle2,
  Wifi, WifiOff, Languages, ChevronLeft, Home, Cloud, Sprout, Wallet,
  AlertTriangle, Shield, TreePine, Coins, ArrowUpRight, ArrowDownLeft,
  Clock, Phone, QrCode, MapPin, User, Leaf, Users, Truck, Warehouse,
  Recycle, FileText, Camera, BarChart2, CreditCard, Building2,
  Package, BadgeCheck, ChevronRight, Star, TrendingUp, Banknote,
  LogOut, Settings, Bell, PieChart, Activity, X, UserPlus,
  UsersRound, Plus, Pencil, Trash2, GraduationCap, Wrench, ShoppingCart, BookOpen, Volume2,
  Award, Handshake, Landmark, Gift,
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { t, LANGS, type Lang, getGreeting } from "./i18n";
import BeneficiaryOnboardingForm from "./components/BeneficiaryOnboardingForm";
import AddParcelForm from "./components/AddParcelForm";
import IdentityQRCode from "./components/IdentityQRCode";
import { getCurrentLocation, type GeoPoint } from "./lib/geolocation";
import { subscribeToGuaranteeFund, subscribeToCreditSettings, getGuaranteeFund, getCreditSettings } from "./services/fundService";
import {
  recordContribution, computeWeeklyStreak, getContributionSplitTotals, getContributionsTotalForUsers,
  submitContributionRequest, confirmContributionRequest, rejectContributionRequest,
  subscribeToPendingContributions, subscribeToUserContributions,
} from "./services/contributionService";
import { subscribeToWallet, getWallet } from "./services/walletService";
import {
  subscribeToUserCredits, subscribeToPendingCredits, countActiveCredits,
  createBondForFarmer, approveBondByBeneficiary, rejectBondByBeneficiary,
  subscribeToInvestableBonds, subscribeToInvestorBonds, investInBond, getCredit,
  subscribeToPendingBondInvestments, reviewBondInvestment, listAllCredits,
} from "./services/creditService";
import { subscribeToCooperativeInfo, updateCooperativeInfo } from "./services/cooperativeService";
import { computeCreditCeiling, computeFinancingScore } from "./lib/credit";
import { listProfiles, updateProfile, getProfile, resolveLoginEmail } from "./services/profileService";
import { looksLikeEmail, syntheticEmailForPhone } from "./lib/phoneAuth";
import { CROPS } from "./lib/crops";
import { computeCarbonCredits, CARBON_CREDIT_PRICE_FCFA } from "./lib/carbon";
import { redeemCarbonCredits } from "./services/carbonService";
import {
  createListing, subscribeToListingsByFarmer, cancelListing, subscribeToActiveListings,
  createOrder, markOrderPaid, cancelOrder, subscribeToOrdersByFarmer, subscribeToPendingOrders,
} from "./services/marketplaceService";
import {
  subscribeToModules, createModule, deleteModule,
  subscribeToProgress, markModuleComplete,
} from "./services/trainingService";
import {
  subscribeToEquipmentCatalog, createEquipmentItem, deleteEquipmentItem,
  submitEquipmentRequest, subscribeToUserEquipmentRequests, subscribeToPendingEquipmentRequests,
  approveEquipmentRequest, rejectEquipmentRequest,
} from "./services/equipmentService";
import { estimateCreditCeiling } from "./services/creditService";
import { speak } from "./lib/speech";
import BigConfirmation from "./components/BigConfirmation";
import IconGridPicker from "./components/IconGridPicker";
import {
  submitInvestorRequest, subscribeToUserInvestorRequests, subscribeToPendingInvestorRequests,
  approveInvestorRequest, rejectInvestorRequest, creditInstitutionalFund,
} from "./services/investorService";
import {
  submitDonation, subscribeToUserDonations, subscribeToPendingDonations, confirmDonation, getDonationsTotalConfirmed,
} from "./services/donationService";
import type { InvestorProfileType, InvestorRequest, Donation } from "./types/firestore";

/** GIE et Institutionnel attendent la validation juridique (Cabinet LAWSON HRR) avant collecte réelle de fonds
 * — même démarche que pour Bokanmin. Ne PAS passer à true sans confirmation explicite de l'utilisateur. */
const INVESTOR_PROFILE_LIVE: Record<InvestorProfileType, boolean> = { honor: true, gie: false, institutional: false };
import type {
  MarketplaceListing, MarketplaceOrder, TrainingModule, TrainingProgress,
  EquipmentCatalogItem, EquipmentRequest,
} from "./types/firestore";
import { createGroup, updateGroup, deleteGroup, subscribeToGroupsByCooperative } from "./services/groupService";
import { hasPermission, SUPERVISOR_PERMISSION_GROUPS } from "./lib/permissions";
import { uploadKycPhoto, uploadLossPhoto } from "./services/storageService";
import { submitLossClaim, getUserLossValueFcfa, subscribeToUserLossClaims } from "./services/lossService";
import DocumentPreviewModal from "./components/DocumentPreviewModal";
import type { PdfDocumentData } from "./lib/pdf";
import { downloadTablePdf } from "./lib/pdf";
import { buildIdentityPayload } from "./lib/qr";
import { vibrate } from "./lib/haptics";
import ConfirmButton from "./components/ConfirmButton";
import { SkeletonList } from "./components/Skeleton";
import SpeakButton from "./components/SpeakButton";
import WavePaymentBanner from "./components/WavePaymentBanner";
import OnboardingTour, { hasSeenOnboarding } from "./components/OnboardingTour";
import { describeAuthError } from "./lib/authErrors";
import { subscribeToNotifications, markAllRead } from "./services/notificationService";
import type { AppNotification, CooperativeInfo } from "./types/firestore";
import AddBeneficiaryForm from "./components/AddBeneficiaryForm";
import MemberDetailPanel from "./components/MemberDetailPanel";
import { listRecentTransactions } from "./services/transactionService";
import { getAgriculturalAdvice } from "./lib/weather";
import { useBackGuard } from "./lib/backGuard";
import type { GuaranteeFund, CreditSettings, Credit, Profile, Transaction, SusuGroup, BondInvestment, LossClaim, Contribution, Crop } from "./types/firestore";

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
      className={`relative flex flex-col justify-between text-white rounded-2xl shadow active:scale-95 transition-transform p-3.5 min-h-[104px] ${COLORS[color] ?? COLORS.green}`}>
      {badge !== undefined && (
        <span className="absolute top-2 right-2 bg-white text-rose-600 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow">
          {badge}
        </span>
      )}
      <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-4xl leading-none">{emoji}</span>
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

/** Module pas encore branché à une vraie source de données — aucune donnée inventée affichée. */
function ComingSoonNotice({ icon: Icon, title, message }: { icon: typeof Clock; title: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-300">
      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 flex items-center justify-center">
        <Icon className="w-6 h-6 text-amber-600" />
      </div>
      <div className="font-black text-stone-800 mb-1">{title}</div>
      <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed">{message}</p>
      <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-[11px] font-bold px-3 py-1.5 rounded-full">
        <Clock className="w-3 h-3" /> Bientôt disponible
      </div>
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
          <div className="relative inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-3 shadow-lg">
            <Leaf className="w-7 h-7 text-white" />
            <button type="button"
              onClick={() => speak(isLogin
                ? "Pour vous connecter, entrez votre numéro de téléphone ou votre email, puis votre mot de passe, et appuyez sur Se connecter."
                : "Pour vous inscrire, entrez votre numéro de téléphone ou votre email, choisissez un mot de passe, et appuyez sur S'inscrire.")}
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white border border-stone-200 shadow flex items-center justify-center text-emerald-600"
              aria-label="Écouter les instructions">
              <Volume2 className="w-3.5 h-3.5" />
            </button>
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
    // Ligne 8 — Accompagnement
    { emoji: "🎓", label: "Formation",        sub: "Coaching",   color: "sky",     page: "formation" },
    { emoji: "⚙️", label: "Matériel",         sub: "Financement flexible", color: "amber", page: "equipment" },
    { emoji: "🤝", label: "Devenir Investisseur", sub: "3 profils", color: "indigo", page: "become-investor" },
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
  const { pushToast, textScale, setTextScale, voiceEnabled, setVoiceEnabled } = useApp();
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

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-stone-500" />
              <div className="text-xs text-stone-500 font-semibold">Lecture audio automatique</div>
            </div>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${voiceEnabled ? "bg-emerald-500" : "bg-stone-200"}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${voiceEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
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
  const [myContribution, setMyContribution] = useState(0);
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToWallet(user.id, (w) => { setMyContribution(w?.totalContributed ?? 0); setBalance(w?.balance ?? 0); });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToUserContributions(user.id, setMyContributions);
    return () => u();
  }, [user?.id]);

  useEffect(() => { if (user) computeWeeklyStreak(user.id).then(setStreak); }, [user?.id]);

  const pendingContributions = myContributions.filter((c) => c.status === "pending");

  const sendContribution = async () => {
    if (!user) return;
    try {
      await submitContributionRequest(user.id, amount, "guarantee_fund");
      pushToast({ tone: "success", big: true, title: "Cotisation envoyée !", message: "En attente de validation par l'admin (sous 24h)." });
    } catch (err) {
      console.error("Erreur envoi cotisation :", err);
      pushToast({ tone: "warn", title: "Échec de l'envoi", message: "Réessayez, vérifiez votre connexion." });
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
        <div className="text-sm opacity-95">Cotisez régulièrement pour devenir éligible aux bons de financement et à l'assurance agricole</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Ma cotisation totale</div><div className="font-black text-lg">{myContribution.toLocaleString("fr-FR")} F</div></div>
          <div className="bg-white/20 rounded-xl p-2 text-center"><div className="text-xs opacity-80">Mon solde disponible</div><div className="font-black text-lg">{balance.toLocaleString("fr-FR")} F</div></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
        <p className="text-xs text-stone-500 mb-3">
          Cotisation fixe de <span className="font-black text-stone-700">1 500 FCFA / semaine</span>. Cotiser régulièrement rend éligible aux bons de financement et à l'assurance agricole.
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
        <ConfirmButton onConfirm={sendContribution} label="Envoyer ✓" successLabel="✓ Envoyé !"
          className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600" />
        <p className="text-[11px] text-stone-400 text-center mt-2">
          Après paiement sur Wave, un admin confirme votre cotisation sous 24h — votre solde sera crédité à ce moment-là.
        </p>
      </div>

      {pendingContributions.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mt-4">
          <div className="font-black text-amber-900 text-sm mb-2">⏳ En attente de validation</div>
          <div className="space-y-2">
            {pendingContributions.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                <div>
                  <div className="font-bold text-stone-800 text-sm">{c.amount.toLocaleString("fr-FR")} F</div>
                  <div className="text-xs text-stone-400">Envoyé le {new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>
              </div>
            ))}
          </div>
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
        pushToast({ tone: "success", big: true, title: "Bon approuvé !", message: "Il est maintenant visible par les investisseurs." });
      } else {
        await rejectBondByBeneficiary(creditId, user.id, "Refusé par le bénéficiaire.");
        pushToast({ tone: "info", big: true, title: "Bon refusé", message: "" });
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

      <ComingSoonNotice icon={Shield} title="Polices & déclenchement automatique"
        message="La souscription de polices et la détection automatique des sinistres (sécheresse, inondation) arrivent bientôt." />
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
  const [claims, setClaims] = useState<LossClaim[]>([]);
  const photoInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    getCurrentLocation().then(setGps).catch((err) => setGpsError(err instanceof Error ? err.message : "Position GPS indisponible"));
  }, []);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToUserLossClaims(user.id, setClaims);
    return () => u();
  }, [user?.id]);

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
        {claims.length === 0 && (
          <div className="text-sm text-stone-400 text-center py-4">Aucun sinistre déclaré pour l'instant</div>
        )}
        {claims.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0">
            <div className="min-w-0 pr-2">
              <div className="font-bold text-stone-800 text-sm truncate">{s.comment || "Sinistre déclaré"}</div>
              <div className="text-xs text-stone-500">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</div>
            </div>
            <div className="text-xs font-bold rounded-full px-2 py-1 bg-amber-100 text-amber-700 flex-shrink-0">Déclaré</div>
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
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [fund, setFund] = useState<GuaranteeFund | null>(null);
  const [activeBonds, setActiveBonds] = useState<number | null>(null);

  useEffect(() => { listProfiles().then((p) => setMemberCount(p.filter((x) => x.role === "farmer" && x.active).length)); }, []);
  useEffect(() => { const u = subscribeToGuaranteeFund(setFund); return () => u(); }, []);
  useEffect(() => { countActiveCredits().then(setActiveBonds); }, []);

  const cagnotte = `${(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F`;
  const items = [
    { icon: Users, label: "Membres de la coopérative", count: memberCount !== null ? `${memberCount} bénéficiaire${memberCount > 1 ? "s" : ""} actif${memberCount > 1 ? "s" : ""}` : "…" },
    { icon: Coins, label: "Épargne coopérative", count: cagnotte },
    { icon: CreditCard, label: "Bons de financement", count: activeBonds !== null ? `${activeBonds} bon${activeBonds > 1 ? "s" : ""} actif${activeBonds > 1 ? "s" : ""}` : "…" },
  ];

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 via-blue-700 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Building2 className="w-6 h-6" /><div className="font-black text-lg">COOPAVEC</div></div>
        <p className="text-sm opacity-90">Tableau de bord de votre coopérative agricole</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/20 rounded-xl p-3"><div className="text-xs opacity-80">Membres</div><div className="text-2xl font-black">{memberCount ?? "—"}</div></div>
          <div className="bg-white/20 rounded-xl p-3"><div className="text-xs opacity-80">Cagnotte coop</div><div className="text-2xl font-black">{cagnotte}</div></div>
        </div>
      </div>

      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <item.icon className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="font-black text-stone-800">{item.label}</div>
            <div className="text-xs text-stone-500">{item.count}</div>
          </div>
        </div>
      ))}

      <ComingSoonNotice icon={TrendingUp} title="Production collective"
        message="Le suivi de la production agrégée de la coopérative sera bientôt disponible ici." />
    </div>
  );
}

// ==================== MODULE : MARKETPLACE AGRICOLE (SOP-02) ====================

const LISTING_STATUS_LABEL: Record<string, string> = { active: "En vente", sold: "Vendue", cancelled: "Annulée" };
const ORDER_STATUS_LABEL: Record<string, string> = { pending: "En attente de paiement", paid: "Payée", cancelled: "Annulée" };

function MarketplacePage() {
  const { user } = useAuth();
  const { pushToast } = useApp();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState<Crop>("cacao");
  const [quantityKg, setQuantityKg] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [otherNote, setOtherNote] = useState("");
  const [showOtherNote, setShowOtherNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToListingsByFarmer(user.id, setListings);
    const u2 = subscribeToOrdersByFarmer(user.id, setOrders);
    return () => { u1(); u2(); };
  }, [user?.id]);

  const handleCreate = async () => {
    if (!user || quantityKg <= 0 || pricePerKg <= 0) return;
    setSaving(true);
    try {
      const description = [...tags, otherNote.trim()].filter(Boolean).join(" · ");
      await createListing(user.id, { crop, quantityKg, pricePerKgFcfa: pricePerKg, description });
      pushToast({ tone: "success", big: true, title: "Récolte publiée !", message: "Votre annonce est visible par la coopérative." });
      setShowForm(false); setQuantityKg(0); setPricePerKg(0); setTags([]); setOtherNote(""); setShowOtherNote(false);
    } catch (err) {
      console.error("Erreur publication annonce :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (listingId: string) => {
    if (!user) return;
    try {
      await cancelListing(listingId, user.id);
    } catch (err) {
      console.error("Erreur annulation annonce :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Package className="w-6 h-6" /><div className="font-black text-lg">Marketplace Agricole</div></div>
        <p className="text-sm opacity-90 mb-3">Publiez vos récoltes, suivez vos commandes jusqu'au paiement.</p>
        <button onClick={() => setShowForm((v) => !v)} className="bg-white/20 backdrop-blur hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Publier une récolte
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Culture</label>
            <IconGridPicker columns={5} value={crop} onChange={setCrop}
              options={CROPS.map((c) => ({ value: c.key, emoji: c.emoji, label: c.label }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Quantité (kg)</label>
              <input type="number" min={0} value={quantityKg || ""} onChange={(e) => setQuantityKg(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Prix / kg (F)</label>
              <input type="number" min={0} value={pricePerKg || ""} onChange={(e) => setPricePerKg(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Précisions (optionnel)</label>
            <div className="flex flex-wrap gap-2">
              {[{ key: "🌿 Bio", label: "🌿 Bio" }, { key: "☀️ Séché", label: "☀️ Séché" }, { key: "🆕 Frais", label: "🆕 Frais" }, { key: "📦 Prêt au transport", label: "📦 Prêt" }].map((t) => (
                <button key={t.key} type="button" onClick={() => toggleTag(t.key)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border-2 ${tags.includes(t.key) ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-stone-50 border-stone-200 text-stone-600"}`}>
                  {t.label}
                </button>
              ))}
              <button type="button" onClick={() => setShowOtherNote((v) => !v)}
                className={`px-3 py-2 rounded-full text-xs font-bold border-2 ${showOtherNote ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-stone-50 border-stone-200 text-stone-600"}`}>
                ✍️ Autre
              </button>
            </div>
            {showOtherNote && (
              <textarea value={otherNote} onChange={(e) => setOtherNote(e.target.value)} rows={2} placeholder="Précision libre"
                className="w-full mt-2 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            )}
          </div>
          {quantityKg > 0 && pricePerKg > 0 && (
            <div className="text-xs text-orange-700 font-semibold">Valeur estimée : {(quantityKg * pricePerKg).toLocaleString("fr-FR")} F</div>
          )}
          <button onClick={handleCreate} disabled={saving || quantityKg <= 0 || pricePerKg <= 0}
            className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-br from-orange-500 to-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Publier
          </button>
        </div>
      )}

      <div className="font-black text-stone-800 mb-2">Mes annonces</div>
      {listings.length === 0 && <div className="text-sm text-stone-400 text-center py-4">Aucune annonce publiée.</div>}
      {listings.map((l) => {
        const cropInfo = CROPS.find((c) => c.key === l.crop);
        return (
          <div key={l.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold text-stone-800">{cropInfo?.emoji} {cropInfo?.label} · {l.quantityKg.toLocaleString("fr-FR")} kg</div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${l.status === "active" ? "bg-emerald-100 text-emerald-700" : l.status === "sold" ? "bg-sky-100 text-sky-700" : "bg-stone-100 text-stone-500"}`}>
                {LISTING_STATUS_LABEL[l.status]}
              </span>
            </div>
            <div className="text-xs text-stone-500 mb-2">{l.pricePerKgFcfa.toLocaleString("fr-FR")} F/kg</div>
            {l.status === "active" && (
              <button onClick={() => handleCancel(l.id)} className="text-xs font-bold text-rose-600">Annuler l'annonce</button>
            )}
          </div>
        );
      })}

      <div className="font-black text-stone-800 mb-2 mt-5">Mes commandes</div>
      {orders.length === 0 && <div className="text-sm text-stone-400 text-center py-4">Aucune commande pour l'instant.</div>}
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-stone-800 text-sm">{o.buyerLabel}</div>
            <div className="text-xs text-stone-500">{o.quantityKg.toLocaleString("fr-FR")} kg · {o.totalAmountFcfa.toLocaleString("fr-FR")} F</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${o.status === "paid" ? "bg-emerald-100 text-emerald-700" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
            {ORDER_STATUS_LABEL[o.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ==================== MODULE 12 : COLLECTE AGRICOLE ====================

function CollectePage() {
  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-800 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Truck className="w-6 h-6" /><div className="font-black text-lg">Collecte Agricole</div></div>
        <p className="text-sm opacity-90">Déclarez votre récolte et planifiez le transport vers l'entrepôt.</p>
      </div>

      <ComingSoonNotice icon={Truck} title="Déclaration de récolte & collecte"
        message="La déclaration de récolte, la demande de transport et le suivi de traçabilité du lot arrivent bientôt." />
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

      <ComingSoonNotice icon={Warehouse} title="Gestion des stocks"
        message="Le suivi des entrées, sorties et de l'inventaire des entrepôts arrive bientôt." />
    </div>
  );
}

// ==================== MODULE 14 : RECYCLAGE DES DÉCHETS ====================

function RecyclagePage() {
  const dechetsCibles = ["Manioc 🥔", "Cacao 🍫", "Anacarde 🥜", "Maïs 🌽", "Palmier 🌴"];

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Recycle className="w-6 h-6" /><div className="font-black text-lg">Recyclage des Déchets</div></div>
        <p className="text-sm opacity-90">Déclarez vos déchets agricoles pour collecte et valorisation.</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
        <div className="font-black text-stone-800 mb-3">🌱 Déchets ciblés</div>
        <div className="flex flex-wrap gap-2">
          {dechetsCibles.map(d => (
            <div key={d} className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1.5 text-sm font-bold">{d}</div>
          ))}
        </div>
      </div>

      <ComingSoonNotice icon={Recycle} title="Déclaration & registre"
        message="La déclaration de déchets pour collecte et le suivi de valorisation arrivent bientôt." />
    </div>
  );
}

// ==================== MODULE CARBONE ====================

function CarbonPage() {
  const { carbonCredits, availableCarbonCredits, co2Saved, parcels, pushToast } = useApp();
  const { user } = useAuth();
  const [redeemAmount, setRedeemAmount] = useState(0);

  useEffect(() => { setRedeemAmount(availableCarbonCredits); }, [availableCarbonCredits]);

  const parcelsByCrop = CROPS
    .map((c) => ({ ...c, parcels: parcels.filter((p) => p.crop === c.key) }))
    .filter((c) => c.parcels.length > 0)
    .map((c) => ({
      ...c,
      hectares: c.parcels.reduce((sum, p) => sum + p.hectares, 0),
      credits: computeCarbonCredits(c.parcels),
    }));

  const handleRedeem = async () => {
    if (!user || redeemAmount <= 0) return;
    try {
      await redeemCarbonCredits(user.id, redeemAmount, carbonCredits);
      pushToast({ tone: "success", big: true, title: "Prime carbone versée !", message: `${(redeemAmount * CARBON_CREDIT_PRICE_FCFA).toLocaleString("fr-FR")} F` });
    } catch (err) {
      console.error("Erreur rachat crédits carbone :", err);
      pushToast({ tone: "warn", title: "Échec", message: err instanceof Error ? err.message : "Réessayez." });
      throw err;
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="text-sm opacity-90">Vos parcelles enregistrées "verdissent" votre ferme et génèrent des crédits carbone.</div>
        <div className="relative grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><Coins className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">Crédits gagnés</div><div className="text-2xl font-black">{carbonCredits}</div></div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3"><TreePine className="w-5 h-5 opacity-80 mb-1" /><div className="text-xs opacity-80 font-medium">CO₂ économisé</div><div className="text-2xl font-black">{co2Saved}t</div></div>
        </div>
      </div>

      {parcelsByCrop.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300 mb-4">
          <TreePine className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <div className="text-sm text-stone-500 font-medium">Enregistrez une parcelle (onglet "Mes Champs") pour commencer à gagner des crédits carbone.</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4">
          <div className="font-black text-stone-800 mb-3">🌱 Détail par culture</div>
          {parcelsByCrop.map((c) => (
            <div key={c.key} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div className="text-sm text-stone-700">{c.emoji} {c.label} · {c.hectares.toLocaleString("fr-FR")} ha</div>
              <div className="text-sm font-black text-emerald-700">+{c.credits.toLocaleString("fr-FR")}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
        <div className="font-black text-stone-800 mb-1">💰 Vendre mes crédits carbone</div>
        <p className="text-xs text-stone-500 mb-3">{CARBON_CREDIT_PRICE_FCFA.toLocaleString("fr-FR")} F par crédit, versés directement sur votre solde.</p>
        {availableCarbonCredits <= 0 ? (
          <div className="text-xs text-stone-400 text-center py-2">Aucun crédit disponible pour l'instant.</div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 mb-3">
              <button onClick={() => setRedeemAmount((a) => Math.max(0, a - 1))} className="w-10 h-10 rounded-xl bg-stone-100 font-black">−</button>
              <div className="text-center">
                <div className="text-2xl font-black text-stone-800">{redeemAmount}</div>
                <div className="text-[10px] text-stone-500 font-semibold uppercase">/ {availableCarbonCredits} disponible{availableCarbonCredits > 1 ? "s" : ""}</div>
              </div>
              <button onClick={() => setRedeemAmount((a) => Math.min(availableCarbonCredits, a + 1))} className="w-10 h-10 rounded-xl bg-stone-100 font-black">+</button>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center mb-3 border border-emerald-100">
              <Money value={redeemAmount * CARBON_CREDIT_PRICE_FCFA} size="md" />
            </div>
            <ConfirmButton onConfirm={handleRedeem} label="Vendre ✓"
              className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600" />
          </>
        )}
      </div>
    </div>
  );
}

// ==================== MODULE FORMATION / COACHING ====================

function FormationPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToModules(setModules);
    const u2 = subscribeToProgress(user.id, setProgress);
    return () => { u1(); u2(); };
  }, [user?.id]);

  const completedIds = new Set(progress?.completedIds ?? []);
  const categories = Array.from(new Set(modules.map((m) => m.category)));

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-6 h-6" /><div className="font-black text-lg">Formation & Coaching</div></div>
        <p className="text-sm opacity-90">{completedIds.size}/{modules.length} module{modules.length > 1 ? "s" : ""} terminé{completedIds.size > 1 ? "s" : ""}</p>
      </div>

      {modules.length === 0 && (
        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
          <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <div className="text-sm text-stone-500 font-medium">Aucun contenu pour l'instant — revenez bientôt.</div>
        </div>
      )}

      {categories.map((cat) => (
        <div key={cat} className="mb-4">
          <div className="text-xs font-black text-stone-500 uppercase tracking-wide mb-2">{cat}</div>
          {modules.filter((m) => m.category === cat).map((m) => {
            const done = completedIds.has(m.id);
            const open = openId === m.id;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-2 overflow-hidden">
                <button onClick={() => setOpenId(open ? null : m.id)} className="w-full text-left p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-100" : "bg-sky-100"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <BookOpen className="w-4 h-4 text-sky-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-800 text-sm truncate">{m.title}</div>
                    <div className="text-xs text-stone-500">{m.summary} · {m.durationMinutes} min</div>
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-stone-600 whitespace-pre-line mb-3">{m.content}</p>
                    {!done && user && (
                      <button onClick={() => markModuleComplete(user.id, m.id)}
                        className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-gradient-to-br from-sky-500 to-blue-600">
                        Marquer comme terminé
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ==================== MODULE FINANCEMENT MATÉRIEL AGRICOLE ====================

const EQUIPMENT_TERM_OPTIONS = [3, 6, 9, 12];

function EquipmentPage() {
  const { user } = useAuth();
  const { pushToast } = useApp();
  const [catalog, setCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [equipmentLabel, setEquipmentLabel] = useState("");
  const [amount, setAmount] = useState(0);
  const [termMonths, setTermMonths] = useState(6);
  const [reasonTag, setReasonTag] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeToEquipmentCatalog(setCatalog);
    if (!user) return;
    const u2 = subscribeToUserEquipmentRequests(user.id, setRequests);
    return () => { u1(); u2(); };
  }, [user?.id]);

  const pickItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = catalog.find((c) => c.id === itemId);
    if (item) { setEquipmentLabel(item.name); setAmount(item.estimatedPriceFcfa); }
  };

  const handleSubmit = async () => {
    const reason = reasonTag === "other" ? otherReason.trim() : reasonTag;
    if (!user || !equipmentLabel.trim() || amount <= 0 || !reason) return;
    setSaving(true);
    try {
      await submitEquipmentRequest(user.id, { equipmentItemId: selectedItemId || null, equipmentLabel, amount, termMonths, reason });
      pushToast({ tone: "success", big: true, title: "Demande envoyée !", message: "La coopérative va l'examiner." });
      setShowForm(false); setSelectedItemId(""); setEquipmentLabel(""); setAmount(0); setReasonTag(""); setOtherReason("");
    } catch (err) {
      console.error("Erreur demande matériel :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    } finally {
      setSaving(false);
    }
  };

  const statusLabel: Record<string, string> = { pending: "En attente", approved: "Approuvée", rejected: "Refusée" };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Wrench className="w-6 h-6" /><div className="font-black text-lg">Financement Matériel</div></div>
        <p className="text-sm opacity-90 mb-3">Choisissez votre équipement, une durée flexible adaptée à votre cycle de récolte.</p>
        <button onClick={() => setShowForm((v) => !v)} className="bg-white/20 backdrop-blur hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Demander un financement
        </button>
      </div>

      {catalog.length > 0 && (
        <div className="mb-4">
          <div className="font-black text-stone-800 mb-2 text-sm">Catalogue — touchez pour choisir</div>
          <div className="grid grid-cols-2 gap-2">
            {catalog.map((it) => {
              const selected = showForm && selectedItemId === it.id;
              return (
                <button key={it.id} type="button" onClick={() => { pickItem(it.id); setShowForm(true); }}
                  className={`text-left rounded-xl p-3 border-2 text-sm ${selected ? "bg-amber-50 border-amber-500" : "bg-white border-stone-200"}`}>
                  <div className="font-bold text-stone-800">{it.name}</div>
                  <div className="text-xs text-stone-500">{it.category}</div>
                  <div className="text-xs font-bold text-amber-700 mt-1">{it.estimatedPriceFcfa.toLocaleString("fr-FR")} F</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Nom de l'équipement</label>
            <input value={equipmentLabel} onChange={(e) => setEquipmentLabel(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Montant demandé (F)</label>
            <input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Durée de remboursement</label>
            <div className="flex gap-2">
              {EQUIPMENT_TERM_OPTIONS.map((t) => (
                <button key={t} onClick={() => setTermMonths(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold ${termMonths === t ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                  {t} mois
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Motif</label>
            <IconGridPicker columns={2} value={reasonTag} onChange={setReasonTag}
              options={[
                { value: "Nouvelle récolte", emoji: "🌾", label: "Nouvelle récolte" },
                { value: "Remplacer un outil cassé", emoji: "🔧", label: "Remplacer un outil" },
                { value: "Agrandir ma production", emoji: "📈", label: "Agrandir ma production" },
                { value: "other", emoji: "✍️", label: "Autre" },
              ]} />
            {reasonTag === "other" && (
              <textarea value={otherReason} onChange={(e) => setOtherReason(e.target.value)} rows={2} placeholder="Précisez votre motif"
                className="w-full mt-2 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            )}
          </div>
          <button onClick={handleSubmit} disabled={saving || !equipmentLabel.trim() || amount <= 0 || (!reasonTag || (reasonTag === "other" && !otherReason.trim()))}
            className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-br from-amber-500 to-orange-600 disabled:opacity-50">
            {saving ? "Envoi…" : "Envoyer la demande"}
          </button>
        </div>
      )}

      <div className="font-black text-stone-800 mb-2">Mes demandes</div>
      {requests.length === 0 && <div className="text-sm text-stone-400 text-center py-4">Aucune demande pour l'instant.</div>}
      {requests.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-stone-800 text-sm">{r.equipmentLabel}</div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"}`}>
              {statusLabel[r.status]}
            </span>
          </div>
          <div className="text-xs text-stone-500">{r.amount.toLocaleString("fr-FR")} F · {r.termMonths} mois</div>
          {r.status === "approved" && <div className="text-xs text-emerald-700 mt-1">✓ Votre bon est visible par les investisseurs.</div>}
          {r.status === "rejected" && r.rejectionReason && <div className="text-xs text-rose-600 mt-1">{r.rejectionReason}</div>}
        </div>
      ))}
    </div>
  );
}

// ==================== MODULE DEVENIR INVESTISSEUR ====================

const INVESTOR_PROFILES: { key: InvestorProfileType; icon: typeof Award; label: string; tagline: string; color: string }[] = [
  { key: "honor", icon: Award, label: "Membre d'Honneur", tagline: "Un don libre, sans retour financier — pour protéger, former, transformer.", color: "from-amber-500 to-yellow-600" },
  { key: "gie", icon: Handshake, label: "Réseau CoopAvec GIE", tagline: "Souscrivez une part (dès 100 000 F), gagnez une commission décidée en Assemblée.", color: "from-violet-600 to-purple-700" },
  { key: "institutional", icon: Landmark, label: "Partenaire Institutionnel", tagline: "Fonds vert ou ligne de crédit au service d'une agriculture durable.", color: "from-sky-600 to-blue-700" },
];

const GIE_SHARE_OPTIONS = [100000, 200000, 300000, 500000];
const REQUEST_STATUS_LABEL: Record<string, string> = { pending: "En attente de validation", approved: "Approuvée", rejected: "Non retenue" };

function BecomeInvestorPage() {
  const { user, profile } = useAuth();
  const { pushToast } = useApp();
  const [requests, setRequests] = useState<InvestorRequest[]>([]);
  const [selected, setSelected] = useState<InvestorProfileType | null>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [gieShareAmount, setGieShareAmount] = useState(100000);
  const [institutionName, setInstitutionName] = useState("");
  const [institutionRepresentative, setInstitutionRepresentative] = useState("");
  const [fundAmount, setFundAmount] = useState(0);
  const [interestRatePct, setInterestRatePct] = useState(0);
  const [termMonths, setTermMonths] = useState(12);
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToUserInvestorRequests(user.id, setRequests);
    return () => u();
  }, [user?.id]);

  const pending = requests.find((r) => r.status === "pending");
  const lastRejected = requests.find((r) => r.status === "rejected");

  const validByType: Record<InvestorProfileType, boolean> = {
    honor: phone.trim().length > 0 && email.trim().length > 0,
    gie: phone.trim().length > 0 && email.trim().length > 0 && gieShareAmount > 0,
    institutional: phone.trim().length > 0 && email.trim().length > 0 && institutionName.trim().length > 0
      && institutionRepresentative.trim().length > 0 && fundAmount > 0 && termMonths > 0,
  };

  const handleSubmit = async () => {
    if (!user || !selected || !validByType[selected]) return;
    setSaving(true);
    try {
      await submitInvestorRequest(user.id, {
        profileType: selected, phone: phone.trim(), email: email.trim(),
        ...(selected === "gie" ? { gieShareAmount } : {}),
        ...(selected === "institutional" ? { institutionName, institutionRepresentative, fundAmount, interestRatePct, termMonths, rules } : {}),
      });
      pushToast({ tone: "success", big: true, title: "Demande envoyée !", message: "L'administration va l'examiner." });
      setSelected(null);
    } catch (err) {
      console.error("Erreur demande investisseur :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="flex items-center gap-2 mb-2"><Handshake className="w-6 h-6" /><div className="font-black text-lg">Devenir Investisseur</div></div>
        <p className="text-sm opacity-90">Choisissez le profil qui correspond à votre engagement envers la coopérative.</p>
      </div>

      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="font-bold text-amber-800 text-sm">Demande en cours — {INVESTOR_PROFILES.find((p) => p.key === pending.profileType)?.label}</div>
          <div className="text-xs text-amber-700 mt-1">{REQUEST_STATUS_LABEL[pending.status]} · envoyée le {new Date(pending.createdAt).toLocaleDateString("fr-FR")}</div>
        </div>
      )}

      {!pending && lastRejected && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4">
          <div className="font-bold text-rose-800 text-sm">Demande précédente non retenue</div>
          {lastRejected.rejectionReason && <div className="text-xs text-rose-700 mt-1">{lastRejected.rejectionReason}</div>}
          <div className="text-xs text-rose-600 mt-1">Vous pouvez soumettre une nouvelle demande ci-dessous.</div>
        </div>
      )}

      {!pending && !selected && (
        <div className="space-y-3">
          {INVESTOR_PROFILES.map((p) => {
            const Icon = p.icon;
            const live = INVESTOR_PROFILE_LIVE[p.key];
            return (
              <button key={p.key} onClick={() => setSelected(p.key)}
                className={`w-full text-left bg-gradient-to-br ${p.color} text-white rounded-2xl p-4 shadow-sm flex items-start gap-3`}>
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-black flex items-center gap-2">{p.label} {!live && <Lock className="w-3.5 h-3.5 opacity-80" />}</div>
                  <div className="text-xs opacity-90 mt-0.5">{p.tagline}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!pending && selected && !INVESTOR_PROFILE_LIVE[selected] && (
        <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
          <Lock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <div className="font-bold text-stone-700 mb-1">Bientôt disponible</div>
          <div className="text-sm text-stone-500">Ce profil est en attente de validation juridique par la coopérative avant toute collecte réelle de fonds.</div>
          <button onClick={() => setSelected(null)} className="mt-4 text-sm font-bold text-violet-600">← Retour</button>
        </div>
      )}

      {!pending && selected && INVESTOR_PROFILE_LIVE[selected] && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-3">
          <button onClick={() => setSelected(null)} className="text-xs font-bold text-stone-400">← Changer de profil</button>
          <div className="font-black text-stone-800">{INVESTOR_PROFILES.find((p) => p.key === selected)?.label}</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
            </div>
          </div>

          {selected === "gie" && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">Part souscrite</label>
              <div className="grid grid-cols-4 gap-2">
                {GIE_SHARE_OPTIONS.map((amt) => (
                  <button key={amt} type="button" onClick={() => setGieShareAmount(amt)}
                    className={`py-2.5 rounded-xl text-xs font-bold ${gieShareAmount === amt ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                    {(amt / 1000).toLocaleString("fr-FR")}k
                  </button>
                ))}
              </div>
              <input type="number" min={100000} step={10000} value={gieShareAmount} onChange={(e) => setGieShareAmount(Number(e.target.value))}
                className="w-full mt-2 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" placeholder="Autre montant (F)" />
            </div>
          )}

          {selected === "institutional" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Nom de l'institution</label>
                <input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Représentant</label>
                <input value={institutionRepresentative} onChange={(e) => setInstitutionRepresentative(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Fonds (F)</label>
                  <input type="number" min={0} value={fundAmount || ""} onChange={(e) => setFundAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Taux (%)</label>
                  <input type="number" min={0} step={0.1} value={interestRatePct || ""} onChange={(e) => setInterestRatePct(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">Durée (mois)</label>
                  <input type="number" min={1} value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Règles et modalités d'accompagnement</label>
                <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm" />
              </div>
            </>
          )}

          {selected === "honor" && (
            <div className="text-xs text-stone-500 bg-stone-50 rounded-xl p-3">
              Aucun montant à indiquer maintenant — une fois votre statut activé, vous pourrez faire un don libre depuis votre espace investisseur.
            </div>
          )}

          <button onClick={handleSubmit} disabled={saving || !validByType[selected]}
            className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-br from-indigo-600 to-violet-700 disabled:opacity-50">
            {saving ? "Envoi…" : "Envoyer ma demande"}
          </button>
        </div>
      )}
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
  const { balance, transactions, pushToast } = useApp();
  const { user } = useAuth();
  const [amount, setAmount] = useState(1000);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToUserContributions(user.id, setMyContributions);
    return () => u();
  }, [user?.id]);

  const pendingContributions = myContributions.filter((c) => c.status === "pending");

  const sendContribution = async () => {
    if (!user || amount <= 0) return;
    try {
      await submitContributionRequest(user.id, amount, "guarantee_fund");
      pushToast({ tone: "success", big: true, title: "Cotisation envoyée !", message: "En attente de validation par l'admin (sous 24h)." });
    } catch (err) {
      console.error("Erreur envoi cotisation libre :", err);
      pushToast({ tone: "warn", title: "Échec de l'envoi", message: "Réessayez, vérifiez votre connexion." });
      throw err;
    }
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <div className="animate-fade-up relative bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl p-5 shadow-xl mb-4">
        <div className="text-xs opacity-90 font-semibold">💚 Solde disponible</div>
        <Money value={balance} size="lg" />
      </div>

      <div className="animate-fade-up delay-1 bg-white rounded-2xl p-4 shadow-sm border border-stone-200 mb-4">
        <div className="font-black text-stone-900 mb-1">Cotiser un montant libre</div>
        <p className="text-xs text-stone-500 mb-3">
          Contrairement à Bokanmin (1 500 F/semaine), choisissez ici le montant que vous voulez cotiser. Il sera prélevé et rendu disponible sur votre solde.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[500, 1000, 2000, 5000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className={`py-2.5 rounded-xl text-sm font-black transition-all ${
              amount === v ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md scale-105" : "bg-stone-100 text-stone-700"
            }`}>{v.toLocaleString("fr-FR")}</button>
          ))}
        </div>

        <label className="block text-xs font-black text-stone-600 mb-1.5">Ou saisissez un autre montant (F)</label>
        <input type="number" min={0} step={100} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
          className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm font-bold mb-3" />

        <div className="bg-violet-50 rounded-xl p-3 text-center mb-3 border border-stone-200">
          <Money value={amount} size="md" />
        </div>

        <div className="mb-3">
          <WavePaymentBanner amount={amount} />
        </div>

        <ConfirmButton onConfirm={sendContribution} label="Envoyer ✓" successLabel="✓ Envoyé !"
          className="w-full py-4 rounded-2xl font-extrabold text-white text-lg shadow-lg bg-gradient-to-br from-emerald-500 to-green-600" />
        <p className="text-[11px] text-stone-400 text-center mt-2">
          Après paiement sur Wave, un admin confirme votre cotisation sous 24h — votre solde sera crédité à ce moment-là.
        </p>
      </div>

      {pendingContributions.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4">
          <div className="font-black text-amber-900 text-sm mb-2">⏳ En attente de validation</div>
          <div className="space-y-2">
            {pendingContributions.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-amber-100">
                <div>
                  <div className="font-bold text-stone-800 text-sm">{c.amount.toLocaleString("fr-FR")} F</div>
                  <div className="text-xs text-stone-400">Envoyé le {new Date(c.createdAt).toLocaleDateString("fr-FR")}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      <ComingSoonNotice icon={TrendingUp} title="Vue projets pour bénéficiaires"
        message="Le financement participatif de vos bons se suit déjà côté investisseurs — une vue dédiée pour les bénéficiaires arrive bientôt ici." />
    </div>
  );
}

// ==================== TOP BAR ====================

function TopBar({ title, voiceHint, onBack, userName, onLogout }: any) {
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
            <button onClick={() => speak(voiceHint || title)} className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-full text-emerald-700" aria-label="Écouter cette page">
              <Volume2 className="w-4 h-4" />
            </button>
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
  | "entrepots" | "recyclage" | "carbon" | "marketplace" | "formation" | "equipment" | "become-investor";

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
  formation:   "Formation & Coaching",
  equipment:   "Financement Matériel",
  "become-investor": "Devenir Investisseur",
};

/** Phrase courte lue à voix haute quand on appuie sur le bouton haut-parleur de chaque page (voir TopBar). */
const PAGE_VOICE_HINTS: Record<string, string> = {
  home:        "Ceci est votre écran d'accueil. Vous voyez votre solde et tous les services de la coopérative.",
  susu:        "Bokanmin, votre épargne collective. Cotisez chaque semaine.",
  weather:     "La météo de votre village et des conseils pour vos cultures.",
  parcelles:   "Mes champs. Ajoutez vos parcelles avec leur position réelle.",
  credit:      "Vos bons de financement. Acceptez ou refusez une offre de la coopérative.",
  insurance:   "Votre assurance agricole contre la sécheresse et les inondations.",
  agriprotect: "Prenez une photo pour protéger vos preuves de récolte.",
  losses:      "Déclarez une perte pour augmenter vos droits au financement.",
  certificate: "Votre certificat numérique agricole, à montrer si besoin.",
  coopavec:    "Informations sur votre coopérative.",
  crowdfund:   "Le financement participatif de vos bons par des investisseurs.",
  collecte:    "Déclarez votre récolte pour la collecte.",
  entrepots:   "Suivi des stocks en entrepôt.",
  recyclage:   "Déclarez vos déchets agricoles pour valorisation.",
  carbon:      "Vos crédits carbone. Vendez-les pour recevoir de l'argent.",
  formation:   "Des conseils et formations pour améliorer votre ferme.",
  equipment:   "Demandez un financement pour acheter du matériel agricole.",
  "become-investor": "Choisissez un profil pour devenir investisseur de la coopérative.",
  identity:    "Votre identité agricole et vos réglages.",
  payments:    "Envoyez une cotisation par Wave.",
  marketplace: "Vendez votre récolte et suivez vos commandes.",
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
  const [pendingContributions, setPendingContributions] = useState<Contribution[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [txsLoading, setTxsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGenerateBond, setShowGenerateBond] = useState(false);
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null);
  const [splitTotals, setSplitTotals] = useState({ insurance: 0, managementFee: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [showCooperativePanel, setShowCooperativePanel] = useState(false);
  const [showMarketplacePanel, setShowMarketplacePanel] = useState(false);
  const [showFormationPanel, setShowFormationPanel] = useState(false);
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [showInvestorRequestsPanel, setShowInvestorRequestsPanel] = useState(false);

  const refreshProfiles = () => { listProfiles().then((p) => { setProfiles(p); setProfilesLoading(false); }); };
  useEffect(refreshProfiles, []);
  useEffect(() => { const u = subscribeToGuaranteeFund(setFund); return () => u(); }, []);
  useEffect(() => { const u = subscribeToPendingCredits(setPendingCredits); return () => u(); }, []);
  useEffect(() => { const u = subscribeToPendingBondInvestments(setPendingInvestments); return () => u(); }, []);
  useEffect(() => { const u = subscribeToPendingContributions(setPendingContributions); return () => u(); }, []);
  useEffect(() => { countActiveCredits().then(setActiveCreditsCount); }, [pendingInvestments]);
  useEffect(() => { listRecentTransactions(8).then((t) => { setRecentTxs(t); setTxsLoading(false); }); }, []);
  useEffect(() => { getContributionSplitTotals().then(setSplitTotals); }, []);

  const nameByUid = new Map(profiles.map((p) => [p.uid, p.fullName]));

  const kpis = [
    { label: "Bénéficiaires enregistrés", val: profiles.length.toLocaleString("fr-FR"), icon: Users },
    { label: "Fonds de garantie déposé",  val: `${(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F`, icon: Wallet },
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

  const reviewContribution = async (contributionId: string, action: "confirm" | "reject") => {
    if (!user) return;
    setDecidingId(contributionId);
    try {
      if (action === "confirm") await confirmContributionRequest(contributionId, user.id);
      else await rejectContributionRequest(contributionId, user.id, "Paiement Wave introuvable — contactez votre superviseur.");
    } catch (err) {
      console.error("Erreur revue cotisation :", err);
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
              <h3 className="text-sm font-black text-stone-700">Cotisations en attente de validation</h3>
              {pendingContributions.length === 0 && (
                <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
                  <Wallet className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <div className="text-sm text-stone-500 font-medium">Aucune cotisation en attente</div>
                </div>
              )}
              {pendingContributions.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-800 text-sm">{nameByUid.get(c.userId) ?? c.userId}</span>
                    <span className="text-[10px] text-stone-400">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="font-black text-stone-900 text-lg">{c.amount.toLocaleString("fr-FR")} F</div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => reviewContribution(c.id, "reject")} disabled={decidingId === c.id}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs disabled:opacity-50">Rejeter</button>
                    <button onClick={() => reviewContribution(c.id, "confirm")} disabled={decidingId === c.id}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">Confirmer & créditer</button>
                  </div>
                </div>
              ))}
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
                { icon: Bell,       label: "Notifications",    desc: "Alertes système",        onClick: () => setShowNotifications(true) },
                { icon: Shield,     label: "Sécurité & accès", desc: "Rôles et permissions",    onClick: () => setShowSecurityPanel(true) },
                { icon: FileText,   label: "Rapports",         desc: "Générer des exports",     onClick: () => setShowReportsPanel(true) },
                { icon: Building2,  label: "Coopérative",      desc: "Informations structure",  onClick: () => setShowCooperativePanel(true) },
                { icon: ShoppingCart, label: "Marketplace",    desc: "Annonces et commandes",   onClick: () => setShowMarketplacePanel(true) },
                { icon: GraduationCap, label: "Formation",     desc: "Contenus pédagogiques",   onClick: () => setShowFormationPanel(true) },
                { icon: Wrench,     label: "Financement matériel", desc: "Catalogue et demandes", onClick: () => setShowEquipmentPanel(true) },
                { icon: Handshake,  label: "Demandes Investisseur", desc: "Membre d'Honneur, GIE, Institutionnel", onClick: () => setShowInvestorRequestsPanel(true) },
              ].map((it, i) => {
                const Icon = it.icon;
                return (
                  <button key={i} type="button" onClick={it.onClick}
                    className="w-full flex items-center gap-3 px-4 py-4 border-b border-stone-50 last:border-0 hover:bg-stone-50 text-left">
                    <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-800 text-sm">{it.label}</div>
                      <div className="text-xs text-stone-500">{it.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300" />
                  </button>
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
      {showNotifications && (
        <AdminNotificationsPanel pendingInvestmentsCount={pendingInvestments.length} pendingBondsCount={pendingCredits.length}
          pendingContributionsCount={pendingContributions.length}
          onClose={() => setShowNotifications(false)} />
      )}
      {showSecurityPanel && (
        <SecurityAccessPanel supervisors={profiles.filter((p) => p.role === "agent")}
          onSelect={(uid) => { setShowSecurityPanel(false); setSelectedMemberUid(uid); }}
          onClose={() => setShowSecurityPanel(false)} />
      )}
      {showReportsPanel && (
        <ReportsPanel profiles={profiles} nameByUid={nameByUid} fund={fund} splitTotals={splitTotals}
          onClose={() => setShowReportsPanel(false)} />
      )}
      {showCooperativePanel && (
        <CooperativeInfoPanel onClose={() => setShowCooperativePanel(false)} />
      )}
      {showMarketplacePanel && (
        <MarketplaceAdminPanel nameByUid={nameByUid} onClose={() => setShowMarketplacePanel(false)} />
      )}
      {showFormationPanel && (
        <FormationAdminPanel onClose={() => setShowFormationPanel(false)} />
      )}
      {showEquipmentPanel && (
        <EquipmentAdminPanel nameByUid={nameByUid} onClose={() => setShowEquipmentPanel(false)} />
      )}
      {showInvestorRequestsPanel && (
        <InvestorRequestsAdminPanel nameByUid={nameByUid} onClose={() => setShowInvestorRequestsPanel(false)} />
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

function AdminNotificationsPanel({ pendingInvestmentsCount, pendingBondsCount, pendingContributionsCount, onClose }: {
  pendingInvestmentsCount: number; pendingBondsCount: number; pendingContributionsCount: number; onClose: () => void;
}) {
  useBackGuard(true, onClose);
  const { user } = useAuth();
  const [personalNotifs, setPersonalNotifs] = useState<AppNotification[]>([]);
  const [broadcastNotifs, setBroadcastNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const u = subscribeToNotifications(user.id, setPersonalNotifs);
    return () => u();
  }, [user?.id]);

  // Canal diffusé "admins" — évite d'avoir à énumérer les uid de tous les admins côté client.
  useEffect(() => {
    const u = subscribeToNotifications("admins", setBroadcastNotifs);
    return () => u();
  }, []);

  const notifs = [...personalNotifs, ...broadcastNotifs].sort((a, b) => b.createdAt - a.createdAt);

  useEffect(() => {
    if (!user) return;
    if (personalNotifs.some((n) => !n.read)) markAllRead(user.id);
    if (broadcastNotifs.some((n) => !n.read)) markAllRead("admins");
  }, [user?.id, personalNotifs.length, broadcastNotifs.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Bell className="w-5 h-5 text-violet-600" /> Notifications</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
              <div className="text-xl font-black text-emerald-700">{pendingContributionsCount}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Cotisations à valider</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
              <div className="text-xl font-black text-amber-700">{pendingInvestmentsCount}</div>
              <div className="text-[10px] text-amber-600 font-semibold">Paiements à valider</div>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 text-center">
              <div className="text-xl font-black text-sky-700">{pendingBondsCount}</div>
              <div className="text-[10px] text-sky-600 font-semibold">Bons en attente bénéficiaire</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {notifs.length === 0 && <div className="p-6 text-center text-sm text-stone-400">Aucune notification</div>}
            {notifs.map((n) => (
              <div key={n.id} className="px-4 py-3 border-b border-stone-50 last:border-0">
                <div className="font-bold text-stone-800 text-sm">{n.title}</div>
                <div className="text-xs text-stone-500">{n.message}</div>
                <div className="text-[10px] text-stone-400 mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_PERMISSION_KEYS = SUPERVISOR_PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

function SecurityAccessPanel({ supervisors, onSelect, onClose }: {
  supervisors: Profile[]; onSelect: (uid: string) => void; onClose: () => void;
}) {
  useBackGuard(true, onClose);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Shield className="w-5 h-5 text-violet-600" /> Sécurité & accès</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-stone-500">Superviseurs et droits accordés — touchez un superviseur pour modifier ses droits.</p>
          {supervisors.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-stone-300">
              <div className="text-sm text-stone-500 font-medium">Aucun superviseur enregistré</div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {supervisors.map((s) => {
              const granted = ALL_PERMISSION_KEYS.filter((k) => hasPermission(s, k)).length;
              return (
                <button key={s.uid} onClick={() => onSelect(s.uid)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-stone-50 last:border-0 text-left hover:bg-stone-50">
                  <Avatar name={s.fullName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 text-sm">{s.fullName}</div>
                    <div className="text-xs text-stone-500">{s.village}, {s.region}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    granted === ALL_PERMISSION_KEYS.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{granted}/{ALL_PERMISSION_KEYS.length} droits</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsPanel({ profiles, nameByUid, fund, splitTotals, onClose }: {
  profiles: Profile[]; nameByUid: Map<string, string>; fund: GuaranteeFund | null;
  splitTotals: { insurance: number; managementFee: number }; onClose: () => void;
}) {
  useBackGuard(true, onClose);
  const [generating, setGenerating] = useState<string | null>(null);

  const exportBeneficiaries = () => {
    const farmers = profiles.filter((p) => p.role === "farmer");
    downloadTablePdf({
      title: "Liste des bénéficiaires", subtitle: `${farmers.length} bénéficiaire(s)`,
      columns: ["Nom", "Village/Région", "KYC", "Superviseur", "Actif"],
      rows: farmers.map((f) => [
        f.fullName, `${f.village}, ${f.region}`, f.kycStatus,
        f.supervisorId ? (nameByUid.get(f.supervisorId) ?? "—") : "—",
        f.active ? "Oui" : "Non",
      ]),
    }, "Beneficiaires_COOPAVEC.pdf");
  };

  const exportFunds = () => {
    downloadTablePdf({
      title: "Cotisations & fonds", subtitle: "Situation actuelle",
      columns: ["Libellé", "Montant"],
      rows: [
        ["Total cotisations — assurance", `${splitTotals.insurance.toLocaleString("fr-FR")} F`],
        ["Total cotisations — frais de gestion", `${splitTotals.managementFee.toLocaleString("fr-FR")} F`],
        ["Fonds de garantie déposé", `${(fund?.totalDeposited ?? 0).toLocaleString("fr-FR")} F`],
        ["Disponible pour crédits", `${(fund?.availableForCredit ?? 0).toLocaleString("fr-FR")} F`],
        ["Déjà prêté (crédits)", `${(fund?.totalDisbursedAsCredits ?? 0).toLocaleString("fr-FR")} F`],
      ],
    }, "Cotisations_Fonds_COOPAVEC.pdf");
  };

  const exportBonds = async () => {
    setGenerating("bonds");
    try {
      const credits = await listAllCredits();
      downloadTablePdf({
        title: "Bons de financement", subtitle: `${credits.length} bon(s)`,
        columns: ["Bénéficiaire", "Montant", "Statut", "Crédité", "Engagé"],
        rows: credits.map((c) => [
          nameByUid.get(c.userId) ?? c.userId,
          `${(c.approvedAmount ?? 0).toLocaleString("fr-FR")} F`,
          c.status,
          `${c.creditedAmount.toLocaleString("fr-FR")} F`,
          `${c.investedAmount.toLocaleString("fr-FR")} F`,
        ]),
      }, "Bons_Financement_COOPAVEC.pdf");
    } finally {
      setGenerating(null);
    }
  };

  const items = [
    { key: "beneficiaries", icon: Users, label: "Liste des bénéficiaires", onClick: exportBeneficiaries },
    { key: "funds", icon: Coins, label: "Cotisations & fonds", onClick: exportFunds },
    { key: "bonds", icon: CreditCard, label: "Bons de financement", onClick: exportBonds },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><FileText className="w-5 h-5 text-violet-600" /> Rapports</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.key} onClick={it.onClick} disabled={generating === it.key}
                className="w-full flex items-center gap-3 px-4 py-4 bg-stone-50 rounded-2xl border border-stone-200 hover:bg-stone-100 disabled:opacity-50">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center"><Icon className="w-4 h-4 text-violet-600" /></div>
                <div className="flex-1 text-left font-bold text-stone-800 text-sm">{it.label}</div>
                {generating === it.key ? <Loader className="w-4 h-4 animate-spin text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-300" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CooperativeInfoPanel({ onClose }: { onClose: () => void }) {
  useBackGuard(true, onClose);
  const [info, setInfo] = useState<CooperativeInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { const u = subscribeToCooperativeInfo(setInfo); return () => u(); }, []);

  const patch = (p: Partial<CooperativeInfo>) => setInfo((prev) => (prev ? { ...prev, ...p } : prev));

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    try {
      await updateCooperativeInfo({ name: info.name, phone: info.phone, email: info.email, address: info.address, region: info.region });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof Omit<CooperativeInfo, "updatedAt">; label: string }[] = [
    { key: "name", label: "Nom de la coopérative" },
    { key: "phone", label: "Téléphone" },
    { key: "email", label: "Email" },
    { key: "address", label: "Adresse" },
    { key: "region", label: "Région" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-violet-600" /> Coopérative</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        {!info ? (
          <div className="p-8 flex justify-center"><Loader className="w-6 h-6 animate-spin text-stone-400" /></div>
        ) : (
          <div className="p-4 space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">{f.label}</label>
                <input value={info[f.key]} onChange={(e) => patch({ [f.key]: e.target.value })}
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving}
              className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-60 ${saved ? "bg-emerald-500" : "bg-gradient-to-br from-violet-600 to-purple-600"}`}>
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saved ? "Enregistré !" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== PANNEAUX ADMIN : MARKETPLACE / FORMATION / MATÉRIEL ====================

function MarketplaceAdminPanel({ nameByUid, onClose }: { nameByUid: Map<string, string>; onClose: () => void }) {
  useBackGuard(true, onClose);
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [pendingOrders, setPendingOrders] = useState<MarketplaceOrder[]>([]);
  const [orderingListingId, setOrderingListingId] = useState<string | null>(null);
  const [buyerLabel, setBuyerLabel] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = subscribeToActiveListings(setListings);
    const u2 = subscribeToPendingOrders(setPendingOrders);
    return () => { u1(); u2(); };
  }, []);

  const handleCreateOrder = async (listing: MarketplaceListing) => {
    if (!buyerLabel.trim()) return;
    setBusy(true);
    try {
      await createOrder(listing, buyerLabel);
      setOrderingListingId(null); setBuyerLabel("");
    } catch (err) {
      console.error("Erreur enregistrement commande :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await markOrderPaid(orderId, user.id);
    } catch (err) {
      console.error("Erreur validation paiement :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setBusy(true);
    try {
      await cancelOrder(orderId);
    } catch (err) {
      console.error("Erreur annulation commande :", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Package className="w-5 h-5 text-violet-600" /> Marketplace</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <div className="font-bold text-stone-800 text-sm mb-2">Commandes en attente de paiement ({pendingOrders.length})</div>
            {pendingOrders.length === 0 && <div className="text-xs text-stone-400 py-2">Aucune commande en attente.</div>}
            {pendingOrders.map((o) => (
              <div key={o.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm truncate">{nameByUid.get(o.farmerId) ?? o.farmerId} → {o.buyerLabel}</div>
                  <div className="text-xs text-stone-500">{o.quantityKg.toLocaleString("fr-FR")} kg · {o.totalAmountFcfa.toLocaleString("fr-FR")} F</div>
                </div>
                <div className="shrink-0 flex gap-1.5">
                  <button onClick={() => handleMarkPaid(o.id)} disabled={busy}
                    className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Marquer payée</button>
                  <button onClick={() => handleCancelOrder(o.id)} disabled={busy}
                    className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-2 rounded-lg disabled:opacity-50">Annuler</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="font-bold text-stone-800 text-sm mb-2">Annonces actives ({listings.length})</div>
            {listings.length === 0 && <div className="text-xs text-stone-400 py-2">Aucune annonce active.</div>}
            {listings.map((l) => (
              <div key={l.id} className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-2">
                <div className="font-bold text-stone-800 text-sm">{nameByUid.get(l.farmerId) ?? l.farmerId}</div>
                <div className="text-xs text-stone-500 mb-2">{l.crop} · {l.quantityKg.toLocaleString("fr-FR")} kg · {l.pricePerKgFcfa.toLocaleString("fr-FR")} F/kg</div>
                {orderingListingId === l.id ? (
                  <div className="flex gap-2">
                    <input value={buyerLabel} onChange={(e) => setBuyerLabel(e.target.value)} placeholder="Nom de l'acheteur"
                      className="flex-1 px-2.5 py-2 bg-white border border-stone-200 rounded-lg text-xs" />
                    <button onClick={() => handleCreateOrder(l)} disabled={busy || !buyerLabel.trim()}
                      className="bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">OK</button>
                  </div>
                ) : (
                  <button onClick={() => setOrderingListingId(l.id)} className="text-xs font-bold text-violet-600">Enregistrer une commande</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormationAdminPanel({ onClose }: { onClose: () => void }) {
  useBackGuard(true, onClose);
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const u = subscribeToModules(setModules); return () => u(); }, []);

  const handleCreate = async () => {
    if (!user || !title.trim() || !category.trim()) return;
    setSaving(true);
    try {
      await createModule(user.id, { title, category, summary, content, durationMinutes });
      setShowForm(false); setTitle(""); setCategory(""); setSummary(""); setContent(""); setDurationMinutes(10);
    } catch (err) {
      console.error("Erreur création module :", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-violet-600" /> Formation</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="w-full py-3 rounded-xl font-bold text-violet-700 bg-violet-50 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Nouveau module
            </button>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Catégorie (ex. Bonnes pratiques)"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Résumé court"
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu complet" rows={4}
                className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Durée (minutes)</label>
                <input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
              </div>
              <button onClick={handleCreate} disabled={saving || !title.trim() || !category.trim()}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-violet-600 disabled:opacity-50">
                {saving ? "Enregistrement…" : "Publier le module"}
              </button>
            </div>
          )}
          <div className="space-y-2">
            {modules.map((m) => (
              <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm truncate">{m.title}</div>
                  <div className="text-xs text-stone-500">{m.category} · {m.durationMinutes} min</div>
                </div>
                <button onClick={() => deleteModule(m.id)} className="shrink-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentAdminPanel({ nameByUid, onClose }: { nameByUid: Map<string, string>; onClose: () => void }) {
  useBackGuard(true, onClose);
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<EquipmentRequest[]>([]);
  const [ceilingByFarmer, setCeilingByFarmer] = useState<Record<string, number>>({});
  const [showItemForm, setShowItemForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedPriceFcfa, setEstimatedPriceFcfa] = useState(0);
  const [itemDescription, setItemDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = subscribeToEquipmentCatalog(setCatalog);
    const u2 = subscribeToPendingEquipmentRequests(setPendingRequests);
    return () => { u1(); u2(); };
  }, []);

  const pendingFarmerIds = pendingRequests.map((r) => r.farmerId).join(",");
  useEffect(() => {
    const ids = Array.from(new Set(pendingRequests.map((r) => r.farmerId))).filter((id) => !(id in ceilingByFarmer));
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => estimateCreditCeiling(id).then((r) => [id, r.ceiling] as const).catch(() => [id, 0] as const)))
      .then((entries) => setCeilingByFarmer((prev) => ({ ...prev, ...Object.fromEntries(entries) })));
  }, [pendingFarmerIds]);

  const handleCreateItem = async () => {
    if (!name.trim() || !category.trim()) return;
    setBusy(true);
    try {
      await createEquipmentItem({ name, category, estimatedPriceFcfa, description: itemDescription });
      setShowItemForm(false); setName(""); setCategory(""); setEstimatedPriceFcfa(0); setItemDescription("");
    } catch (err) {
      console.error("Erreur ajout équipement :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await approveEquipmentRequest(requestId, user.id);
    } catch (err) {
      console.error("Erreur approbation demande matériel :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await rejectEquipmentRequest(requestId, user.id, "Demande refusée par la coopérative.");
    } catch (err) {
      console.error("Erreur refus demande matériel :", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-violet-600" /> Financement matériel</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <div className="font-bold text-stone-800 text-sm mb-2">Demandes en attente ({pendingRequests.length})</div>
            {pendingRequests.length === 0 && <div className="text-xs text-stone-400 py-2">Aucune demande en attente.</div>}
            {pendingRequests.map((r) => (
              <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                <div className="font-bold text-stone-800 text-sm">{nameByUid.get(r.farmerId) ?? r.farmerId} — {r.equipmentLabel}</div>
                <div className="text-xs text-stone-500 mb-1">{r.amount.toLocaleString("fr-FR")} F · {r.termMonths} mois · {r.reason}</div>
                {r.farmerId in ceilingByFarmer && (
                  <div className="text-[11px] text-violet-600 mb-2">💡 Plafond estimé : {ceilingByFarmer[r.farmerId].toLocaleString("fr-FR")} F (indicatif, non bloquant)</div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(r.id)} disabled={busy}
                    className="flex-1 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Approuver</button>
                  <button onClick={() => handleReject(r.id)} disabled={busy}
                    className="flex-1 bg-rose-50 text-rose-600 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Rejeter</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-stone-800 text-sm">Catalogue ({catalog.length})</div>
              <button onClick={() => setShowItemForm((v) => !v)} className="text-xs font-bold text-violet-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Ajouter</button>
            </div>
            {showItemForm && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 mb-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex. Motoculteur)"
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
                <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Catégorie (ex. Motorisation)"
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
                <input type="number" min={0} value={estimatedPriceFcfa || ""} onChange={(e) => setEstimatedPriceFcfa(Number(e.target.value))} placeholder="Prix indicatif (F)"
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
                <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Description" rows={2}
                  className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm" />
                <button onClick={handleCreateItem} disabled={busy || !name.trim() || !category.trim()}
                  className="w-full py-2.5 rounded-lg font-bold text-white bg-violet-600 disabled:opacity-50">Ajouter au catalogue</button>
              </div>
            )}
            {catalog.map((it) => (
              <div key={it.id} className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm truncate">{it.name}</div>
                  <div className="text-xs text-stone-500">{it.category} · {it.estimatedPriceFcfa.toLocaleString("fr-FR")} F</div>
                </div>
                <button onClick={() => deleteEquipmentItem(it.id)} className="shrink-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvestorRequestsAdminPanel({ nameByUid, onClose }: { nameByUid: Map<string, string>; onClose: () => void }) {
  useBackGuard(true, onClose);
  const { user } = useAuth();
  const [requests, setRequests] = useState<InvestorRequest[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = subscribeToPendingInvestorRequests(setRequests);
    const u2 = subscribeToPendingDonations(setDonations);
    getDonationsTotalConfirmed().then(setDonationsTotal);
    return () => { u1(); u2(); };
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await approveInvestorRequest(requestId, user.id);
    } catch (err) {
      console.error("Erreur approbation demande investisseur :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await rejectInvestorRequest(requestId, user.id, "Demande non retenue par la coopérative.");
    } catch (err) {
      console.error("Erreur refus demande investisseur :", err);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDonation = async (donationId: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await confirmDonation(donationId, user.id);
    } catch (err) {
      console.error("Erreur confirmation don :", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><Handshake className="w-5 h-5 text-violet-600" /> Demandes Investisseur</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <div className="font-bold text-stone-800 text-sm mb-2">Demandes en attente ({requests.length})</div>
            {requests.length === 0 && <div className="text-xs text-stone-400 py-2">Aucune demande en attente.</div>}
            {requests.map((r) => (
              <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                <div className="font-bold text-stone-800 text-sm">{nameByUid.get(r.userId) ?? r.userId}</div>
                <div className="text-xs text-stone-600 font-semibold">{INVESTOR_PROFILES.find((p) => p.key === r.profileType)?.label}</div>
                <div className="text-xs text-stone-500 mt-1">{r.phone} · {r.email}</div>
                {r.profileType === "gie" && <div className="text-xs text-stone-500">Part souscrite : {(r.gieShareAmount ?? 0).toLocaleString("fr-FR")} F</div>}
                {r.profileType === "institutional" && (
                  <div className="text-xs text-stone-500">
                    {r.institutionName} — {r.institutionRepresentative}<br />
                    Fonds : {(r.fundAmount ?? 0).toLocaleString("fr-FR")} F · Taux : {r.interestRatePct ?? 0}% · Durée : {r.termMonths ?? 0} mois
                  </div>
                )}
                {r.profileType !== "honor" && (
                  <div className="text-[11px] text-amber-700 mt-1">⚠️ Un appel de vérification est recommandé avant validation.</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleApprove(r.id)} disabled={busy}
                    className="flex-1 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Approuver</button>
                  <button onClick={() => handleReject(r.id)} disabled={busy}
                    className="flex-1 bg-rose-50 text-rose-600 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Rejeter</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-stone-800 text-sm">Dons Membre d'Honneur en attente ({donations.length})</div>
              <div className="text-xs text-stone-500">Total confirmé : {donationsTotal.toLocaleString("fr-FR")} F</div>
            </div>
            {donations.length === 0 && <div className="text-xs text-stone-400 py-2">Aucun don en attente.</div>}
            {donations.map((d) => (
              <div key={d.id} className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm truncate">{nameByUid.get(d.donorId) ?? d.donorId}</div>
                  <div className="text-xs text-stone-500">{d.amount.toLocaleString("fr-FR")} F · {d.channel}</div>
                </div>
                <button onClick={() => handleConfirmDonation(d.id)} disabled={busy}
                  className="shrink-0 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50">Confirmer</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== CLIENT SPACE ====================

function ClientSpace({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"apercu" | "projets" | "rapports" | "profil">("apercu");
  const { online, transactions, pushToast } = useApp();
  const { profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [bonds, setBonds] = useState<Credit[]>([]);
  const [farmerNames, setFarmerNames] = useState<Record<string, string>>({});
  const [myInvestments, setMyInvestments] = useState<BondInvestment[]>([]);
  const [investmentCredits, setInvestmentCredits] = useState<Record<string, Credit>>({});
  const [investingBond, setInvestingBond] = useState<Credit | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [gieContributions, setGieContributions] = useState<Contribution[]>([]);
  const [donateAmount, setDonateAmount] = useState(0);
  const [contributeAmount, setContributeAmount] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    const u = subscribeToWallet(profile.uid, (w) => setBalance(w?.balance ?? 0));
    return () => u();
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || profile.investorProfile !== "honor") return;
    const u = subscribeToUserDonations(profile.uid, setDonations);
    return () => u();
  }, [profile?.uid, profile?.investorProfile]);

  useEffect(() => {
    if (!profile?.uid || profile.investorProfile !== "gie") return;
    const u = subscribeToUserContributions(profile.uid, setGieContributions);
    return () => u();
  }, [profile?.uid, profile?.investorProfile]);

  const gieShareProgress = gieContributions.filter((c) => c.status === "confirmed").reduce((sum, c) => sum + c.amount, 0);

  const handleDonate = async () => {
    if (!profile?.uid || donateAmount <= 0) return;
    try {
      await submitDonation(profile.uid, donateAmount, "plateforme", "");
      pushToast({ tone: "success", title: "Don envoyé !", message: "En attente de confirmation par l'administration." });
      setDonateAmount(0);
    } catch (err) {
      console.error("Erreur envoi don :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    }
  };

  const handleContributeGie = async () => {
    if (!profile?.uid || contributeAmount <= 0) return;
    try {
      await submitContributionRequest(profile.uid, contributeAmount, "guarantee_fund");
      pushToast({ tone: "success", title: "Cotisation envoyée !", message: "En attente de validation par l'admin (sous 24h)." });
      setContributeAmount(0);
    } catch (err) {
      console.error("Erreur cotisation GIE :", err);
      pushToast({ tone: "warn", title: "Échec", message: "Réessayez." });
    }
  };

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
  const totalEstimatedReturn = myInvestments.reduce((sum, inv) => {
    const credit = investmentCredits[inv.creditId];
    return credit ? sum + Math.round(inv.amount * credit.interestRatePerMonth * credit.termMonths) : sum;
  }, 0);
  const roiPct = totalInvested > 0 ? (totalEstimatedReturn / totalInvested) * 100 : 0;

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

            {/* Profil investisseur (Membre d'Honneur / GIE / Institutionnel) */}
            {profile?.investorProfile && (() => {
              const meta = INVESTOR_PROFILES.find((p) => p.key === profile.investorProfile);
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div className={`bg-gradient-to-br ${meta.color} rounded-2xl p-4 text-white shadow-sm`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5" />
                    <div className="font-black text-sm">{meta.label}</div>
                  </div>

                  {profile.investorProfile === "honor" && (
                    <>
                      <div className="text-xs opacity-90 mb-3">Total donné : {donations.filter((d) => d.status === "confirmed").reduce((s, d) => s + d.amount, 0).toLocaleString("fr-FR")} F</div>
                      <div className="flex gap-2">
                        <input type="number" min={0} value={donateAmount || ""} onChange={(e) => setDonateAmount(Number(e.target.value))}
                          placeholder="Montant (F)" className="flex-1 px-3 py-2 rounded-xl text-sm text-stone-800" />
                        <button onClick={handleDonate} disabled={donateAmount <= 0}
                          className="bg-white text-amber-700 font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1.5">
                          <Gift className="w-4 h-4" /> Faire un don
                        </button>
                      </div>
                    </>
                  )}

                  {profile.investorProfile === "gie" && (
                    <>
                      <div className="flex justify-between text-xs opacity-90 mb-1">
                        <span>{gieShareProgress.toLocaleString("fr-FR")} F cotisés</span>
                        <span className="font-black">sur {(profile.gieShareAmount ?? 0).toLocaleString("fr-FR")} F</span>
                      </div>
                      <div className="h-2 bg-white/25 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, Math.round((gieShareProgress / Math.max(1, profile.gieShareAmount ?? 1)) * 100))}%` }} />
                      </div>
                      <div className="flex gap-2">
                        <input type="number" min={0} value={contributeAmount || ""} onChange={(e) => setContributeAmount(Number(e.target.value))}
                          placeholder="Montant (F)" className="flex-1 px-3 py-2 rounded-xl text-sm text-stone-800" />
                        <button onClick={handleContributeGie} disabled={contributeAmount <= 0}
                          className="bg-white text-violet-700 font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50">Cotiser</button>
                      </div>
                    </>
                  )}

                  {profile.investorProfile === "institutional" && profile.institutionalConditions && (
                    <div className="text-xs opacity-90 space-y-1">
                      <div>Fonds proposé : {profile.institutionalConditions.fundAmount.toLocaleString("fr-FR")} F</div>
                      <div>Taux : {profile.institutionalConditions.interestRatePct}% · Durée : {profile.institutionalConditions.termMonths} mois</div>
                      {profile.institutionalConditions.rules && <div>Conditions : {profile.institutionalConditions.rules}</div>}
                      <div className="opacity-75 mt-1">Le financement se fait par virement bancaire, crédité par la coopérative.</div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                          {b.purpose === "equipment" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚙️ Matériel</span>
                          )}
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
              {[
                { l: "Investi", v: `${totalInvested.toLocaleString("fr-FR")} F` },
                { l: "Rendement estimé", v: `${totalEstimatedReturn.toLocaleString("fr-FR")} F` },
                { l: "ROI estimé", v: totalInvested > 0 ? `+${roiPct.toFixed(1)}%` : "—" },
              ].map((s,i)=>(
                <div key={i} className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm text-center">
                  <div className="font-black text-stone-900 text-base">{s.v}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
            <ComingSoonNotice icon={BarChart2} title="Performance & documents"
              message="Le suivi de performance dans le temps et les documents téléchargeables (relevés, attestations) arrivent bientôt." />
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
                  <div className="text-sm text-stone-500">{INVESTOR_PROFILES.find((p) => p.key === profile?.investorProfile)?.label ?? "Investisseur"} · {profile?.region}</div>
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
                { label:"Entreprise",   value: profile?.cooperativeId || "—", icon: BadgeCheck },
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
      await recordContribution(selected.uid, amount, "guarantee_fund", "Cotisation Bokanmin — collectée par agent (Wave)", profile?.uid);
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
      case "formation":   return <FormationPage />;
      case "equipment":   return <EquipmentPage />;
      case "become-investor": return <BecomeInvestorPage />;
      case "identity":    return <IdentityPage onLogout={handleLogout} />;
      case "payments":    return <PaymentsPage />;
      default:            return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen max-w-xl mx-auto relative shadow-2xl bg-stone-50">
      <TopBar
        title={PAGE_TITLES[page]}
        voiceHint={PAGE_VOICE_HINTS[page]}
        onBack={page !== "home" ? goHome : undefined}
        userName={user.name}
        onLogout={handleLogout}
      />
      <main key={pageKey} className="pb-20 animate-fade-in">{render()}</main>
      <BottomNav current={bottomKey} onChange={navigate} />
      <Toast />
      <BigConfirmation />
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