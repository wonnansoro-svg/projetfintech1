import { useEffect, useState } from "react";
import { X, Download, Loader, FileText } from "lucide-react";
import { buildQrDataUrl, downloadDocumentPdf, type PdfDocumentData } from "../lib/pdf";
import { useBackGuard } from "../lib/backGuard";

export default function DocumentPreviewModal({ data, filename, onClose, onValidated }: {
  data: PdfDocumentData; filename: string; onClose: () => void; onValidated?: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useBackGuard(true, onClose);

  useEffect(() => {
    if (!data.qrPayload) return;
    buildQrDataUrl(data.qrPayload).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [data.qrPayload]);

  const handleValidate = async () => {
    setDownloading(true);
    try {
      await downloadDocumentPdf(data, filename);
      onValidated?.();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-stone-100">
          <div className="font-black text-stone-800 flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> Prévisualisation</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Aperçu façon document imprimé */}
          <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50">
            <div className="text-lg font-black text-stone-900">{data.title}</div>
            {data.subtitle && <div className="text-sm text-stone-500 mb-3">{data.subtitle}</div>}
            <div className="h-px bg-stone-200 my-3" />
            <div className="text-xs font-black text-stone-500 uppercase mb-1">Bénéficiaire</div>
            <div className="text-sm text-stone-800 font-bold">{data.farmer.fullName}</div>
            <div className="text-xs text-stone-500">{data.farmer.phone} · {data.farmer.cooperativeId}</div>
            <div className="text-xs text-stone-500">{data.farmer.village}, {data.farmer.region}</div>
            <div className="h-px bg-stone-200 my-3" />
            <div className="text-xs font-black text-stone-500 uppercase mb-1">Détails</div>
            <div className="space-y-1">
              {data.fields.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-stone-500">{f.label}</span>
                  <span className="font-bold text-stone-800">{f.value}</span>
                </div>
              ))}
            </div>
            {qrDataUrl && (
              <div className="flex justify-end mt-4">
                <img src={qrDataUrl} alt="QR de vérification" className="w-20 h-20" />
              </div>
            )}
          </div>

          <p className="text-xs text-stone-500 mt-3">
            Vérifiez les informations ci-dessus. En validant, ce document sera téléchargé en PDF avec vos informations et le QR code de vérification.
          </p>

          <button onClick={handleValidate} disabled={downloading}
            className="mt-4 w-full py-4 rounded-2xl font-black text-white bg-gradient-to-br from-teal-600 to-cyan-600 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
            {downloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Valider et télécharger le PDF
          </button>
          <button onClick={onClose} className="mt-2 w-full py-3 rounded-2xl font-bold text-stone-600 bg-stone-100">
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}
