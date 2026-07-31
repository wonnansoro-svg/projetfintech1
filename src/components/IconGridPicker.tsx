/**
 * Grille de gros boutons icône + libellé — remplace les `<select>`/champs
 * texte pour les utilisateurs qui ne lisent pas facilement : la sélection
 * se fait par reconnaissance visuelle, pas par lecture d'une liste.
 */
export default function IconGridPicker<T extends string>({ options, value, onChange, columns = 3 }: {
  options: { value: T; emoji: string; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 border-2 transition-colors ${
              selected ? "bg-emerald-50 border-emerald-500" : "bg-stone-50 border-stone-200"
            }`}>
            <span className="text-3xl leading-none">{opt.emoji}</span>
            <span className={`text-xs font-bold text-center leading-tight ${selected ? "text-emerald-700" : "text-stone-600"}`}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
