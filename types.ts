
export type DocumentType = 'invoice' | 'quote' | 'receipt';
export type PDFModel = 'model1' | 'model2';

export interface InvoiceItem {
  id: string;
  concept: string;
  amount: number;
}

export interface InvoiceData {
  type: DocumentType;
  pdfModel: PDFModel;
  customerName: string;
  idNumber: string;
  address: string;
  postalCode: string;
  items: InvoiceItem[];
  ivaPercentage: number;
  includeIvaInQuote?: boolean;
}

export interface IssuerData {
  name: string;
  idNumber: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  nextInvoiceNumber: string;
  logo?: string; // Base64 string of the company logo
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

export interface SavedInvoice extends InvoiceData {
  invoiceId: string;
  createdAt: string;
  total: number;
  issuer?: IssuerData;
  userId: string;
}
