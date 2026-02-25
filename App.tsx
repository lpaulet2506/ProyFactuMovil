
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Download, Receipt, History, FilePlus2, Building2, Save, LogOut, ShieldCheck, UserPlus, User as UserIcon, Mail, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import Input from './components/Input';
import { InvoiceData, InvoiceItem, SavedInvoice, IssuerData, User } from './types';
import { generateInvoicePDF } from './utils/pdfGenerator';
import { storage, emailService } from './services/storage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'settings' | 'admin'>('create');
  const [history, setHistory] = useState<SavedInvoice[]>([]);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  const initialInvoiceState: InvoiceData = {
    type: 'invoice',
    pdfModel: 'model1',
    customerName: '',
    idNumber: '',
    address: '',
    postalCode: '',
    items: [{ id: crypto.randomUUID(), concept: '', amount: 0 }],
    ivaPercentage: 21,
    includeIvaInQuote: false,
  };

  const [data, setData] = useState<InvoiceData>(initialInvoiceState);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const [issuer, setIssuer] = useState<IssuerData>({
    name: '',
    idNumber: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    nextInvoiceNumber: '0001',
    nextQuoteNumber: '0001',
    nextReceiptNumber: '0001',
    logo: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    role: 'user' as const,
    logo: ''
  });
  const [profileForm, setProfileForm] = useState({
    email: currentUser?.email || '',
    password: ''
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({ email: currentUser.email, password: '' });
    }
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser) {
        console.log("Loading data for user:", currentUser.id);
        try {
          const invoices = await storage.getInvoices();
          console.log("Invoices loaded:", invoices.length);
          setHistory(Array.isArray(invoices) ? invoices : []);

          const savedIssuer = await storage.getIssuerData();
          console.log("Issuer data loaded:", savedIssuer ? "YES" : "NO");
          if (savedIssuer) {
            setIssuer(savedIssuer);
          }

          if (currentUser.role === 'admin') {
            const users = await storage.getAllUsers();
            setAllUsers(Array.isArray(users) ? users : []);
          }
        } catch (err) {
          console.error("Error loading data:", err);
        }
      }
    };
    loadData();
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { // 500KB limit for localStorage safety
        alert("El logo es demasiado grande. Por favor, usa una imagen menor a 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const user = await storage.login(loginForm.email, loginForm.password);
    if (user) {
      setCurrentUser(user);
    } else {
      setLoginError("Email o contraseña incorrectos.");
    }
  };

  const handleLogout = () => {
    storage.logout();
    setCurrentUser(null);
    setActiveTab('create');
  };

  const handleRecoverPassword = () => {
    if (!loginForm.email) {
      alert("Por favor, introduce tu correo electrónico primero.");
      return;
    }
    emailService.sendRecoveryEmail(loginForm.email);
    alert(`Se ha enviado un correo de recuperación a: ${loginForm.email}`);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await storage.updateUser(currentUser.id, {
        email: profileForm.email,
        password: profileForm.password || undefined
      });
      const updatedUser = { ...currentUser, email: profileForm.email };
      setCurrentUser(updatedUser);
      localStorage.setItem('factumovil_session', JSON.stringify(updatedUser));
      alert("Perfil actualizado correctamente. Si cambiaste la contraseña, úsala en tu próximo inicio de sesión.");
      setProfileForm(p => ({ ...p, password: '' }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.email || (!editingUserId && !newUserForm.password)) {
      alert("Completa todos los campos obligatorios.");
      return;
    }
    try {
      if (editingUserId) {
        await storage.updateUser(editingUserId, {
          email: newUserForm.email,
          password: newUserForm.password || undefined,
          role: newUserForm.role
        });
        alert("Usuario actualizado con éxito.");
      } else {
        await storage.addUser({
          id: crypto.randomUUID(),
          email: newUserForm.email,
          password: newUserForm.password,
          role: newUserForm.role,
          createdAt: new Date().toISOString()
        }, {
          logo: newUserForm.logo
        });
        alert("Empresa creada con éxito.");
      }
      setEditingUserId(null);
      setNewUserForm({ email: '', password: '', role: 'user', logo: '' });
      const users = await storage.getAllUsers();
      setAllUsers(users);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleInputChange = (field: keyof InvoiceData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleIssuerChange = (field: keyof IssuerData, value: any) => {
    setIssuer(prev => ({ ...prev, [field]: value }));
  };

  const saveIssuerSettings = async () => {
    console.log("Saving issuer settings...", issuer);
    const missing = [];
    if (!issuer.name?.trim()) missing.push("Razón Social");
    if (!issuer.idNumber?.trim()) missing.push("CIF/DNI");
    if (!issuer.email?.trim()) missing.push("Email");

    if (missing.length > 0) {
      alert(`Por favor, complete los datos obligatorios de la empresa: \n- ${missing.join("\n- ")}`);
      return;
    }

    try {
      console.log("Calling storage.saveIssuerData...");
      await storage.saveIssuerData(issuer);
      console.log("Issuer data saved successfully in storage");
      alert("Datos de empresa actualizados correctamente.");
    } catch (err: any) {
      console.error("Error in saveIssuerSettings:", err);
      alert(err.message);
    }
  };

  const resetForm = useCallback((type: 'invoice' | 'quote' | 'receipt' = 'invoice') => {
    setData({ ...initialInvoiceState, type, pdfModel: data.pdfModel }); // Keep current model preference
    setShowTypeSelector(false);
    if (activeTab !== 'create') setActiveTab('create');
  }, [activeTab, data.pdfModel]);

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), concept: '', amount: 0 }]
    }));
  };

  const removeItem = (id: string) => {
    if (data.items.length === 1) return;
    setData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const calculateSubtotal = () => data.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const subtotal = calculateSubtotal();
  const isInvoice = data.type === 'invoice';
  const ivaAmount = isInvoice ? subtotal * (data.ivaPercentage / 100) : 0;
  const total = subtotal + ivaAmount;

  const handleGenerate = async () => {
    console.log("handleGenerate called", { customerName: data.customerName, type: data.type });
    setShowValidationErrors(true);

    const missingFields: string[] = [];
    if (!data.customerName?.trim()) missingFields.push("Nombre del Cliente");

    if (data.type === 'quote') {
      if (!data.address?.trim()) missingFields.push("Dirección");
    } else {
      if (!data.idNumber?.trim()) missingFields.push("CIF/DNI del Cliente");
      if (!data.address?.trim()) missingFields.push("Dirección del Cliente");
      if (!data.postalCode?.trim()) missingFields.push("Código Postal del Cliente");
    }

    if (missingFields.length > 0) {
      alert(`Por favor, complete los siguientes campos obligatorios: \n- ${missingFields.join("\n- ")}`);
      return;
    }

    const hasValidItems = data.items.some(item => (item.concept || '').trim() !== '' && (Number(item.amount) || 0) > 0);
    if (!hasValidItems) {
      alert("Debe registrar al menos una línea con descripción y precio mayor a 0.");
      return;
    }

    if (!currentUser) {
      console.error("No current user found");
      return;
    }

    if (!issuer || !issuer.name?.trim()) {
      alert("Primero debe configurar los datos de su empresa en la pestaña de Configuración.");
      setActiveTab('settings');
      return;
    }

    const seriesNumber = data.type === 'invoice'
      ? issuer.nextInvoiceNumber
      : data.type === 'quote'
        ? issuer.nextQuoteNumber
        : issuer.nextReceiptNumber;

    setIsGenerating(true);

    try {
      console.log("Invoking generateInvoicePDF...");
      const docTypePrefix = data.type === 'invoice' ? 'F' : data.type === 'quote' ? 'C' : 'R';
      const fullInvoiceId = `${docTypePrefix}-${seriesNumber || '0001'}`;

      const invoiceId = generateInvoicePDF(data, issuer, fullInvoiceId);
      console.log("PDF generation successful, ID:", invoiceId);

      const savedInvoice: SavedInvoice = {
        ...data,
        invoiceId: invoiceId,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        total: total,
        issuer: issuer
      };

      console.log("Saving invoice to storage...");
      await storage.saveInvoice(savedInvoice);
      setHistory(prev => [savedInvoice, ...(Array.isArray(prev) ? prev : [])]);

      const nextNum = (parseInt(seriesNumber || '0001') + 1).toString().padStart(4, '0');
      const updatedIssuer = { ...issuer };
      if (data.type === 'invoice') updatedIssuer.nextInvoiceNumber = nextNum;
      else if (data.type === 'quote') updatedIssuer.nextQuoteNumber = nextNum;
      else if (data.type === 'receipt') updatedIssuer.nextReceiptNumber = nextNum;

      setIssuer(updatedIssuer);
      await storage.saveIssuerData(updatedIssuer);

      const docType = data.type === 'invoice' ? 'Factura' : data.type === 'quote' ? 'Cotización' : 'Recibo';
      alert(`${docType} ${seriesNumber} generada correctamente.`);
      setShowValidationErrors(false);
    } catch (err) {
      console.error("Critical error in handleGenerate:", err);
      alert(`Error crítico al generar el documento: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta factura?")) {
      await storage.deleteInvoice(id);
      const invoices = await storage.getInvoices();
      setHistory(Array.isArray(invoices) ? invoices : []);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md animate-in">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl rotate-3">
              <Receipt size={44} />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-indigo-950 tracking-tight">FactuMovil</h1>
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-widest mt-1">Gestión Empresarial</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <Input
              label="Email de la Empresa"
              type="email"
              placeholder="correo@empresa.com"
              value={loginForm.email}
              onChange={(e) => {
                setLoginForm(p => ({ ...p, email: e.target.value }));
                if (loginError) setLoginError(null);
              }}
            />
            <div className="flex flex-col gap-1">
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => {
                  setLoginForm(p => ({ ...p, password: e.target.value }));
                  if (loginError) setLoginError(null);
                }}
              />
              <button
                type="button"
                onClick={handleRecoverPassword}
                className="text-right text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-2 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold animate-in">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all mt-2"
            >
              Entrar al Panel
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full text-gray-300 text-[10px] font-black uppercase tracking-widest text-center mt-4 border-t border-gray-50 pt-4"
            >
              Limpiar Sesión y Reintentar
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Acceso Restringido</p>
          </div>
        </div>
      </div>
    );
  }

  const renderAdmin = () => (
    <div className="flex flex-col gap-8 animate-in">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-indigo-950">Administración</h2>
        </div>

        <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={18} className="text-indigo-500" />
            <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider">
              {editingUserId ? 'Editar Empresa' : 'Alta de Nueva Empresa'}
            </h3>
          </div>

          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
              {newUserForm.logo ? (
                <>
                  <img src={newUserForm.logo} className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setNewUserForm(p => ({ ...p, logo: '' }))}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <X size={20} />
                  </button>
                </>
              ) : (
                <ImageIcon className="text-gray-300" size={32} />
              )}
            </div>
            <label className="text-[10px] font-black uppercase text-indigo-600 cursor-pointer bg-indigo-50 px-3 py-1 rounded-full">
              {editingUserId ? 'Subir Nuevo Logo' : 'Cargar Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, (base64) => setNewUserForm(p => ({ ...p, logo: base64 })))}
              />
            </label>
          </div>

          <Input
            label="Email del Usuario"
            type="email"
            placeholder="usuario@nuevaempresa.com"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm(p => ({ ...p, email: e.target.value }))}
          />
          <Input
            label={editingUserId ? "Nueva Contraseña (opcional)" : "Contraseña Temporal"}
            type="password"
            placeholder={editingUserId ? "Dejar en blanco para no cambiar" : "Clave123"}
            value={newUserForm.password}
            onChange={(e) => setNewUserForm(p => ({ ...p, password: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Permisos</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              value={newUserForm.role}
              onChange={(e) => setNewUserForm(p => ({ ...p, role: e.target.value as any }))}
            >
              <option value="user">Usuario Estándar (Empresa)</option>
              <option value="admin">Administrador del Sistema</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors">
              {editingUserId ? 'Actualizar Usuario' : 'Crear y Notificar'}
            </button>
            {editingUserId && (
              <button
                type="button"
                onClick={() => {
                  setEditingUserId(null);
                  setNewUserForm({ email: '', password: '', role: 'user', logo: '' });
                }}
                className="bg-gray-100 text-gray-600 px-6 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-bold text-gray-400 px-2 leading-tight uppercase">Toca un usuario o empresa para cargar sus datos y editar su acceso.</p>
          <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider px-2">Listado de Usuarios ({allUsers.length})</h3>
          {allUsers.map(u => (
            <div
              key={u.id}
              className={`bg-white p-5 rounded-2xl border ${editingUserId === u.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100'} flex justify-between items-center shadow-sm cursor-pointer hover:border-indigo-300 transition-all`}
              onClick={() => {
                setEditingUserId(u.id);
                setNewUserForm({
                  email: u.email,
                  password: '',
                  role: u.role as 'admin' | 'user',
                  logo: ''
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                  {u.role === 'admin' ? <ShieldCheck size={20} /> : <UserIcon size={20} />}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{u.email}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {u.id.slice(0, 8)} • {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {u.id !== currentUser.id && (
                <button onClick={async () => {
                  if (confirm("¿Borrar usuario?")) {
                    await storage.deleteUser(u.id);
                    const users = await storage.getAllUsers();
                    setAllUsers(users);
                  }
                }} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={20} /></button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col gap-8 animate-in">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Perfil de Usuario</h2>
        </div>
        <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserIcon size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Datos de Sesión</p>
            <p className="text-xl font-black mt-1 break-all">{currentUser.email}</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black uppercase">{currentUser.role}</span>
              <span className="text-[10px] text-indigo-200 font-bold">Registro: {new Date(currentUser.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Configuración de Emisor</h2>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 border-b border-gray-50 pb-6">
            <div className="w-24 h-24 rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
              {issuer.logo ? (
                <>
                  <img src={issuer.logo} className="w-full h-full object-contain" />
                  <button
                    onClick={() => setIssuer(p => ({ ...p, logo: '' }))}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <Trash2 size={24} />
                  </button>
                </>
              ) : (
                <ImageIcon className="text-gray-300" size={40} />
              )}
            </div>
            <label className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer active:scale-95 transition-all">
              <ImageIcon size={16} /> {issuer.logo ? 'Cambiar Logo' : 'Subir Logo Empresa'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, (base64) => handleIssuerChange('logo', base64))}
              />
            </label>
            <p className="text-[9px] text-gray-400 font-bold uppercase text-center">Formato PNG o JPG (Máx. 500KB)</p>
          </div>

          <div className="grid gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-indigo-500" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Numeración de Documentación</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <Input
                  label="Factura"
                  placeholder="0001"
                  value={issuer.nextInvoiceNumber}
                  onChange={(e) => handleIssuerChange('nextInvoiceNumber', e.target.value)}
                />
                <Input
                  label="Cotización"
                  placeholder="0001"
                  value={issuer.nextQuoteNumber}
                  onChange={(e) => handleIssuerChange('nextQuoteNumber', e.target.value)}
                />
                <Input
                  label="Recibo"
                  placeholder="0001"
                  value={issuer.nextReceiptNumber}
                  onChange={(e) => handleIssuerChange('nextReceiptNumber', e.target.value)}
                />
              </div>
            </div>

            <Input label="Razón Social" value={issuer.name} onChange={(e) => handleIssuerChange('name', e.target.value)} />
            <Input label="CIF / DNI" value={issuer.idNumber} onChange={(e) => handleIssuerChange('idNumber', e.target.value)} />
            <Input label="Dirección Fiscal" value={issuer.address} onChange={(e) => handleIssuerChange('address', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="C. Postal" value={issuer.postalCode} onChange={(e) => handleIssuerChange('postalCode', e.target.value)} />
              <Input label="Ciudad" value={issuer.city} onChange={(e) => handleIssuerChange('city', e.target.value)} />
            </div>
            <Input label="Teléfono" type="tel" value={issuer.phone} onChange={(e) => handleIssuerChange('phone', e.target.value)} />
            <Input label="Email de Factura" type="email" value={issuer.email} onChange={(e) => handleIssuerChange('email', e.target.value)} />

            <button
              onClick={saveIssuerSettings}
              className="w-full bg-indigo-600 text-white flex items-center justify-center gap-2 py-4 rounded-2xl font-bold mt-2 shadow-lg active:scale-95 transition-all"
            >
              <Save size={20} /> Guardar Datos
            </button>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest py-6 border-t border-gray-100 mt-2">
          <LogOut size={18} /> Salir de la Aplicación
        </button>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-indigo-600 text-white p-6 sticky top-0 z-10 shadow-xl rounded-b-[2.5rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              <Receipt size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">FactuMovil</h1>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">
                {activeTab === 'create' ? (data.type === 'invoice' ? 'Factura' : data.type === 'quote' ? 'Cotización' : 'Recibo') : activeTab === 'history' ? 'Historial' : activeTab === 'settings' ? 'Perfil' : 'Admin'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-200"
              title="Cerrar Sesión"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 py-8 flex flex-col max-w-lg mx-auto w-full pb-40">
        {activeTab === 'create' && (
          <div className="flex flex-col gap-8 animate-in">
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    {data.type === 'invoice' ? 'Cliente' : data.type === 'quote' ? 'Solicitante' : 'Pagador'}
                  </h2>
                </div>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                  {data.type === 'invoice' ? 'F' : data.type === 'quote' ? 'C' : 'R'}-2025-{issuer.nextInvoiceNumber || '0001'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Nombre o Razón Social"
                  placeholder="Empresa Cliente S.L."
                  value={data.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  required={true}
                  error={showValidationErrors && !(data.customerName || '').trim()}
                />
                <Input
                  label="CIF / DNI"
                  placeholder="00000000X"
                  value={data.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  required={data.type !== 'quote'}
                  error={showValidationErrors && data.type !== 'quote' && !(data.idNumber || '').trim()}
                />
                <Input
                  label="Dirección"
                  placeholder="Av. Principal 45"
                  value={data.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required={true}
                  error={showValidationErrors && !(data.address || '').trim()}
                />
                <Input
                  label="C. Postal"
                  placeholder="28001"
                  value={data.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  required={data.type !== 'quote'}
                  error={showValidationErrors && data.type !== 'quote' && !(data.postalCode || '').trim()}
                />
              </div>
              {data.type === 'quote' && (
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mt-2">
                  <input
                    type="checkbox"
                    id="plusIva"
                    checked={data.includeIvaInQuote}
                    onChange={(e) => handleInputChange('includeIvaInQuote', e.target.checked)}
                    className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="plusIva" className="text-sm font-bold text-gray-700 cursor-pointer">
                    Incluir frase "Precio más IVA"
                  </label>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Líneas de Factura</h2>
                </div>
              </div>
              {data.items.map((item, index) => (
                <div key={item.id} className="relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <div className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-lg">{index + 1}</div>
                  {data.items.length > 1 && <button onClick={() => removeItem(item.id)} className="absolute top-4 right-4 text-gray-200 hover:text-red-400"><Trash2 size={20} /></button>}
                  <Input
                    label="Descripción del Trabajo"
                    placeholder="Servicios realizados..."
                    value={item.concept}
                    onChange={(e) => handleItemChange(item.id, 'concept', e.target.value)}
                    required={true}
                    error={showValidationErrors && !(item.concept || '').trim()}
                  />
                  <Input
                    label="Precio (€)"
                    type="number"
                    placeholder="0.00"
                    value={item.amount || ''}
                    onChange={(e) => handleItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                    required={true}
                    error={showValidationErrors && (Number(item.amount) || 0) <= 0}
                  />
                </div>
              ))}
              <button onClick={addItem} className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-indigo-100 rounded-3xl text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors">
                <Plus size={18} /> Añadir Línea
              </button>
            </section>

            <section className="bg-indigo-950 text-white p-7 rounded-[2.5rem] shadow-2xl flex flex-col gap-3">
              <div className="flex flex-col gap-2 mb-4 border-b border-indigo-900 pb-4">
                <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Modelo de Diseño</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInputChange('pdfModel', 'model1')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${data.pdfModel === 'model1' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/50 text-indigo-400'}`}
                  >
                    Modelo 1 (Clásico)
                  </button>
                  <button
                    onClick={() => handleInputChange('pdfModel', 'model2')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${data.pdfModel === 'model2' ? 'bg-indigo-600 text-white' : 'bg-indigo-900/50 text-indigo-400'}`}
                  >
                    Modelo 2 (Moderno)
                  </button>
                </div>
              </div>

              {isInvoice && (
                <>
                  <div className="flex justify-between items-center text-xs text-indigo-300 font-bold uppercase tracking-widest"><span>Base Imponible</span><span>{subtotal.toFixed(2)} €</span></div>
                  <div className="flex justify-between items-center text-xs text-indigo-300 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <span>IVA (%)</span>
                      <input type="number" className="bg-indigo-900 border border-indigo-800 rounded px-2 py-0.5 w-14 text-right text-white font-black" value={data.ivaPercentage} onChange={(e) => handleInputChange('ivaPercentage', parseFloat(e.target.value) || 0)} />
                    </div>
                    <span>{ivaAmount.toFixed(2)} €</span>
                  </div>
                </>
              )}
              <div className="flex flex-col gap-3 pt-3 border-t border-indigo-900">
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                  {isInvoice ? 'Total Factura' : data.type === 'quote' ? 'Total Cotización' : 'Total Recibo'}
                </span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black text-indigo-400">
                    {total >= 100000 ? Math.floor(total).toLocaleString() : total.toFixed(2)}
                  </span>
                  <span className="text-lg font-bold text-indigo-500">€</span>
                </div>
              </div>
            </section>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 animate-in">
            <div className="flex items-center gap-2 mb-2 px-2">
              <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Registro de Facturas</h2>
            </div>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300 gap-4">
                <Mail size={48} className="opacity-20" />
                <p className="font-bold text-sm">Sin historial de emisiones</p>
              </div>
            ) : history.map(inv => (
              <div key={inv.invoiceId} className="bg-white p-5 rounded-3xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${inv.type === 'invoice' ? 'bg-blue-100 text-blue-600' : inv.type === 'quote' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {inv.type === 'invoice' ? 'Factura' : inv.type === 'quote' ? 'Cotización' : 'Recibo'}
                    </span>
                    <h3 className="font-bold text-gray-800">{inv.customerName}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-black uppercase mt-1">
                    <span className="text-indigo-600 font-mono">#{inv.invoiceId}</span>
                    <span>•</span>
                    <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xl font-black text-indigo-600 mt-2">{inv.total.toFixed(2)}€</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => generateInvoicePDF(inv, inv.issuer || null, inv.invoiceId)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100"><Download size={20} /></button>
                  </div>
                  <button onClick={() => handleDeleteHistory(inv.invoiceId)} className="p-3 text-gray-300 hover:text-red-500"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'admin' && currentUser.role === 'admin' && renderAdmin()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 flex flex-col items-center">
        {activeTab === 'create' && (
          <div className="w-full px-5 mb-4 max-w-lg">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-3xl font-black shadow-2xl transition-all active:scale-95 ${isGenerating ? 'bg-gray-400 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
              {isGenerating ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center gap-3">
                  <Download size={20} />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] uppercase opacity-80 tracking-widest">Descargar Documento</span>
                    <span className="text-sm uppercase tracking-tight">
                      {data.type === 'invoice' ? 'Factura' : data.type === 'quote' ? 'Cotización' : 'Recibo'} #
                      {data.type === 'invoice' ? issuer.nextInvoiceNumber : data.type === 'quote' ? issuer.nextQuoteNumber : issuer.nextReceiptNumber}
                    </span>
                  </div>
                </div>
              )}
            </button>
          </div>
        )}

        <footer className="w-full bg-white/90 backdrop-blur-2xl border-t border-gray-100 flex items-center justify-around py-5 px-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] relative">
          {showTypeSelector && (
            <div className="absolute bottom-full mb-4 left-5 right-5 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 flex flex-col gap-2 animate-in">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Seleccionar Tipo de Documento</p>
              <button onClick={() => resetForm('invoice')} className="flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl transition-colors text-left group">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Receipt size={20} /></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Factura</p>
                  <p className="text-[10px] text-gray-400 font-medium">Con desglose de IVA</p>
                </div>
              </button>
              <button onClick={() => resetForm('quote')} className="flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl transition-colors text-left group">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors"><FilePlus2 size={20} /></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Cotización</p>
                  <p className="text-[10px] text-gray-400 font-medium">Presupuesto sin IVA</p>
                </div>
              </button>
              <button onClick={() => resetForm('receipt')} className="flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-2xl transition-colors text-left group">
                <div className="p-2 bg-green-100 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors"><Save size={20} /></div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Recibo</p>
                  <p className="text-[10px] text-gray-400 font-medium">Comprobante de pago</p>
                </div>
              </button>
              <button onClick={() => setShowTypeSelector(false)} className="mt-2 text-center text-[10px] font-black text-gray-300 uppercase py-2">Cancelar</button>
            </div>
          )}
          <button onClick={() => setShowTypeSelector(!showTypeSelector)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'create' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
            <FilePlus2 size={26} strokeWidth={activeTab === 'create' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Nueva</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
            <History size={26} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Emitidas</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
            <Building2 size={26} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Empresa</span>
          </button>
          {currentUser.role === 'admin' && (
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-indigo-600 scale-110' : 'text-gray-400'}`}>
              <ShieldCheck size={26} strokeWidth={activeTab === 'admin' ? 2.5 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
            </button>
          )}
        </footer>
      </nav>
    </div>
  );
};

export default App;
