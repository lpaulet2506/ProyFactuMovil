
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
  login: (email: string, password: string): User | null => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...safeUser } = user;
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

  getAllUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  addUser: (user: User, initialIssuer?: Partial<IssuerData>) => {
    const users = storage.getAllUsers();
    if (users.some(u => u.email === user.email)) throw new Error("El usuario ya existe.");
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // If admin provided a logo or initial data, save it for the new user
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
        ...initialIssuer
      };
      localStorage.setItem(ISSUER_PREFIX + user.id, JSON.stringify(defaultIssuer));
    }

    emailService.sendWelcomeEmail(user.email);
  },

  deleteUser: (id: string) => {
    const users = storage.getAllUsers().filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(ISSUER_PREFIX + id);
  },

  saveInvoice: (invoice: SavedInvoice) => {
    const history = storage.getInvoices();
    const updated = [invoice, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },
  
  getInvoices: (): SavedInvoice[] => {
    const user = storage.getCurrentUser();
    if (!user) return [];
    const data = localStorage.getItem(HISTORY_KEY);
    const allInvoices: SavedInvoice[] = data ? JSON.parse(data) : [];
    return allInvoices.filter(inv => inv.userId === user.id);
  },

  deleteInvoice: (id: string) => {
    const data = localStorage.getItem(HISTORY_KEY);
    const allInvoices: SavedInvoice[] = data ? JSON.parse(data) : [];
    const updated = allInvoices.filter(inv => inv.invoiceId !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  saveIssuerData: (data: IssuerData) => {
    const user = storage.getCurrentUser();
    if (!user) return;
    try {
      localStorage.setItem(ISSUER_PREFIX + user.id, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving issuer data to localStorage:", e);
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        throw new Error("No hay espacio suficiente en el dispositivo para guardar el logo. Intenta con una imagen más pequeña.");
      }
      throw new Error("Error al guardar los datos de la empresa.");
    }
  },

  getIssuerData: (): IssuerData | null => {
    const user = storage.getCurrentUser();
    if (!user) return null;
    const data = localStorage.getItem(ISSUER_PREFIX + user.id);
    return data ? JSON.parse(data) : null;
  }
};
