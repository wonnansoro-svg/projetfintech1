import { useState } from "react";
import { X, User, Phone, MapPin, Building2, Loader, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { createProfileAsAdmin, type AdminCreatedAccount } from "../services/profileService";
import { CROPS } from "../lib/crops";
import { useBackGuard } from "../lib/backGuard";
import type { Crop, Role } from "../types/firestore";

const ROLE_OPTIONS: { key: Role; label: string }[] = [
  { key: "farmer", label: "🌾 Agriculteur" },
  { key: "investor", label: "🏢 Investisseur" },
  { key: "agent", label: "🧑‍🌾 Superviseur" },
];

export default function AddBeneficiaryForm({ onClose, onDone, allowedRoles = ["farmer", "investor", "agent"], supervisorId = null }: {
  onClose: () => void; onDone: () => void; allowedRoles?: Role[]; supervisorId?: string | null;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [region, setRegion] = useState("");
  const [cooperativeId, setCooperativeId] = useState("");
  const [crops, setCrops] = useState<Crop[]>([]);
  const [role, setRole] = useState<Role>(allowedRoles[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<AdminCreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);

  useBackGuard(true, created ? onDone : onClose);

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
      const account = await createProfileAsAdmin({
        fullName: fullName.trim(), phone: phone.trim(), village: village.trim(),
        region: region.trim(), cooperativeId: cooperativeId.trim(), crops, role, supervisorId,
      });
      setCreated(account);
    } catch (err) {
      console.error("Erreur création bénéficiaire (admin) :", err);
      setError("Impossible de créer le compte. Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard?.writeText(`Email : ${created.email}\nMot de passe : ${created.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">🆕 Ajouter un bénéficiaire</div>
          <button onClick={created ? onDone : onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="font-black text-stone-900">Compte créé avec succès</div>
            <p className="text-sm text-stone-500">
              Communiquez ces identifiants à <span className="font-bold">{created.profile.fullName}</span> pour qu'il/elle puisse se connecter avec son propre téléphone.
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2">
              <div><div className="text-[10px] text-stone-500 font-semibold uppercase">Email de connexion</div><div className="font-mono font-bold text-stone-800 text-sm break-all">{created.email}</div></div>
              <div><div className="text-[10px] text-stone-500 font-semibold uppercase">Mot de passe temporaire</div><div className="font-mono font-bold text-stone-800 text-sm">{created.tempPassword}</div></div>
            </div>
            <button onClick={copyCredentials}
              className="w-full py-3 bg-stone-100 rounded-xl font-bold text-sm text-stone-700 flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" /> {copied ? "Copié !" : "Copier les identifiants"}
            </button>
            <button onClick={onDone} className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold">Terminer</button>
          </div>
        ) : (
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
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  placeholder="Nom et prénoms" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  placeholder="+225 07 00 00 00 00" required />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Sert d'identifiant de connexion (aucun email requis).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Village</label>
                <input value={village} onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  placeholder="Village" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Région</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input value={region} onChange={(e) => setRegion(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    placeholder="Région" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">Coopérative</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={cooperativeId} onChange={(e) => setCooperativeId(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  placeholder="Nom de la coopérative" required />
              </div>
            </div>

            {allowedRoles.length > 1 && (
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Rôle</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.filter((o) => allowedRoles.includes(o.key)).map((o) => (
                    <button key={o.key} type="button" onClick={() => setRole(o.key)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        role === o.key ? "bg-violet-600 text-white border-violet-600" : "bg-stone-50 text-stone-600 border-stone-200"
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              Créer le compte
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
