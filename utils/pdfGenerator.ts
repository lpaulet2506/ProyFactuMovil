
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { InvoiceData, IssuerData } from "../types";

export const generateInvoicePDF = (data: InvoiceData, issuer: IssuerData | null, customId?: string) => {
  const doc = new jsPDF();
  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const ivaAmount = subtotal * (data.ivaPercentage / 100);
  const total = subtotal + ivaAmount;
  const invoiceId = customId || Math.floor(Math.random() * 10000).toString().padStart(5, '0');

  // Header
  doc.setFontSize(24);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text("FACTURA", 105, 20, { align: "center" });

  // Invoice Meta
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Nº Factura: ${invoiceId}`, 200, 15, { align: 'right' });
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 200, 20, { align: 'right' });

  // Columnas: Emisor vs Receptor
  let yPos = 40;
  
  // EMISOR (Tus datos)
  doc.setTextColor(40, 44, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMISOR:", 15, yPos);
  doc.setFont("helvetica", "normal");
  if (issuer) {
    doc.text(issuer.name, 15, yPos + 6);
    doc.text(`CIF/DNI: ${issuer.idNumber}`, 15, yPos + 11);
    doc.text(issuer.address, 15, yPos + 16);
    doc.text(`${issuer.postalCode} ${issuer.city}`, 15, yPos + 21);
    doc.text(`Tel: ${issuer.phone}`, 15, yPos + 26);
  } else {
    doc.setTextColor(200, 0, 0);
    doc.text("(Datos del emisor no configurados)", 15, yPos + 6);
    doc.setTextColor(40, 44, 52);
  }

  // RECEPTOR (Cliente)
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 110, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, 110, yPos + 6);
  doc.text(`CIF/DNI: ${data.idNumber}`, 110, yPos + 11);
  doc.text(data.address, 110, yPos + 16);
  doc.text(`C.P.: ${data.postalCode}`, 110, yPos + 21);

  // Table
  const tableRows = data.items.map(item => [
    item.concept,
    `${(Number(item.amount) || 0).toFixed(2)} €`
  ]);

  autoTable(doc, {
    startY: yPos + 35,
    head: [['Descripción del Trabajo', 'Monto']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Summary
  doc.setFontSize(10);
  doc.text(`Subtotal:`, 140, finalY);
  doc.text(`${subtotal.toFixed(2)} €`, 195, finalY, { align: 'right' });
  
  doc.text(`IVA (${data.ivaPercentage}%):`, 140, finalY + 7);
  doc.text(`${ivaAmount.toFixed(2)} €`, 195, finalY + 7, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`TOTAL:`, 140, finalY + 18);
  doc.text(`${total.toFixed(2)} €`, 195, finalY + 18, { align: 'right' });

  // Footer Legal
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("Esta factura ha sido generada digitalmente.", 105, 280, { align: "center" });
  doc.text("Gracias por su confianza.", 105, 285, { align: "center" });

  // Save/Download
  doc.save(`Factura_${invoiceId}_${data.customerName.replace(/\s+/g, '_')}.pdf`);
  return invoiceId;
};
