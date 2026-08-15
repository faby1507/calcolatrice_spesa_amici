// src/App.tsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Pizza, Users, Plus, Trash2, Share2, Calculator, LogOut, Check } from 'lucide-react';

interface Room {
  id: string;
  title: string;
  cover_charge: number;
}

interface RoomItem {
  id: string;
  room_id: string;
  person_name: string;
  item_name: string;
  price: number;
  is_shared: boolean;
  created_at: string;
}

export default function App() {
  // Stato Stanza & Utente Locale
  const [roomId, setRoomId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<RoomItem[]>([]);
  
  // Form Stanza & Input
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('Pizzata di Gruppo 🍕');
  const [newRoomCover, setNewRoomCover] = useState('2.00');

  // Input Ordine
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [copied, setCopied] = useState(false);

  // Leggi eventuale stanza dall'URL al caricamento (es. ?room=XYZ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinRoomInput(roomParam.toUpperCase());
    }
  }, []);

  // Sottoscrizione Realtime quando si entra in una stanza
  useEffect(() => {
    if (!roomId) return;

    // 1. Carica i dati iniziali
    fetchRoomData(roomId);

    // 2. Ascolta modifiche in tempo reale da altri amici
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_items', filter: `room_id=eq.${roomId}` },
        () => {
          fetchItems(roomId);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const fetchRoomData = async (id: string) => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (roomData) {
      setRoom(roomData);
      fetchItems(id);
    }
  };

  const fetchItems = async (id: string) => {
    const { data: itemsData } = await supabase
      .from('room_items')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true });
    if (itemsData) setItems(itemsData);
  };

  // Creazione Stanza
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !newRoomTitle.trim()) return;

    // Genera un codice stanza casuale di 6 caratteri (es. PIZ-492)
    const code = 'S-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const cover = parseFloat(newRoomCover) || 0;

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ id: code, title: newRoomTitle.trim(), cover_charge: cover }])
      .select()
      .single();

    if (error) {
      alert('Errore nella creazione della stanza: ' + error.message);
      return;
    }

    setRoom(data);
    setRoomId(code);
    window.history.pushState({}, '', `?room=${code}`);
  };

  // Accesso a una stanza esistente
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !joinRoomInput.trim()) return;

    const code = joinRoomInput.trim().toUpperCase();
    const { data, error } = await supabase.from('rooms').select('*').eq('id', code).single();

    if (error || !data) {
      alert('Stanza non trovata! Controlla il codice inserito.');
      return;
    }

    setRoom(data);
    setRoomId(code);
    window.history.pushState({}, '', `?room=${code}`);
  };

  // Aggiungi un piatto o bevanda
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(price) || price <= 0 || !roomId) return;

    const { error } = await supabase.from('room_items').insert([
      {
        room_id: roomId,
        person_name: isShared ? 'TUTTI' : userName.trim(),
        item_name: itemName.trim(),
        price: price,
        is_shared: isShared,
      },
    ]);

    if (!error) {
      setItemName('');
      setItemPrice('');
      setIsShared(false);
      fetchItems(roomId);
    }
  };

  // Rimuovi un piatto
  const handleRemoveItem = async (id: string) => {
    await supabase.from('room_items').delete().eq('id', id);
    fetchItems(roomId);
  };

  // Copia link per gli amici
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // --- CALCOLI TOTALI E DIVISIONE ---
  // Trova tutti i partecipanti unici che hanno inserito almeno un ordine (più l'utente corrente)
  const uniqueNames = Array.from(
    new Set([
      ...items.filter((i) => !i.is_shared).map((i) => i.person_name),
      userName.trim(),
    ])
  ).filter(Boolean);

  const memberCount = uniqueNames.length || 1;
  const coverPerPerson = room?.cover_charge || 0;
  const totalCover = coverPerPerson * memberCount;

  // Totale spese condivise (es. patatine, caraffe di vino)
  const sharedItemsTotal = items
    .filter((i) => i.is_shared)
    .reduce((acc, curr) => acc + Number(curr.price), 0);

  const sharedPerPerson = (sharedItemsTotal + totalCover) / memberCount;

  // Quote individuali
  const summaryByPerson = uniqueNames.map((name) => {
    const personalItems = items.filter((i) => !i.is_shared && i.person_name.toLowerCase() === name.toLowerCase());
    const personalTotal = personalItems.reduce((acc, curr) => acc + Number(curr.price), 0);
    const totalToPay = personalTotal + sharedPerPerson;

    return {
      name,
      personalItems,
      personalTotal,
      sharedPerPerson,
      totalToPay,
      isMe: name.toLowerCase() === userName.trim().toLowerCase(),
    };
  });

  const grandTotal = items.reduce((acc, curr) => acc + Number(curr.price), 0) + totalCover;

  // SCHERMATA 1: Selezione / Creazione Stanza
  if (!roomId || !room) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-700">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Pizza className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Conto Al Volo 🍕</h1>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Il tuo Nome o Soprannome
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="es. Mario"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Unisciti a Stanza Esistente */}
          <form onSubmit={handleJoinRoom} className="space-y-3 pb-6 border-b border-slate-700">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Entra con Codice Stanza
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                placeholder="es. S-ABCD"
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold uppercase tracking-wider focus:outline-none focus:border-emerald-500 text-sm"
              />
              <button
                type="submit"
                disabled={!userName.trim() || !joinRoomInput.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-sm transition"
              >
                Entra
              </button>
            </div>
          </form>

          {/* Crea Nuova Stanza */}
          <form onSubmit={handleCreateRoom} className="mt-6 space-y-3">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Oppure crea un nuovo tavolo
            </span>
            <input
              type="text"
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
              placeholder="Nome serata (es. Pizzeria da Gino)"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 mb-1">Coperto a testa (€)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newRoomCover}
                  onChange={(e) => setNewRoomCover(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!userName.trim()}
                className="flex-1 mt-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition"
              >
                Crea Tavolo
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SCHERMATA 2: Tavolo in Tempo Reale
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Navbar */}
      <header className="bg-slate-900/80 backdrop-blur sticky top-0 z-10 border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-400 text-sm tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Stanza: {room.id}
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md text-slate-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? 'Link Copiato!' : 'Invita Amici'}
              </button>
            </div>
            <h1 className="text-lg font-bold text-white mt-0.5">{room.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">Tu: <strong className="text-white">{userName}</strong></span>
            <button
              onClick={() => {
                setRoomId('');
                setRoom(null);
                window.history.pushState({}, '', window.location.pathname);
              }}
              className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 rounded-xl"
              title="Esci dal tavolo"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Colonna 1: Inserisci il tuo ordine */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
            <h2 className="font-bold text-sm text-white flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-emerald-400" /> Cosa prendi?
            </h2>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Cosa vuoi ordinare?</label>
                <input
                  type="text"
                  required
                  placeholder="es. Pizza 4 Formaggi, Birra..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Costo (€)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="es. 8.50"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="sharedCheck"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700"
                />
                <label htmlFor="sharedCheck" className="text-xs text-slate-300 select-none">
                  È una cosa condivisa tra tutti (es. patatine, vino)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition"
              >
                Aggiungi al Tavolo
              </button>
            </form>
          </div>

          {/* Box Riepilogo Veloce */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center text-sm">
            <div>
              <span className="text-slate-400 text-xs block">Amici al tavolo: {memberCount}</span>
              <span className="text-slate-400 text-xs block">Coperto: €{coverPerPerson.toFixed(2)} cad.</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-xs block">Totale Conto</span>
              <span className="text-lg font-black text-emerald-400">€{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Colonna 2 & 3: Chi Paga Cosa & Voci Inserite */}
        <div className="md:col-span-2 space-y-6">
          {/* Schede Quote Personali */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h2 className="font-bold text-sm text-white flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-emerald-400" /> Quote Calcolate in Tempo Reale
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summaryByPerson.map((person) => (
                <div
                  key={person.name}
                  className={`p-4 rounded-xl border transition ${
                    person.isMe
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-white text-sm">
                        {person.name} {person.isMe && <span className="text-xs text-emerald-400 font-normal">(Tu)</span>}
                      </span>
                    </div>
                    <span className="text-base font-black text-emerald-400">
                      €{person.totalToPay.toFixed(2)}
                    </span>
                  </div>

                  {/* Voci ordinate da questa persona */}
                  <div className="text-xs text-slate-400 space-y-1 mb-2">
                    {person.personalItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>• {item.item_name}</span>
                        <span>€{Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                    {person.personalItems.length === 0 && (
                      <span className="text-slate-600 italic">Nessun piatto individuale</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
                    <span>Suo: €{person.personalTotal.toFixed(2)}</span>
                    <span>Coperto+Comuni: €{person.sharedPerPerson.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voci Ordinate al Tavolo */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
            <h2 className="font-bold text-sm text-white flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" /> Tutte le Ordinazioni ({items.length})
            </h2>

            {items.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">
                Nessun ordine inserito finora. Scrivi la tua pizza o bevanda a sinistra!
              </p>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-medium text-slate-200">{item.item_name}</span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.is_shared
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.is_shared ? 'Condiviso' : item.person_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">€{Number(item.price).toFixed(2)}</span>
                      {(item.person_name.toLowerCase() === userName.trim().toLowerCase() || item.is_shared) && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}