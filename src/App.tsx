import { useMemo, useState } from 'react';

interface Farmer {
  id: string;
  fullName: string;
  phone: string;
  activity: string;
  village: string;
  savings: number;
  insuranceStatus: string;
  gpsLocation: string;
}

interface ClimateAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
}

const initialFarmers: Farmer[] = [
  {
    id: '1',
    fullName: 'Kouassi Adjoua',
    phone: '+2250700000001',
    activity: 'Culture du cacao',
    village: 'Yamoussoukro',
    savings: 125000,
    insuranceStatus: 'Actif',
    gpsLocation: '5.3480, -4.0270',
  },
  {
    id: '2',
    fullName: 'Traoré Mamadou',
    phone: '+2250700000002',
    activity: 'Commerce de riz',
    village: 'Bouaké',
    savings: 98000,
    insuranceStatus: 'En attente',
    gpsLocation: '7.6938, -5.0303',
  },
];

const climateAlerts: ClimateAlert[] = [
  {
    id: '1',
    title: 'Alerte Sécheresse',
    description: 'Faible niveau de pluie détecté pendant 21 jours.',
    severity: 'Élevé',
  },
  {
    id: '2',
    title: 'Risque d’inondation',
    description: 'Précipitations importantes prévues cette semaine.',
    severity: 'Moyen',
  },
];

export default function App() {
  const [farmers, setFarmers] = useState<Farmer[]>(initialFarmers);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [activity, setActivity] = useState('');
  const [village, setVillage] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');

  const totalSavings = useMemo(() => {
    return farmers.reduce((acc, item) => acc + item.savings, 0);
  }, [farmers]);

  const registerFarmer = () => {
    if (!fullName || !phone || !activity || !village) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const newFarmer: Farmer = {
      id: Date.now().toString(),
      fullName,
      phone,
      activity,
      village,
      savings: 0,
      insuranceStatus: 'Actif',
      gpsLocation,
    };

    setFarmers((prev: Farmer[]) => [newFarmer, ...prev]);

    setFullName('');
    setPhone('');
    setActivity('');
    setVillage('');
    setGpsLocation('');

    alert('Bénéficiaire enregistré avec succès.');
  };

  const collectContribution = (farmerId: string) => {
    const updated = farmers.map((farmer: Farmer) => {
      if (farmer.id === farmerId) {
        return {
          ...farmer,
          savings: farmer.savings + 5000,
        };
      }

      return farmer;
    });

    setFarmers(updated);

    alert('Cotisation de 5 000 FCFA ajoutée.');
  };

  const insurancePayment = (name: string) => {
    alert(`Paiement assurance initié pour ${name}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg,#052e16 0%,#0f172a 45%,#14532d 100%)',
        color: '#F8FAFC',
        fontFamily: 'Inter, Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          background:
            'linear-gradient(90deg,#14532d,#15803d,#22c55e)',
          padding: 30,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        }}
      >
        <h1 style={{ fontSize: 42 }}>AGROSUSU</h1>

        <p style={{ color: '#DCFCE7', fontSize: 18 }}>
          Fintech Agricole • Assurance Climatique • Épargne Collective
        </p>

        <div style={heroGrid}>
          <div style={heroCard}>
            <h3>Assurance Climatique</h3>
            <p>Protection sécheresse et inondation.</p>
          </div>

          <div style={heroCard}>
            <h3>GPS Parcelles</h3>
            <p>Traçabilité des exploitations agricoles.</p>
          </div>

          <div style={heroCard}>
            <h3>Mobile Money</h3>
            <p>Paiements et cotisations numériques.</p>
          </div>

          <div style={heroCard}>
            <h3>Crédit Agricole</h3>
            <p>Financement intelligent des producteurs.</p>
          </div>
        </div>
      </div>

      <div style={dashboardGrid}>
        <div style={dashboardCard}>
          <h3>Bénéficiaires</h3>
          <h1>{farmers.length}</h1>
        </div>

        <div style={dashboardCard}>
          <h3>Épargne Totale</h3>
          <h1>{totalSavings.toLocaleString()} FCFA</h1>
        </div>

        <div style={dashboardCard}>
          <h3>Assurances Actives</h3>
          <h1>86</h1>
        </div>

        <div style={dashboardCard}>
          <h3>Parcelles GPS</h3>
          <h1>142</h1>
        </div>
      </div>

      <div style={sectionCard}>
        <h2>Enregistrement Bénéficiaire</h2>

        <input
          placeholder='Nom complet'
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder='Téléphone'
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder='Activité agricole ou commerciale'
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder='Village / Région'
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder='Coordonnées GPS'
          value={gpsLocation}
          onChange={(e) => setGpsLocation(e.target.value)}
          style={inputStyle}
        />

        <button style={primaryButton} onClick={registerFarmer}>
          Créer un compte
        </button>
      </div>

      <div style={sectionCard}>
        <h2>Alertes Climatiques</h2>

        {climateAlerts.map((alert) => (
          <div key={alert.id} style={alertCard}>
            <h3>{alert.title}</h3>
            <p>{alert.description}</p>
            <strong>Niveau : {alert.severity}</strong>
          </div>
        ))}
      </div>

      <div style={sectionCard}>
        <h2>Services Intégrés</h2>

        <div style={servicesGrid}>
          <div style={serviceCard}>
            <h3>Wallet Mobile Money</h3>
            <p>Orange Money, MTN Money, Wave et Moov.</p>
          </div>

          <div style={serviceCard}>
            <h3>Suivi GPS</h3>
            <p>Cartographie et traçabilité des parcelles.</p>
          </div>

          <div style={serviceCard}>
            <h3>Données Météo</h3>
            <p>Analyse climatique et alertes intelligentes.</p>
          </div>

          <div style={serviceCard}>
            <h3>Vente Carbone</h3>
            <p>Revenus issus des crédits carbone agricoles.</p>
          </div>

          <div style={serviceCard}>
            <h3>Crédits Agricoles</h3>
            <p>Financement des semences et équipements.</p>
          </div>

          <div style={serviceCard}>
            <h3>Intelligence Artificielle</h3>
            <p>Détection des maladies des cultures.</p>
          </div>
        </div>
      </div>

      <div style={sectionCard}>
        <h2>Liste des Bénéficiaires</h2>

        <div style={farmerGrid}>
          {farmers.map((item: Farmer) => (
            <div key={item.id} style={farmerCard}>
              <h3>{item.fullName}</h3>

              <p>Téléphone : {item.phone}</p>
              <p>Activité : {item.activity}</p>
              <p>Village : {item.village}</p>
              <p>GPS : {item.gpsLocation}</p>
              <p>Assurance : {item.insuranceStatus}</p>

              <h4>
                Épargne : {item.savings.toLocaleString()} FCFA
              </h4>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  style={secondaryButton}
                  onClick={() => collectContribution(item.id)}
                >
                  Cotisation
                </button>

                <button
                  style={insuranceButton}
                  onClick={() => insurancePayment(item.fullName)}
                >
                  Assurance
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={footerCard}>
        <h2>AgroSusu Platform</h2>
        <p>
          Inclusion financière agricole • Assurance climatique • Agriculture
          intelligente • Afrique de l’Ouest
        </p>
      </div>
    </div>
  );
}

const dashboardGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 20,
  padding: 20,
};

const dashboardCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,#1e293b,#0f172a)',
  padding: 22,
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
};

const heroGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 18,
  marginTop: 24,
};

const heroCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)',
  padding: 20,
  borderRadius: 20,
  backdropFilter: 'blur(8px)',
};

const sectionCard: React.CSSProperties = {
  background: 'rgba(15,23,42,0.92)',
  margin: 20,
  padding: 24,
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 15,
  marginBottom: 14,
  borderRadius: 12,
  border: '1px solid #334155',
  backgroundColor: '#1E293B',
  color: '#FFFFFF',
  fontSize: 15,
};

const primaryButton: React.CSSProperties = {
  background: 'linear-gradient(90deg,#16a34a,#22c55e)',
  color: '#FFFFFF',
  padding: 15,
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  width: '100%',
};

const secondaryButton: React.CSSProperties = {
  background: '#2563EB',
  color: '#FFFFFF',
  padding: 12,
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const insuranceButton: React.CSSProperties = {
  background: '#DC2626',
  color: '#FFFFFF',
  padding: 12,
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const alertCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,#7f1d1d,#991b1b)',
  padding: 18,
  borderRadius: 18,
  marginBottom: 14,
};

const servicesGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
  gap: 18,
  marginTop: 20,
};

const serviceCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,#1d4ed8,#0f172a)',
  padding: 22,
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
};

const farmerGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
  gap: 18,
  marginTop: 20,
};

const farmerCard: React.CSSProperties = {
  background: 'linear-gradient(145deg,#334155,#1e293b)',
  padding: 22,
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.08)',
};

const footerCard: React.CSSProperties = {
  margin: 20,
  padding: 30,
  textAlign: 'center',
  borderRadius: 24,
  background: 'linear-gradient(90deg,#14532d,#166534,#15803d)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
};
