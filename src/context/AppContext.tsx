import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { getWeatherForecast, type WeatherData, type ForecastDay } from "../lib/weather";
import { getCurrentLocation, type GeoPoint } from "../lib/geolocation";
import { subscribeToParcelsByOwner } from "../services/parcelService";
import { subscribeToWallet } from "../services/walletService";
import { subscribeToTransactionsByUser, recordTransaction } from "../services/transactionService";
import { computeCarbonCredits, CO2_TONNES_PER_CREDIT } from "../lib/carbon";
import { useAuth } from "./AuthContext";
import type { Parcel as FirestoreParcel, Transaction as FirestoreTx } from "../types/firestore";

export type Parcel = FirestoreParcel;
export type Tx = FirestoreTx;
export type TextScale = "sm" | "md" | "lg";

const TEXT_SCALE_PX: Record<TextScale, string> = { sm: "15px", md: "17px", lg: "20px" };

export interface Toast {
  id: number;
  title: string;
  message: string;
  tone: "success" | "info" | "warn";
}

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  online: boolean;
  userName: string;
  userVillage: string;
  balance: number;
  textScale: TextScale;
  setTextScale: (s: TextScale) => void;
  parcels: Parcel[];
  parcelsLoading: boolean;
  transactions: Tx[];
  carbonCredits: number;
  availableCarbonCredits: number;
  co2Saved: number;
  insuranceTriggered: boolean;
  addTx: (tx: Omit<Tx, "id" | "userId" | "createdAt">) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  toasts: Toast[];
  weather: WeatherData | null;
  weatherForecast: ForecastDay[] | null;
  weatherError: string | null;
  currentLocation: GeoPoint | null;
  loadWeather: (lat: number, lng: number) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "fr");
  const [textScale, setTextScale] = useState<TextScale>(() => (localStorage.getItem("textScale") as TextScale) || "md");
  const [online, setOnline] = useState(navigator.onLine);
  const [balance, setBalance] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<ForecastDay[] | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);

  const userName = profile?.fullName ?? "";
  const userVillage = profile?.village ?? "";

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setParcels([]); setParcelsLoading(false); return; }
    setParcelsLoading(true);
    const unsubscribe = subscribeToParcelsByOwner(user.id, (p) => { setParcels(p); setParcelsLoading(false); });
    return () => unsubscribe();
  }, [user?.id]);

  const [transactions, setTransactions] = useState<FirestoreTx[]>([]);
  useEffect(() => {
    if (!user) { setTransactions([]); return; }
    const unsubscribe = subscribeToTransactionsByUser(user.id, setTransactions);
    return () => unsubscribe();
  }, [user?.id]);

  const [carbonCreditsRedeemed, setCarbonCreditsRedeemed] = useState(0);
  useEffect(() => {
    if (!user) { setBalance(0); setCarbonCreditsRedeemed(0); return; }
    const unsubscribe = subscribeToWallet(user.id, (wallet) => {
      setBalance(wallet?.balance ?? 0);
      setCarbonCreditsRedeemed(wallet?.carbonCreditsRedeemed ?? 0);
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Crédits carbone gagnés grâce aux parcelles enregistrées (verdissement du champ) —
  // calculés en direct, pas stockés, pour toujours refléter les parcelles à jour.
  const carbonCredits = computeCarbonCredits(parcels);
  const availableCarbonCredits = Math.max(0, carbonCredits - carbonCreditsRedeemed);
  const co2Saved = Math.round(carbonCredits * CO2_TONNES_PER_CREDIT * 10) / 10;
  const [insuranceTriggered] = useState(false);

  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);

  useEffect(() => {
    localStorage.setItem("textScale", textScale);
    document.documentElement.style.fontSize = TEXT_SCALE_PX[textScale];
  }, [textScale]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pushToast = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3200);
  };

  const loadWeather = async (lat: number, lng: number) => {
    try {
      const { current, forecast } = await getWeatherForecast(lat, lng);
      setWeather(current);
      setWeatherForecast(forecast);
      setWeatherError(null);
    } catch (error) {
      console.error("Weather load error:", error);
      setWeatherError("Météo indisponible — vérifiez votre connexion.");
    }
  };

  // Charger météo et localisation au montage
  useEffect(() => {
    getCurrentLocation()
      .then((loc) => {
        setCurrentLocation(loc);
        loadWeather(loc.lat, loc.lng);
      })
      .catch((error) => {
        console.error("Location error:", error);
        setWeatherError("Position GPS indisponible — autorisez la localisation pour voir la météo locale.");
      });
  }, []);

  const addTx = (tx: Omit<Tx, "id" | "userId" | "createdAt">) => {
    if (!user) return;
    // Le solde et l'historique se mettent à jour via les abonnements Firestore ci-dessus.
    recordTransaction(user.id, tx).catch((err) => console.error("Erreur d'enregistrement de la transaction :", err));
  };

  return (
    <AppContext.Provider
      value={{
        lang, setLang, online, userName, userVillage,
        balance, textScale, setTextScale,
        parcels, parcelsLoading, transactions, carbonCredits, availableCarbonCredits, co2Saved,
        insuranceTriggered, addTx,
        pushToast, toasts, weather, weatherForecast, weatherError, currentLocation, loadWeather,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}