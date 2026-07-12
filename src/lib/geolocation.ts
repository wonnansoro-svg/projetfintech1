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
 * Observe les mouvements GPS pour tracer une parcelle
 * Retourne une fonction d'arrêt
 */
export function trackParcelBoundary(callback: (points: GeoPoint[]) => void): () => void {
  const points: GeoPoint[] = [];
  let watchId: number | null = null;

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        points.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        callback(points);
      },
      (err) => console.error("Watch error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}

/**
 * Calcule la surface d'un polygone (coordonnées lat/lng)
 * Utilise la formule de Shoelace
 */
export function calculatePolygonArea(points: GeoPoint[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += (p1.lng * p2.lat - p2.lng * p1.lat);
  }

  area = Math.abs(area) / 2;

  // Conversion lat/lng à km² (approximation)
  // À l'équateur : 1° ≈ 111 km
  const latInKm = 111;

  const areaKm2 = area * ((latInKm / 180) ** 2);
  return areaKm2; // retourner en ha : * 100
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
