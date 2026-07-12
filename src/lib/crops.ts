import type { Crop } from "../types/firestore";

export const CROPS: { key: Crop; label: string; emoji: string }[] = [
  { key: "maize", label: "Maïs", emoji: "🌽" },
  { key: "millet", label: "Mil", emoji: "🌾" },
  { key: "rice", label: "Riz", emoji: "🍚" },
  { key: "anacarde", label: "Anacarde", emoji: "🥜" },
  { key: "cacao", label: "Cacao", emoji: "🍫" },
  { key: "manioc", label: "Manioc", emoji: "🥔" },
  { key: "vivrier", label: "Vivrier", emoji: "🍠" },
  { key: "palmier", label: "Palmier", emoji: "🌴" },
  { key: "hevea", label: "Hévéa", emoji: "🌳" },
  { key: "autre", label: "Autre", emoji: "➕" },
];
