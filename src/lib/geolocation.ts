// Utilitaires pour géolocalisation et traçage de parcelles

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Boundary {
  type: "polygon" | "circle";
  points?: GeoPoint[]; // Pour polygon
  center?: GeoPoint;   // Pour circle
  radius?: number;     // Pour circle (en mètres)
}

export interface TrackedParcel {
  id: string;
  name: string;
  crop: string;
  hectares: number;
  boundary: Boundary;
  gpsPoints: { time: string; point: GeoPoint }[]; // Trace du parcours
  createdAt: string;
  updatedAt: string;
}

function describeGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Localisation refusée. Autorisez l'accès à la position dans les paramètres du navigateur pour ce site.";
    case err.POSITION_UNAVAILABLE:
      return "Signal GPS indisponible. Sortez à l'air libre, loin des bâtiments, et réessayez.";
    case err.TIMEOUT:
      return "La localisation prend trop de temps. Vérifiez que le GPS du téléphone est activé et réessayez.";
    default:
      return "Impossible d'obtenir la position GPS.";
  }
}

/**
 * Demande la géolocalisation du navigateur
 */
export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée par ce navigateur."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.error("Geo error:", err);
        reject(new Error(describeGeoError(err)));
      },
      { timeout: 25000, maximumAge: 30000, enableHighAccuracy: true }
    );
  });
}

/**
 * Observe les mouvements GPS pour tracer une parcelle.
 * `onError` est indispensable : sans lui, un refus de permission ou un
 * contexte non sécurisé (site servi en http:// plutôt que https://, où
 * l'API de géolocalisation est bloquée par le navigateur) laissait
 * auparavant le traçage bloqué en silence, sans jamais accumuler de points
 * — l'utilisateur restait bloqué avec le bouton "Enregistrer" grisé, sans
 * comprendre pourquoi.
 * Retourne une fonction d'arrêt.
 */
export function trackParcelBoundary(callback: (points: GeoPoint[]) => void, onError?: (message: string) => void): () => void {
  const points: GeoPoint[] = [];
  let watchId: number | null = null;

  if (!navigator.geolocation) {
    onError?.("Géolocalisation non disponible sur cet appareil/navigateur (vérifiez que le site est bien ouvert en https://).");
    return () => {};
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      points.push({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      callback(points);
    },
    (err) => {
      console.error("Watch error:", err);
      onError?.(describeGeoError(err));
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}

/**
 * Calcule la surface d'un polygone GPS (coordonnées lat/lng en degrés).
 *
 * BUG CORRIGÉ : l'ancienne formule multipliait l'aire en degré² par
 * (111/180)² ≈ 0,38 — une conversion sans fondement (confusion avec le
 * facteur radians↔degrés π/180, qui sert à convertir un ANGLE, pas une
 * distance). Le facteur correct est ~111,32 km PAR degré (pas divisé par
 * 180), au carré : ~12 393. Résultat concret de l'ancien bug : un champ de
 * 100m × 100m (1 hectare réel) ressortait à environ 0,00003 hectare — donc
 * systématiquement arrondi à 0.00 ha, ce qui bloquait aussi silencieusement
 * le bouton "Enregistrer" (qui exige hectares > 0).
 *
 * On projette chaque point en mètres locaux (plan tangent, précis pour la
 * petite échelle d'une parcelle agricole) avant d'appliquer Shoelace, avec
 * une correction cos(latitude) sur la longitude (un degré de longitude est
 * plus court qu'un degré de latitude, sauf à l'équateur).
 */
export function calculatePolygonArea(points: GeoPoint[]): number {
  if (points.length < 3) return 0;

  const KM_PER_DEGREE_LAT = 111.32;
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos((avgLat * Math.PI) / 180);

  const toMeters = (p: GeoPoint) => ({
    x: p.lng * kmPerDegreeLng * 1000,
    y: p.lat * KM_PER_DEGREE_LAT * 1000,
  });

  let areaM2 = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = toMeters(points[i]);
    const p2 = toMeters(points[(i + 1) % points.length]);
    areaM2 += p1.x * p2.y - p2.x * p1.y;
  }
  areaM2 = Math.abs(areaM2) / 2;

  return areaM2 / 1_000_000; // km² (appelant convertit ensuite en ha : * 100)
}

/**
 * Vérifie si un point est à l'intérieur d'un polygone (ray casting)
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  const { lat, lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: lat1, lng: lng1 } = polygon[i];
    const { lat: lat2, lng: lng2 } = polygon[j];

    const intersect =
      lng1 > lng !== lng2 > lng &&
      lat < ((lat2 - lat1) * (lng - lng1)) / (lng2 - lng1) + lat1;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calcule la distance entre deux points (Haversine)
 */
export function distance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371; // Rayon Terre en km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}
