// Interfaces miroir des collections Firestore utilisées par l'app.
// Les Timestamp Firestore sont représentés en number (millis epoch) côté app
// pour rester simples à manipuler dans les composants React.

export type Role = "farmer" | "admin" | "investor" | "agent";
export type KycStatus = "pending" | "level1" | "level2";
export type Crop = "maize" | "millet" | "rice" | "anacarde" | "cacao" | "manioc" | "vivrier" | "palmier" | "hevea" | "autre";

/** Droits togglables par l'admin sur un compte superviseur (role "agent"). Absent/null = tout autorisé (rétrocompatible). */
export type SupervisorPermission =
  | "beneficiary_create" | "beneficiary_edit" | "beneficiary_deactivate"
  | "group_create" | "group_edit" | "group_delete"
  | "contribution_collect"
  | "view_beneficiaries" | "view_totals" | "view_groups";

export interface Profile {
  uid: string;
  role: Role;
  fullName: string;
  phone: string;
  email: string;
  village: string;
  region: string;
  cooperativeId: string;
  crops: Crop[];
  kycStatus: KycStatus;
  kycIdPhotoUrl: string | null;
  verificationCode: string;
  active: boolean;
  /** Superviseur (role "agent") responsable de ce bénéficiaire — créé automatiquement ou réassigné par l'admin. */
  supervisorId: string | null;
  /** Uniquement significatif si role === "agent". */
  permissions: Partial<Record<SupervisorPermission, boolean>> | null;
  /** Uniquement significatif si role === "investor" — voir services/investorService.ts. */
  investorProfile?: InvestorProfileType | null;
  /** GIE — part souscrite (cible), alimentée par les cotisations kind="guarantee_fund" existantes. */
  gieShareAmount?: number | null;
  /** Institutionnel — conditions négociées puis validées par l'admin. */
  institutionalConditions?: {
    fundAmount: number;
    interestRatePct: number;
    termMonths: number;
    rules: string;
  } | null;
  createdAt: number;
  updatedAt: number;
}

export interface Wallet {
  uid: string;
  balance: number;
  totalContributed: number;
  contributionsLast12m: number;
  /** Crédits carbone déjà convertis en argent (voir lib/carbon.ts) — le reste s'obtient en comparant au total calculé depuis les parcelles. */
  carbonCreditsRedeemed: number;
  updatedAt: number;
}

export interface GeoPointLike {
  lat: number;
  lng: number;
}

export interface ParcelBoundary {
  type: "polygon" | "circle";
  points?: GeoPointLike[];
  center?: GeoPointLike;
  radius?: number;
}

export interface Parcel {
  id: string;
  ownerId: string;
  name: string;
  crop: Crop;
  hectares: number;
  gps: GeoPointLike | null;
  boundary: ParcelBoundary | null;
  gpsTrace: { time: string; point: GeoPointLike }[] | null;
  createdAt: number;
  updatedAt: number;
}

export interface SusuGroup {
  id: string;
  name: string;
  cooperativeId: string;
  contributionAmount: number;
  memberIds: string[];
  rotationOrder: string[];
  currentTurnIndex: number;
  cycleStartDate: number;
  createdAt: number;
  updatedAt: number;
}

export interface SusuGroupMember {
  uid: string;
  joinedAt: number;
  paidThisCycle: boolean;
  totalContributed: number;
}

export type ContributionKind = "susu" | "guarantee_fund";
export type ContributionStatus = "pending" | "confirmed" | "rejected";

export interface Contribution {
  id: string;
  userId: string;
  groupId: string | null;
  amount: number;
  /** Part assurance/cotisation (fonds de garantie) — visible admin uniquement. */
  insurancePart: number;
  /** Part frais de gestion de la coopérative — visible admin uniquement, n'alimente pas le fonds de garantie. */
  managementFeePart: number;
  kind: ContributionKind;
  /**
   * "pending" = cotisation libre-service (Bokanmin, paiement Wave) envoyée par le
   * bénéficiaire, en attente de validation admin — aucun mouvement d'argent tant que
   * "confirmed". "confirmed" direct = collecte en personne par admin/superviseur
   * (déjà validée sur place).
   */
  status: ContributionStatus;
  confirmedAt: number | null;
  confirmedBy: string | null;
  createdAt: number;
}

export interface GuaranteeFund {
  totalDeposited: number;
  totalDisbursedAsCredits: number;
  reserveRatio: number;
  availableForCredit: number;
  updatedAt: number;
}

export interface CreditSettings {
  multiplierK: number;
  maxFundSharePct: number;
  regulatoryCapByKyc: Record<KycStatus, number>;
  minContributionsRequired: number;
  minLoanAmount: number;
  monthlyRate: number;
  termMonths: number;
}

export type CreditStatus = "pending" | "approved" | "rejected" | "active" | "repaid" | "defaulted";

export interface RepaymentInstallment {
  dueDate: string;
  amount: number;
  status: "upcoming" | "paid" | "late";
}

export interface CreditCalculationSnapshot {
  personalContribution12m: number;
  fundAvailableAtDecision: number;
  fundShareCap: number;
  regulatoryCap: number;
  kycLevelUsed: KycStatus;
  ceiling: number;
  financingScore: number;
}

export interface Credit {
  id: string;
  userId: string;
  requestedAmount: number;
  approvedAmount: number | null;
  status: CreditStatus;
  interestRatePerMonth: number;
  termMonths: number;
  schedule: RepaymentInstallment[];
  calculationSnapshot: CreditCalculationSnapshot | null;
  rejectionReason: string | null;
  requestedAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
  /** uid de l'admin qui a généré le bon. */
  createdBy: string;
  /** Montant total engagé par des investisseurs (payé, en attente ou déjà validé par l'admin) — plafonné à approvedAmount. */
  investedAmount: number;
  /** Part déjà validée par l'admin et versée sur le solde du bénéficiaire — plafonné à approvedAmount. */
  creditedAmount: number;
  /** Absent = "cash" (bons créés avant l'ajout du financement matériel). */
  purpose?: "cash" | "equipment";
  /** Nom de l'équipement financé, uniquement si purpose === "equipment". */
  equipmentLabel?: string | null;
}

export type BondInvestmentStatus = "pending" | "approved" | "rejected";

/** Investissement d'un investisseur dans un bon (Credit approuvé d'un agriculteur), soumis à validation admin. */
export interface BondInvestment {
  id: string;
  creditId: string;
  investorId: string;
  farmerId: string;
  amount: number;
  status: BondInvestmentStatus;
  reviewedBy: string | null;
  createdAt: number;
}

export type TxType =
  | "deposit" | "withdraw" | "send" | "receive" | "payout"
  | "credit_disbursement" | "credit_repayment";

export interface LossClaim {
  id: string;
  userId: string;
  comment: string;
  gps: GeoPointLike | null;
  photoUrls: string[];
  lossKg: number | null;
  estimatedValueFcfa: number | null;
  status: "submitted";
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TxType;
  amount: number;
  label: string;
  relatedCreditId?: string;
  relatedContributionId?: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

// ==================== PROFILS INVESTISSEURS (Financement Participatif) ====================

export type InvestorProfileType = "honor" | "gie" | "institutional";
export type InvestorRequestStatus = "pending" | "approved" | "rejected";

/** Demande d'un fermier pour devenir investisseur (Membre d'Honneur / Réseau GIE / Partenaire Institutionnel). */
export interface InvestorRequest {
  id: string;
  userId: string;
  profileType: InvestorProfileType;
  phone: string;
  email: string;
  /** Réseau GIE uniquement. */
  gieShareAmount?: number;
  /** Partenaire Institutionnel uniquement. */
  institutionName?: string;
  institutionRepresentative?: string;
  fundAmount?: number;
  interestRatePct?: number;
  termMonths?: number;
  rules?: string;
  status: InvestorRequestStatus;
  rejectionReason: string | null;
  createdAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
}

export type DonationChannel = "plateforme" | "virement" | "cheque";
export type DonationStatus = "pending" | "confirmed" | "rejected";

/** Don libre d'un Membre d'Honneur — sans retour financier, ne crédite jamais son propre solde. */
export interface Donation {
  id: string;
  donorId: string;
  amount: number;
  channel: DonationChannel;
  note: string;
  status: DonationStatus;
  confirmedAt: number | null;
  confirmedBy: string | null;
  createdAt: number;
}

/** Document unique `settings/cooperative` — informations de la coopérative éditables par l'admin. */
export interface CooperativeInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  updatedAt: number;
}

// ==================== MARKETPLACE AGRICOLE ====================

export type ListingStatus = "active" | "sold" | "cancelled";

export interface MarketplaceListing {
  id: string;
  farmerId: string;
  crop: Crop;
  quantityKg: number;
  pricePerKgFcfa: number;
  description: string;
  status: ListingStatus;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus = "pending" | "paid" | "cancelled";

/** L'acheteur est une personne/entité externe à l'app (pas de rôle "acheteur") — la coop sert d'intermédiaire. */
export interface MarketplaceOrder {
  id: string;
  listingId: string;
  farmerId: string;
  buyerLabel: string;
  quantityKg: number;
  totalAmountFcfa: number;
  status: OrderStatus;
  createdAt: number;
  paidAt: number | null;
  paidBy: string | null;
}

// ==================== FORMATION / COACHING ====================

export interface TrainingModule {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  durationMinutes: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** Un seul document par utilisateur, id = uid. */
export interface TrainingProgress {
  uid: string;
  completedIds: string[];
  updatedAt: number;
}

// ==================== FINANCEMENT MATÉRIEL AGRICOLE ====================

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  category: string;
  estimatedPriceFcfa: number;
  description: string;
  createdAt: number;
}

export type EquipmentRequestStatus = "pending" | "approved" | "rejected";

export interface EquipmentRequest {
  id: string;
  farmerId: string;
  equipmentItemId: string | null;
  equipmentLabel: string;
  amount: number;
  termMonths: number;
  reason: string;
  status: EquipmentRequestStatus;
  /** Rempli une fois approuvé — le bon de financement correspondant, géré par le moteur de bons existant. */
  linkedCreditId: string | null;
  rejectionReason: string | null;
  createdAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
}
