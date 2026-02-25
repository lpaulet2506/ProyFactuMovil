
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
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        const user = await response.json();
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user as User;
      }
    } catch (err) {
      console.error("Login error:", err);
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

  updateUser: async (id: string, data: { email: string, password?: string }) => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Error al actualizar el usuario");
    }
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
    console.log("storage.saveIssuerData: Current user", user);
    if (!user) {
      console.error("No user found in session");
      return;
    }
    console.log(`Sending POST to /api/issuer/${user.id}`);
    const response = await fetch(`/api/issuer/${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Error saving issuer data:", error);
      throw new Error(error.error || "Error saving issuer data");
    }
    console.log("Issuer data saved successfully");
  },

  getIssuerData: async (): Promise<IssuerData | null> => {
    const user = storage.getCurrentUser();
    if (!user) return null;
    try {
      const response = await fetch(`/api/issuer/${user.id}`);
      if (!response.ok) {
        console.error("Failed to fetch issuer data");
        return null;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching issuer data:", err);
      return null;
    }
  }
};
