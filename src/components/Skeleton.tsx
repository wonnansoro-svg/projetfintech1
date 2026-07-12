export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-200 rounded-lg ${className}`} />;
}

/** Squelette de chargement pour une liste de cartes (parcelles, membres, transactions...). */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-stone-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-3.5 w-2/3" />
            <SkeletonLine className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
