// src/App.tsx
import { useState } from 'react';
import { Plus, Trash2, Pizza, UserPlus, Users, Calculator, Receipt } from 'lucide-react';

interface Member {
  id: string;
  name: string;
}

interface Item {
  id: string;
  memberId: string | 'SHARED'; // Assegnato a un amico o condiviso
  name: string;
  price: number;
}

export default function App() {
  const [billTitle, setBillTitle] = useState('Pizzata con gli amici 🍕');
  const [coverCharge, setCoverCharge] = useState<number>(2.0); // Coperto a persona
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Mario' },
    { id: '2', name: 'Anna' },
    { id: '3', name: 'Luca' },
  ]);

  const [items, setItems] = useState<Item[]>([
    { id: '101', memberId: '1', name: 'Pizza Diavola', price: 8.5 },
    { id: '102', memberId: '1', name: 'Birra Media', price: 5.0 },
    { id: '103', memberId: '2', name: 'Pizza Margherita', price: 6.0 },
    { id: '104', memberId: '2', name: 'Acqua Naturale', price: 2.5 },
    { id: '105', memberId: '3', name: 'Panino Burger', price: 10.0 },
    { id: '106', memberId: 'SHARED', name: 'Patatine Fritte al centro', price: 6.0 },
  ]);

  // Input temporanei
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('1');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Aggiungi partecipante
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newMember: Member = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    if (!selectedMember) setSelectedMember(newMember.id);
  };

  // Rimuovi partecipante
  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
    setItems(items.filter((item) => item.memberId !== id));
    if (selectedMember === id && members.length > 1) {
      setSelectedMember(members[0].id);
    }
  };

  // Aggiungi voce ordinata
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(price) || price <= 0) return;

    const newItem: Item = {
      id: Date.now().toString(),
      memberId: selectedMember,
      name: itemName.trim(),
      price: price,
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemPrice('');
  };

  // Rimuovi voce ordinata
  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  // --- CALCOLI TOTALI E QUOTE ---
  const memberCount = members.length;
  
  // Costi condivisi (items con memberId 'SHARED')
  const totalSharedItems = items
    .filter((i) => i.memberId === 'SHARED')
    .reduce((acc, curr) => acc + curr.price, 0);

  // Totale complessivo del coperto
  const totalCover = coverCharge * memberCount;

  // Quota condivisa extra per ogni persona
  const sharedExtraPerPerson = memberCount > 0 ? (totalSharedItems + totalCover) / memberCount : 0;

  // Calcolo quota finale per singolo partecipante
  const memberTotals = members.map((m) => {
    const individualItems = items.filter((i) => i.memberId === m.id);
    const individualTotal = individualItems.reduce((acc, curr) => acc + curr.price, 0);
    const totalToPay = individualTotal + sharedExtraPerPerson;

    return {
      member: m,
      individualItems,
      individualTotal,
      sharedPart: sharedExtraPerPerson,
      totalToPay,
    };
  });

  const grandTotal = items.reduce((acc, curr) => acc + curr.price, 0) + totalCover;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Header */}
      <header className="bg-emerald-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Pizza className="w-8 h-8" />
            <div>
              <input
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="bg-transparent text-xl font-bold border-b border-emerald-400 focus:outline-none focus:border-white w-full"
              />
              <p className="text-emerald-100 text-xs mt-1">Dividi esattamente per quello che hai consumato</p>
            </div>
          </div>
          <div className="bg-emerald-700/60 p-3 rounded-xl flex items-center gap-4">
            <div>
              <label className="block text-xs text-emerald-200">Coperto (€ a testa)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={coverCharge}
                onChange={(e) => setCoverCharge(parseFloat(e.target.value) || 0)}
                className="w-20 bg-white text-slate-800 text-sm font-semibold rounded px-2 py-1 focus:outline-none"
              />
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-200 block">Totale Conto</span>
              <span className="text-xl font-extrabold">€{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Colonna Sinistra: Gestione Amici & Aggiunta Piatti */}
        <div className="space-y-6 md:col-span-1">
          {/* Box Amici */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm">
              <Users className="w-4 h-4 text-emerald-600" /> Chi c'era? ({members.length})
            </h2>

            <form onSubmit={handleAddMember} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Nome amico"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="flex-1 text-sm px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg"
                title="Aggiungi partecipante"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-200"
                >
                  {m.name}
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-slate-400 hover:text-red-500 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Box Aggiunta Ordinazione */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-sm">
              <Plus className="w-4 h-4 text-emerald-600" /> Aggiungi Cosa / Costo
            </h2>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Di chi è?</label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="SHARED">👥 Condiviso tra tutti (es. antipasti/vino)</option>
                  <optgroup label="Singolo amico:">
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cosa ha preso?</label>
                <input
                  type="text"
                  placeholder="es. Pizza 4 Formaggi, Birra..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Prezzo (€)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="es. 8.50"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm transition"
              >
                Aggiungi al Conto
              </button>
            </form>
          </div>
        </div>

        {/* Colonna Destra: Quote Finali & Dettaglio Ordinazioni */}
        <div className="space-y-6 md:col-span-2">
          {/* Schede Quote per Singolo Amico */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" /> Quote da Pagare
            </h2>

            {memberTotals.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Aggiungi almeno un amico per calcolare le quote.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memberTotals.map(({ member, individualItems, individualTotal, sharedPart, totalToPay }) => (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-900">{member.name}</span>
                        <span className="text-base font-extrabold text-emerald-700">
                          €{totalToPay.toFixed(2)}
                        </span>
                      </div>

                      {/* Lista piatti personali */}
                      <div className="text-xs text-slate-500 space-y-1 mb-2">
                        {individualItems.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>• {item.name}</span>
                            <span>€{item.price.toFixed(2)}</span>
                          </div>
                        ))}
                        {individualItems.length === 0 && (
                          <span className="italic text-slate-400">Nessuna voce individuale</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                      <span>Cose sue: €{individualTotal.toFixed(2)}</span>
                      <span>Coperto + Condivisi: €{sharedPart.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riepilogo Lista Voci Inserite */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-600" /> Dettaglio di tutte le voci ({items.length})
            </h2>

            {items.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">Nessun piatto o bevanda inserita.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {items.map((item) => {
                  const assignedMember = members.find((m) => m.id === item.memberId);
                  return (
                    <div key={item.id} className="py-2.5 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.memberId === 'SHARED' ? 'Condiviso' : assignedMember?.name || 'Sconosciuto'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">€{item.price.toFixed(2)}</span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}