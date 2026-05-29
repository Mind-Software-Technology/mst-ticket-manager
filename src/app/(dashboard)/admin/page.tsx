"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { PlusCircle, Search, Edit2 } from 'lucide-react';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Form state User
  const [newUser, setNewUser] = useState({
    name: '',
    role: 'Anggota Baru',
    pin: '1234'
  });

  // Form state
  const [newTask, setNewTask] = useState({
    task_id: '',
    title: '',
    division: 'Marketing',
    pic_name: 'Haura',
    status: 'Belum Mulai',
    priority: 'Normal',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: sprintsData, error: sprintsError } = await supabase.from('sprints').select('*');
      const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*');
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      
      if (sprintsError || tasksError || usersError) throw new Error("DB Connection Error");
      
      setSprints(sprintsData || []);
      setTasks(tasksData || []);
      setUsers(usersData || []);
      setIsDemo(false);
    } catch (error) {
      console.warn("Using demo data");
      setIsDemo(true);
      setSprints([{ id: '1', name: 'Sprint 1', start_date: '2026-05-29', end_date: '2026-06-12', status: 'Aktif' }]);
      setUsers([
        { id: '1', name: 'Nashwa', role: 'Co-Founder & Project Lead', pin: '1234' },
        { id: '2', name: 'Gema', role: 'Co-Founder & Business Lead', pin: '1234' },
        { id: '3', name: 'Haura', role: 'Co-Founder & Marketing Lead', pin: '1234' },
        { id: '4', name: 'Zira', role: 'Co-Founder & Design Lead', pin: '1234' },
        { id: '5', name: 'Arhab', role: 'Co-Founder & Lead Developer', pin: '1234' },
        { id: '6', name: 'Jack', role: 'Co-Founder & Lead Developer', pin: '1234' }
      ]);
      setTasks([
        { id: '1', task_id: 'SPT1-MKT1', title: 'Pembuatan naskah teks deskripsi profil', division: 'Marketing', pic_name: 'Haura', status: 'Belum Mulai', priority: 'Tinggi' },
        { id: '2', task_id: 'SPT1-DSN1', title: 'Pembuatan aset logo, pemilihan font', division: 'Design', pic_name: 'Zira', status: 'Sedang Dikerjakan', priority: 'Tinggi' },
        { id: '3', task_id: 'SPT1-DEV1', title: 'Setup repositori kerja & Hosting', division: 'Development', pic_name: 'Arhab', status: 'Selesai', priority: 'Kritis' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      const addedUser = { id: Date.now().toString(), ...newUser };
      setUsers([...users, addedUser]);
      setShowUserModal(false);
      alert('Berhasil menambah anggota di Mode Demo');
      return;
    }

    try {
      const { data, error } = await supabase.from('users').insert([newUser]).select();
      if (error) throw error;
      if (data) {
        setUsers([...users, data[0]]);
        setShowUserModal(false);
        alert('Berhasil menambah anggota');
      }
    } catch (error) {
      alert("Gagal menambah anggota. Cek koneksi Supabase.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      if (editingTaskId) {
        setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, ...newTask } : t));
      } else {
        setTasks([...tasks, { id: Date.now().toString(), ...newTask }]);
      }
      closeModal();
      return;
    }

    try {
      if (editingTaskId) {
        const { data, error } = await supabase.from('tasks').update(newTask).eq('id', editingTaskId).select();
        if (error) throw error;
        if (data) setTasks(tasks.map(t => t.id === editingTaskId ? data[0] : t));
      } else {
        const { data, error } = await supabase.from('tasks').insert([newTask]).select();
        if (error) throw error;
        if (data) setTasks([...tasks, data[0]]);
      }
      closeModal();
    } catch (error) {
      alert("Gagal menyimpan tugas. Cek koneksi Supabase.");
    }
  };

  const openEditModal = (task: any) => {
    setNewTask({
      task_id: task.task_id,
      title: task.title,
      division: task.division,
      pic_name: task.pic_name,
      status: task.status,
      priority: task.priority,
      start_date: task.start_date || '',
      end_date: task.end_date || ''
    });
    setEditingTaskId(task.id);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setNewTask({
      task_id: '',
      title: '',
      division: 'Marketing',
      pic_name: 'Haura',
      status: 'Belum Mulai',
      priority: 'Normal',
      start_date: '',
      end_date: ''
    });
    setEditingTaskId(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTaskId(null);
  };

  const statusColors: Record<string, string> = {
    'Belum Mulai': 'bg-slate-100 text-slate-800',
    'Sedang Dikerjakan': 'bg-blue-100 text-blue-800',
    'Selesai': 'bg-green-100 text-green-800',
  };

  const priorityColors: Record<string, string> = {
    'Rendah': 'bg-slate-100 text-slate-600',
    'Normal': 'bg-indigo-100 text-indigo-700',
    'Tinggi': 'bg-orange-100 text-orange-700',
    'Kritis': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Tiket (Admin)</h1>
          <p className="text-slate-500 mt-1">Kelola seluruh tugas dan sprint startup.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowUserModal(true)}
            className="flex items-center px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm font-medium"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Tambah Anggota
          </button>
          <button 
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Tambah Tugas
          </button>
        </div>
      </div>

      {isDemo && (
         <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
           <strong>Mode Demo Aktif.</strong> Supabase belum terkoneksi (kredensial kosong di .env.local). Data yang ditambahkan tidak akan tersimpan permanen.
         </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Tugas', value: tasks.length, color: 'text-indigo-600' },
          { label: 'Selesai', value: tasks.filter(t => t.status === 'Selesai').length, color: 'text-green-600' },
          { label: 'Progres', value: tasks.filter(t => t.status === 'Sedang Dikerjakan').length, color: 'text-blue-600' },
          { label: 'Sprint Aktif', value: sprints.filter(s => s.status === 'Aktif').length, color: 'text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Daftar Tugas Aktif</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari tugas..." 
              className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-medium">ID Tugas</th>
                <th className="p-4 font-medium">Judul</th>
                <th className="p-4 font-medium">PIC</th>
                <th className="p-4 font-medium">Tenggat</th>
                <th className="p-4 font-medium">Prioritas</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada tugas.</td></tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{task.task_id}</td>
                    <td className="p-4 text-slate-700 max-w-xs truncate">{task.title}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {task.pic_name}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {task.end_date ? new Date(task.end_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${priorityColors[task.priority] || priorityColors['Normal']}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[task.status] || statusColors['Belum Mulai']}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => openEditModal(task)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Tugas (Sederhana) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{editingTaskId ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h2>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Tugas</label>
                <input required type="text" value={newTask.task_id} onChange={e => setNewTask({...newTask, task_id: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Contoh: SPT1-DSN1" />
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  <strong>Format:</strong> SPT[No]-[DIVISI][No]<br/>
                  • Marketing: <code>SPT1-MKT1</code><br/>
                  • Design: <code>SPT1-DSN1</code><br/>
                  • Development: <code>SPT1-DEV1</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tugas</label>
                <textarea required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PIC (Penanggung Jawab)</label>
                  <select value={newTask.pic_name} onChange={e => setNewTask({...newTask, pic_name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioritas</label>
                  <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    <option value="Rendah">Rendah</option>
                    <option value="Normal">Normal</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Kritis">Kritis</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai</label>
                  <input type="date" value={newTask.start_date} onChange={e => setNewTask({...newTask, start_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Berakhir (Tenggat)</label>
                  <input type="date" value={newTask.end_date} onChange={e => setNewTask({...newTask, end_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">Simpan Tugas</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah Anggota */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Tambah Anggota Tim</h2>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Anggota</label>
                <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Masukkan nama panggilan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jabatan / Peran</label>
                <input required type="text" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Contoh: Frontend Developer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PIN Keamanan (Untuk Login)</label>
                <input required type="text" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Contoh: 1234" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">Simpan Anggota</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
