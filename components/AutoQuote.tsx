import React, { useState } from 'react';
import { 
  ArrowLeft, FileText, Download, Save, Send, Receipt, Edit2, ShieldCheck, Mail, ImageIcon, UserIcon, Check, Plus, Trash2, Home, Waves, Hammer, Hexagon, Maximize, PaintBucket, Wrench, Menu, MoreHorizontal, FilePlus2, Building2, LayoutGrid, Calendar, LogOut
} from 'lucide-react';
import Input from './Input';

const CATEGORIES = [
  { id: 'demoliciones', name: 'Demoliciones', icon: Hammer, bg: 'bg-orange-100', text: 'text-orange-600' },
  { id: 'revestimientos', name: 'Revestimientos', icon: LayoutGrid, bg: 'bg-green-100', text: 'text-green-600' },
  { id: 'instalaciones', name: 'Instalaciones', icon: Waves, bg: 'bg-blue-100', text: 'text-blue-600' },
  { id: 'albanileria', name: 'Albañilería', icon: Hexagon, bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { id: 'acabados', name: 'Acabados', icon: PaintBucket, bg: 'bg-pink-100', text: 'text-pink-600' },
  { id: 'carpinteria', name: 'Carpintería', icon: Maximize, bg: 'bg-yellow-100', text: 'text-yellow-600' },
];

const ITEMS = {
  revestimientos: [
    { id: 'r1', name: 'Falso techo pladur', unit: 'm²' },
    { id: 'r2', name: 'Enlucido de yeso', unit: 'm²' },
    { id: 'r3', name: 'Alicatado de pared', unit: 'm²' },
    { id: 'r4', name: 'Tarima / Parquet', unit: 'm²' },
    { id: 'r5', name: 'Baldosa cerámica', unit: 'm²' },
    { id: 'r6', name: 'Rodapié', unit: 'ml' },
    { id: 'r7', name: 'Papel pintado', unit: 'm²' },
  ]
};

const AutoQuote = () => {
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({
    client: '',
    projectRef: '',
    address: '',
    type: 'cocina',
    notes: ''
  });
  const [selectedCat, setSelectedCat] = useState('revestimientos');
  const [selectedItem, setSelectedItem] = useState<{name: string, unit: string} | null>(null);
  
  const [newItem, setNewItem] = useState({
    unit: 'm²',
    qty: 0,
    price: 0,
    includeMaterial: true,
    includeLabor: true,
    waste: 7.5,
    zone: 'Cocina',
    notes: ''
  });

  const [parts, setParts] = useState([
    { id: 1, name: 'Demolición de alicatado', unit: 'm²', qty: 12.8, price: 18.5, total: 236.80 },
    { id: 2, name: 'Levantado de rodapié', unit: 'ml', qty: 53.69, price: 2.4, total: 128.86 },
    { id: 3, name: 'Desmontaje mobiliario cocina', unit: 'ud', qty: 1, price: 120, total: 120.00 },
  ]);

  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const deletePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const editPart = (index: number) => {
    const p = parts[index];
    setSelectedItem({ name: p.name, unit: p.unit });
    setNewItem({
      unit: p.unit,
      qty: p.qty,
      price: p.price,
      includeMaterial: true,
      includeLabor: true,
      waste: 7.5,
      zone: 'Cocina',
      notes: ''
    });
    setEditingItemIndex(index);
    setStep(4);
  };

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _parts = [...parts];
    const draggedItemContent = _parts.splice(dragItem.current, 1)[0];
    _parts.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setParts(_parts);
  };

  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const touchStartY = React.useRef(0);

  const onTouchStart = (e: React.TouchEvent, index: number) => {
    setTouchDragIndex(index);
    touchStartY.current = e.touches[0].clientY;
    document.body.style.overflow = 'hidden'; 
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchDragIndex === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    const ROW_HEIGHT = 65; 
    
    if (Math.abs(diff) > ROW_HEIGHT / 1.5) {
      const direction = diff > 0 ? 1 : -1;
      const targetIndex = touchDragIndex + direction;
      
      setParts(prevParts => {
        if (targetIndex >= 0 && targetIndex < prevParts.length) {
          const newParts = [...prevParts];
          const temp = newParts[touchDragIndex];
          newParts[touchDragIndex] = newParts[targetIndex];
          newParts[targetIndex] = temp;
          setTouchDragIndex(targetIndex);
          touchStartY.current = currentY;
          return newParts;
        }
        return prevParts;
      });
    }
  };

  const onTouchEnd = () => {
    setTouchDragIndex(null);
    document.body.style.overflow = 'auto'; // restore body scroll
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const subtotal = parts.reduce((acc, p) => acc + p.total, 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const renderStep1 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <ArrowLeft className="text-gray-600" onClick={() => {}} />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Nuevo presupuesto</h2>
        <FilePlus2 className="text-green-500" />
      </div>

      <div className="flex flex-col gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">1. Datos del proyecto</h3>
        
        <Input label="Cliente" placeholder="Juan Pérez" value={projectData.client} onChange={e => setProjectData({...projectData, client: e.target.value})} />
        <Input label="Proyecto / Referencia" placeholder="Reforma cocina" value={projectData.projectRef} onChange={e => setProjectData({...projectData, projectRef: e.target.value})} />
        <Input label="Dirección" placeholder="Calle Mayor 12, 28001 Madrid" value={projectData.address} onChange={e => setProjectData({...projectData, address: e.target.value})} />
        
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Tipo de reforma</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'vivienda', label: 'Vivienda Completa', icon: Home },
              { id: 'cocina', label: 'Cocina', icon: LayoutGrid },
              { id: 'bano', label: 'Baño', icon: Waves },
              { id: 'parcial', label: 'Parcial', icon: Wrench },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button 
                  key={t.id}
                  onClick={() => setProjectData({...projectData, type: t.id})}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${projectData.type === t.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                >
                  <Icon size={24} />
                  <span className="text-[10px] font-bold text-center leading-tight">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Notas (opcional)</label>
          <textarea 
            className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
            rows={3}
            placeholder="Añade una nota..."
            value={projectData.notes}
            onChange={e => setProjectData({...projectData, notes: e.target.value})}
          />
        </div>

        <button onClick={handleNext} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mt-4 shadow-lg hover:bg-green-700 transition">
          Siguiente ➔
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <ArrowLeft className="text-gray-600" onClick={handleBack} />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Nueva partida</h2>
        <span className="text-gray-400">×</span>
      </div>

      <div className="flex gap-2">
        <input type="text" placeholder="Buscar partida..." className="flex-1 bg-white border border-gray-200 rounded-xl px-4 text-sm" />
        <button className="bg-gray-100 p-3 rounded-xl"><MoreHorizontal /></button>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Categorías</h3>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map(c => {
             const Icon = c.icon;
             return (
               <button 
                 key={c.id} 
                 onClick={() => { setSelectedCat(c.id); handleNext(); }}
                 className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex flex-col items-center gap-3 hover:border-green-500 transition"
               >
                 <div className={`p-3 rounded-full ${c.bg} ${c.text}`}><Icon size={24} /></div>
                 <span className="text-xs font-bold text-gray-700">{c.name}</span>
               </button>
             )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Plantillas rápidas</h3>
        <div className="flex flex-wrap gap-2">
          {['Baño completo', 'Cocina', 'Suelo completo', 'Pintura general'].map(p => (
            <span key={p} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <ArrowLeft className="text-gray-600" onClick={handleBack} />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Revestimientos</h2>
        <span className="text-gray-400">×</span>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {ITEMS.revestimientos.map((item, i) => (
          <div key={item.id} className={`flex items-center justify-between p-4 ${i !== ITEMS.revestimientos.length-1 ? 'border-b border-gray-50' : ''}`} onClick={() => { setSelectedItem(item); handleNext(); }}>
            <div>
              <p className="font-bold text-gray-800 text-sm">{item.name}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{item.unit}</p>
            </div>
            <button className="text-green-600 border border-green-200 rounded-full p-1"><Plus size={16} /></button>
          </div>
        ))}
        <button className="p-4 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-widest text-center mt-2">Ver más partidas</button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <ArrowLeft className="text-gray-600" onClick={handleBack} />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Nueva partida</h2>
        <span className="text-gray-400">×</span>
      </div>

      <div className="flex items-center gap-3 px-4">
         <div className="bg-gray-100 p-3 rounded-xl"><LayoutGrid className="text-gray-500" /></div>
         <div>
            <p className="font-bold text-gray-800 text-sm">{selectedItem?.name || 'Partida'}</p>
            <p className="text-green-600 text-xs font-bold">{selectedCat || 'Categoría'}</p>
         </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Unidad</label>
          <select className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium" value={newItem.unit} onChange={e=>setNewItem({...newItem, unit: e.target.value})}>
            <option>m²</option>
            <option>ml</option>
            <option>ud</option>
          </select>
        </div>

        <Input label="Cantidad" type="number" placeholder="73.72" value={newItem.qty || ''} onChange={e=>setNewItem({...newItem, qty: parseFloat(e.target.value)})} />
        <Input label="Precio unitario (€)" type="number" placeholder="25.00" value={newItem.price || ''} onChange={e=>setNewItem({...newItem, price: parseFloat(e.target.value)})} />
        
        <div className="bg-gray-100 p-4 rounded-xl flex flex-col gap-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
          <span className="text-lg font-black text-gray-800">{(newItem.qty * newItem.price).toFixed(2)} €</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm font-bold text-gray-700">Incluye material</span>
          <input type="checkbox" checked={newItem.includeMaterial} onChange={e=>setNewItem({...newItem, includeMaterial: e.target.checked})} className="toggle" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm font-bold text-gray-700">Incluye mano de obra</span>
          <input type="checkbox" checked={newItem.includeLabor} onChange={e=>setNewItem({...newItem, includeLabor: e.target.checked})} className="toggle" />
        </div>

        <Input label="Desperdicio (%)" type="number" placeholder="7.5" value={newItem.waste || ''} onChange={e=>setNewItem({...newItem, waste: parseFloat(e.target.value)})} />

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Zona</label>
          <select className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium" value={newItem.zone} onChange={e=>setNewItem({...newItem, zone: e.target.value})}>
            <option>Cocina</option>
            <option>Baño</option>
            <option>Salón</option>
          </select>
        </div>

        <button onClick={() => {
          const updatedPart = {
            id: editingItemIndex !== null ? parts[editingItemIndex].id : Date.now(),
            name: selectedItem?.name || 'Partida',
            unit: newItem.unit,
            qty: newItem.qty,
            price: newItem.price,
            total: newItem.qty * newItem.price
          };

          if (editingItemIndex !== null) {
            const newParts = [...parts];
            newParts[editingItemIndex] = updatedPart;
            setParts(newParts);
            setEditingItemIndex(null);
            setStep(5);
          } else {
            setParts([...parts, updatedPart]);
            handleNext();
          }
        }} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg mt-2 hover:bg-green-700">Guardar partida</button>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <Menu className="text-gray-600" />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Presupuesto</h2>
        <FilePlus2 className="text-green-500" />
      </div>

      <div className="flex items-center gap-3 px-2">
        <div className="bg-gray-200 p-2 rounded-lg"><Hexagon size={20} className="text-gray-500"/></div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">{projectData.projectRef || 'Reforma'}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase">{projectData.client || 'Cliente'}</p>
        </div>
        <Edit2 size={16} className="text-gray-400" />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-bold">Subtotal</span><span className="font-black text-gray-800">{subtotal.toFixed(2)} €</span></div>
        <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-bold">IVA (21%)</span><span className="font-black text-gray-800">{iva.toFixed(2)} €</span></div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100"><span className="text-gray-800 font-black">Total</span><span className="font-black text-green-600 text-xl">{total.toFixed(2)} €</span></div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Partidas ({parts.length})</h3>
        </div>
        <div className="-mx-5 bg-white border-y border-gray-100 overflow-hidden flex flex-col">
          {parts.map((p, i) => (
            <div 
              key={p.id} 
              onDragEnter={(e) => { dragOverItem.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center justify-between p-4 px-5 ${i !== parts.length-1 ? 'border-b border-gray-50' : ''} ${touchDragIndex === i ? 'bg-green-50 z-10 shadow-sm relative' : 'bg-white hover:bg-gray-50'} transition`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="cursor-move p-3 -ml-3"
                  draggable
                  onDragStart={(e) => { dragItem.current = i; }}
                  onDragEnd={handleSort}
                  onTouchStart={(e) => onTouchStart(e, i)}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onTouchCancel={onTouchEnd}
                >
                  <Menu size={16} className="text-gray-400 hover:text-gray-600" />
                </div>
                <div>
                   <p className="font-bold text-gray-800 text-xs">{p.name}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{p.unit} {p.qty}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-black text-gray-800 text-xs">{p.total.toFixed(2)} €</p>
                <div className="relative">
                  <button onClick={() => setActiveMenu(activeMenu === i ? null : i)} className="p-2 -mr-2">
                    <MoreHorizontal size={16} className="text-gray-400 hover:text-gray-700" />
                  </button>
                  {activeMenu === i && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 shadow-xl rounded-xl z-50 flex flex-col min-w-[140px] overflow-hidden">
                      <button 
                        onClick={() => { setActiveMenu(null); editPart(i); }} 
                        className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 text-left font-bold"
                      >
                        <Edit2 size={16} className="text-indigo-500" /> Editar
                      </button>
                      <button 
                        onClick={() => { setActiveMenu(null); deletePart(i); }} 
                        className="px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 text-left font-bold border-t border-gray-50"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setStep(2)} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2"><Plus size={18}/> Añadir partida</button>
        <button onClick={() => handleNext()} className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2">Siguiente ➔</button>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="flex flex-col gap-6 animate-in">
      <div className="flex items-center gap-3 mb-2 px-2">
        <ArrowLeft className="text-gray-600" onClick={handleBack} />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1 text-center">Resumen</h2>
        <FilePlus2 className="text-gray-400" />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest border-b border-gray-50 pb-2">Resumen económico</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-bold">Subtotal</span><span className="font-black text-gray-800">{subtotal.toFixed(2)} €</span></div>
          <div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-bold">IVA (21%)</span><span className="font-black text-gray-800">{iva.toFixed(2)} €</span></div>
          <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100"><span className="text-gray-800 font-black">Total</span><span className="font-black text-green-600 text-xl">{total.toFixed(2)} €</span></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
         <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest px-6 pt-5 pb-2">Acciones</h3>
         {[
           { label: 'Vista previa PDF', icon: FileText },
           { label: 'Enviar por WhatsApp', icon: Send, color: 'text-green-500' },
           { label: 'Enviar por email', icon: Mail },
           { label: 'Guardar como plantilla', icon: Save },
           { label: 'Duplicar presupuesto', icon: FilePlus2 },
         ].map((a, i) => {
           const Icon = a.icon;
           return (
             <button key={i} className={`flex items-center gap-4 p-4 px-6 border-t border-gray-50 text-left hover:bg-gray-50 w-full`}>
               <Icon size={18} className={a.color || "text-gray-400"} />
               <span className="text-sm font-bold text-gray-700">{a.label}</span>
             </button>
           )
         })}
      </div>

      <button className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center gap-2 mt-2"><Save size={18}/> Guardar y finalizar</button>
    </div>
  );

  return (
    <div className="pb-24">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      
      {/* Footer Navigation mock for this step wizard specifically if requested, 
          but App.tsx already provides the global footer. We can show local stepper navigation here if needed */}
      <div className="fixed bottom-[88px] left-0 right-0 flex justify-center pb-2 z-10 pointer-events-none">
         <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-4 pointer-events-auto">
            <span className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-green-500' : 'bg-gray-200'}`}></span>
            <span className={`h-2 w-2 rounded-full ${step === 2 || step === 3 || step === 4 ? 'bg-green-500' : 'bg-gray-200'}`}></span>
            <span className={`h-2 w-2 rounded-full ${step === 5 ? 'bg-green-500' : 'bg-gray-200'}`}></span>
            <span className={`h-2 w-2 rounded-full ${step === 6 ? 'bg-green-500' : 'bg-gray-200'}`}></span>
         </div>
      </div>
    </div>
  )
};

export default AutoQuote;
