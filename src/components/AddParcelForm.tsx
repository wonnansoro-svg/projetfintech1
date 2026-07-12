import { useState } from "react";
import { X, MapPin, Loader, CheckCircle2, AlertCircle, Route } from "lucide-react";
import { addParcel } from "../services/parcelService";
import { getCurrentLocation, trackParcelBoundary, calculatePolygonArea, type GeoPoint } from "../lib/geolocation";
import type { Crop } from "../types/firestore";

const CROPS: { key: Crop; label: string; emoji: string }[] = [
  { key: "maize", label: "Maïs", emoji: "🌽" },
  { key: "millet", label: "Mil", emoji: "🌾" },
  { key: "rice", label: "Riz", emoji: "🍚" },
  { key: "anacarde", label: "Anacarde", emoji: "🥜" },
  { key: "cacao", label: "Cacao", emoji: "🍫" },
  { key: "manioc", label: "Manioc", emoji: "🥔" },
];

export default function AddParcelForm({ ownerId, onClose, onDone }: {
  ownerId: string; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<Crop>("maize");
  const [hectares, setHectares] = useState("");
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [tracePoints, setTracePoints] = useState<GeoPoint[]>([]);
  const [stopTracking, setStopTracking] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const captureGps = async () => {
    setLocating(true);
    setGpsError("");
    try {
      const point = await getCurrentLocation();
      setGps(point);
    } catch {
      setGpsError("Impossible d'obtenir la position GPS. Vérifiez que la localisation est autorisée.");
    } finally {
      setLocating(false);
    }
  };

  const startTracing = () => {
    setTracePoints([]);
    setTracing(true);
    const stop = trackParcelBoundary((points) => setTracePoints([...points]));
    setStopTracking(() => stop);
  };

  const finishTracing = () => {
    stopTracking?.();
    setTracing(false);
    if (tracePoints.length >= 3) {
      const areaKm2 = calculatePolygonArea(tracePoints);
      const ha = areaKm2 * 100;
      setHectares(ha.toFixed(2));
      setGps(tracePoints[0]);
    }
  };

  const valid = name.trim().length > 0 && Number(hectares) > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      await addParcel({
        ownerId,
        name: name.trim(),
        crop,
        hectares: Number(hectares),
        gps,
        boundary: tracePoints.length >= 3 ? { type: "polygon", points: tracePoints } : null,
        gpsTrace: tracePoints.length >= 3 ? tracePoints.map((point) => ({ time: new Date().toISOString(), point })) : null,
      });
      onDone();
    } catch (err) {
      console.error("Erreur ajout parcelle :", err);
      setError("Impossible d'enregistrer la parcelle. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">🌾 Nouvelle parcelle</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Nom de la parcelle</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
              placeholder="Ex : Parcelle Nord" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Culture</label>
            <div className="grid grid-cols-3 gap-2">
              {CROPS.map((c) => (
                <button key={c.key} type="button" onClick={() => setCrop(c.key)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    crop === c.key ? "bg-green-600 text-white border-green-600" : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Surface (hectares)</label>
            <input type="number" min="0" step="0.1" value={hectares} onChange={(e) => setHectares(e.target.value)}
              className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
              placeholder="Ex : 1.2 (ou trace les limites ci-dessous)" />
          </div>

          <div className="bg-sky-50 rounded-xl p-3 border border-sky-100 space-y-2">
            <div className="flex items-center gap-2 text-sky-700 font-bold text-sm"><MapPin className="w-4 h-4" /> Position GPS</div>
            {gps ? (
              <div className="text-xs font-mono text-stone-700">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>
            ) : (
              <div className="text-xs text-stone-500">Aucune position capturée</div>
            )}
            {gpsError && <div className="text-xs text-red-600">{gpsError}</div>}
            <button type="button" onClick={captureGps} disabled={locating}
              className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60">
              {locating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              Capturer ma position actuelle
            </button>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm"><Route className="w-4 h-4" /> Tracer les limites (optionnel)</div>
            <div className="text-xs text-stone-500">
              {tracing ? `Traçage en cours… ${tracePoints.length} points enregistrés` : "Marchez le long du contour du champ pendant le traçage"}
            </div>
            {!tracing ? (
              <button type="button" onClick={startTracing}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">
                Démarrer le traçage
              </button>
            ) : (
              <button type="button" onClick={finishTracing}
                className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-bold text-xs">
                Terminer le traçage ({tracePoints.length} points)
              </button>
            )}
          </div>

          <button onClick={handleSubmit} disabled={!valid || saving}
            className="w-full py-4 rounded-2xl font-black text-white bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Enregistrer la parcelle
          </button>
        </div>
      </div>
    </div>
  );
}
