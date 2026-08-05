import { useState } from "react";
import { X, MapPin, Loader, CheckCircle2, AlertCircle, Route } from "lucide-react";
import { addParcel } from "../services/parcelService";
import { getCurrentLocation, trackParcelBoundary, calculatePolygonArea, type GeoPoint } from "../lib/geolocation";
import { vibrate } from "../lib/haptics";
import { CROPS } from "../lib/crops";
import { useBackGuard } from "../lib/backGuard";
import type { Crop } from "../types/firestore";

export default function AddParcelForm({ ownerId, onClose, onDone }: {
  ownerId: string; onClose: () => void; onDone: () => void;
}) {
  useBackGuard(true, onClose);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState<Crop>("maize");
  const [hectares, setHectares] = useState<number | null>(null);
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [tracePoints, setTracePoints] = useState<GeoPoint[]>([]);
  const [stopTracking, setStopTracking] = useState<(() => void) | null>(null);
  const [traceError, setTraceError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const captureGps = async () => {
    setLocating(true);
    setGpsError("");
    try {
      const point = await getCurrentLocation();
      setGps(point);
      vibrate(15);
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : "Impossible d'obtenir la position GPS.");
    } finally {
      setLocating(false);
    }
  };

  const startTracing = () => {
    setTracePoints([]);
    setTraceError("");
    setHectares(null);
    setTracing(true);
    const stop = trackParcelBoundary((points) => setTracePoints([...points]));
    setStopTracking(() => stop);
  };

  const finishTracing = () => {
    stopTracking?.();
    setTracing(false);
    if (tracePoints.length < 3) {
      setTraceError("Tracé insuffisant (au moins 3 points requis). Recommencez en marchant tout le tour du champ.");
      return;
    }
    const areaKm2 = calculatePolygonArea(tracePoints);
    setHectares(Number((areaKm2 * 100).toFixed(2)));
    setGps(tracePoints[0]);
    vibrate([15, 60, 15]);
  };

  const valid = name.trim().length > 0 && hectares !== null && hectares > 0;

  const handleSubmit = async () => {
    if (!valid || hectares === null) return;
    setSaving(true);
    setError("");
    try {
      await addParcel({
        ownerId,
        name: name.trim(),
        crop,
        hectares,
        gps,
        boundary: { type: "polygon", points: tracePoints },
        gpsTrace: tracePoints.map((point) => ({ time: new Date().toISOString(), point })),
      });
      vibrate(15);
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
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800">🌾 Nouvelle parcelle</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
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
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm"><Route className="w-4 h-4" /> Tracer les limites du champ</div>
            <div className="text-xs text-stone-500">
              {tracing ? `Traçage en cours… ${tracePoints.length} points enregistrés` : "Obligatoire : marchez tout le tour du champ pour mesurer sa surface automatiquement."}
            </div>
            {traceError && <div className="text-xs text-red-600">{traceError}</div>}
            {hectares !== null && !tracing && (
              <div className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                <div className="text-[10px] text-emerald-600 font-semibold uppercase">Surface mesurée (calcul automatique, non modifiable)</div>
                <div className="text-lg font-black text-emerald-800">{hectares} ha</div>
              </div>
            )}
            {!tracing ? (
              <button type="button" onClick={startTracing}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs">
                {hectares !== null ? "Retracer les limites" : "Démarrer le traçage"}
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
