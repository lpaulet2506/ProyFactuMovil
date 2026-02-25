
import { SavedInvoice, IssuerData, User, UserRole } from "../types";

const HISTORY_KEY = 'factumovil_history';
const ISSUER_PREFIX = 'factumovil_issuer_';
const USERS_KEY = 'factumovil_users';
const SESSION_KEY = 'factumovil_session';

export const emailService = {
  sendWelcomeEmail: (email: string) => {
    console.log(`%c [BACKEND] Enviando correo de bienvenida a: ${email}`, 'color: #4f46e5; font-weight: bold;');
    console.log(`Asunto: ¡Bienvenido a FactuMovil!
    
Hola ${email},

Nos complace informarte que tu cuenta de empresa ha sido creada con éxito. 
Ya puedes empezar a generar tus facturas de forma profesional desde nuestra aplicación móvil.

Un cordial saludo,
El equipo de FactuMovil.`);
  },
  
  sendRecoveryEmail: (email: string) => {
    console.log(`%c [BACKEND] Enviando correo de recuperación a: ${email}`, 'color: #ef4444; font-weight: bold;');
    console.log(`Asunto: Recuperación de contraseña - FactuMovil
    
Estimado usuario,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta asociada a ${email}.
Por favor, haz clic en el siguiente enlace (simulado) para establecer una nueva clave:
https://factumovil.com/recovery?token=simulated_token_123

Si no has solicitado este cambio, puedes ignorar este mensaje.

Atentamente,
Soporte de FactuMovil.`);
  }
};

const seedAdmin = () => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (users.length === 0) {
    const admin: User = {
      id: 'admin-001',
      email: 'admin@factumovil.com',
      password: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([admin]));
  }
};

seedAdmin();

export const storage = {
  login: async (email: string, password: string): Promise<User | null> => {
    const response = await fetch('/api/users');
    const users: User[] = await response.json();
    // In a real app, we'd have a proper login endpoint, but for now we'll simulate it
    const user = users.find(u => u.email === email && (u as any).password === password);
    if (user) {
      const { password: _, ...safeUser } = user as any;
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
      return safeUser as User;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await fetch('/api/users');
    return response.json();
  },

  addUser: async (user: User, initialIssuer?: Partial<IssuerData>) => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    
    if (initialIssuer) {
      const defaultIssuer: IssuerData = {
        name: '',
        idNumber: '',
        address: '',
        postalCode: '',
        city: '',
        phone: '',
        email: user.email,
        nextInvoiceNumber: '0001',
        nextQuoteNumber: '0001',
        nextReceiptNumber: '0001',
        ...initialIssuer
      };
      await fetch(`/api/issuer/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultIssuer)
      });
    }

    emailService.sendWelcomeEmail(user.email);
  },

  deleteUser: async (id: string) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
  },

  saveInvoice: async (invoice: SavedInvoice) => {
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...invoice, userId: invoice.userId })
    });
  },
  
  getInvoices: async (): Promise<SavedInvoice[]> => {
    const user = storage.getCurrentUser();
    if (!user) return [];
    const response = await fetch(`/api/invoices/${user.id}`);
    return response.json();
  },

  deleteInvoice: async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
  },

  saveIssuerData: async (data: IssuerData) => {
    const user = storage.getCurrentUser();
    if (!user) return;
    await fetch(`/api/issuer/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  getIssuerData: async (): Promise<IssuerData | null> => {
    const user = storage.getCurrentUser();
    if (!user) return null;
    const response = await fetch(`/api/issuer/${user.id}`);
    return response.json();
  }
};
