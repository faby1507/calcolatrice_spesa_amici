// src/components/Auth.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        alert('Registrazione completata! Controlla la tua email per confermare se richiesto.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          {isSignUp ? 'Crea un Account' : 'Accedi a Spesa Amici'}
        </h2>
        <p className="text-sm text-center text-slate-500 mb-6">
          {isSignUp ? 'Inizia a dividere le spese facilmente' : 'Bentornato! Inserisci le tue credenziali'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mario@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow transition disabled:opacity-50"
          >
            {loading ? 'Caricamento...' : isSignUp ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isSignUp ? 'Hai già un account?' : 'Non hai ancora un account?'}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            className="text-emerald-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Accedi qui' : 'Registrati qui'}
          </button>
        </div>
      </div>
    </div>
  );
}