'use client';

import { useState } from 'react';

interface LoginProps {
  onLogin: (username: string) => Promise<boolean>;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    const success = await onLogin(username.trim());
    if (!success) {
      setUsername('');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#f5f5f0]">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-[#5a5a40]">Gestione Turni</h1>
        <p className="text-[#7a7a72] text-center mb-8 text-sm">Inserisci il tuo username per continuare</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-[11px] font-bold text-[#7a7a72] uppercase mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              placeholder="ES. MARIO"
              className="w-full px-4 py-3 border border-[#e6dfd1] rounded-xl focus:ring-2 focus:ring-[#5a5a40] focus:border-[#5a5a40] outline-none transition-all uppercase bg-[#f5f5f0] text-[#2d2d2a]"
              required
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full bg-[#5a5a40] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#4a4a35] focus:ring-4 focus:ring-[#e6dfd1] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm tracking-wide"
          >
            {isLoading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}
