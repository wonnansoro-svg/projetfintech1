import { useState } from "react";
import { X, User, Phone, MapPin, Building2, Loader, CheckCircle2, AlertCircle } from "lucide-react";
import { updateProfile, regeneratePhoneIndex } from "../services/profileService";
import { CROPS } from "../lib/crops";
import { useBackGuard } from "../lib/backGuard";
import { useApp } from "../context/AppContext";
import { normalizePhone } from "../lib/phoneAuth";
import type { Crop, Profile } from "../types/firestore";

export default function EditProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  useBackGuard(true, onClose);
  const { pushToast } = useApp();
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [village, setVillage] = useState(profile.village);
  const [region, setRegion] = useState(profile.region);
  const [cooperativeId, setCooperativeId] = useState(profile.cooperativeId);
  const [crops, setCrops] = useState<Crop[]>(profile.crops);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleCrop = (c: Crop) => {
    setCrops((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const requiresCrops = profile.role === "farmer";
  const valid = fullName.trim().length > 1 && phone.trim().length >= 8 && village.trim().length > 0
    && region.trim().length > 0 && cooperativeId.trim().length > 0 && (!requiresCrops || crops.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const phoneChanged = normalizePhone(phone.trim()) !== normalizePhone(profile.phone);
      await updateProfile(profile.uid, {
        fullName: fullName.trim(), phone: phone.trim(), village: village.trim(),
        region: region.trim(), cooperativeId: cooperativeId.trim(), crops,
      });
      // Le numéro sert d'identifiant de connexion (résolu via phoneIndex) : s'il change,
      // il faut réindexer sinon la connexion par téléphone échoue après modification.
      if (phoneChanged) await regeneratePhoneIndex(profile.uid);
      pushToast({ tone: "success", title: "Profil mis à jour", message: "Vos informations ont été enregistrées." });
      onClose();
    } catch (err) {
      console.error("Erreur mise à jour du profil :", err);
      setError("Impossible d'enregistrer vos modifications. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85%] flex flex-col overflow-hidden my-auto">
        <form onSubmit={handleSubmit} className="contents">
          <div className="shrink-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
            <div className="font-black text-stone-800">✏️ Modifier mes informations</div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="Nom et prénoms" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="+225 07 00 00 00 00" required />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Sert aussi d'identifiant de connexion.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Village</label>
                <input value={village} onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="Village" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Région</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input value={region} onChange={(e) => setRegion(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    placeholder="Région" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Coopérative</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={cooperativeId} onChange={(e) => setCooperativeId(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="Nom de la coopérative" required />
              </div>
            </div>

            {requiresCrops && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Cultures</label>
                <div className="grid grid-cols-3 gap-2">
                  {CROPS.map((c) => (
                    <button key={c.key} type="button" onClick={() => toggleCrop(c.key)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        crops.includes(c.key) ? "bg-orange-500 text-white border-orange-500" : "bg-stone-50 text-stone-600 border-stone-200"
                      }`}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 border-t border-stone-100" style={{ paddingBottom: "max(1.75rem, calc(env(safe-area-inset-bottom) + 1rem))" }}>
            <button type="submit" disabled={!valid || saving}
              className="w-full py-4 rounded-2xl font-black text-white bg-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
