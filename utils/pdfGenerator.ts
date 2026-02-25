import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { InvoiceData, IssuerData } from "../types";

export const generateInvoicePDF = (data: InvoiceData, issuer: IssuerData | null, customId?: string) => {
  console.log("generateInvoicePDF started", { type: data.type, model: data.pdfModel });
  
  const doc = new jsPDF();
  const model = data.pdfModel || 'model1';
  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const isInvoice = data.type === 'invoice';
  const ivaAmount = isInvoice ? subtotal * (data.ivaPercentage / 100) : 0;
  const total = subtotal + ivaAmount;
  const invoiceId = customId || Math.floor(Math.random() * 10000).toString().padStart(5, '0');

  const titles: Record<string, string> = {
    invoice: "Factura",
    quote: "Cotización",
    receipt: "Recibo"
  };
  const title = titles[data.type] || "Documento";

  try {
    if (model === 'model2') {
      // --- MODEL 2 DESIGN (PREMIUM) ---
      
      // Top Decorations
      doc.setFillColor(251, 191, 36); // Amarillo (Franja - Base mayor)
      doc.triangle(0, 0, 140, 0, 0, 40, 'F');
      
      doc.setFillColor(44, 88, 200); // Azul (Esquina - Detalle)
      doc.triangle(0, 0, 80, 0, 0, 25, 'F');

      // Bottom Decorations
      doc.setFillColor(251, 191, 36); // Amarillo (Franja - Base mayor)
      doc.triangle(210, 297, 70, 297, 210, 257, 'F');
      
      doc.setFillColor(44, 88, 200); // Azul (Esquina - Detalle)
      doc.triangle(210, 297, 130, 297, 210, 272, 'F');

      // Logo (Top Right)
      if (issuer?.logo) {
        try {
          // Detect format from base64 or default to PNG
          const format = issuer.logo.includes('image/jpeg') || issuer.logo.includes('image/jpg') ? 'JPEG' : 'PNG';
          doc.addImage(issuer.logo, format, 150, 15, 40, 25);
        } catch (e) {
          console.error("Error adding logo:", e);
        }
      }

      // Company Info (Top Right)
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFont("helvetica", "bold");
      doc.text("Datos de la Empresa", 130, 45);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      if (issuer) {
        doc.text(String(issuer.name || ""), 130, 50);
        doc.text(`NIF: ${String(issuer.idNumber || "")}`, 130, 54);
        doc.text(String(issuer.email || ""), 130, 58);
        doc.text(String(issuer.phone || ""), 130, 62);
      }

      // Client Info (Top Left)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(data.type === 'invoice' ? "Datos del Cliente" : data.type === 'quote' ? "Datos del Solicitante" : "Datos del Pagador", 15, 45);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(String(data.customerName || ""), 15, 50);
      doc.text(String(data.address || ""), 15, 55);
      doc.text(`${String(data.postalCode || "")} ${String(issuer?.city || "")}`.trim(), 15, 60);
      doc.text(`ID/DNI: ${String(data.idNumber || "")}`, 15, 65);

      // Title and Meta
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 88, 200);
      doc.text(title, 15, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Número : ${invoiceId}`, 55, 80);
      doc.text(`Fecha : ${new Date().toLocaleDateString()}`, 130, 80);

      // Table
      const tableRows = data.items.map(item => [
        item.concept,
        `${(Number(item.amount) || 0).toFixed(2)}€`
      ]);

      autoTable(doc, {
        startY: 85,
        head: [['DESCRIPCIÓN', 'PRECIO']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [44, 88, 200], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
        columnStyles: {
          1: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: 15, right: 15 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const rightMargin = 195; // 210 - 15
      const totalBoxWidth = 80;
      const totalBoxX = rightMargin - totalBoxWidth;

      // Summary
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      
      if (isInvoice) {
        doc.setFont("helvetica", "bold");
        doc.text(`SUB TOTAL`, totalBoxX + 5, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(`${subtotal.toFixed(2)} €`, rightMargin, finalY, { align: 'right' });
        
        doc.setFont("helvetica", "bold");
        doc.text(`IVA ${data.ivaPercentage}%`, totalBoxX + 5, finalY + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`${ivaAmount.toFixed(2)}€`, rightMargin, finalY + 7, { align: 'right' });
        
        doc.setFillColor(44, 88, 200);
        doc.rect(totalBoxX, finalY + 12, totalBoxWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL`, totalBoxX + 5, finalY + 20);
        doc.text(`${total.toFixed(2)}€`, rightMargin - 5, finalY + 20, { align: 'right' });
      } else {
        doc.setFillColor(44, 88, 200);
        doc.rect(totalBoxX, finalY, totalBoxWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const totalLabel = data.type === 'quote' && data.includeIvaInQuote ? 'TOTAL (Precio más IVA)' : 'TOTAL';
        doc.text(totalLabel, totalBoxX + 5, finalY + 8);
        doc.text(`${total.toFixed(2)}€`, rightMargin - 5, finalY + 8, { align: 'right' });
      }

    } else {
      // --- MODEL 1 DESIGN (Existing) ---
      // Logo rendering
      if (issuer?.logo) {
        try {
          const format = issuer.logo.includes('image/jpeg') || issuer.logo.includes('image/jpg') ? 'JPEG' : 'PNG';
          doc.addImage(issuer.logo, format, 15, 10, 40, 40);
        } catch (e) {
          console.error("Error adding logo to PDF:", e);
        }
      }

      // Header
      doc.setFontSize(26);
      doc.setTextColor(44, 88, 200); // Nuevo Azul solicitado
      doc.text(title.toUpperCase(), 105, 30, { align: "center" });

      // Invoice Meta
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`Nº ${title.toLowerCase()}: ${invoiceId}`, 200, 15, { align: 'right' });
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 200, 20, { align: 'right' });

      // Columnas: Emisor vs Receptor
      let yPos = 60;
      
      // EMISOR (Tus datos)
      doc.setTextColor(40, 44, 52);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("EMISOR:", 15, yPos);
      doc.setFont("helvetica", "normal");
      if (issuer) {
        doc.text(String(issuer.name || "(Nombre no definido)"), 15, yPos + 6);
        doc.text(`CIF/DNI: ${String(issuer.idNumber || '---')}`, 15, yPos + 11);
        doc.text(String(issuer.address || '---'), 15, yPos + 16);
        doc.text(`${String(issuer.postalCode || '')} ${String(issuer.city || '')}`, 15, yPos + 21);
        doc.text(`Tel: ${String(issuer.phone || '---')}`, 15, yPos + 26);
      } else {
        doc.setTextColor(200, 0, 0);
        doc.text("(Datos del emisor no configurados)", 15, yPos + 6);
        doc.setTextColor(40, 44, 52);
      }

      // RECEPTOR (Cliente)
      doc.setFont("helvetica", "bold");
      doc.text(data.type === 'invoice' ? "CLIENTE:" : data.type === 'quote' ? "SOLICITANTE:" : "PAGADOR:", 110, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(String(data.customerName || ""), 110, yPos + 6);
      doc.text(`CIF/DNI: ${String(data.idNumber || '---')}`, 110, yPos + 11);
      doc.text(String(data.address || '---'), 110, yPos + 16);
      doc.text(`C.P.: ${String(data.postalCode || '---')}`, 110, yPos + 21);

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
        headStyles: { fillColor: [44, 88, 200], textColor: [255, 255, 255] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // Summary
      doc.setFontSize(10);
      const summaryX = 115; // Moved further left to avoid overlap
      
      if (isInvoice) {
        doc.text(`Subtotal:`, summaryX, finalY);
        doc.text(`${subtotal.toFixed(2)} €`, 195, finalY, { align: 'right' });
        
        doc.text(`IVA (${data.ivaPercentage}%):`, summaryX, finalY + 8);
        doc.text(`${ivaAmount.toFixed(2)} €`, 195, finalY + 8, { align: 'right' });
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 88, 200);
        doc.text(`TOTAL:`, summaryX, finalY + 20);
        doc.text(`${total.toFixed(2)} €`, 195, finalY + 20, { align: 'right' });
      } else {
        doc.setFontSize(12); // Reduced from 14
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 88, 200);
        const totalLabel = data.type === 'quote' && data.includeIvaInQuote ? 'TOTAL (Precio más IVA):' : 'TOTAL:';
        // Move label further left if it's the long one
        const labelX = totalLabel.includes('IVA') ? 90 : 115;
        doc.text(totalLabel, labelX, finalY);
        doc.text(`${total.toFixed(2)} €`, 195, finalY, { align: 'right' });
      }

      // Footer Legal
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`Este ${title.toLowerCase()} ha sido generado digitalmente.`, 105, 280, { align: "center" });
      doc.text("Gracias por su confianza.", 105, 285, { align: "center" });
    }

    // Save/Download
    const safeCustomerName = (data.customerName || 'Cliente').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeTitle = (title || 'Documento').normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    const filename = `${safeTitle}_${invoiceId}_${safeCustomerName}.pdf`;
    
    console.log("Saving PDF as:", filename);
    
    // Manual download method for better reliability in iframes
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("PDF download triggered.");
    return invoiceId;
  } catch (error) {
    console.error("Fatal error in generateInvoicePDF:", error);
    throw error;
  }
};
