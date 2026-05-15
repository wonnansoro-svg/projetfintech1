import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  FlatList,
} from 'react-native';

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
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
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

    setFarmers((prev) => [newFarmer, ...prev]);

    setFullName('');
    setPhone('');
    setActivity('');
    setVillage('');
    setGpsLocation('');

    Alert.alert(
      'Succès',
      'Le bénéficiaire a été enregistré avec succès.'
    );
  };

  const collectContribution = (farmerId: string) => {
    const updated = farmers.map((farmer) => {
      if (farmer.id === farmerId) {
        return {
          ...farmer,
          savings: farmer.savings + 5000,
        };
      }

      return farmer;
    });

    setFarmers(updated);

    Alert.alert(
      'Cotisation enregistrée',
      'Une cotisation de 5 000 FCFA a été ajoutée.'
    );
  };

  const insurancePayment = (farmerName: string) => {
    Alert.alert(
      'Paiement Assurance',
      `Le remboursement climatique a été initié pour ${farmerName}.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>AGROSUSU</Text>
          <Text style={styles.subtitle}>
            Fintech Agricole • Assurance Climatique • Épargne Collective
          </Text>
        </View>

        <View style={styles.dashboardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bénéficiaires</Text>
            <Text style={styles.bigValue}>{farmers.length}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Épargne Totale</Text>
            <Text style={styles.bigValue}>
              {totalSavings.toLocaleString()} FCFA
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Enregistrement Bénéficiaire
          </Text>

          <TextInput
            placeholder="Nom complet"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            placeholder="Téléphone"
            placeholderTextColor="#7a7a7a"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            placeholder="Activité agricole ou commerciale"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
            value={activity}
            onChangeText={setActivity}
          />

          <TextInput
            placeholder="Village / Région"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
            value={village}
            onChangeText={setVillage}
          />

          <TextInput
            placeholder="Coordonnées GPS"
            placeholderTextColor="#7a7a7a"
            style={styles.input}
            value={gpsLocation}
            onChangeText={setGpsLocation}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={registerFarmer}
          >
            <Text style={styles.buttonText}>Créer un compte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alertes Climatiques</Text>

          {climateAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDescription}>
                {alert.description}
              </Text>
              <Text style={styles.alertSeverity}>
                Niveau : {alert.severity}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liste des Bénéficiaires</Text>

          <FlatList
            data={farmers}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.farmerCard}>
                <Text style={styles.farmerName}>{item.fullName}</Text>

                <Text style={styles.infoText}>
                  Téléphone : {item.phone}
                </Text>

                <Text style={styles.infoText}>
                  Activité : {item.activity}
                </Text>

                <Text style={styles.infoText}>
                  Localité : {item.village}
                </Text>

                <Text style={styles.infoText}>
                  GPS : {item.gpsLocation || 'Non disponible'}
                </Text>

                <Text style={styles.infoText}>
                  Assurance : {item.insuranceStatus}
                </Text>

                <Text style={styles.savingsText}>
                  Épargne : {item.savings.toLocaleString()} FCFA
                </Text>

                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => collectContribution(item.id)}
                  >
                    <Text style={styles.buttonText}>Cotisation</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.insuranceButton}
                    onPress={() => insurancePayment(item.fullName)}
                  >
                    <Text style={styles.buttonText}>Assurance</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            AgroSusu © 2026 - Inclusion Financière Agricole en Afrique
            de l’Ouest
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    backgroundColor: '#14532D',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#D1FAE5',
    marginTop: 8,
    fontSize: 14,
  },
  dashboardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    width: '48%',
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  bigValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  section: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#16A34A',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  insuranceButton: {
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#7F1D1D',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  alertTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertDescription: {
    color: '#FECACA',
    marginTop: 6,
  },
  alertSeverity: {
    color: '#FFFFFF',
    marginTop: 10,
    fontWeight: '600',
  },
  farmerCard: {
    backgroundColor: '#334155',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  farmerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: '#E2E8F0',
    marginBottom: 6,
  },
  savingsText: {
    color: '#86EFAC',
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 14,
  },
  actionContainer: {
    flexDirection: 'row',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  footerText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
