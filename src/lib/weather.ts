// API Open-Meteo (gratuit, sans clé API, accessible hors-ligne en cache)
// Peut aussi utiliser OpenWeatherMap, Weatherstack, etc.

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  rainfall: number;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  rainProbability: number;
  rainfall: number;
  windSpeed: number;
  icon: string; // emoji représentant la météo
}

// Cache simple localStorage
const cacheKey = (lat: number, lng: number) => `weather_${lat.toFixed(3)}_${lng.toFixed(3)}`;

export async function getWeatherForecast(lat: number, lng: number): Promise<{
  current: WeatherData;
  forecast: ForecastDay[];
}> {
  // Vérifier le cache d'abord
  const cached = localStorage.getItem(cacheKey(lat, lng));
  if (cached) {
    const data = JSON.parse(cached);
    // Retourner si moins de 3h
    if (Date.now() - data.timestamp < 3 * 3600 * 1000) {
      return data.data;
    }
  }

  try {
    // Open-Meteo API (gratuit, très fiable)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,rain&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code,wind_speed_10m_max&timezone=Africa/Dakar&forecast_days=7`
    );

    if (!response.ok) throw new Error("Weather API error");
    const json = await response.json();

    // Parser le code météo WMO (https://en.wikipedia.org/wiki/Weather_code)
    const iconForCode = (code: number): string => {
      if ([0, 1].includes(code)) return "☀️"; // Clear, Mainly clear
      if ([2].includes(code)) return "🌤️"; // Partly cloudy
      if ([3].includes(code)) return "☁️"; // Overcast
      if ([45, 48].includes(code)) return "🌫️"; // Foggy
      if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️"; // Drizzle/Rain
      if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️"; // Snow
      if ([80, 81, 82].includes(code)) return "⛈️"; // Rain showers
      if ([95, 96, 99].includes(code)) return "⛈️"; // Thunderstorm
      return "🌦️";
    };

    const current: WeatherData = {
      temperature: Math.round(json.current.temperature_2m),
      humidity: json.current.relative_humidity_2m,
      windSpeed: Math.round(json.current.wind_speed_10m),
      rainProbability: 0,
      rainfall: json.current.rain || 0,
      description: iconForCode(json.current.weather_code),
    };

    const forecast: ForecastDay[] = json.daily.time.map((date: string, i: number) => ({
      date,
      tempMax: Math.round(json.daily.temperature_2m_max[i]),
      tempMin: Math.round(json.daily.temperature_2m_min[i]),
      rainProbability: json.daily.precipitation_probability_max[i] || 0,
      rainfall: json.daily.precipitation_sum[i] || 0,
      windSpeed: Math.round(json.daily.wind_speed_10m_max[i]),
      icon: iconForCode(json.daily.weather_code[i]),
    }));

    const result = { current, forecast };

    // Cacher
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify({
      timestamp: Date.now(),
      data: result,
    }));

    return result;
  } catch (error) {
    console.error("Weather fetch error:", error);
    // Pas de connexion : on retombe sur le dernier relevé connu (même ancien)
    // plutôt que d'inventer une météo. S'il n'y en a aucun, l'erreur remonte.
    if (cached) return (JSON.parse(cached) as { data: { current: WeatherData; forecast: ForecastDay[] } }).data;
    throw error instanceof Error ? error : new Error("Impossible de récupérer la météo.");
  }
}

// Conseil agricole simple basé sur météo
export function getAgriculturalAdvice(weather: WeatherData): {
  canPlant: boolean;
  canHarvest: boolean;
  warning: string | null;
} {
  const { rainProbability, temperature, windSpeed } = weather;

  const canPlant = temperature > 15 && temperature < 35 && rainProbability < 20;
  const canHarvest = rainProbability < 10 && temperature > 20;

  let warning: string | null = null;
  if (rainProbability > 70) warning = "Fortes pluies prévues — protège tes récoltes";
  if (temperature > 40) warning = "Canicule — arrose régulièrement";
  if (windSpeed > 30) warning = "Grands vents — attention aux plants jeunes";

  return { canPlant, canHarvest, warning };
}
