"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('mst_user');
    if (!storedUser) {
      router.push('/');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mst_user');
    router.push('/');
  };

  if (!user) return null; // or loading spinner

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r md:border-b-0 border-slate-200 flex flex-col shadow-sm flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center md:block">
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              MST Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-1 hidden md:block">Sprint Management System</p>
          </div>
          <div className="md:hidden flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{user.name}</span>
            <button onClick={handleLogout} className="text-red-500 p-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-0">
          <div className="hidden md:block mb-4 px-2 py-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-1">Logged in as</p>
            <p className="font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-600 truncate">{user.role}</p>
          </div>

          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 w-full">
            {(user.name === 'Nashwa' || user.role === 'Viewer') && (
              <Link href="/admin" className="whitespace-nowrap flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                <LayoutDashboard className="w-5 h-5 mr-2 md:mr-3 text-slate-400" />
                Admin Dashboard
              </Link>
            )}
            <Link href="/board" className="whitespace-nowrap flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
              <CheckSquare className="w-5 h-5 mr-2 md:mr-3 text-slate-400" />
              Tugas Saya
            </Link>
          </nav>
        </div>

        <div className="hidden md:block p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
