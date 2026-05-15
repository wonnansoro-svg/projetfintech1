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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ============================================================================
// TYPES DE DONNÉES
// ============================================================================

interface Beneficiary {
  id: string;
  fintechCode: string;
  category: 'Agriculteur' | 'Commerçante' | 'Transporteur';
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  idCardNumber: string;
  emergencyContact: string;
  language: string;
  estimatedIncome: string;
  mobileMoneyProvider: 'Orange Money' | 'MTN' | 'Wave' | 'Moov';
  mobileMoneyNumber: string;
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  savings: number;
  cardNumber: string; 
  activity: string; 
  areaHectares: string;
  season: string;
  farmingMethods: string;
  gpsLocation: string;
  cooperative: string;
  susuGroup: string;
  trustScore: number; 
  insuranceStatus: 'Actif' | 'En attente' | 'Sinistré';
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
    fullName: 'Kouassi Adjoua', gender: 'Femme', dob: '12/05/1985',
    phone: '+225 07 00 00 00 01', idCardNumber: 'CI-1985-123456',
    emergencyContact: '+225 05 00 00 00 99', language: 'Baoulé, Français',
    estimatedIncome: '1 500 000 FCFA/an', mobileMoneyProvider: 'Wave', mobileMoneyNumber: '0700000001',
    riskLevel: 'Faible', savings: 125000, cardNumber: '4532 1234 5678 9012',
    activity: 'Culture du Cacao', areaHectares: '3.5', season: 'Grande saison', farmingMethods: 'Agroforesterie',
    gpsLocation: '5.8118, -5.2750', cooperative: 'COOP-CA N\'Zrama', susuGroup: 'Susu Femmes Vaillantes', trustScore: 92,
    insuranceStatus: 'Actif', carbonCredits: 25000, loanStatus: 'Éligible',
    activities: ['12/04: Semis terminé ✅', '05/05: Inspection Satellite (Bonne santé) ✅'],
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
  
  const [kycTab, setKycTab] = useState<'perso' | 'finance' | 'agri'>('perso');
  const [benCategory, setBenCategory] = useState<'Agriculteur' | 'Commerçante'>('Agriculteur');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentAdmin({
          id: user.uid,
          adminName: user.displayName || "Admin",
          email: user.email || "",
          structureName: "Ma Fintech", 
          affiliationCode: `FIN-${user.uid.substring(0,4).toUpperCase()}`
        });
        setAppView('admin_dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  const currentUser = useMemo(() => beneficiaries.find(f => f.id === currentBeneficiaryId), [beneficiaries, currentBeneficiaryId]);

  const handleRegisterAdmin = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, adminForm.email, adminForm.pass);
      const newCode = `FIN-${userCredential.user.uid.substring(0, 4).toUpperCase()}`;
      setCurrentAdmin({ id: userCredential.user.uid, structureName: adminForm.structure, adminName: adminForm.name, email: adminForm.email, affiliationCode: newCode });
      setAppView('admin_dashboard');
    } catch (error: any) { alert("Erreur d'inscription : " + error.message); }
  };

  const handleLoginAdmin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.pass);
      setCurrentAdmin({ id: userCredential.user.uid, adminName: userCredential.user.displayName || "Admin", email: userCredential.user.email || "", structureName: "Ma Fintech", affiliationCode: `FIN-${userCredential.user.uid.substring(0,4).toUpperCase()}` });
      setAppView('admin_dashboard');
    } catch (error: any) { alert("Erreur de connexion."); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentAdmin(null);
    setAppView('login');
  };

  // ============================================================================
  // VUES (ÉCRANS)
  // ============================================================================

  if (appView === 'login') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={{ color: '#16a34a', marginBottom: '10px' }}>AgroSusu Hub</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Le Core Banking Agricole (Marque Blanche)</p>
          
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '16px' }}>Connexion Fintech (Admin)</h3>
            <input type="email" placeholder="Email" style={{...styles.input, marginBottom: '10px'}} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <input type="password" placeholder="Mot de passe" style={{...styles.input, marginBottom: '15px'}} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
            <button style={styles.primaryBtn} onClick={handleLoginAdmin}>🔐 Se connecter</button>
          </div>
          <button style={styles.secondaryBtn} onClick={() => setAppView('register_admin')}>🏢 Inscrire une nouvelle Fintech</button>
          
          <div style={{ margin: '20px 0', color: '#e2e8f0' }}><hr/></div>
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>Simulation Accès Bénéficiaire</p>
          {beneficiaries.map(f => (
            <button key={f.id} style={{...styles.secondaryBtn, fontSize: '12px', padding: '8px'}} onClick={() => { setCurrentBeneficiaryId(f.id); setAppView('beneficiary_dashboard'); }}>
              👨🏿‍🌾 Connecter Profil Digital : {f.fullName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (appView === 'register_admin') {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2>Inscription Fintech</h2>
          <input type="text" placeholder="Nom de la structure" style={{...styles.input, marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, structure: e.target.value})} />
          <input type="text" placeholder="Nom de l'Admin" style={{...styles.input, marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, name: e.target.value})} />
          <input type="email" placeholder="Email pro" style={{...styles.input, marginBottom: '10px'}} onChange={e => setAdminForm({...adminForm, email: e.target.value})} />
          <input type="password" placeholder="Mot de passe" style={{...styles.input, marginBottom: '20px'}} onChange={e => setAdminForm({...adminForm, pass: e.target.value})} />
          <button style={styles.primaryBtn} onClick={handleRegisterAdmin}>Créer le compte</button>
          <button style={styles.secondaryBtn} onClick={() => setAppView('login')}>Retour</button>
        </div>
      </div>
    );
  }

  if (appView === 'admin_dashboard' && currentAdmin) {
    const myBeneficiaries = beneficiaries.filter(b => b.fintechCode === currentAdmin.affiliationCode || b.fintechCode === 'FIN-DEMO');
    
    return (
      <div style={styles.appContainer}>
        <NavBar title={`${currentAdmin.structureName} (Code: ${currentAdmin.affiliationCode})`} onLogout={handleLogout} />
        
        <div style={styles.section}>
          <h2>📝 Création de Profil Numérique (KYC Complet)</h2>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
             <button style={kycTab === 'perso' ? styles.tabActive : styles.tabInactive} onClick={() => setKycTab('perso')}>👤 Identité</button>
             <button style={kycTab === 'finance' ? styles.tabActive : styles.tabInactive} onClick={() => setKycTab('finance')}>💰 Finance & Susu</button>
             <button style={kycTab === 'agri' ? styles.tabActive : styles.tabInactive} onClick={() => setKycTab('agri')}>🌱 Agri & GPS</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {kycTab === 'perso' && (
              <>
                <select style={styles.input} value={benCategory} onChange={e => setBenCategory(e.target.value as any)}>
                  <option value="Agriculteur">Agriculteur</option>
                  <option value="Commerçante">Commerçante</option>
                </select>
                <input type="text" placeholder="Nom et Prénoms" style={styles.input} />
                <input type="text" placeholder="Sexe" style={styles.input} />
                <input type="date" placeholder="Date de naissance" style={styles.input} />
                <input type="text" placeholder="Pièce d'Identité (NNI)" style={styles.input} />
                <input type="text" placeholder="Contact d'urgence" style={styles.input} />
              </>
            )}
            
            {kycTab === 'finance' && (
              <>
                <select style={styles.input}><option>Wave</option><option>Orange Money</option><option>MTN MoMo</option></select>
                <input type="tel" placeholder="Numéro Mobile Money" style={styles.input} />
                <input type="text" placeholder="Revenus estimés annuels" style={styles.input} />
                <input type="text" placeholder="Groupe Susu d'appartenance" style={styles.input} />
                <input type="text" placeholder="Coopérative" style={styles.input} />
                <div style={{ gridColumn: 'span 2', background: '#dcfce7', padding: '10px', borderRadius: '8px', color: '#166534', fontWeight: 'bold' }}>
                  Ouverture de portefeuille numérique automatique après validation.
                </div>
              </>
            )}

            {kycTab === 'agri' && (
              <>
                <input type="text" placeholder={benCategory === 'Agriculteur' ? "Type de culture principale" : "Type de marchandise"} style={styles.input} />
                
                {benCategory === 'Agriculteur' && (
                   <input type="text" placeholder="Superficie (Hectares)" style={styles.input} />
                )}
                
                <select style={styles.input}><option>Méthode Conventionnelle</option><option>Agroforesterie (Éligible Carbone)</option></select>
                <div style={{ gridColumn: 'span 2', background: '#f1f5f9', padding: '15px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                  <h4>📍 Module Cartographie</h4>
                  <button style={{...styles.secondaryBtn, width: 'auto', marginRight: '10px'}}>🚶‍♂️ Mode Marche (Tracer Bordure)</button>
                  <button style={{...styles.secondaryBtn, width: 'auto'}}>📸 Prendre Photo Géolocalisée</button>
                </div>
              </>
            )}
          </div>
          <button style={{...styles.primaryBtn, marginTop: '20px'}}>Enregistrer & Créer Identifiant Financier Unique</button>
        </div>

        <div style={styles.section}>
          <h2>📋 Base de Données des Bénéficiaires</h2>
          <table style={styles.table}>
            <thead><tr><th>Profil</th><th>Nom</th><th>Mobile Money</th><th>Score Confiance</th><th>Assurance</th></tr></thead>
            <tbody>
              {myBeneficiaries.map(f => (
                <tr key={f.id}>
                  <td>{f.category}</td><td>{f.fullName}</td><td>{f.mobileMoneyProvider} ({f.mobileMoneyNumber})</td>
                  <td><strong style={{ color: '#16a34a' }}>{f.trustScore}/100</strong></td>
                  <td>{f.insuranceStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (appView === 'beneficiary_dashboard' && currentUser) {
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Profil Digital : ${currentUser.fullName}`} onLogout={() => {setCurrentBeneficiaryId(null); setAppView('login');}} />
        
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          <div style={styles.cardDark}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'white' }}>Portefeuille & Épargne</h3>
              <span style={{ background: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color:'white' }}>Lié à {currentUser.mobileMoneyProvider}</span>
            </div>
            <div style={{ fontSize: '28px', color: 'white', fontWeight: 'bold', marginBottom: '5px' }}>{currentUser.savings.toLocaleString()} FCFA</div>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>ID Unique : {currentUser.cardNumber}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button style={styles.actionBtnDark}>Dépôt Susu</button>
              <button style={styles.actionBtnDark}>Retrait (USSD)</button>
            </div>
          </div>

          <div style={styles.cardWhite}>
            <h3 style={styles.cardTitle}>🤝 Groupe Susu & Confiance</h3>
            <p><strong>Groupe :</strong> {currentUser.susuGroup}</p>
            <p><strong>Coopérative :</strong> {currentUser.cooperative}</p>
            <div style={{ marginTop: '15px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#166534', fontWeight: 'bold' }}>Score de Crédit Intelligent</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>{currentUser.trustScore}/100</span>
              </div>
              <p style={{ fontSize: '12px', color: '#166534', margin: '5px 0 0 0' }}>Basé sur l'historique d'épargne et les rendements agricoles.</p>
            </div>
          </div>

          <div style={styles.cardWhite}>
            <h3 style={styles.cardTitle}>🛡️ Assurance Climatique</h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Basée sur les données satellites de {currentUser.gpsLocation}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span>Indice Pluviométrique (30j)</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Normal (120mm)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                <span>Détection Maladie (IA)</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Aucune</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#0f172a' }}>
              Statut du contrat : <strong>{currentUser.insuranceStatus}</strong> <br/>
              *Indemnisation automatique via Mobile Money si seuil atteint.*
            </p>
          </div>

          <div style={styles.cardWhite}>
            <h3 style={styles.cardTitle}>🌱 Crédit Agricole & Carbone</h3>
            <div style={{ padding: '10px', background: '#fef3c7', borderRadius: '8px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#b45309' }}>Finance Climatique</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>Pratique : {currentUser.farmingMethods}</p>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b45309', marginTop: '5px' }}>+ {currentUser.carbonCredits.toLocaleString()} FCFA générés</div>
            </div>
            <button style={{...styles.primaryBtn, width: '100%'}}>💳 Demander Crédit (Intrants)</button>
          </div>

        </div>
      </div>
    );
  }

  return null;
}

const NavBar = ({ title, onLogout }: { title: string, onLogout: () => void }) => (
  <div style={styles.navbar}>
    <h2 style={{ margin: 0, color: 'white', fontSize: '18px' }}>{title}</h2>
    <button style={styles.logoutBtn} onClick={onLogout}>Déconnexion</button>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  loginContainer: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: '"Inter", sans-serif' },
  loginBox: { background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', width: '100%', maxWidth: '500px' },
  appContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' },
  section: { background: 'white', margin: '20px', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' },
  navbar: { background: '#0f172a', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' },
  primaryBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold' },
  secondaryBtn: { background: 'transparent', color: '#0f172a', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold' },
  actionBtnDark: { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  logoutBtn: { background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  tabActive: { flex: 1, padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  tabInactive: { flex: 1, padding: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' },
  cardDark: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  cardWhite: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { margin: '0 0 15px 0', color: '#0f172a', fontSize: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }
};