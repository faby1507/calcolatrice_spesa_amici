// src/App.tsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { LogOut, Plus, Receipt } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  created_at: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    // Controlla la sessione attiva
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carica le spese dell'utente
  const fetchExpenses = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
  };

  useEffect(() => {
    if (session) fetchExpenses();
  }, [session]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !session?.user) return;

    const { error } = await supabase.from('expenses').insert([
      {
        description: desc,
        amount: parseFloat(amount),
        paid_by: session.user.id,
      },
    ]);

    if (!error) {
      setDesc('');
      setAmount('');
      fetchExpenses();
    } else {
      alert('Errore nell\'aggiunta della spesa: ' + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Caricamento in corso...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  const total = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center max-w-4xl mx-auto">
        <div className="flex items-center space-x-2">
          <Receipt className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-800">Calcolatrice Spesa Amici</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center text-sm font-medium text-red-600 hover:text-red-700 gap-1 bg-red-50 px-3 py-1.5 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Esci
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form inserimento */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-1 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Nuova Spesa
          </h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descrizione</label>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="es. Spesa Esselunga"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Importo (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm shadow transition"
            >
              Aggiungi Spesa
            </button>
          </form>
        </div>

        {/* Lista Spese */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Riepilogo Spese</h2>
            <span className="text-base font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
              Totale: €{total.toFixed(2)}
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nessuna spesa registrata finora.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <div key={expense.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{expense.description}</p>
                    <p className="text-xs text-slate-400">{new Date(expense.created_at).toLocaleDateString('it-IT')}</p>
                  </div>
                  <span className="font-bold text-slate-900">€{Number(expense.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}