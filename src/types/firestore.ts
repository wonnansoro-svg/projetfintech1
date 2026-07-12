// Interfaces miroir des collections Firestore utilisées par l'app.
// Les Timestamp Firestore sont représentés en number (millis epoch) côté app
// pour rester simples à manipuler dans les composants React.

export type Role = "farmer" | "admin" | "investor" | "agent";
export type KycStatus = "pending" | "level1" | "level2";
export type Crop = "maize" | "millet" | "rice" | "anacarde" | "cacao" | "manioc" | "vivrier" | "palmier" | "hevea" | "autre";

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
  createdAt: number;
  updatedAt: number;
}

export interface Wallet {
  uid: string;
  balance: number;
  totalContributed: number;
  contributionsLast12m: number;
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

export interface Contribution {
  id: string;
  userId: string;
  groupId: string | null;
  amount: number;
  kind: ContributionKind;
  status: "confirmed";
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
