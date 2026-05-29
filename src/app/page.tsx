"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { LockKeyhole, UserRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            setUsers(data);
        } else {
            // Mock data jika database kosong (hanya untuk tampilan visual MVP)
            setUsers([
                { id: '1', name: 'Nashwa', role: 'Co-Founder & Project Lead', pin: '1234' },
                { id: '2', name: 'Gema', role: 'Co-Founder & Business Lead', pin: '1234' },
                { id: '3', name: 'Haura', role: 'Co-Founder & Marketing Lead', pin: '1234' },
            ]);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setDbError(true);
        // Fallback mockup
        setUsers([
            { id: '1', name: 'Nashwa', role: 'Co-Founder & Project Lead', pin: '1234' },
            { id: '2', name: 'Gema', role: 'Co-Founder & Business Lead', pin: '1234' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUser) {
      setError('Pilih nama Anda terlebih dahulu');
      return;
    }

    const user = users.find(u => u.name === selectedUser);
    if (user && user.pin === pin) {
      // Simpan session sederhana
      localStorage.setItem('mst_user', JSON.stringify(user));
      if (user.name === 'Nashwa') {
        router.push('/admin');
      } else {
        router.push('/board');
      }
    } else {
      setError('PIN tidak valid');
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('mst_user', JSON.stringify({ name: 'Tamu (Guest)', role: 'Viewer', pin: '' }));
    router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
            <UserRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MST Workspace</h1>
          <p className="text-slate-300 mt-2 text-sm">Sistem Manajemen Tugas Tim Internal</p>
        </div>

        {dbError && (
          <div className="mb-6 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-200 text-xs text-center">
            Database belum terhubung. Menggunakan mode Demo (Mock Data).
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Masuk Sebagai</label>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-black/20 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                disabled={loading}
              >
                <option value="" disabled className="text-slate-500">Pilih Nama Anggota...</option>
                {users.map(u => (
                  <option key={u.id} value={u.name} className="text-black">{u.name} - {u.role}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">PIN Keamanan</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LockKeyhole className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN (Demo: 1234)"
                className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center animate-pulse">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Masuk ke Workspace
          </button>
          
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full mt-3 py-3 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl border border-white/10 transition-all focus:outline-none"
          >
            Masuk sebagai Tamu (Hanya Lihat)
          </button>
        </form>
      </div>
    </div>
  );
}
