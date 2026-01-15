
export interface InvoiceItem {
  id: string;
  concept: string;
  amount: number;
}

export interface InvoiceData {
  customerName: string;
  idNumber: string;
  address: string;
  postalCode: string;
  items: InvoiceItem[];
  ivaPercentage: number;
}

export interface IssuerData {
  name: string;
  idNumber: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  nextInvoiceNumber: string; // New field for series control
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
  userId: string; // Multi-tenant support
}
