"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { CheckCircle2, Circle, Clock, MessageSquare, AlertTriangle } from 'lucide-react';

export default function BoardPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mst_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      fetchMyTasks(u.name);
    }
  }, []);

  async function fetchMyTasks(userName: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('pic_name', `%${userName}%`);
        
      if (error) throw error;
      setTasks(data || []);
      setIsDemo(false);
    } catch (error) {
      console.warn("Using demo data");
      setIsDemo(true);
      // Demo data
      setTasks([
        { id: '1', task_id: 'SPT1-T1', title: 'Tugas Contoh (Demo)', status: 'Belum Mulai', priority: 'Normal', report_link: '', blocker: '' },
        { id: '2', task_id: 'SPT1-T2', title: 'Tugas Progres (Demo)', status: 'Sedang Dikerjakan', priority: 'Tinggi', report_link: '', blocker: 'Menunggu akses' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    if (isDemo) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
      return;
    }
    
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  const updateTaskField = async (id: string, field: string, value: string) => {
    if (isDemo) {
      setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
      return;
    }
    
    const { error } = await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    if (!error) {
      setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
    } else {
      alert(`Gagal menyimpan ${field}`);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Selesai') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'Sedang Dikerjakan') return <Clock className="w-5 h-5 text-blue-500" />;
    return <Circle className="w-5 h-5 text-slate-300" />;
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Halo, {user.name}!</h1>
        <p className="text-slate-500 mt-1">Berikut adalah daftar tugas yang dipercayakan kepada Anda.</p>
      </div>

      {isDemo && (
         <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
           <strong>Mode Demo.</strong> Tidak terhubung ke database. Perubahan status hanya tersimpan di memori (sementara).
         </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Memuat tugas Anda...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">Tidak ada tugas!</h3>
            <p className="text-slate-500 mt-1">Bagus, Anda sudah menyelesaikan semua pekerjaan (Atau belum diberi tugas).</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">
                      {getStatusIcon(task.status)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{task.task_id}</span>
                        {task.end_date && (
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {new Date(task.end_date).toLocaleDateString('id-ID')}
                          </span>
                        )}
                        {(task.priority === 'Tinggi' || task.priority === 'Kritis') && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Prioritas {task.priority}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-lg font-semibold ${task.status === 'Selesai' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {task.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Status Dropdown */}
                  <div className="flex-shrink-0">
                    <select 
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                      className={`text-sm font-medium rounded-lg px-3 py-1.5 border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500
                        ${task.status === 'Belum Mulai' ? 'bg-slate-50 border-slate-200 text-slate-700' : 
                          task.status === 'Sedang Dikerjakan' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                          'bg-green-50 border-green-200 text-green-700'}`}
                    >
                      <option value="Belum Mulai">Belum Mulai</option>
                      <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
                  <div className="flex-1">
                    <label className="flex items-center text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Laporan / Link Hasil
                    </label>
                    <input 
                      type="text" 
                      placeholder="Masukkan link google drive / figma / laporan..." 
                      defaultValue={task.report_link || ''}
                      onBlur={(e) => {
                        if (e.target.value !== task.report_link) {
                          updateTaskField(task.id, 'report_link', e.target.value);
                        }
                      }}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Kendala (Blocker)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Apa yang menghambat Anda?" 
                      defaultValue={task.blocker || ''}
                      onBlur={(e) => {
                        if (e.target.value !== task.blocker) {
                          updateTaskField(task.id, 'blocker', e.target.value);
                        }
                      }}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
