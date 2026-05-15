import React, { useMemo, useState } from 'react';

// --- Types de données ---
interface Farmer {
  id: string;
  fullName: string;
  phone: string;
  activity: string;
  village: string;
  savings: number;
  insuranceStatus: 'Actif' | 'En attente' | 'Sinistré';
  gpsLocation: string;
  cardNumber: string;
}

interface ClimateAlert {
  id: string;
  title: string;
  description: string;
  severity: 'Élevé' | 'Moyen' | 'Faible';
}

// --- Données initiales ---
const initialFarmers: Farmer[] = [
  {
    id: '1',
    fullName: 'Kouassi Adjoua',
    phone: '+225 07 00 00 00 01',
    activity: 'Culture du cacao',
    village: 'Yamoussoukro',
    savings: 125000,
    insuranceStatus: 'Actif',
    gpsLocation: '5.8118, -5.2750',
    cardNumber: '4532 1234 5678 9012',
  },
  {
    id: '2',
    fullName: 'Traoré Mamadou',
    phone: '+225 07 00 00 00 02',
    activity: 'Commerce de riz',
    village: 'Bouaké',
    savings: 98000,
    insuranceStatus: 'En attente',
    gpsLocation: '7.6938, -5.0303',
    cardNumber: '4532 9876 5432 1098',
  },
];

const climateAlerts: ClimateAlert[] = [
  {
    id: '1',
    title: 'Alerte Sécheresse',
    description: 'Faible niveau de pluie détecté sur les 21 derniers jours dans le Gbêkê.',
    severity: 'Élevé',
  },
  {
    id: '2',
    title: 'Prévision normale',
    description: 'Pluviométrie adéquate attendue cette semaine dans le Bélier.',
    severity: 'Faible',
  },
];

// --- Composant Principal ---
export default function App() {
  const [farmers, setFarmers] = useState<Farmer[]>(initialFarmers);
  const [userRole, setUserRole] = useState<'admin' | 'beneficiary' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Stats globales (Admin)
  const totalSavings = useMemo(() => farmers.reduce((acc, item) => acc + item.savings, 0), [farmers]);

  // Utilisateur connecté (Bénéficiaire)
  const currentUser = useMemo(() => farmers.find(f => f.id === currentUserId), [farmers, currentUserId]);

  // --- Actions ---
  const handleLoginAdmin = () => setUserRole('admin');
  
  const handleLoginBeneficiary = (id: string) => {
    setCurrentUserId(id);
    setUserRole('beneficiary');
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUserId(null);
  };

  const simulatePayment = (amount: number, type: 'cotisation' | 'assurance') => {
    if (!currentUser) return;
    const updated = farmers.map(f => {
      if (f.id === currentUser.id) {
        return { 
          ...f, 
          savings: type === 'cotisation' ? f.savings + amount : f.savings,
          // Simulation logic here...
        };
      }
      return f;
    });
    setFarmers(updated);
    alert(type === 'cotisation' ? `Paiement de ${amount} FCFA réussi !` : `Demande d'indemnisation envoyée.`);
  };

  // --- Vues (Écrans) ---

  // 1. Écran de Connexion
  if (!userRole) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={{ color: '#16a34a', marginBottom: '10px' }}>AgroSusu</h1>
          <p style={{ color: '#64748b', marginBottom: '30px' }}>Plateforme d'inclusion financière agricole</p>
          
          <button style={styles.primaryBtn} onClick={handleLoginAdmin}>
            🔐 Connexion Administrateur
          </button>
          
          <div style={{ margin: '20px 0', color: '#94a3b8' }}>ou</div>
          
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>Simuler la connexion d'un bénéficiaire :</p>
          {farmers.map(f => (
            <button key={f.id} style={styles.secondaryBtn} onClick={() => handleLoginBeneficiary(f.id)}>
              👨🏿‍🌾 Connexion - {f.fullName}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 2. Écran Administrateur
  if (userRole === 'admin') {
    return (
      <div style={styles.appContainer}>
        <NavBar title="Portail Administrateur" onLogout={handleLogout} />
        
        <div style={styles.gridDashboard}>
          <MetricCard title="Bénéficiaires" value={farmers.length.toString()} icon="👥" />
          <MetricCard title="Fonds Susu" value={`${totalSavings.toLocaleString()} FCFA`} icon="💰" />
          <MetricCard title="Assurances Actives" value={farmers.filter(f => f.insuranceStatus === 'Actif').length.toString()} icon="🛡️" />
        </div>

        <div style={styles.section}>
          <h2>📍 Cartographie Globale des Parcelles</h2>
          <div style={styles.mapContainer}>
             <div style={styles.mapOverlay}>
                {farmers.map(f => (
                  <div key={f.id} style={styles.mapPin}>
                    📍 <span style={styles.pinTooltip}>{f.fullName} ({f.village})</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2>📋 Gestion des Bénéficiaires</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Activité</th>
                  <th>Épargne</th>
                  <th>Statut Assurance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map(f => (
                  <tr key={f.id}>
                    <td>{f.fullName}</td>
                    <td>{f.activity}</td>
                    <td>{f.savings.toLocaleString()} FCFA</td>
                    <td>
                      <span style={f.insuranceStatus === 'Actif' ? styles.badgeGreen : styles.badgeOrange}>
                        {f.insuranceStatus}
                      </span>
                    </td>
                    <td>
                      <button style={styles.actionBtn}>Détails</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. Écran Bénéficiaire
  if (userRole === 'beneficiary' && currentUser) {
    return (
      <div style={styles.appContainer}>
        <NavBar title={`Espace de ${currentUser.fullName}`} onLogout={handleLogout} />
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
          
          {/* Carte Virtuelle */}
          <div style={styles.virtualCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>AgroCard</span>
              <span style={{ fontSize: '24px' }}>💳</span>
            </div>
            <div style={{ margin: '20px 0', fontSize: '22px', letterSpacing: '2px' }}>
              {currentUser.cardNumber}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>BÉNÉFICIAIRE</div>
                <div style={{ fontSize: '14px' }}>{currentUser.fullName.toUpperCase()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>SOLDE ÉPARGNE</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{currentUser.savings.toLocaleString()} FCFA</div>
              </div>
            </div>
          </div>

          {/* Actions Rapides */}
          <div style={styles.actionPanel}>
            <h3>Opérations Financières</h3>
            <button style={styles.primaryBtn} onClick={() => simulatePayment(5000, 'cotisation')}>
              📥 Payer ma cotisation (5 000 FCFA)
            </button>
            <button style={{...styles.secondaryBtn, borderColor: '#ef4444', color: '#ef4444'}} onClick={() => simulatePayment(0, 'assurance')}>
              🚨 Déclarer un sinistre climatique
            </button>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
              Statut Assurance : <strong>{currentUser.insuranceStatus}</strong>
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2>📍 Ma Parcelle ({currentUser.village})</h2>
          <div style={{...styles.mapContainer, height: '200px'}}>
             <div style={styles.mapOverlay}>
                <div style={{...styles.mapPin, transform: 'scale(1.5)'}}>
                  📍
                </div>
             </div>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Coordonnées GPS : {currentUser.gpsLocation}</p>
        </div>

        <div style={styles.section}>
          <h2>🌤️ Alertes Météo Locales</h2>
          {climateAlerts.map(alert => (
            <div key={alert.id} style={alert.severity === 'Élevé' ? styles.alertHigh : styles.alertLow}>
              <strong>{alert.title}</strong>
              <p style={{ margin: '5px 0 0 0' }}>{alert.description}</p>
            </div>
          ))}
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

const MetricCard = ({ title, value, icon }: { title: string, value: string, icon: string }) => (
  <div style={styles.metricCard}>
    <div style={{ fontSize: '30px' }}>{icon}</div>
    <div>
      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>{title.toUpperCase()}</div>
      <div style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
    </div>
  </div>
);

// --- Styles CSS-in-JS (Modern UX/UI) ---
const styles: Record<string, React.CSSProperties> = {
  // Conteneurs
  loginContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    fontFamily: '"Inter", sans-serif',
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '400px',
  },
  appContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '"Inter", sans-serif',
    paddingBottom: '40px',
  },
  section: {
    background: 'white',
    margin: '20px',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
  },
  
  // Navigation
  navbar: {
    background: 'linear-gradient(90deg, #166534, #15803d)',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  
  // Grilles et Cartes
  gridDashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    padding: '20px',
  },
  metricCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    border: '1px solid #e2e8f0',
  },
  virtualCard: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: 'white',
    padding: '25px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '350px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    margin: '0 20px',
    position: 'relative',
    overflow: 'hidden',
  },
  actionPanel: {
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    flex: '1',
    minWidth: '280px',
    margin: '0 20px',
    border: '1px solid #e2e8f0',
  },
  
  // Boutons
  primaryBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: 'bold',
    marginBottom: '10px',
    transition: 'background 0.3s',
  },
  secondaryBtn: {
    background: 'transparent',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  actionBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#0f172a',
  },

  // Tableau
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  
  // Badges & Alertes
  badgeGreen: {
    background: '#dcfce7',
    color: '#166534',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  badgeOrange: {
    background: '#fef3c7',
    color: '#b45309',
    padding: '4px 8px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  alertHigh: {
    background: '#fee2e2',
    borderLeft: '4px solid #ef4444',
    padding: '15px',
    margin: '10px 0',
    borderRadius: '4px',
    color: '#7f1d1d',
  },
  alertLow: {
    background: '#dcfce7',
    borderLeft: '4px solid #22c55e',
    padding: '15px',
    margin: '10px 0',
    borderRadius: '4px',
    color: '#14532d',
  },

  // Carte GPS (Simulation)
  mapContainer: {
    width: '100%',
    height: '300px',
    backgroundColor: '#e2e8f0',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    // Motif simulant une carte topographique simple
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '20px 20px',
  },
  mapOverlay: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  mapPin: {
    fontSize: '24px',
    cursor: 'pointer',
    position: 'relative',
    animation: 'bounce 2s infinite',
  },
  pinTooltip: {
    position: 'absolute',
    top: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0f172a',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  }
};