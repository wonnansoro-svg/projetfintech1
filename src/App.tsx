import { useMemo, useState } from "react";

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
    id: "1",
    fullName: "Kouassi Adjoua",
    phone: "+2250700000001",
    activity: "Culture du cacao",
    village: "Yamoussoukro",
    savings: 125000,
    insuranceStatus: "Actif",
    gpsLocation: "5.3480, -4.0270",
  },
  {
    id: "2",
    fullName: "Traoré Mamadou",
    phone: "+2250700000002",
    activity: "Commerce de riz",
    village: "Bouaké",
    savings: 98000,
    insuranceStatus: "En attente",
    gpsLocation: "7.6938, -5.0303",
  },
];

const climateAlerts: ClimateAlert[] = [
  {
    id: "1",
    title: "Alerte Sécheresse",
    description: "Faible niveau de pluie détecté pendant 21 jours.",
    severity: "Élevé",
  },
  {
    id: "2",
    title: "Risque d’inondation",
    description: "Précipitations importantes prévues cette semaine.",
    severity: "Moyen",
  },
];

export default function App() {
  const [farmers, setFarmers] =
    useState<Farmer[]>(initialFarmers);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [activity, setActivity] = useState("");
  const [village, setVillage] = useState("");
  const [gpsLocation, setGpsLocation] = useState("");

  const totalSavings = useMemo(() => {
    return farmers.reduce(
      (acc, item) => acc + item.savings,
      0
    );
  }, [farmers]);

  const registerFarmer = () => {
    if (
      !fullName ||
      !phone ||
      !activity ||
      !village
    ) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const newFarmer: Farmer = {
      id: Date.now().toString(),
      fullName,
      phone,
      activity,
      village,
      savings: 0,
      insuranceStatus: "Actif",
      gpsLocation,
    };

    setFarmers((prev: Farmer[]) => [
      newFarmer,
      ...prev,
    ]);

    setFullName("");
    setPhone("");
    setActivity("");
    setVillage("");
    setGpsLocation("");

    alert("Bénéficiaire enregistré.");
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

    alert("Cotisation ajoutée.");
  };

  const insurancePayment = (name: string) => {
    alert(
      `Paiement assurance effectué pour ${name}`
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        color: "white",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          backgroundColor: "#14532D",
          padding: 20,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <h1>AGROSUSU</h1>

        <p>
          Fintech Agricole • Assurance Climatique
          • Épargne Collective
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          padding: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            backgroundColor: "#1E293B",
            padding: 20,
            borderRadius: 16,
            flex: 1,
          }}
        >
          <h3>Bénéficiaires</h3>
          <h1>{farmers.length}</h1>
        </div>

        <div
          style={{
            backgroundColor: "#1E293B",
            padding: 20,
            borderRadius: 16,
            flex: 1,
          }}
        >
          <h3>Épargne Totale</h3>
          <h1>
            {totalSavings.toLocaleString()} FCFA
          </h1>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#1E293B",
          margin: 20,
          padding: 20,
          borderRadius: 20,
        }}
      >
        <h2>Enregistrement Bénéficiaire</h2>

        <input
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) =>
            setFullName(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Téléphone"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Activité"
          value={activity}
          onChange={(e) =>
            setActivity(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Village"
          value={village}
          onChange={(e) =>
            setVillage(e.target.value)
          }
          style={inputStyle}
        />

        <input
          placeholder="Coordonnées GPS"
          value={gpsLocation}
          onChange={(e) =>
            setGpsLocation(e.target.value)
          }
          style={inputStyle}
        />

        <button
          onClick={registerFarmer}
          style={primaryButton}
        >
          Créer un compte
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#1E293B",
          margin: 20,
          padding: 20,
          borderRadius: 20,
        }}
      >
        <h2>Alertes Climatiques</h2>

        {climateAlerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              backgroundColor: "#7F1D1D",
              padding: 15,
              borderRadius: 12,
              marginBottom: 10,
            }}
          >
            <h3>{alert.title}</h3>

            <p>{alert.description}</p>

            <strong>
              Niveau : {alert.severity}
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: "#1E293B",
          margin: 20,
          padding: 20,
          borderRadius: 20,
        }}
      >
        <h2>Liste des Bénéficiaires</h2>

        {farmers.map((item: Farmer) => (
          <div
            key={item.id}
            style={{
              backgroundColor: "#334155",
              padding: 20,
              borderRadius: 16,
              marginBottom: 16,
            }}
          >
            <h3>{item.fullName}</h3>

            <p>Téléphone : {item.phone}</p>

            <p>Activité : {item.activity}</p>

            <p>Village : {item.village}</p>

            <p>
              GPS :{" "}
              {item.gpsLocation ||
                "Non disponible"}
            </p>

            <p>
              Assurance :{" "}
              {item.insuranceStatus}
            </p>

            <h4>
              Épargne :{" "}
              {item.savings.toLocaleString()} FCFA
            </h4>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                style={secondaryButton}
                onClick={() =>
                  collectContribution(item.id)
                }
              >
                Cotisation
              </button>

              <button
                style={insuranceButton}
                onClick={() =>
                  insurancePayment(
                    item.fullName
                  )
                }
              >
                Assurance
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  borderRadius: 10,
  border: "none",
  backgroundColor: "#334155",
  color: "white",
};

const primaryButton: React.CSSProperties = {
  backgroundColor: "#16A34A",
  color: "white",
  padding: 14,
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  width: "100%",
  fontWeight: "bold",
};

const secondaryButton: React.CSSProperties = {
  backgroundColor: "#2563EB",
  color: "white",
  padding: 12,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const insuranceButton: React.CSSProperties = {
  backgroundColor: "#DC2626",
  color: "white",
  padding: 12,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};