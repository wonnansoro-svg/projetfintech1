import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fintech-f4dee.firebaseapp.com",
  projectId: "fintech-f4dee",
  storageBucket: "fintech-f4dee.firebasestorage.app",
  messagingSenderId: "683189698437",
  appId: "1:683189698437:web:4660db484bd377a1298eec",
  measurementId: "G-NSF5PPM5KJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ============================================================================
// TYPES
// ============================================================================

type BenCategory = 'Agriculteur' | 'Commerçante' | 'Transporteur';
type InsuranceStatus = 'Actif' | 'En attente' | 'Sinistré' | 'Remboursé';
type LoanStatus = 'Éligible' | 'En cours' | 'Non éligible' | 'Remboursé';
type RiskLevel = 'Faible' | 'Moyen' | 'Élevé';
type MobileProvider = 'Orange Money' | 'MTN' | 'Wave' | 'Moov';

interface GpsPoint { lat: number; lng: number; timestamp: string; }

interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall_30d: number;
  drought_index: number;
  flood_risk: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  alert: string | null;
  lastUpdate: string;
}

interface SusuContribution { date: string; amount: number; status: 'Payé' | 'En retard' | 'En attente'; }

interface ClaimRequest {
  id: string;
  date: string;
  type: 'Sécheresse' | 'Inondation' | 'Maladie cultures' | 'Autre';
  amount: number;
  status: 'Soumis' | 'En cours d\'analyse' | 'Approuvé' | 'Rejeté';
  evidence: string[];
}

interface Beneficiary {
  id: string;
  fintechCode: string;
  category: BenCategory;
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  idCardNumber: string;
  photoUrl?: string;
  fingerprintId?: string;
  voiceId?: string;
  emergencyContact: string;
  language: string;
  estimatedIncome: string;
  mobileMoneyProvider: MobileProvider;
  mobileMoneyNumber: string;
  riskLevel: RiskLevel;
  savings: number;
  cardNumber: string;
  activity: string;
  areaHectares: string;
  season: string;
  farmingMethods: string;
  gpsParcel: GpsPoint[];
  gpsLocation: string;
  cooperative: string;
  susuGroup: string;
  susuContributions: SusuContribution[];
  trustScore: number;
  insuranceStatus: InsuranceStatus;
  carbonCredits: number;
  loanStatus: LoanStatus;
  activities: string[];
  weatherData: WeatherData;
  claims: ClaimRequest[];
  bankAccountNumber: string;
  balance: number;
  loans: { amount: number; rate: number; monthsLeft: number }[];
}

interface FintechAdmin {
  id: string;
  structureName: string;
  adminName: string;
  email: string;
  affiliationCode: string;
}

interface NewBenForm {
  category: BenCategory;
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  idCardNumber: string;
  emergencyContact: string;
  language: string;
  mobileMoneyProvider: MobileProvider;
  mobileMoneyNumber: string;
  estimatedIncome: string;
  susuGroup: string;
  cooperative: string;
  activity: string;
  areaHectares: string;
  farmingMethods: string;
  season: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockWeather: WeatherData = {
  temperature: 28,
  humidity: 72,
  rainfall_30d: 84,
  drought_index: 0.35,
  flood_risk: 'Faible',
  alert: null,
  lastUpdate: '2024-05-15 08:00',
};

const mockWeatherAlert: WeatherData = {
  temperature: 38,
  humidity: 18,
  rainfall_30d: 12,
  drought_index: 0.88,
  flood_risk: 'Faible',
  alert: '🚨 SÉCHERESSE CRITIQUE — Seuil d\'indemnisation atteint. Déclaration disponible.',
  lastUpdate: '2024-05-15 08:00',
};

const initialBeneficiaries: Beneficiary[] = [
  {
    id: '1', fintechCode: 'FIN-DEMO', category: 'Agriculteur',
    fullName: 'Adjoua Kouassi', gender: 'Femme', dob: '1985-05-12',
    phone: '+225 07 00 00 01', idCardNumber: 'CI-1985-123456',
    emergencyContact: '+225 05 00 00 99', language: 'Baoulé',
    estimatedIncome: '1 500 000 FCFA/an',
    mobileMoneyProvider: 'Wave', mobileMoneyNumber: '0700000001',
    riskLevel: 'Faible', savings: 125000, cardNumber: '4532-1234-5678-9012',
    activity: 'Culture du Cacao', areaHectares: '3.5', season: 'Grande saison',
    farmingMethods: 'Agroforesterie',
    gpsLocation: '5.8118, -5.2750',
    gpsParcel: [
      { lat: 5.8118, lng: -5.2750, timestamp: '2024-03-01T08:00' },
      { lat: 5.8122, lng: -5.2748, timestamp: '2024-03-01T08:01' },
      { lat: 5.8125, lng: -5.2755, timestamp: '2024-03-01T08:02' },
      { lat: 5.8120, lng: -5.2760, timestamp: '2024-03-01T08:03' },
    ],
    cooperative: 'COOP-CA N\'Zrama', susuGroup: 'Susu Femmes Vaillantes',
    susuContributions: [
      { date: '2024-01-01', amount: 5000, status: 'Payé' },
      { date: '2024-02-01', amount: 5000, status: 'Payé' },
      { date: '2024-03-01', amount: 5000, status: 'Payé' },
      { date: '2024-04-01', amount: 5000, status: 'Payé' },
      { date: '2024-05-01', amount: 5000, status: 'En attente' },
    ],
    trustScore: 92, insuranceStatus: 'Actif', carbonCredits: 25000,
    loanStatus: 'Éligible',
    activities: [
      '12/04: Semis terminé ✅',
      '05/05: Inspection Satellite — Bonne santé ✅',
      '10/05: Photo géolocalisée parcelle N°2 ✅',
    ],
    weatherData: mockWeather,
    claims: [],
    bankAccountNumber: 'CI-BK-0000-1234-5678',
    balance: 125000,
    loans: [],
  },
  {
    id: '2', fintechCode: 'FIN-DEMO', category: 'Commerçante',
    fullName: 'Mariam Traoré', gender: 'Femme', dob: '1978-11-03',
    phone: '+225 05 12 34 56', idCardNumber: 'CI-1978-789012',
    emergencyContact: '+225 07 98 76 54', language: 'Dioula',
    estimatedIncome: '800 000 FCFA/an',
    mobileMoneyProvider: 'Orange Money', mobileMoneyNumber: '0512345678',
    riskLevel: 'Moyen', savings: 75000, cardNumber: '4532-9876-5432-1098',
    activity: 'Vente Tomates & Ignames', areaHectares: '0',
    season: 'Toute l\'année', farmingMethods: 'Commerce local',
    gpsLocation: '5.3540, -4.0030',
    gpsParcel: [],
    cooperative: 'Marché Central Bouaké', susuGroup: 'Tontine Solidarité',
    susuContributions: [
      { date: '2024-01-01', amount: 3000, status: 'Payé' },
      { date: '2024-02-01', amount: 3000, status: 'Payé' },
      { date: '2024-03-01', amount: 3000, status: 'En retard' },
      { date: '2024-04-01', amount: 3000, status: 'En attente' },
    ],
    trustScore: 67, insuranceStatus: 'En attente', carbonCredits: 0,
    loanStatus: 'En cours',
    activities: [
      '15/03: Inscription marché ✅',
      '20/04: Déclaration stock — 200 kg tomates ✅',
    ],
    weatherData: mockWeatherAlert,
    claims: [
      {
        id: 'CLM-001', date: '2024-05-10',
        type: 'Sécheresse', amount: 150000,
        status: 'En cours d\'analyse',
        evidence: ['Photo stock 10/05', 'Données météo SODEXAM'],
      },
    ],
    bankAccountNumber: 'CI-BK-0000-9876-5432',
    balance: 75000,
    loans: [{ amount: 200000, rate: 8, monthsLeft: 10 }],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function genCode(uid: string) { return `FIN-${uid.substring(0, 4).toUpperCase()}`; }
function genBenId() { return `BEN-${Date.now().toString(36).toUpperCase()}`; }
function genBankAccount() { return `CI-BK-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}`; }
function genCardNumber() { return `4532-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}-${Math.random().toString().slice(2, 6)}`; }

function droughtLabel(di: number) {
  if (di < 0.3) return { label: 'Normal', color: '#16a34a' };
  if (di < 0.6) return { label: 'Modéré', color: '#d97706' };
  if (di < 0.8) return { label: 'Sévère', color: '#ea580c' };
  return { label: 'Critique 🚨', color: '#dc2626' };
}

const LANGUAGES = ['Français', 'Dioula', 'Baoulé', 'Haoussa', 'Wolof', 'Mooré', 'Bambara', 'Fon', 'Éwé'];
const SEASONS = ['Grande saison', 'Petite saison', 'Saison sèche', 'Toute l\'année'];
const FARMING = ['Agroforesterie (Éligible Carbone)', 'Agriculture conventionnelle', 'Commerce local', 'Élevage', 'Pêche'];

// ============================================================================
// PICTOGRAM ICONS (SVG inline) for illiterate users
// ============================================================================

const PictoIcons: Record<string, JSX.Element> = {
  wallet: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M16 12h2"/><path d="M2 10h20"/></svg>,
  weather: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>,
  insurance: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L3 7v6c0 5 4 9.3 9 10.3C17 22.3 21 18 21 13V7L12 2z"/><path d="M9 12l2 2 4-4"/></svg>,
  susu: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><circle cx="15" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6"/></svg>,
  carbon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"/><path d="M8 12s1-4 4-4 4 4 4 4-1 4-4 4-4-4-4-4z"/></svg>,
  map: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>,
  loan: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="15" x2="12" y2="17"/></svg>,
  alert: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.3 3.4L2 20h20L13.7 3.4a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>,
  activity: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  voice: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  photo: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  gps: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>,
  claim: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

// ============================================================================
// MINI GPS MAP (Canvas-based parcel tracer)
// ============================================================================

const ParcelMap: React.FC<{
  points: GpsPoint[];
  onAddPoint?: (p: GpsPoint) => void;
  readonly?: boolean;
}> = ({ points, onAddPoint, readonly = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    // Background grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (points.length < 2) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Démarrez le tracé GPS', W / 2, H / 2);
      return;
    }

    // Normalize coords
    const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 30;
    const toX = (lng: number) => maxLng === minLng ? W / 2 : pad + ((lng - minLng) / (maxLng - minLng)) * (W - pad * 2);
    const toY = (lat: number) => maxLat === minLat ? H / 2 : pad + ((maxLat - lat) / (maxLat - minLat)) * (H - pad * 2);

    // Fill parcel
    ctx.beginPath();
    ctx.moveTo(toX(points[0].lng), toY(points[0].lat));
    points.forEach(p => ctx.lineTo(toX(p.lng), toY(p.lat)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(22, 163, 74, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    points.forEach((p, i) => {
      const x = toX(p.lng), y = toY(p.lat);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#dc2626' : '#16a34a';
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`P${i + 1}`, x, y - 8);
    });
  }, [points]);

  useEffect(() => { draw(); }, [draw]);

  const startTracking = () => {
    if (!navigator.geolocation) { setStatus('GPS non disponible'); return; }
    setTracking(true);
    setStatus('📍 Marchez le long de la bordure de votre parcelle...');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() };
        onAddPoint?.(pt);
        setStatus(`✅ ${points.length + 1} points enregistrés`);
      },
      (err) => setStatus(`Erreur GPS: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setTracking(false);
    setWatchId(null);
    setStatus(`✅ Parcelle tracée — ${points.length} points`);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos(prev => [...prev, reader.result as string]);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={320} height={200} style={{ width: '100%', height: '200px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'block' }} />
      {!readonly && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!tracking ? (
            <button style={{ ...S.primaryBtn, padding: '8px 14px', fontSize: '13px', width: 'auto' }} onClick={startTracking}>
              🚶 Marcher & Tracer
            </button>
          ) : (
            <button style={{ ...S.dangerBtn, padding: '8px 14px', fontSize: '13px', width: 'auto' }} onClick={stopTracking}>
              ⏹ Arrêter le tracé
            </button>
          )}
          <button style={{ ...S.secondaryBtn, padding: '8px 14px', fontSize: '13px', width: 'auto' }} onClick={() => fileRef.current?.click()}>
            📸 Photo géolocalisée
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>
      )}
      {status && <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px' }}>{status}</p>}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          {photos.map((src, i) => (
            <img key={i} src={src} alt="Photo parcelle" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
          ))}
        </div>
      )}
      {points.length > 0 && (
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
          {points.length} pts GPS · Surface estimée : {(points.length * 0.12).toFixed(2)} ha
        </p>
      )}
    </div>
  );
};

// ============================================================================
// WEATHER WIDGET
// ============================================================================

const WeatherCard: React.FC<{ data: WeatherData }> = ({ data }) => {
  const drought = droughtLabel(data.drought_index);
  const insured = data.drought_index >= 0.8 || data.flood_risk === 'Critique';

  return (
    <div style={S.cardWhite}>
      <h3 style={S.cardTitle}>🌤 Données Météo & Risques Climatiques</h3>
      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '-8px', marginBottom: '12px' }}>
        Actualisé : {data.lastUpdate}
      </p>
      {data.alert && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>{data.alert}</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { icon: '🌡️', label: 'Température', value: `${data.temperature}°C`, color: data.temperature > 35 ? '#dc2626' : '#0f172a' },
          { icon: '💧', label: 'Humidité', value: `${data.humidity}%`, color: data.humidity < 30 ? '#dc2626' : '#0f172a' },
          { icon: '🌧️', label: 'Pluie (30j)', value: `${data.rainfall_30d} mm`, color: data.rainfall_30d < 30 ? '#dc2626' : '#16a34a' },
          { icon: '🌊', label: 'Risque inondation', value: data.flood_risk, color: data.flood_risk === 'Critique' ? '#dc2626' : data.flood_risk === 'Élevé' ? '#ea580c' : '#16a34a' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{icon} {label}</div>
            <div style={{ fontWeight: '700', color, fontSize: '14px' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '10px', padding: '10px', background: drought.color + '18', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#0f172a' }}>Indice de sécheresse</span>
        <span style={{ fontWeight: '700', color: drought.color }}>{drought.label} ({Math.round(data.drought_index * 100)}%)</span>
      </div>
      {insured && (
        <button style={{ ...S.dangerBtn, marginTop: '10px', padding: '10px', fontSize: '13px' }}>
          🛡️ Déclarer un sinistre climatique
        </button>
      )}
    </div>
  );
};

// ============================================================================
// SUSU GROUP WIDGET
// ============================================================================

const SusuCard: React.FC<{ ben: Beneficiary }> = ({ ben }) => {
  const paid = ben.susuContributions.filter(c => c.status === 'Payé').length;
  const total = ben.susuContributions.length;
  const pct = Math.round((paid / total) * 100);
  const totalPaid = ben.susuContributions.filter(c => c.status === 'Payé').reduce((s, c) => s + c.amount, 0);

  return (
    <div style={S.cardWhite}>
      <h3 style={S.cardTitle}>🤝 Groupe Susu & Épargne Collective</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px' }}>{ben.susuGroup}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Coopérative : {ben.cooperative}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '700', fontSize: '20px', color: '#16a34a' }}>{totalPaid.toLocaleString()} F</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>cotisé ce cycle</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '8px', marginBottom: '8px' }}>
        <div style={{ background: '#16a34a', borderRadius: '99px', height: '8px', width: `${pct}%`, transition: 'width 0.5s' }} />
      </div>
      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px' }}>{paid}/{total} cotisations payées ({pct}%)</p>

      {/* Contributions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ben.susuContributions.map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
            <span>{c.date}</span>
            <span style={{ fontWeight: '600' }}>{c.amount.toLocaleString()} F</span>
            <span style={{
              padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
              background: c.status === 'Payé' ? '#dcfce7' : c.status === 'En retard' ? '#fef2f2' : '#fef3c7',
              color: c.status === 'Payé' ? '#166534' : c.status === 'En retard' ? '#b91c1c' : '#b45309',
            }}>{c.status}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#166534', fontWeight: '600', fontSize: '13px' }}>Score de Confiance</span>
          <span style={{ fontSize: '22px', fontWeight: '800', color: '#15803d' }}>{ben.trustScore}/100</span>
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '6px', marginTop: '6px' }}>
          <div style={{ background: ben.trustScore > 80 ? '#16a34a' : ben.trustScore > 60 ? '#d97706' : '#dc2626', borderRadius: '99px', height: '6px', width: `${ben.trustScore}%` }} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CLAIMS WIDGET
// ============================================================================

const ClaimsCard: React.FC<{ claims: ClaimRequest[] }> = ({ claims }) => {
  const [showForm, setShowForm] = useState(false);
  const [claimType, setClaimType] = useState<ClaimRequest['type']>('Sécheresse');

  const statusColor: Record<string, string> = {
    'Soumis': '#2563eb', 'En cours d\'analyse': '#d97706',
    'Approuvé': '#16a34a', 'Rejeté': '#dc2626',
  };

  return (
    <div style={S.cardWhite}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🛡️ Déclarations de Sinistres</h3>
        <button style={{ ...S.primaryBtn, width: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowForm(!showForm)}>
          + Nouveau
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: '600', margin: '0 0 10px', fontSize: '14px' }}>Déclarer un sinistre climatique</p>
          <select style={{ ...S.input, marginBottom: '8px' }} value={claimType} onChange={e => setClaimType(e.target.value as any)}>
            <option>Sécheresse</option><option>Inondation</option>
            <option>Maladie cultures</option><option>Autre</option>
          </select>
          <input type="text" placeholder="Montant estimé des pertes (FCFA)" style={{ ...S.input, marginBottom: '8px' }} />
          <input type="file" accept="image/*,video/*" style={{ marginBottom: '8px', width: '100%', fontSize: '12px' }} />
          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 8px' }}>
            Les données GPS et météo sont automatiquement jointes comme preuve.
          </p>
          <button style={{ ...S.primaryBtn, fontSize: '13px', padding: '8px' }}>
            📤 Soumettre la déclaration
          </button>
        </div>
      )}

      {claims.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Aucun sinistre déclaré
        </p>
      ) : (
        claims.map(c => (
          <div key={c.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{c.type}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{c.date} · {c.id}</div>
              </div>
              <span style={{ background: statusColor[c.status] + '20', color: statusColor[c.status], padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700' }}>
                {c.status}
              </span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Montant demandé :</span>
              <strong>{c.amount.toLocaleString()} FCFA</strong>
            </div>
            {c.evidence.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Preuves : </span>
                {c.evidence.map((e, i) => (
                  <span key={i} style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>{e}</span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ============================================================================
// BANK ACCOUNT CARD
// ============================================================================

const BankCard: React.FC<{ ben: Beneficiary }> = ({ ben }) => {
  const [showTransfer, setShowTransfer] = useState(false);

  return (
    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '20px', borderRadius: '16px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compte AgroSusu</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{ben.bankAccountNumber}</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
          {ben.mobileMoneyProvider}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Solde disponible</p>
        <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: '800', color: 'white' }}>
          {ben.balance.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: '400' }}>FCFA</span>
        </p>
      </div>

      {ben.loans.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', marginBottom: '15px' }}>
          {ben.loans.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#94a3b8' }}>Crédit en cours ({l.rate}%)</span>
              <span style={{ fontWeight: '600' }}>{l.amount.toLocaleString()} F · {l.monthsLeft} mois</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button style={{ flex: 1, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          💰 Cotiser Susu
        </button>
        <button style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }} onClick={() => setShowTransfer(!showTransfer)}>
          📲 Retrait USSD
        </button>
      </div>

      {showTransfer && (
        <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#94a3b8' }}>Montant à retirer</p>
          <input type="number" placeholder="Montant (FCFA)" style={{ ...S.input, background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
          <button style={{ ...S.primaryBtn, fontSize: '13px', padding: '8px' }}>
            Confirmer le retrait
          </button>
          <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0' }}>
            Composez *144*4*3# sur votre téléphone pour confirmer
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CARBON CREDITS CARD
// ============================================================================

const CarbonCard: React.FC<{ ben: Beneficiary }> = ({ ben }) => (
  <div style={S.cardWhite}>
    <h3 style={S.cardTitle}>🌱 Crédit Carbone & Finance Verte</h3>
    <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#92400e' }}>Méthode : {ben.farmingMethods}</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#b45309' }}>Superficie : {ben.areaHectares} ha</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontWeight: '800', fontSize: '20px', color: '#b45309' }}>
            +{ben.carbonCredits.toLocaleString()} F
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#b45309' }}>crédits générés</p>
        </div>
      </div>
    </div>

    {ben.farmingMethods.includes('Agroforesterie') ? (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
          <span>Certification CO₂ estimée</span><strong>2.1 tonnes/ha/an</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
          <span>Marché carbone (Gold Standard)</span><strong>~12 500 F/tonne</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
          <span>Revenu annuel estimé</span><strong style={{ color: '#16a34a' }}>{Math.round(parseFloat(ben.areaHectares || '0') * 2.1 * 12500).toLocaleString()} F</strong>
        </div>
        <button style={{ ...S.primaryBtn, marginTop: '12px', fontSize: '13px', padding: '10px' }}>
          📜 Demander certification Gold Standard
        </button>
      </div>
    ) : (
      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Passez à l'Agroforesterie pour générer des crédits carbone et augmenter vos revenus.
        </p>
        <button style={{ ...S.secondaryBtn, marginTop: '10px', fontSize: '12px', padding: '8px' }}>
          En savoir plus
        </button>
      </div>
    )}
  </div>
);

// ============================================================================
// ACTIVITY LOG
// ============================================================================

const ActivityLog: React.FC<{ ben: Beneficiary }> = ({ ben }) => {
  const [voice, setVoice] = useState(false);

  return (
    <div style={S.cardWhite}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>📋 Journal d'Activités</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            style={{ ...S.secondaryBtn, width: 'auto', padding: '5px 10px', fontSize: '12px', background: voice ? '#fef2f2' : undefined, color: voice ? '#dc2626' : undefined }}
            onClick={() => setVoice(!voice)}
          >
            🎤 {voice ? 'Arrêter' : 'Vocal'}
          </button>
          <button style={{ ...S.secondaryBtn, width: 'auto', padding: '5px 10px', fontSize: '12px' }}>
            + Activité
          </button>
        </div>
      </div>

      {voice && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎤</div>
          <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', fontWeight: '600' }}>Enregistrement vocal en cours...</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
            Dites "Semis terminé", "Récolte commencée", "Problème sur la parcelle", etc.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ben.activities.map((a, i) => (
          <div key={i} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #16a34a' }}>
            {a}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600' }}>Ajouter une activité (pictogrammes)</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { icon: '🌱', label: 'Semis' },
            { icon: '💧', label: 'Irrigation' },
            { icon: '🌾', label: 'Récolte' },
            { icon: '🐛', label: 'Maladie' },
            { icon: '☀️', label: 'Sécheresse' },
            { icon: '🌧️', label: 'Pluie' },
          ].map(({ icon, label }) => (
            <button key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', minWidth: '56px' }}>
              <span style={{ fontSize: '22px' }}>{icon}</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// KYC FORM — ENRICHED
// ============================================================================

const KycForm: React.FC<{ fintechCode: string; onSuccess: (ben: Beneficiary) => void; }> = ({ fintechCode, onSuccess }) => {
  const [tab, setTab] = useState<'perso' | 'finance' | 'agri' | 'biometric'>('perso');
  const [form, setForm] = useState<NewBenForm>({
    category: 'Agriculteur', fullName: '', gender: 'Femme', dob: '',
    phone: '', idCardNumber: '', emergencyContact: '', language: 'Français',
    mobileMoneyProvider: 'Wave', mobileMoneyNumber: '', estimatedIncome: '',
    susuGroup: '', cooperative: '', activity: '', areaHectares: '',
    farmingMethods: 'Agriculture conventionnelle', season: 'Grande saison',
  });
  const [parcelPoints, setParcelPoints] = useState<GpsPoint[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState(false);
  const [voice, setVoice] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const upd = (k: keyof NewBenForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    const newBen: Beneficiary = {
      id: genBenId(),
      fintechCode,
      category: form.category,
      fullName: form.fullName || 'Nouveau Bénéficiaire',
      gender: form.gender,
      dob: form.dob,
      phone: form.phone,
      idCardNumber: form.idCardNumber,
      emergencyContact: form.emergencyContact,
      language: form.language,
      estimatedIncome: form.estimatedIncome,
      mobileMoneyProvider: form.mobileMoneyProvider,
      mobileMoneyNumber: form.mobileMoneyNumber,
      riskLevel: 'Moyen',
      savings: 0,
      cardNumber: genCardNumber(),
      activity: form.activity,
      areaHectares: form.areaHectares,
      season: form.season,
      farmingMethods: form.farmingMethods,
      gpsLocation: parcelPoints.length > 0 ? `${parcelPoints[0].lat.toFixed(4)}, ${parcelPoints[0].lng.toFixed(4)}` : 'Non défini',
      gpsParcel: parcelPoints,
      cooperative: form.cooperative,
      susuGroup: form.susuGroup,
      susuContributions: [],
      trustScore: 50,
      insuranceStatus: 'En attente',
      carbonCredits: 0,
      loanStatus: 'Non éligible',
      activities: [`${new Date().toLocaleDateString('fr')}: Inscription complète ✅`],
      weatherData: mockWeather,
      claims: [],
      bankAccountNumber: genBankAccount(),
      balance: 0,
      loans: [],
      photoUrl: photo || undefined,
    };
    onSuccess(newBen);
    alert(`✅ Profil créé ! Compte bancaire : ${newBen.bankAccountNumber}\nCode bénéficiaire : ${newBen.id}`);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const tabStyle = (active: boolean) => ({
    ...( active ? S.tabActive : S.tabInactive ),
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  });

  return (
    <div style={S.section}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ fontSize: '32px' }}>📝</div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Nouveau Profil Numérique (KYC)</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Enregistrement + ouverture de compte bancaire automatique
          </p>
        </div>
      </div>

      {/* Category selector with pictograms */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {([['Agriculteur', '👨🏿‍🌾'], ['Commerçante', '🛒'], ['Transporteur', '🚛']] as [BenCategory, string][]).map(([cat, icon]) => (
          <button key={cat} style={{
            flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer', border: '2px solid',
            borderColor: form.category === cat ? '#16a34a' : '#e2e8f0',
            background: form.category === cat ? '#f0fdf4' : 'white',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          }} onClick={() => upd('category', cat)}>
            <span style={{ fontSize: '24px' }}>{icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: form.category === cat ? '#16a34a' : '#64748b' }}>{cat}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
        {([['perso', '👤 Identité'], ['finance', '💰 Finance'], ['agri', '🌱 Terrain GPS'], ['biometric', '🔐 Biométrie']] as [typeof tab, string][]).map(([t, label]) => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            <span style={{ fontSize: '13px' }}>{label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {tab === 'perso' && (
          <>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
              <div
                style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e2e8f0', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #94a3b8' }}
                onClick={() => photoRef.current?.click()}
              >
                {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '28px' }}>📷</span>}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>Photo du bénéficiaire</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Cliquez pour prendre ou sélectionner</p>
              </div>
              <input ref={photoRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>

            <input type="text" placeholder="Nom et Prénoms complets" style={S.input} value={form.fullName} onChange={e => upd('fullName', e.target.value)} />
            <select style={S.input} value={form.gender} onChange={e => upd('gender', e.target.value)}>
              <option>Femme</option><option>Homme</option>
            </select>
            <input type="date" style={S.input} value={form.dob} onChange={e => upd('dob', e.target.value)} />
            <input type="tel" placeholder="Téléphone (+225...)" style={S.input} value={form.phone} onChange={e => upd('phone', e.target.value)} />
            <input type="text" placeholder="Numéro Pièce d'Identité (NNI)" style={S.input} value={form.idCardNumber} onChange={e => upd('idCardNumber', e.target.value)} />
            <input type="tel" placeholder="Contact d'urgence" style={S.input} value={form.emergencyContact} onChange={e => upd('emergencyContact', e.target.value)} />
            <select style={S.input} value={form.language} onChange={e => upd('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </>
        )}

        {tab === 'finance' && (
          <>
            <select style={S.input} value={form.mobileMoneyProvider} onChange={e => upd('mobileMoneyProvider', e.target.value as MobileProvider)}>
              <option>Wave</option><option>Orange Money</option><option>MTN</option><option>Moov</option>
            </select>
            <input type="tel" placeholder="Numéro Mobile Money" style={S.input} value={form.mobileMoneyNumber} onChange={e => upd('mobileMoneyNumber', e.target.value)} />
            <input type="text" placeholder="Revenus estimés annuels (FCFA)" style={S.input} value={form.estimatedIncome} onChange={e => upd('estimatedIncome', e.target.value)} />
            <input type="text" placeholder="Groupe Susu / Tontine" style={S.input} value={form.susuGroup} onChange={e => upd('susuGroup', e.target.value)} />
            <input type="text" placeholder="Coopérative (si applicable)" style={S.input} value={form.cooperative} onChange={e => upd('cooperative', e.target.value)} />
            <div style={{ gridColumn: 'span 2', background: '#dcfce7', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '24px' }}>🏦</span>
                <div>
                  <p style={{ margin: 0, fontWeight: '700', color: '#166534', fontSize: '14px' }}>Compte bancaire numérique créé automatiquement</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#166534' }}>
                    Un IBAN unique sera généré après validation. Lié à votre Mobile Money.
                    Utilisé pour les cotisations, remboursements assurance, crédits carbone et crédits agricoles.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'agri' && (
          <>
            <input type="text" placeholder={form.category === 'Agriculteur' ? "Type de culture principale" : "Type de marchandise"} style={S.input} value={form.activity} onChange={e => upd('activity', e.target.value)} />
            {form.category === 'Agriculteur' && (
              <input type="number" placeholder="Superficie (Hectares)" style={S.input} value={form.areaHectares} onChange={e => upd('areaHectares', e.target.value)} />
            )}
            <select style={S.input} value={form.farmingMethods} onChange={e => upd('farmingMethods', e.target.value)}>
              {FARMING.map(f => <option key={f}>{f}</option>)}
            </select>
            <select style={S.input} value={form.season} onChange={e => upd('season', e.target.value)}>
              {SEASONS.map(s => <option key={s}>{s}</option>)}
            </select>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '10px', border: '1px dashed #94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>📍</span>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>Module Cartographie Parcelle GPS</h4>
                </div>
                <ParcelMap points={parcelPoints} onAddPoint={p => setParcelPoints(prev => [...prev, p])} />
              </div>
            </div>
          </>
        )}

        {tab === 'biometric' && (
          <>
            <div style={{ gridColumn: 'span 2' }}>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: 0 }}>
                Ces données permettent aux bénéficiaires analphabètes de s'identifier sans mot de passe.
              </p>
            </div>

            {/* Fingerprint */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>👆</div>
              <p style={{ fontWeight: '600', margin: '0 0 8px', fontSize: '14px' }}>Empreinte digitale</p>
              <button
                style={{ ...S.primaryBtn, fontSize: '13px', padding: '8px', background: fingerprint ? '#16a34a' : undefined }}
                onClick={() => setFingerprint(!fingerprint)}
              >
                {fingerprint ? '✅ Enregistrée' : '📲 Capturer'}
              </button>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>Via capteur du téléphone</p>
            </div>

            {/* Voice ID */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎤</div>
              <p style={{ fontWeight: '600', margin: '0 0 8px', fontSize: '14px' }}>Empreinte vocale</p>
              <button
                style={{ ...S.primaryBtn, fontSize: '13px', padding: '8px', background: voice ? '#16a34a' : undefined }}
                onClick={() => setVoice(!voice)}
              >
                {voice ? '✅ Enregistrée' : '🎙️ Enregistrer'}
              </button>
              {voice && <p style={{ fontSize: '12px', color: '#16a34a', margin: '4px 0 0' }}>Dites : "Je m'appelle {form.fullName || '...'}"</p>}
            </div>

            {/* USSD info */}
            <div style={{ gridColumn: 'span 2', background: '#eff6ff', borderRadius: '10px', padding: '14px', border: '1px solid #bfdbfe' }}>
              <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px', color: '#1d4ed8' }}>📱 Accès USSD (Sans Smartphone)</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#1e40af' }}>
                Les bénéficiaires sans smartphone accèdent à leurs services via : <br />
                <strong>*144# → AgroSusu → N° bénéficiaire</strong>
              </p>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button style={{ ...S.secondaryBtn, flex: 1 }} onClick={() => {
          const tabs: (typeof tab)[] = ['perso', 'finance', 'agri', 'biometric'];
          const i = tabs.indexOf(tab);
          if (i > 0) setTab(tabs[i - 1]);
        }}>← Précédent</button>
        {tab !== 'biometric' ? (
          <button style={{ ...S.primaryBtn, flex: 2 }} onClick={() => {
            const tabs: (typeof tab)[] = ['perso', 'finance', 'agri', 'biometric'];
            const i = tabs.indexOf(tab);
            setTab(tabs[i + 1]);
          }}>Suivant →</button>
        ) : (
          <button style={{ ...S.primaryBtn, flex: 2 }} onClick={handleSubmit}>
            ✅ Enregistrer & Créer Compte Bancaire
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BENEFICIARY DASHBOARD — ENRICHED
// ============================================================================

const BeneficiaryDashboard: React.FC<{ ben: Beneficiary; onBack: () => void }> = ({ ben, onBack }) => {
  const [activeTab, setActiveTab] = useState<'accueil' | 'carte' | 'meteo' | 'sinistre' | 'activites'>('accueil');

  const navItems = [
    { id: 'accueil', icon: PictoIcons.wallet, label: 'Accueil' },
    { id: 'carte', icon: PictoIcons.map, label: 'Parcelle' },
    { id: 'meteo', icon: PictoIcons.weather, label: 'Météo' },
    { id: 'sinistre', icon: PictoIcons.claim, label: 'Sinistre' },
    { id: 'activites', icon: PictoIcons.activity, label: 'Activités' },
  ] as const;

  return (
    <div style={{ ...S.appContainer, paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>{ben.fullName}</h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>{ben.category} · {ben.language}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: ben.insuranceStatus === 'Actif' ? '#16a34a' : ben.insuranceStatus === 'Sinistré' ? '#dc2626' : '#d97706', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', color: 'white', fontWeight: '600' }}>
              🛡️ {ben.insuranceStatus}
            </span>
            <button style={S.logoutBtn} onClick={onBack}>← Retour</button>
          </div>
        </div>
        {ben.weatherData.alert && (
          <div style={{ marginTop: '10px', background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#fca5a5' }}>
            {ben.weatherData.alert}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {activeTab === 'accueil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <BankCard ben={ben} />
            <SusuCard ben={ben} />
            <CarbonCard ben={ben} />
          </div>
        )}

        {activeTab === 'carte' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={S.cardWhite}>
              <h3 style={S.cardTitle}>📍 Cartographie Parcelle GPS</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-6px', marginBottom: '12px' }}>
                Position : {ben.gpsLocation} · Surface : {ben.areaHectares} ha
              </p>
              <ParcelMap points={ben.gpsParcel} readonly />
              <div style={{ marginTop: '12px', background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
                <p style={{ margin: '0 0 6px', fontWeight: '600', fontSize: '13px' }}>Données satellite (Sentinel-2)</p>
                {[
                  { label: 'Indice NDVI (végétation)', value: '0.72 — Bonne santé', color: '#16a34a' },
                  { label: 'Température sol', value: '26°C — Normal', color: '#0f172a' },
                  { label: 'Humidité sol', value: '68% — Suffisant', color: '#16a34a' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>{r.label}</span>
                    <strong style={{ color: r.color }}>{r.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meteo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <WeatherCard data={ben.weatherData} />
            <div style={S.cardWhite}>
              <h3 style={S.cardTitle}>📡 Prévisions 7 Jours</h3>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                  <div key={d} style={{ minWidth: '68px', background: '#f8fafc', borderRadius: '8px', padding: '10px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{d}</div>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{['☀️', '⛅', '🌧️', '🌧️', '⛅', '☀️', '☀️'][i]}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>{[32, 28, 24, 23, 26, 30, 33][i]}°</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{[0, 2, 18, 22, 5, 0, 0][i]}mm</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sinistre' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ClaimsCard claims={ben.claims} />
          </div>
        )}

        {activeTab === 'activites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ActivityLog ben={ben} />
          </div>
        )}
      </div>

      {/* Bottom nav — pictogram style for illiterate users */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', padding: '4px 0', boxShadow: '0 -4px 12px rgba(0,0,0,0.06)' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === item.id ? '#16a34a' : '#94a3b8' }}
            onClick={() => setActiveTab(item.id)}
          >
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: activeTab === item.id ? '700' : '400' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN DASHBOARD — ENRICHED
// ============================================================================

const AdminDashboard: React.FC<{
  admin: FintechAdmin;
  beneficiaries: Beneficiary[];
  onLogout: () => void;
  onViewBen: (id: string) => void;
  onAddBen: (ben: Beneficiary) => void;
}> = ({ admin, beneficiaries, onLogout, onViewBen, onAddBen }) => {
  const [tab, setTab] = useState<'dashboard' | 'kyc' | 'beneficiaries' | 'alerts'>('dashboard');

  const myBens = beneficiaries.filter(b => b.fintechCode === admin.affiliationCode || b.fintechCode === 'FIN-DEMO');
  const alerts = myBens.filter(b => b.weatherData.alert || b.insuranceStatus === 'Sinistré');
  const totalSavings = myBens.reduce((s, b) => s + b.savings, 0);
  const avgTrust = myBens.length ? Math.round(myBens.reduce((s, b) => s + b.trustScore, 0) / myBens.length) : 0;

  const navStyle = (active: boolean) => ({
    padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
    color: active ? '#16a34a' : '#94a3b8', fontWeight: active ? '700' : '400', fontSize: '14px',
    borderBottom: active ? '2px solid #16a34a' : '2px solid transparent',
  });

  return (
    <div style={S.appContainer}>
      <NavBar title={`${admin.structureName} — ${admin.affiliationCode}`} onLogout={onLogout} />

      {/* Admin nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', overflowX: 'auto' }}>
        <button style={navStyle(tab === 'dashboard')} onClick={() => setTab('dashboard')}>📊 Tableau de bord</button>
        <button style={navStyle(tab === 'kyc')} onClick={() => setTab('kyc')}>➕ Nouveau bénéficiaire</button>
        <button style={navStyle(tab === 'beneficiaries')} onClick={() => setTab('beneficiaries')}>👥 Bénéficiaires</button>
        <button style={navStyle(tab === 'alerts')} onClick={() => setTab('alerts')}>
          🚨 Alertes {alerts.length > 0 && <span style={{ background: '#dc2626', color: 'white', borderRadius: '99px', padding: '1px 6px', fontSize: '11px', marginLeft: '4px' }}>{alerts.length}</span>}
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {tab === 'dashboard' && (
          <div>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { icon: '👥', label: 'Bénéficiaires', value: myBens.length, color: '#2563eb' },
                { icon: '💰', label: 'Épargne totale', value: `${(totalSavings / 1000).toFixed(0)}k FCFA`, color: '#16a34a' },
                { icon: '⭐', label: 'Score moyen', value: `${avgTrust}/100`, color: '#d97706' },
                { icon: '🚨', label: 'Alertes actives', value: alerts.length, color: alerts.length > 0 ? '#dc2626' : '#94a3b8' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={S.section}>
              <h3 style={{ margin: '0 0 14px' }}>Activités récentes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {myBens.flatMap(b => b.activities.slice(0, 2).map(a => ({ ben: b.fullName, activity: a }))).slice(0, 6).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>👤</span>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{item.ben}</span>
                    <span style={{ color: '#64748b' }}>—</span>
                    <span style={{ color: '#0f172a' }}>{item.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'kyc' && (
          <KycForm fintechCode={admin.affiliationCode} onSuccess={onAddBen} />
        )}

        {tab === 'beneficiaries' && (
          <div style={S.section}>
            <h2 style={{ margin: '0 0 16px' }}>👥 Base de Données Bénéficiaires</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myBens.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => onViewBen(b.id)}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden', flexShrink: 0 }}>
                    {b.photoUrl ? <img src={b.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b.category === 'Agriculteur' ? '👨🏿‍🌾' : '🛒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{b.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{b.category} · {b.mobileMoneyProvider} {b.mobileMoneyNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: b.trustScore > 80 ? '#16a34a' : b.trustScore > 60 ? '#d97706' : '#dc2626', fontSize: '15px' }}>{b.trustScore}/100</div>
                    <div>
                      <span style={{
                        padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                        background: b.insuranceStatus === 'Actif' ? '#dcfce7' : b.insuranceStatus === 'Sinistré' ? '#fef2f2' : '#fef3c7',
                        color: b.insuranceStatus === 'Actif' ? '#166534' : b.insuranceStatus === 'Sinistré' ? '#b91c1c' : '#b45309',
                      }}>{b.insuranceStatus}</span>
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '18px' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'alerts' && (
          <div style={S.section}>
            <h2 style={{ margin: '0 0 16px' }}>🚨 Alertes Climatiques & Sinistres</h2>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <p>Aucune alerte active. Tous les bénéficiaires sont en zone sûre.</p>
              </div>
            ) : (
              alerts.map(b => (
                <div key={b.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px' }}>{b.fullName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{b.gpsLocation} · {b.category}</div>
                    </div>
                    <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                      ⚠️ Risque élevé
                    </span>
                  </div>
                  {b.weatherData.alert && (
                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#b91c1c' }}>{b.weatherData.alert}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ ...S.dangerBtn, flex: 1, padding: '8px', fontSize: '12px' }} onClick={() => onViewBen(b.id)}>
                      Voir profil & déclencher indemnisation
                    </button>
                    <button style={{ ...S.secondaryBtn, width: 'auto', padding: '8px 14px', fontSize: '12px' }}>
                      📲 Notifier
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [currentAdmin, setCurrentAdmin] = useState<FintechAdmin | null>(null);
  const [currentBenId, setCurrentBenId] = useState<string | null>(null);
  const [appView, setAppView] = useState<'login' | 'register_admin' | 'admin_dashboard' | 'beneficiary_dashboard'>('login');
  const [adminForm, setAdminForm] = useState({ structure: '', name: '', email: '', pass: '' });
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentAdmin({
          id: user.uid,
          adminName: user.displayName || 'Admin',
          email: user.email || '',
          structureName: 'Ma Fintech',
          affiliationCode: genCode(user.uid),
        });
        setAppView('admin_dashboard');
      }
    });
    return unsub;
  }, []);

  const currentBen = useMemo(() => beneficiaries.find(b => b.id === currentBenId), [beneficiaries, currentBenId]);

  const handleRegister = async () => {
    try {
      const uc = await createUserWithEmailAndPassword(auth, adminForm.email, adminForm.pass);
      setCurrentAdmin({ id: uc.user.uid, structureName: adminForm.structure, adminName: adminForm.name, email: adminForm.email, affiliationCode: genCode(uc.user.uid) });
      setAppView('admin_dashboard');
    } catch (e: any) { alert('Erreur inscription : ' + e.message); }
  };

  const handleLogin = async () => {
    setLoginError('');
    try {
      const uc = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.pass);
      setCurrentAdmin({ id: uc.user.uid, adminName: uc.user.displayName || 'Admin', email: uc.user.email || '', structureName: 'Ma Fintech', affiliationCode: genCode(uc.user.uid) });
      setAppView('admin_dashboard');
    } catch { setLoginError('Email ou mot de passe incorrect.'); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentAdmin(null);
    setAppView('login');
  };

  const addBeneficiary = (ben: Beneficiary) => {
    setBeneficiaries(prev => [...prev, { ...ben, fintechCode: currentAdmin?.affiliationCode || 'FIN-DEMO' }]);
  };

  // ─── LOGIN ───────────────────────────────────────────────
  if (appView === 'login') {
    return (
      <div style={S.loginContainer}>
        <div style={S.loginBox}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌱</div>
            <h1 style={{ color: '#16a34a', margin: '0 0 4px', fontSize: '24px' }}>AgroSusu Hub</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>Finance climatique & épargne collective — Afrique de l'Ouest</p>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0, marginBottom: '14px', color: '#0f172a', fontSize: '15px' }}>🔐 Connexion Opérateur Fintech</h3>
            {loginError && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 10px' }}>{loginError}</p>}
            <input type="email" placeholder="Email" style={{ ...S.input, marginBottom: '10px' }} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
            <input type="password" placeholder="Mot de passe" style={{ ...S.input, marginBottom: '14px' }} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} />
            <button style={S.primaryBtn} onClick={handleLogin}>Se connecter</button>
          </div>

          <button style={{ ...S.secondaryBtn, marginBottom: '16px' }} onClick={() => setAppView('register_admin')}>
            🏢 Inscrire une nouvelle Fintech
          </button>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px' }}>Accès démo bénéficiaires</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {beneficiaries.map(b => (
                <button key={b.id}
                  style={{ ...S.secondaryBtn, fontSize: '13px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}
                  onClick={() => { setCurrentBenId(b.id); setAppView('beneficiary_dashboard'); }}
                >
                  <span style={{ fontSize: '20px' }}>{b.category === 'Agriculteur' ? '👨🏿‍🌾' : '🛒'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700' }}>{b.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{b.category} · Score {b.trustScore}/100</div>
                  </div>
                  {b.weatherData.alert && <span style={{ marginLeft: 'auto', color: '#dc2626' }}>⚠️</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── REGISTER ADMIN ──────────────────────────────────────
  if (appView === 'register_admin') {
    return (
      <div style={S.loginContainer}>
        <div style={S.loginBox}>
          <h2 style={{ marginTop: 0 }}>🏢 Inscription Opérateur Fintech</h2>
          <input type="text" placeholder="Nom de la structure / Fintech" style={{ ...S.input, marginBottom: '10px' }} onChange={e => setAdminForm({ ...adminForm, structure: e.target.value })} />
          <input type="text" placeholder="Nom de l'administrateur" style={{ ...S.input, marginBottom: '10px' }} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} />
          <input type="email" placeholder="Email professionnel" style={{ ...S.input, marginBottom: '10px' }} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} />
          <input type="password" placeholder="Mot de passe (min 6 caractères)" style={{ ...S.input, marginBottom: '20px' }} onChange={e => setAdminForm({ ...adminForm, pass: e.target.value })} />
          <button style={S.primaryBtn} onClick={handleRegister}>✅ Créer le compte</button>
          <button style={{ ...S.secondaryBtn, marginTop: '10px' }} onClick={() => setAppView('login')}>← Retour</button>
        </div>
      </div>
    );
  }

  // ─── ADMIN DASHBOARD ─────────────────────────────────────
  if (appView === 'admin_dashboard' && currentAdmin) {
    return (
      <AdminDashboard
        admin={currentAdmin}
        beneficiaries={beneficiaries}
        onLogout={handleLogout}
        onViewBen={(id) => { setCurrentBenId(id); setAppView('beneficiary_dashboard'); }}
        onAddBen={addBeneficiary}
      />
    );
  }

  // ─── BENEFICIARY DASHBOARD ───────────────────────────────
  if (appView === 'beneficiary_dashboard' && currentBen) {
    return (
      <BeneficiaryDashboard
        ben={currentBen}
        onBack={() => {
          if (currentAdmin) setAppView('admin_dashboard');
          else setAppView('login');
        }}
      />
    );
  }

  return null;
}

// ============================================================================
// NAVBAR
// ============================================================================

const NavBar: React.FC<{ title: string; onLogout: () => void }> = ({ title, onLogout }) => (
  <div style={S.navbar}>
    <div>
      <span style={{ fontSize: '16px', marginRight: '6px' }}>🌱</span>
      <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>{title}</span>
    </div>
    <button style={S.logoutBtn} onClick={onLogout}>Déconnexion</button>
  </div>
);

// ============================================================================
// STYLES
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  loginContainer: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', backgroundColor: '#f1f5f9', fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 16px' },
  loginBox: { background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', width: '100%', maxWidth: '480px' },
  appContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Inter", system-ui, sans-serif' },
  section: { background: 'white', margin: '0 0 16px', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' },
  navbar: { background: '#0f172a', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', fontSize: '14px', fontFamily: 'inherit' },
  primaryBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '700', fontSize: '14px', fontFamily: 'inherit' },
  secondaryBtn: { background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '600', fontSize: '14px', fontFamily: 'inherit' },
  dangerBtn: { background: '#dc2626', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '700', fontSize: '14px', fontFamily: 'inherit' },
  logoutBtn: { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' },
  tabActive: { flex: 1, padding: '9px 6px', background: 'white', color: '#16a34a', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  tabInactive: { flex: 1, padding: '9px 6px', background: 'transparent', color: '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' },
  cardWhite: { background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' },
  cardTitle: { margin: '0 0 14px', color: '#0f172a', fontSize: '15px', fontWeight: '700', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
};