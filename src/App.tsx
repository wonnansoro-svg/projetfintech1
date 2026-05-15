import React, { useMemo, useState, useEffect } from 'react';

// 1. LES IMPORTS FIREBASE DOIVENT ÊTRE TOUT EN HAUT
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// 2. CONFIGURATION FIREBASE (En dehors de l'objet apiService)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fintech-f4dee.firebaseapp.com",
  projectId: "fintech-f4dee",
  storageBucket: "fintech-f4dee.firebasestorage.app",
  messagingSenderId: "683189698437",
  appId: "1:683189698437:web:4660db484bd377a1298eec",
  measurementId: "G-NSF5PPM5KJ"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// ============================================================================
// 🔧 ZONE D'INTÉGRATION DES API
// ============================================================================

const apiService = {
  // FIREBASE (Authentification)
  loginAdminFirebase: async (email: string, pass: string) => {
    // TODO: const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    console.log("Firebase Auth simulé pour:", email);
  },
  
  // MÉTÉO
  getWeatherForParcel: async (lat: number, lng: number) => {
    console.log(`Météo récupérée pour GPS: ${lat}, ${lng}`);
  },

  // NDVI
  getNDVIHealth: async (polygonGeoJSON: any) => {
    console.log("Analyse NDVI simulée : La parcelle est en bonne santé (Indice: 0.65)");
    return "Bonne santé (0.65)";
  },

  // LEAFLET
  calculateArea: (points: any[]) => {
    return (Math.random() * 5 + 0.5).toFixed(2); 
  }
};

// ============================================================================
// TYPES DE DONNÉES (La suite de votre code reste identique en bas...)
// ============================================================================
interface Beneficiary {
  id: string;
  fintechCode: string; // Lien avec la Fintech
  category: 'Agriculteur' | 'Commerçante';
  fullName: string;
  idCardNumber: string; // Carte d'identité / NNI
  phone: string;
  activity: string; // Ex: Mangue, Cacao, ou Vente d'igname
  villageOrMarket: string;
  // Spécifique Agriculteur
  gpsPolygon?: any[];
  areaHectares?: string;
  // Spécifique Commerçante
  storageCapacity?: string;
  
  savings: number;
  insuranceStatus: 'Actif' | 'En attente' | 'Sinistré';
  cardNumber: string;
  carbonCredits: number;
  loanStatus: 'Éligible' | 'En cours' | 'Non éligible';
  activities: string[];
}

interface FintechAdmin {
  id: string;
  structureName: string;
  adminName: string;
  email: string;
  affiliationCode: string; // Ex: FIN-1234
}

// --- Données initiales ---
const initialBeneficiaries: Beneficiary[] = [
  {
    id: '1', fintechCode: 'FIN-DEMO', category: 'Agriculteur',
    fullName: 'Kouassi Adjoua', idCardNumber: 'CI-1990-123456',
    phone: '+225 07 00 00 00 01', activity: 'Culture de la Mangue',
    villageOrMarket: 'Korhogo', areaHectares: '2.5',
    savings: 125000, insuranceStatus: 'Actif', cardNumber: '4532 1234 5678 9012',
    carbonCredits: 15000, loanStatus: 'Éligible',
    activities: ['12/04/2024: Semis terminé (Preuve GPS ✅)', '05/05/2024: Analyse NDVI: Excellente santé ✅'],
  },
  {
    id: '2', fintechCode: 'FIN-DEMO', category: 'Commerçante',
    fullName: 'Traoré Mamadou', idCardNumber: 'CI-1985-654321',
    phone: '+225 07 00 00 00 02', activity: 'Commerce de vivrier (Igname/Banane)',
    villageOrMarket: 'Marché de Bouaké', storageCapacity: '5 Tonnes',
    savings: 98000, insuranceStatus: 'En attente', cardNumber: '4532 9876 5432 1098',
    carbonCredits: 0, loanStatus: 'Non éligible',
    activities: ['01/05/2024: Stockage marchandise enregistré ✅'],
  },
];

// ============================================================================
// COMPOSANT PRINCIPAL APP
// ============================================================================

export default function App() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [currentAdmin, setCurrentAdmin] = useState<FintechAdmin | null>(null);
  const [currentBeneficiaryId, setCurrentBeneficiaryId] = useState<string | null>(null);
  const [appView, setAppView] = useState<'login' | 'register_admin' | 'admin_dashboard' | 'beneficiary_dashboard'>('login');

  // --- États Formulaire Inscription Administrateur ---
  const [adminForm, setAdminForm] = useState({ structure: '', name: '', email: '', pass: '' });

  // --- États Formulaire Inscription Bénéficiaire ---
  const [benCategory, setBenCategory] = useState<'Agriculteur' | 'Commerçante'>('Agriculteur');
  const [gpsMode, setGpsMode] = useState<'marche' | 'point'>('point');
  const [simulatedArea, setSimulatedArea] = useState<string | null>(null);

  // --- Synthèse Vocale ---
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentUser = useMemo(() => beneficiaries.find(f => f.id === currentBeneficiaryId), [beneficiaries, currentBeneficiaryId]);

  // --- Actions Navigation & Auth ---
  const handleRegisterAdmin = () => {
    const newCode = `FIN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newAdmin: FintechAdmin = { id: Date.now().toString(), structureName: adminForm.structure, adminName: adminForm.name, email: adminForm.email, affiliationCode: newCode };
    setCurrentAdmin(newAdmin);
    setAppView('admin_dashboard');
    alert(`Compte Fintech créé ! Votre code d'affiliation à donner à vos agents est : ${newCode}`);
  };

  const simulateGpsTracking = () => {
    alert(`Lancement du traçage GPS en mode: ${gpsMode === 'marche' ? 'Marche le long des bordures' : 'Saisie Point par Point'}`);
    setTimeout(() => {
      const area = apiService.calculateArea([]);
      setSimulatedArea(area);
      alert(`Traçage terminé. Superficie calculée : ${area} Hectares.`);
    }, 1500);
  };

  // ============================================================================
  // VUES (ÉCRANS)
  // ============================================================================

  // 1. ÉCRAN DE CONNEXION INITIAL
  if (appView === 'login') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={{ color: '#16a34a', marginBottom: '10px' }}>AgroSusu Hub</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>La plateforme SaaS des Fintechs Agricoles</p>
          
          <button style={styles.primaryBtn} onClick={() => { setCurrentAdmin({ id: '0', structureName: 'Demo Fintech', adminName: 'Admin', email: 'admin@demo.com', affiliationCode: 'FIN-DEMO' }); setAppView('admin_dashboard'); }}>
            🔐 Connexion Admin Existant
          </button>
          <button style={styles.secondaryBtn} onClick={() => setAppView('register_admin')}>
            🏢 Créer une nouvelle Fintech (Admin)
          </button>
          
          <div style={{ margin: '20px 0', color: '#94a3b8' }}>ou espace bénéficiaire</div>
          
          {beneficiaries.map(f => (
            <button key={f.id} style={styles.secondaryBtn} onClick={() => { setCurrentBeneficiaryId(f.id); setAppView('beneficiary_dashboard'); }}>
              👨🏿‍🌾 Connecter {f.fullName} ({f.category})
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. ÉCRAN CRÉATION FINTECH (ADMIN)
  if (appView === 'register_admin') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2 style={{ color: '#0f172a' }}>Inscription Structure</h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Devenez partenaire et gérez vos propres bénéficiaires.</p>
          
          <input type="text" placeholder="Nom de la structure (Fintech/Coopérative)" style={{...styles.input, width: '100%', marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, structure: e.target.value})} />
          <input type="text" placeholder="Nom de l'Administrateur" style={{...styles.input, width: '100%', marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, name: e.target.value})} />
          <input type="email" placeholder="Email pro" style={{...styles.input, width: '100%', marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, email: e.target.value})} />
          <input type="password" placeholder="Mot de passe" style={{...styles.input, width: '100%', marginBottom: '20px'}} onChange={e => setAdminForm({...adminForm, pass: e.target.value})} />
          
          <button style={styles.primaryBtn} onClick={handleRegisterAdmin}>Générer mon compte & mon Code</button>
          <button style={{...styles.secondaryBtn, border: 'none'}} onClick={() => setAppView('login')}>Retour</button>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD ADMINISTRATEUR (MULTI-TENANT)
  if (appView === 'admin_dashboard' && currentAdmin) {
    const myBeneficiaries = beneficiaries.filter(b => b.fintechCode === currentAdmin.affiliationCode);
    
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Tableau de bord : ${currentAdmin.structureName}`} onLogout={() => setAppView('login')} />
        
        <div style={{ padding: '20px', background: '#e0f2fe', margin: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Votre Code d'Affiliation Fintech : </strong>
            <span style={{ background: 'white', padding: '5px 10px', borderRadius: '6px', fontSize: '18px', letterSpacing: '2px', fontWeight: 'bold' }}>{currentAdmin.affiliationCode}</span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#0369a1' }}>Donnez ce code à vos agents terrain pour lier les paysans à votre base.</p>
        </div>

        {/* NOUVEAU FORMULAIRE D'ENRÔLEMENT KYC COMPLET */}
        <div style={styles.section}>
          <h2>📝 Enrôlement KYC d'un Bénéficiaire</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <button style={benCategory === 'Agriculteur' ? styles.tabActive : styles.tabInactive} onClick={() => setBenCategory('Agriculteur')}>🌱 Agriculteur</button>
             <button style={benCategory === 'Commerçante' ? styles.tabActive : styles.tabInactive} onClick={() => setBenCategory('Commerçante')}>🛒 Commerçante / Vivrier</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom complet (selon pièce d'identité)" style={styles.input} />
            <input type="text" placeholder="Numéro Pièce Identité (NNI / CNI)" style={styles.input} />
            <input type="tel" placeholder="Numéro de Téléphone (Mobile Money)" style={styles.input} />
            <input type="text" placeholder={benCategory === 'Agriculteur' ? "Village / Localité" : "Marché de vente principal"} style={styles.input} />
            
            {benCategory === 'Agriculteur' ? (
              <>
                <input type="text" placeholder="Spéculation (Mangue, Cacao, Maïs...)" style={styles.input} />
                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <h4>📍 Cartographie de la Parcelle (Intégration Leaflet future)</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button style={gpsMode === 'point' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setGpsMode('point')}>📍 Mode Point par Point</button>
                    <button style={gpsMode === 'marche' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setGpsMode('marche')}>🚶‍♂️ Mode Marche (Contour)</button>
                  </div>
                  <button style={{...styles.secondaryBtn, background: 'white'}} onClick={simulateGpsTracking}>🔴 Lancer le relevé GPS</button>
                  {simulatedArea && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>Superficie calculée : {simulatedArea} ha</p>}
                </div>
              </>
            ) : (
              <>
                <input type="text" placeholder="Type de produits vendus (Igname, Tomate...)" style={styles.input} />
                <input type="text" placeholder="Capacité de stockage estimée (Tonnes ou Sacs)" style={styles.input} />
              </>
            )}
          </div>
          <button style={{...styles.primaryBtn, width: '100%', background: '#0f172a'}}>✅ Finaliser l'inscription & Ouvrir le compte bancaire</button>
        </div>

        <div style={styles.section}>
          <h2>📋 Base de données de vos Bénéficiaires</h2>
          <table style={styles.table}>
            <thead><tr><th>Catégorie</th><th>Nom</th><th>ID Carte</th><th>Localité</th><th>Détails Spécifiques</th><th>Épargne</th></tr></thead>
            <tbody>
              {myBeneficiaries.map(f => (
                <tr key={f.id}>
                  <td>{f.category === 'Agriculteur' ? '🌱 Agr.' : '🛒 Com.'}</td>
                  <td>{f.fullName}</td><td>{f.idCardNumber}</td><td>{f.villageOrMarket}</td>
                  <td>{f.category === 'Agriculteur' ? `${f.areaHectares} ha - ${f.activity}` : `${f.storageCapacity} - ${f.activity}`}</td>
                  <td>{f.savings.toLocaleString()} CFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 4. ESPACE BÉNÉFICIAIRE (Reste inchangé mais hérite des nouvelles données)
  if (appView === 'beneficiary_dashboard' && currentUser) {
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Espace de ${currentUser.fullName} (${currentUser.category})`} onLogout={() => {setCurrentBeneficiaryId(null); setAppView('login');}} />
        
        {/* Résumé du code d'espace bénéficiaire précédent */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
          <div style={styles.virtualCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>AgroCard</span><span>💳</span>
            </div>
            <div style={{ margin: '20px 0', fontSize: '22px', letterSpacing: '2px' }}>{currentUser.cardNumber}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: '10px' }}>{currentUser.category.toUpperCase()}</div><div style={{ fontSize: '14px' }}>{currentUser.fullName}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: '10px' }}>SOLDE</div><div style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentUser.savings.toLocaleString()} CFA <button onClick={() => speakText(`Solde de ${currentUser.savings} francs`)} style={styles.voiceBtn}>🔊</button></div></div>
            </div>
          </div>
          
          <div style={styles.actionPanel}>
            <h3>Vos informations validées</h3>
            <p><strong>Identité NNI :</strong> {currentUser.idCardNumber}</p>
            <p><strong>Affiliation :</strong> {currentUser.fintechCode}</p>
            {currentUser.category === 'Agriculteur' && <p><strong>Superficie tracée :</strong> {currentUser.areaHectares} Hectares</p>}
            <button style={styles.primaryBtn}>📥 Payer Cotisation Susu</button>
          </div>
        </div>

        {/* Intégration future Map & API Météo affichée au bénéficiaire */}
        <div style={styles.section}>
          <h2>📍 Suivi Satellitaire (NDVI & Météo)</h2>
          <div style={styles.mapContainer}>
             <div style={styles.mapOverlay}>
                <div style={{textAlign: 'center', color: '#334155'}}>
                  <p>🗺️ Espace réservé pour la carte Leaflet détaillée</p>
                  <p>Intégration API Météo & NDVI active sur ces coordonnées.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// --- Sous-composants UI ---
const NavBar = ({ title, onLogout }: { title: string, onLogout: () => void }) => (
  <div style={styles.navbar}>
    <h2 style={{ margin: 0, color: 'white' }}>{title}</h2>
    <button style={styles.logoutBtn} onClick={onLogout}>Déconnexion</button>
  </div>
);

// --- Styles ---
const styles: Record<string, React.CSSProperties> = {
  loginContainer: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: '"Inter", sans-serif' },
  loginBox: { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', width: '100%', maxWidth: '500px' },
  appContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' },
  section: { background: 'white', margin: '20px', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  navbar: { background: 'linear-gradient(90deg, #166534, #15803d)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' },
  
  // Boutons et Onglets
  primaryBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '10px' },
  secondaryBtn: { background: 'transparent', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '10px' },
  logoutBtn: { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
  voiceBtn: { background: '#e0f2fe', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', marginLeft: '10px' },
  tabActive: { flex: 1, padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  tabInactive: { flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  
  // Cartes & Tableaux
  virtualCard: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '350px' },
  actionPanel: { background: 'white', padding: '20px', borderRadius: '16px', flex: '1', minWidth: '280px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  mapContainer: { width: '100%', height: '300px', backgroundColor: '#e2e8f0', borderRadius: '12px', position: 'relative', overflow: 'hidden', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' },
  mapOverlay: { width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};