"use client";

// =====================================================
// Legacy Admin Dashboard
//
// Halaman ini masih beroperasi pada tabel `tasks` (skema lama).
// Akan dirombak / di-replace di Sprint 2 (modul Gawean).
// Sprint 1 hanya melakukan:
//   - Migrasi auth dari localStorage → useSession (Supabase Auth)
//   - Cleanup type `any` & lint error supaya build pass.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { PlusCircle, Search, Edit2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";

interface LegacyTask {
  id: string;
  task_id: string;
  title: string;
  division: string;
  pic_name: string;
  status: string;
  priority: string;
  start_date?: string | null;
  end_date?: string | null;
  sprint_id?: string | null;
  report_link?: string | null;
  blocker?: string | null;
}

interface LegacySprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface LegacyUserRow {
  id: string;
  name: string;
  role: string;
  pin: string;
}

type TaskFormState = {
  task_id: string;
  title: string;
  division: string;
  pic_name: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
};

const INITIAL_TASK_FORM: TaskFormState = {
  task_id: "",
  title: "",
  division: "Marketing",
  pic_name: "Haura",
  status: "Belum Mulai",
  priority: "Normal",
  start_date: "",
  end_date: "",
};

export default function AdminDashboard() {
  const { session } = useSession();
  const [tasks, setTasks] = useState<LegacyTask[]>([]);
  const [sprints, setSprints] = useState<LegacySprint[]>([]);
  const [users, setUsers] = useState<LegacyUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Sprint 1: role dari profile.is_admin (Supabase Auth) — bukan localStorage.
  const userRole = session?.profile.is_admin ? "Admin" : "Viewer";

  const [newUser, setNewUser] = useState({
    name: "",
    role: "Anggota Baru",
    pin: "1234",
  });

  const [newTask, setNewTask] = useState<TaskFormState>(INITIAL_TASK_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sprintsRes, tasksRes, usersRes] = await Promise.all([
        supabase.from("sprints").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("users").select("*"),
      ]);

      if (sprintsRes.error || tasksRes.error || usersRes.error) {
        throw new Error("DB Connection Error");
      }

      setSprints((sprintsRes.data ?? []) as LegacySprint[]);
      setTasks((tasksRes.data ?? []) as LegacyTask[]);
      setUsers((usersRes.data ?? []) as LegacyUserRow[]);
      setIsDemo(false);
    } catch (err) {
      console.warn("[admin] using demo data", err);
      setIsDemo(true);
      setSprints([
        {
          id: "1",
          name: "Sprint 1",
          start_date: "2026-05-29",
          end_date: "2026-06-12",
          status: "Aktif",
        },
      ]);
      setUsers([
        { id: "1", name: "Nashwa", role: "Co-Founder & Project Lead", pin: "1234" },
        { id: "2", name: "Gema",   role: "Co-Founder & Business Lead", pin: "1234" },
        { id: "3", name: "Haura",  role: "Co-Founder & Marketing Lead", pin: "1234" },
        { id: "4", name: "Zira",   role: "Co-Founder & Design Lead", pin: "1234" },
        { id: "5", name: "Arhab",  role: "Co-Founder & Lead Developer", pin: "1234" },
        { id: "6", name: "Jack",   role: "Co-Founder & Lead Developer", pin: "1234" },
      ]);
      setTasks([
        { id: "1", task_id: "SPT1-MKT1", title: "Pembuatan naskah teks deskripsi profil", division: "Marketing",   pic_name: "Haura", status: "Belum Mulai",       priority: "Tinggi" },
        { id: "2", task_id: "SPT1-DSN1", title: "Pembuatan aset logo, pemilihan font",     division: "Design",      pic_name: "Zira",  status: "Sedang Dikerjakan", priority: "Tinggi" },
        { id: "3", task_id: "SPT1-DEV1", title: "Setup repositori kerja & Hosting",        division: "Development", pic_name: "Arhab", status: "Selesai",           priority: "Kritis" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Legacy page: akan di-replace di Sprint 2 dengan modul Gawean.
    // Pattern fetch+setState di sini sengaja dipertahankan supaya scope Sprint 1 fokus auth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      const addedUser: LegacyUserRow = {
        id: crypto.randomUUID(),
        ...newUser,
      };
      setUsers((prev) => [...prev, addedUser]);
      setShowUserModal(false);
      alert("Berhasil menambah anggota di Mode Demo");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .insert([newUser])
        .select();
      if (error) throw error;
      if (data) {
        setUsers((prev) => [...prev, ...(data as LegacyUserRow[])]);
        setShowUserModal(false);
        alert("Berhasil menambah anggota");
      }
    } catch (err) {
      console.error("[admin] create user failed", err);
      alert("Gagal menambah anggota. Cek koneksi Supabase.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      if (editingTaskId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTaskId ? { ...t, ...newTask } : t)),
        );
      } else {
        const newRow: LegacyTask = { id: crypto.randomUUID(), ...newTask };
        setTasks((prev) => [...prev, newRow]);
      }
      closeModal();
      return;
    }

    try {
      if (editingTaskId) {
        const { data, error } = await supabase
          .from("tasks")
          .update(newTask)
          .eq("id", editingTaskId)
          .select();
        if (error) throw error;
        if (data) {
          const updated = data[0] as LegacyTask;
          setTasks((prev) =>
            prev.map((t) => (t.id === editingTaskId ? updated : t)),
          );
        }
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert([newTask])
          .select();
        if (error) throw error;
        if (data) {
          setTasks((prev) => [...prev, ...(data as LegacyTask[])]);
        }
      }
      closeModal();
    } catch (err) {
      console.error("[admin] save task failed", err);
      alert("Gagal menyimpan tugas. Cek koneksi Supabase.");
    }
  };

  const openEditModal = (task: LegacyTask) => {
    setNewTask({
      task_id: task.task_id,
      title: task.title,
      division: task.division,
      pic_name: task.pic_name,
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ?? "",
      end_date: task.end_date ?? "",
    });
    setEditingTaskId(task.id);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setNewTask(INITIAL_TASK_FORM);
    setEditingTaskId(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTaskId(null);
  };

  const statusColors: Record<string, string> = {
    "Belum Mulai": "bg-slate-100 text-slate-800",
    "Sedang Dikerjakan": "bg-blue-100 text-blue-800",
    Selesai: "bg-green-100 text-green-800",
  };

  const priorityColors: Record<string, string> = {
    Rendah: "bg-slate-100 text-slate-600",
    Normal: "bg-indigo-100 text-indigo-700",
    Tinggi: "bg-orange-100 text-orange-700",
    Kritis: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Master Tiket {userRole === "Viewer" ? "(Mode Tamu)" : "(Admin)"}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            {userRole === "Viewer"
              ? "Lihat seluruh daftar tugas dan progress sprint startup."
              : "Kelola seluruh tugas dan sprint startup."}
          </p>
        </div>
        {userRole !== "Viewer" && (
          <div className="flex flex-row space-x-2 md:space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="flex items-center px-3 md:px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
              Tambah Anggota
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
              Tambah Tugas
            </button>
          </div>
        )}
      </div>

      {isDemo && (
        <div className="mb-4 md:mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs md:text-sm">
          <strong>Mode Demo Aktif.</strong> Supabase belum terkoneksi (kredensial
          kosong di .env.local). Data yang ditambahkan tidak akan tersimpan
          permanen.
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {[
          { label: "Total Tugas", value: tasks.length, color: "text-indigo-600" },
          { label: "Selesai",     value: tasks.filter((t) => t.status === "Selesai").length, color: "text-green-600" },
          { label: "Progres",     value: tasks.filter((t) => t.status === "Sedang Dikerjakan").length, color: "text-blue-600" },
          { label: "Sprint Aktif", value: sprints.filter((s) => s.status === "Aktif").length, color: "text-purple-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
          >
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
                {userRole !== "Viewer" && <th className="p-4 font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Belum ada tugas.
                  </td>
                </tr>
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
                      {task.end_date
                        ? new Date(task.end_date).toLocaleDateString("id-ID")
                        : "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          priorityColors[task.priority] || priorityColors["Normal"]
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[task.status] || statusColors["Belum Mulai"]
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    {userRole !== "Viewer" && (
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Tugas */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTaskId ? "Edit Tugas" : "Tambah Tugas Baru"}
              </h2>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID Tugas
                </label>
                <input
                  required
                  type="text"
                  value={newTask.task_id}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task_id: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: SPT1-DSN1"
                />
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  <strong>Format:</strong> SPT[No]-[DIVISI][No]
                  <br />• Marketing: <code>SPT1-MKT1</code>
                  <br />• Design: <code>SPT1-DSN1</code>
                  <br />• Development: <code>SPT1-DEV1</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Judul Tugas
                </label>
                <textarea
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PIC (Penanggung Jawab)
                  </label>
                  <select
                    value={newTask.pic_name}
                    onChange={(e) =>
                      setNewTask({ ...newTask, pic_name: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Normal">Normal</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Kritis">Kritis</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={newTask.start_date}
                    onChange={(e) =>
                      setNewTask({ ...newTask, start_date: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Berakhir (Tenggat)
                  </label>
                  <input
                    type="date"
                    value={newTask.end_date}
                    onChange={(e) =>
                      setNewTask({ ...newTask, end_date: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  Simpan Tugas
                </button>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Anggota
                </label>
                <input
                  required
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Masukkan nama panggilan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jabatan / Peran
                </label>
                <input
                  required
                  type="text"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: Frontend Developer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  PIN Keamanan (Untuk Login Lama)
                </label>
                <input
                  required
                  type="text"
                  value={newUser.pin}
                  onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: 1234"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
