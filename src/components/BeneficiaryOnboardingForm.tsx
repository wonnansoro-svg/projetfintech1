import { useState } from "react";
import { User, Phone, MapPin, Building2, Loader, CheckCircle2, AlertCircle } from "lucide-react";
import { createProfile } from "../services/profileService";
import { phoneFromSyntheticEmail } from "../lib/phoneAuth";
import type { Crop } from "../types/firestore";

const CROPS: { key: Crop; label: string; emoji: string }[] = [
  { key: "maize", label: "Maïs", emoji: "🌽" },
  { key: "millet", label: "Mil", emoji: "🌾" },
  { key: "rice", label: "Riz", emoji: "🍚" },
  { key: "anacarde", label: "Anacarde", emoji: "🥜" },
  { key: "cacao", label: "Cacao", emoji: "🍫" },
  { key: "manioc", label: "Manioc", emoji: "🥔" },
];

export default function BeneficiaryOnboardingForm({ uid, email, onDone }: {
  uid: string; email: string | null; onDone: () => void;
}) {
  const [fullName, setFullName] = useState("");
  // Pré-rempli avec le numéro utilisé à l'inscription (déduit de l'email synthétique
  // "{digits}@coopavec.local") pour que ce soit exactement le même numéro qui finisse
  // dans phoneIndex — sinon la connexion par téléphone échouerait plus tard si un chiffre diffère.
  const [phone, setPhone] = useState(() => phoneFromSyntheticEmail(email));
  const [village, setVillage] = useState("");
  const [region, setRegion] = useState("");
  const [cooperativeId, setCooperativeId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleCrop = (c: Crop) => {
    setCrops((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const valid = fullName.trim().length > 1 && phone.trim().length >= 8 && village.trim() && region.trim() && cooperativeId.trim() && crops.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await createProfile(uid, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email ?? "",
        village: village.trim(),
        region: region.trim(),
        cooperativeId: cooperativeId.trim(),
        crops,
      });
      onDone();
    } catch (err) {
      console.error("Erreur création profil bénéficiaire :", err);
      setError("Impossible d'enregistrer le profil. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-stone-100 to-green-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-3 shadow-lg">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-stone-900">Enregistrement du bénéficiaire</h1>
          <p className="text-stone-500 text-xs mt-1">Renseignez les informations réelles collectées sur le terrain</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="Nom et prénoms" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="+225 07 00 00 00 00" required />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">C'est ce numéro qui vous servira à vous reconnecter — vérifiez qu'il est correct.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Village</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="Village" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Région</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={region} onChange={(e) => setRegion(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                  placeholder="Région" required />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Coopérative</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input value={cooperativeId} onChange={(e) => setCooperativeId(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
                placeholder="Nom de la coopérative" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Cultures</label>
            <div className="grid grid-cols-3 gap-2">
              {CROPS.map((c) => (
                <button key={c.key} type="button" onClick={() => toggleCrop(c.key)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    crops.includes(c.key) ? "bg-green-600 text-white border-green-600" : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={!valid || saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Enregistrer le bénéficiaire
          </button>
        </form>
      </div>
    </div>
  );
}
