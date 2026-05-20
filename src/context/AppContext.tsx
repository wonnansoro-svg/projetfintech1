import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "../i18n";
import { getWeatherForecast, type WeatherData, type ForecastDay } from "../lib/weather";
import { getCurrentLocation, type GeoPoint } from "../lib/geolocation";

export interface SusuMember {
  name: string;
  amount: number;
  paid: boolean;
  avatarColor: string;
}

export interface Parcel {
  id: string;
  name: string;
  hectares: number;
  crop: "maize" | "millet" | "rice";
  gps: { lat: number; lng: number } | null;
}

export interface Tx {
  id: string;
  type: "deposit" | "withdraw" | "send" | "receive" | "payout";
  amount: number;
  date: string;
  label: string;
}

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
  setBalance: (n: number) => void;
  savingsGoal: number;
  weeklySaved: number;
  susuMembers: SusuMember[];
  nextPayoutDays: number;
  parcels: Parcel[];
  transactions: Tx[];
  carbonCredits: number;
  co2Saved: number;
  insuranceTriggered: boolean;
  creditAmount: number;
  creditDueDays: number;
  identity: { name: string; phone: string; village: string; verified: boolean };
  addTx: (tx: Omit<Tx, "id" | "date">) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
  toasts: Toast[];
  weather: WeatherData | null;
  weatherForecast: ForecastDay[] | null;
  currentLocation: GeoPoint | null;
  loadWeather: (lat: number, lng: number) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "fr");
  const [online, setOnline] = useState(navigator.onLine);
  const [balance, setBalance] = useState(45000);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<ForecastDay[] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);

  const savingsGoal = 100000;
  const weeklySaved = 5000;
  const userName = "Mamadou";
  const userVillage = "Thiès";

  const [susuMembers] = useState<SusuMember[]>([
    { name: "Aminata", amount: 5000, paid: true, avatarColor: "#f97316" },
    { name: "Moussa", amount: 5000, paid: true, avatarColor: "#8b5cf6" },
    { name: "Fatou", amount: 5000, paid: true, avatarColor: "#ec4899" },
    { name: "Ibrahima", amount: 5000, paid: false, avatarColor: "#06b6d4" },
    { name: "Aïssatou", amount: 5000, paid: false, avatarColor: "#10b981" },
    { name: "Ousmane", amount: 5000, paid: false, avatarColor: "#f59e0b" },
  ]);
  const nextPayoutDays = 4;
  const [parcels] = useState<Parcel[]>([
    { id: "p1", name: "Parcelle Nord", hectares: 1.2, crop: "maize", gps: { lat: 14.6937, lng: -17.4441 } },
    { id: "p2", name: "Parcelle Rivière", hectares: 0.8, crop: "rice", gps: { lat: 14.7012, lng: -17.4500 } },
    { id: "p3", name: "Parcelle Sud", hectares: 0.5, crop: "millet", gps: null },
  ]);
  const [transactions, setTransactions] = useState<Tx[]>([
    { id: "t1", type: "deposit", amount: 5000, date: "2026-01-15", label: "Tontine — semaine 3" },
    { id: "t2", type: "receive", amount: 30000, date: "2026-01-08", label: "Mon tour de tontine" },
    { id: "t3", type: "send", amount: 2000, date: "2026-01-05", label: "À Aminata" },
    { id: "t4", type: "payout", amount: 15000, date: "2025-12-20", label: "Indemnité sécheresse" },
  ]);
  const [carbonCredits] = useState(12);
  const [co2Saved] = useState(2.4);
  const [insuranceTriggered] = useState(true);
  const [creditAmount] = useState(50000);
  const [creditDueDays] = useState(45);
  const [identity] = useState({
    name: "Mamadou Diop",
    phone: "+221 77 123 45 67",
    village: "Thiès",
    verified: true,
  });

  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);

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
    } catch (error) {
      console.error("Weather load error:", error);
    }
  };

  // Charger météo et localisation au montage
  useEffect(() => {
    getCurrentLocation().then((loc: any) => {
      setCurrentLocation(loc);
      loadWeather(loc.lat, loc.lng);
    });
  }, []);

  const addTx = (tx: Omit<Tx, "id" | "date">) => {
    setTransactions((prev) => [
      { ...tx, id: "t" + Date.now(), date: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]);
    if (tx.type === "deposit" || tx.type === "receive" || tx.type === "payout") {
      setBalance((b) => b + tx.amount);
    } else {
      setBalance((b) => Math.max(0, b - tx.amount));
    }
  };

  return (
    <AppContext.Provider
      value={{
        lang, setLang, online, userName, userVillage,
        balance, setBalance, savingsGoal, weeklySaved,
        susuMembers, nextPayoutDays, parcels, transactions, carbonCredits, co2Saved,
        insuranceTriggered, creditAmount, creditDueDays, identity, addTx,
        pushToast, toasts, weather, weatherForecast, currentLocation, loadWeather,
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
