import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface PdfFarmerInfo {
  fullName: string;
  phone: string;
  village: string;
  region: string;
  cooperativeId: string;
}

export interface PdfDocumentData {
  title: string;
  subtitle?: string;
  farmer: PdfFarmerInfo;
  fields: { label: string; value: string }[];
  qrPayload?: string;
  footerNote?: string;
}

export async function buildQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, width: 240 });
}

export async function generateDocumentPdf(data: PdfDocumentData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 18;
  let y = 22;

  doc.setFillColor(22, 101, 52); // vert coopérative
  doc.rect(0, 0, 210, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(data.title, marginX, y);
  y += 7;

  if (data.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(data.subtitle, marginX, y);
    y += 6;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 210 - marginX, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Bénéficiaire", marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(60, 60, 60);
  const identityLines = [
    `Nom : ${data.farmer.fullName}`,
    `Téléphone : ${data.farmer.phone}`,
    `Coopérative : ${data.farmer.cooperativeId}`,
    `Localisation : ${data.farmer.village}, ${data.farmer.region}`,
  ];
  for (const line of identityLines) {
    doc.text(line, marginX, y);
    y += 5.5;
  }
  y += 4;

  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 210 - marginX, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Détails", marginX, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  for (const f of data.fields) {
    doc.setTextColor(120, 120, 120);
    doc.text(f.label, marginX, y);
    doc.setTextColor(30, 30, 30);
    doc.text(f.value, marginX + 60, y);
    y += 6.5;
  }
  y += 6;

  if (data.qrPayload) {
    const qrDataUrl = await buildQrDataUrl(data.qrPayload);
    const qrSize = 32;
    doc.addImage(qrDataUrl, "PNG", 210 - marginX - qrSize, y, qrSize, qrSize);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Scanner pour vérifier l'authenticité", 210 - marginX - qrSize, y + qrSize + 4);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} — validé par le bénéficiaire`, marginX, 285);
  if (data.footerNote) {
    doc.text(data.footerNote, marginX, 290);
  }

  return doc;
}

export async function downloadDocumentPdf(data: PdfDocumentData, filename: string): Promise<void> {
  const doc = await generateDocumentPdf(data);
  doc.save(filename);
}

export interface PdfTableData {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
}

/** Rapport tabulaire simple (liste de bénéficiaires, bons, cotisations...) — pagine automatiquement. */
export function generateTablePdf(data: PdfTableData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 14;
  const pageBottom = 280;
  const colWidth = (210 - marginX * 2) / data.columns.length;
  let y = 22;

  const drawHeader = () => {
    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, 210, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(data.title, marginX, y);
    y += 6;
    if (data.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(data.subtitle, marginX, y);
      y += 6;
    }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    data.columns.forEach((col, i) => doc.text(col, marginX + i * colWidth, y));
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(marginX, y, 210 - marginX, y);
    y += 6;
  };

  drawHeader();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  for (const row of data.rows) {
    if (y > pageBottom) {
      doc.addPage();
      y = 22;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
    }
    row.forEach((cell, i) => doc.text(cell, marginX + i * colWidth, y, { maxWidth: colWidth - 2 }));
    y += 6.5;
  }
  if (data.rows.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.text("Aucune donnée.", marginX, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, marginX, 290);

  return doc;
}

export function downloadTablePdf(data: PdfTableData, filename: string): void {
  generateTablePdf(data).save(filename);
}
