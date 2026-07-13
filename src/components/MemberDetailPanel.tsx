import { useEffect, useState } from "react";
import { X, Phone, MapPin, Building2, ShieldCheck, Power, CheckCircle2, Loader } from "lucide-react";
import { subscribeToProfile, updateProfile } from "../services/profileService";
import { subscribeToParcelsByOwner } from "../services/parcelService";
import { subscribeToUserCredits } from "../services/creditService";
import { subscribeToTransactionsByUser } from "../services/transactionService";
import { recordContribution } from "../services/contributionService";
import type { Profile, Parcel, Credit, Transaction, Role, KycStatus } from "../types/firestore";

const KYC_LABELS: Record<KycStatus, string> = { pending: "En attente", level1: "Niveau 1", level2: "Niveau 2" };
const ROLE_LABELS: Record<Role, string> = { farmer: "🌾 Agriculteur", investor: "🏢 Investisseur", admin: "⚙️ Admin", agent: "🧑‍🌾 Superviseur" };

export default function MemberDetailPanel({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<"profil" | "activite" | "cotisation">("profil");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(1500);
  const [cashSaving, setCashSaving] = useState(false);
  const [cashDone, setCashDone] = useState(false);

  useEffect(() => { const u = subscribeToProfile(uid, setProfile); return () => u(); }, [uid]);
  useEffect(() => { const u = subscribeToParcelsByOwner(uid, setParcels); return () => u(); }, [uid]);
  useEffect(() => { const u = subscribeToUserCredits(uid, setCredits); return () => u(); }, [uid]);
  useEffect(() => { const u = subscribeToTransactionsByUser(uid, setTxs); return () => u(); }, [uid]);

  const applyPatch = async (patch: Partial<Profile>) => {
    setBusy(true);
    try { await updateProfile(uid, patch); } finally { setBusy(false); }
  };

  const recordCash = async () => {
    if (amount <= 0) return;
    setCashSaving(true);
    try {
      await recordContribution(uid, amount, "guarantee_fund", "Cotisation espèces — saisie par l'agent");
      setCashDone(true);
      setTimeout(() => setCashDone(false), 2000);
    } finally {
      setCashSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
        <Loader className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 truncate pr-2">{profile.fullName}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 p-4 pb-0">
          {(["profil", "activite", "cotisation"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize ${tab === t ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-600"}`}>
              {t === "profil" ? "Profil" : t === "activite" ? "Activité" : "Cotisation"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {tab === "profil" && (
            <>
              <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-stone-700"><Phone className="w-4 h-4 text-stone-400" /> {profile.phone}</div>
                <div className="flex items-center gap-2 text-sm text-stone-700"><Building2 className="w-4 h-4 text-stone-400" /> {profile.cooperativeId}</div>
                <div className="flex items-center gap-2 text-sm text-stone-700"><MapPin className="w-4 h-4 text-stone-400" /> {profile.village}, {profile.region}</div>
                <div className="text-sm text-stone-700">🌾 {profile.crops.join(" · ") || "—"}</div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-xs font-black text-stone-500 uppercase mb-2">Statut KYC — {KYC_LABELS[profile.kycStatus]}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["pending", "level1", "level2"] as const).map((k) => (
                    <button key={k} disabled={busy} onClick={() => applyPatch({ kycStatus: k })}
                      className={`py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${profile.kycStatus === k ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-600"}`}>
                      {KYC_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-xs font-black text-stone-500 uppercase mb-2">Rôle</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["farmer", "investor", "admin", "agent"] as const).map((r) => (
                    <button key={r} disabled={busy} onClick={() => applyPatch({ role: r })}
                      className={`py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${profile.role === r ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-600"}`}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={busy} onClick={() => applyPatch({ active: !profile.active })}
                className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                  profile.active ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                }`}>
                <Power className="w-4 h-4" /> {profile.active ? "Désactiver le compte" : "Réactiver le compte"}
              </button>
            </>
          )}

          {tab === "activite" && (
            <>
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-xs font-black text-stone-500 uppercase mb-2">Parcelles ({parcels.length})</div>
                {parcels.length === 0 && <div className="text-sm text-stone-400">Aucune parcelle enregistrée</div>}
                {parcels.map((p) => (
                  <div key={p.id} className="text-sm text-stone-700 py-1 flex justify-between">
                    <span>{p.name}</span><span className="text-stone-500">{p.hectares} ha</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-xs font-black text-stone-500 uppercase mb-2">Crédits ({credits.length})</div>
                {credits.length === 0 && <div className="text-sm text-stone-400">Aucun crédit</div>}
                {credits.map((c) => (
                  <div key={c.id} className="text-sm text-stone-700 py-1 flex justify-between">
                    <span>{c.requestedAmount.toLocaleString("fr-FR")} F</span><span className="text-stone-500">{c.status}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="text-xs font-black text-stone-500 uppercase mb-2">Transactions récentes</div>
                {txs.length === 0 && <div className="text-sm text-stone-400">Aucune transaction</div>}
                {txs.slice(0, 8).map((t) => (
                  <div key={t.id} className="text-sm text-stone-700 py-1 flex justify-between">
                    <span className="truncate pr-2">{t.label}</span><span className="text-stone-500 flex-shrink-0">{t.amount.toLocaleString("fr-FR")} F</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "cotisation" && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-stone-600"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Cotisation en espèces collectée en personne</div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setAmount((a) => Math.max(500, a - 500))} className="w-10 h-10 rounded-xl bg-stone-100 font-black">−</button>
                <div className="font-black text-xl text-stone-800">{amount.toLocaleString("fr-FR")} F</div>
                <button onClick={() => setAmount((a) => a + 500)} className="w-10 h-10 rounded-xl bg-stone-100 font-black">+</button>
              </div>
              <button onClick={recordCash} disabled={cashSaving}
                className={`w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-60 ${cashDone ? "bg-emerald-500" : "bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                {cashSaving ? <Loader className="w-4 h-4 animate-spin" /> : cashDone ? <CheckCircle2 className="w-4 h-4" /> : null}
                {cashDone ? "Cotisation enregistrée !" : "Enregistrer la cotisation"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
