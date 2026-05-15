import React, { useMemo, useState, useEffect } from 'react';

// 1. IMPORTS FIREBASE
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";

// 2. CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fintech-f4dee.firebaseapp.com",
  projectId: "fintech-f4dee",
  storageBucket: "fintech-f4dee.firebasestorage.app",
  messagingSenderId: "683189698437",
  appId: "1:683189698437:web:4660db484bd377a1298eec",
  measurementId: "G-NSF5PPM5KJ"
};

// Initialisation de Firebase et de l'Authentification
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // C'est cette ligne qui manquait !

// ============================================================================
// 🔧 ZONE D'INTÉGRATION DES API
// ============================================================================

const apiService = {
  getWeatherForParcel: async (lat: number, lng: number) => {
    console.log(`Météo récupérée pour GPS: ${lat}, ${lng}`);
  },

  getNDVIHealth: async (polygonGeoJSON: any) => {
    console.log("Analyse NDVI simulée pour la zone :", polygonGeoJSON ? "OK" : "Vide");
    return "Bonne santé (0.65)";
  },

  calculateArea: (points: any[]) => {
    console.log("Calcul en cours avec les points :", points.length);
    return (Math.random() * 5 + 0.5).toFixed(2); 
  }
};

// ============================================================================
// TYPES DE DONNÉES
// ============================================================================

interface Beneficiary {
  id: string;
  fintechCode: string;
  category: 'Agriculteur' | 'Commerçante';
  fullName: string;
  idCardNumber: string;
  phone: string;
  activity: string;
  villageOrMarket: string;
  gpsPolygon?: any[];
  areaHectares?: string;
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
  affiliationCode: string;
}

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
];

// ============================================================================
// COMPOSANT PRINCIPAL APP
// ============================================================================

export default function App() {
  const [beneficiaries] = useState<Beneficiary[]>(initialBeneficiaries);
  const [currentAdmin, setCurrentAdmin] = useState<FintechAdmin | null>(null);
  const [currentBeneficiaryId, setCurrentBeneficiaryId] = useState<string | null>(null);
  const [appView, setAppView] = useState<'login' | 'register_admin' | 'admin_dashboard' | 'beneficiary_dashboard'>('login');

  const [adminForm, setAdminForm] = useState({ structure: '', name: '', email: '', pass: '' });
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });
  
  const [benCategory, setBenCategory] = useState<'Agriculteur' | 'Commerçante'>('Agriculteur');
  const [gpsMode, setGpsMode] = useState<'marche' | 'point'>('point');
  const [simulatedArea, setSimulatedArea] = useState<string | null>(null);

  // --- 1. MAINTIEN DE LA SESSION FIREBASE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // L'utilisateur est connecté, on restaure sa session
        setCurrentAdmin({
          id: user.uid,
          adminName: user.displayName || "Admin",
          email: user.email || "",
          structureName: "Ma Fintech", // A terme, on récupérera le nom depuis Firestore
          affiliationCode: `FIN-${user.uid.substring(0,4).toUpperCase()}`
        });
        setAppView('admin_dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentUser = useMemo(() => beneficiaries.find(f => f.id === currentBeneficiaryId), [beneficiaries, currentBeneficiaryId]);

  // --- 2. VRAIE INSCRIPTION FIREBASE ---
  const handleRegisterAdmin = async () => {
    try {
      // Appel aux vrais serveurs de Google
      const userCredential = await createUserWithEmailAndPassword(auth, adminForm.email, adminForm.pass);
      const user = userCredential.user;
      
      const newCode = `FIN-${user.uid.substring(0, 4).toUpperCase()}`;
      const newAdmin: FintechAdmin = { 
        id: user.uid, 
        structureName: adminForm.structure, 
        adminName: adminForm.name, 
        email: adminForm.email, 
        affiliationCode: newCode 
      };
      
      setCurrentAdmin(newAdmin);
      setAppView('admin_dashboard');
      alert(`Compte Fintech créé avec succès ! Votre code d'affiliation est : ${newCode}`);
    } catch (error: any) {
      alert("Erreur d'inscription : " + error.message);
    }
  };

  // --- 3. VRAIE CONNEXION FIREBASE ---
  const handleLoginAdmin = async () => {
    try {
      // Appel aux vrais serveurs de Google pour vérifier le mot de passe
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.pass);
      const user = userCredential.user;
      
      setCurrentAdmin({
        id: user.uid,
        adminName: user.displayName || "Admin",
        email: user.email || "",
        structureName: "Ma Fintech",
        affiliationCode: `FIN-${user.uid.substring(0,4).toUpperCase()}`
      });
      setAppView('admin_dashboard');
    } catch (error: any) {
      alert("Erreur : Identifiants incorrects (" + error.message + ")");
    }
  };

  // --- 4. VRAIE DÉCONNEXION FIREBASE ---
  const handleLogout = async () => {
    await signOut(auth);
    setCurrentAdmin(null);
    setAppView('login');
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
          
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>Connexion Admin</h3>
            <input type="email" placeholder="Votre Email" style={{...styles.input, marginBottom: '10px'}} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="Mot de passe" style={{...styles.input, marginBottom: '15px'}} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
            <button style={styles.primaryBtn} onClick={handleLoginAdmin}>
              🔐 Se connecter
            </button>
          </div>

          <div style={{ margin: '20px 0', color: '#94a3b8', fontSize: '14px' }}>Vous n'avez pas de compte ?</div>

          <button style={styles.secondaryBtn} onClick={() => setAppView('register_admin')}>
            🏢 Inscrire une nouvelle Fintech
          </button>
          
          <div style={{ margin: '20px 0', color: '#e2e8f0' }}><hr/></div>
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>Accès rapide bénéficiaires (Démo)</p>
          
          {beneficiaries.map(f => (
            <button key={f.id} style={{...styles.secondaryBtn, fontSize: '12px', padding: '8px'}} onClick={() => { setCurrentBeneficiaryId(f.id); setAppView('beneficiary_dashboard'); }}>
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
          
          <button style={styles.primaryBtn} onClick={handleRegisterAdmin}>Créer mon compte Firebase</button>
          <button style={{...styles.secondaryBtn, border: 'none'}} onClick={() => setAppView('login')}>Retour</button>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD ADMINISTRATEUR
  if (appView === 'admin_dashboard' && currentAdmin) {
    const myBeneficiaries = beneficiaries.filter(b => b.fintechCode === currentAdmin.affiliationCode || b.fintechCode === 'FIN-DEMO');
    
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Tableau de bord : ${currentAdmin.structureName}`} onLogout={handleLogout} />
        
        <div style={{ padding: '20px', background: '#e0f2fe', margin: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Votre Code d'Affiliation Fintech : </strong>
            <span style={{ background: 'white', padding: '5px 10px', borderRadius: '6px', fontSize: '18px', letterSpacing: '2px', fontWeight: 'bold' }}>{currentAdmin.affiliationCode}</span>
          </div>
        </div>

        {/* Formulaire KYC et Tableau */}
        <div style={styles.section}>
          <h2>📝 Enrôlement KYC d'un Bénéficiaire</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <button style={benCategory === 'Agriculteur' ? styles.tabActive : styles.tabInactive} onClick={() => setBenCategory('Agriculteur')}>🌱 Agriculteur</button>
             <button style={benCategory === 'Commerçante' ? styles.tabActive : styles.tabInactive} onClick={() => setBenCategory('Commerçante')}>🛒 Commerçante / Vivrier</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <input type="text" placeholder="Nom complet" style={styles.input} />
            <input type="text" placeholder="Numéro CNI" style={styles.input} />
            {benCategory === 'Agriculteur' && (
               <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <h4>📍 Cartographie de la Parcelle</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button style={gpsMode === 'point' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setGpsMode('point')}>📍 Mode Point par Point</button>
                    <button style={gpsMode === 'marche' ? styles.primaryBtn : styles.secondaryBtn} onClick={() => setGpsMode('marche')}>🚶‍♂️ Mode Marche</button>
                  </div>
                  <button style={{...styles.secondaryBtn, background: 'white'}} onClick={simulateGpsTracking}>🔴 Lancer le relevé GPS</button>
                  {simulatedArea && <p style={{ color: '#16a34a', fontWeight: 'bold' }}>Superficie calculée : {simulatedArea} ha</p>}
               </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. ESPACE BÉNÉFICIAIRE
  if (appView === 'beneficiary_dashboard' && currentUser) {
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Espace de ${currentUser.fullName}`} onLogout={() => {setCurrentBeneficiaryId(null); setAppView('login');}} />
        <div style={{ margin: '20px' }}>
           <h3>Bienvenue {currentUser.fullName} !</h3>
           <p>Solde : {currentUser.savings} CFA</p>
           <button onClick={() => speakText(`Solde de ${currentUser.savings} francs`)} style={styles.voiceBtn}>🔊 Lire solde</button>
        </div>
      </div>
    );
  }

  return null;
}

const NavBar = ({ title, onLogout }: { title: string, onLogout: () => void }) => (
  <div style={styles.navbar}>
    <h2 style={{ margin: 0, color: 'white' }}>{title}</h2>
    <button style={styles.logoutBtn} onClick={onLogout}>Déconnexion</button>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  loginContainer: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: '"Inter", sans-serif' },
  loginBox: { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', width: '100%', maxWidth: '500px' },
  appContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' },
  section: { background: 'white', margin: '20px', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  navbar: { background: 'linear-gradient(90deg, #166534, #15803d)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' },
  primaryBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '10px' },
  secondaryBtn: { background: 'transparent', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginBottom: '10px' },
  logoutBtn: { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
  voiceBtn: { background: '#e0f2fe', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', marginLeft: '10px' },
  tabActive: { flex: 1, padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  tabInactive: { flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
};