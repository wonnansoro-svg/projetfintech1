import { useState } from "react";

export default function WavePaymentBanner({ amount, showLabel = true }: {
  amount?: number; showLabel?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-sky-400 to-blue-600 p-5 text-white shadow-xl">
      {showLabel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌊</span>
          <div className="font-black text-lg">Payez avec Wave</div>
        </div>
      )}
      {amount !== undefined && (
        <div className="bg-white/20 rounded-xl p-2 text-center mb-3">
          <div className="text-xs opacity-80">Montant à payer</div>
          <div className="font-black text-lg">{amount.toLocaleString("fr-FR")} F</div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
        {broken ? (
          <div className="text-center text-stone-500 text-xs py-6 px-3">
            QR Wave non configuré — ajoutez <code className="font-mono">wave-qr.png</code> dans <code className="font-mono">public/</code>.
          </div>
        ) : (
          <img src="/wave-qr.png" alt="QR Code Wave" className="w-full max-w-[220px]" onError={() => setBroken(true)} />
        )}
      </div>
    </div>
  );
}
