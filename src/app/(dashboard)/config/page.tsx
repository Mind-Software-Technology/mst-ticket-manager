"use client";

// =====================================================
// Configuration Page
// Sprint 3 / Config Management
//
// Unified page untuk manage Clients, Products, Projects, Sprints.
// Simplified implementation dengan tabs dan inline modals.
// =====================================================

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Send, Copy, Check } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useProjects } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import { useUsers } from "@/hooks/useUsers";
import type { Client, Product, Project, Sprint, User } from "@/types";

type Tab = "clients" | "products" | "projects" | "sprints" | "users";

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("clients");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Configuration</h1>
          <p className="text-slate-600 mt-1">
            Manage master data for tickets: clients, products, projects, and
            sprints
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            {[
              { id: "clients", label: "Clients" },
              { id: "products", label: "Products" },
              { id: "projects", label: "Projects" },
              { id: "sprints", label: "Sprints" },
              { id: "users", label: "Users & Telegram" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "clients" && <ClientsTab />}
            {activeTab === "products" && <ProductsTab />}
            {activeTab === "projects" && <ProjectsTab />}
            {activeTab === "sprints" && <SprintsTab />}
            {activeTab === "users" && <UsersTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== USERS & TELEGRAM TAB ====================

function UsersTab() {
  const { users, loading, updateUser } = useUsers();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateLinkCode = (userId: string) => {
    return `LINK-${userId.substring(0, 8)}`;
  };

  const handleCopyLink = async (user: User) => {
    const linkCode = generateLinkCode(user.id);
    const message = `/start ${linkCode}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(user.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      prompt("Kirim pesan ini ke bot Telegram MST:", message);
    }
  };

  const handleUnlink = async (user: User) => {
    if (!confirm(`Hapus koneksi Telegram untuk "${user.name}"?`)) return;
    try {
      await updateUser(user.id, { telegram_chat_id: null } as Partial<User>);
    } catch (err: any) {
      alert(`Gagal: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users & Telegram</h2>
          <p className="text-sm text-slate-500 mt-1">
            Hubungkan akun Telegram untuk menerima notifikasi sprint reminder
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Send className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Cara menghubungkan Telegram:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Klik tombol <strong>&quot;Copy Link Code&quot;</strong> di samping nama user</li>
              <li>Buka Telegram dan cari bot <strong>MST Ticket Manager</strong></li>
              <li>Kirim pesan yang sudah di-copy (contoh: <code className="bg-blue-100 px-1 rounded">/start LINK-abc12345</code>)</li>
              <li>Bot akan mengkonfirmasi koneksi berhasil ✅</li>
            </ol>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          Belum ada user.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Division
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Telegram Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.division || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {user.telegram_chat_id ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Terhubung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        Belum terhubung
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.telegram_chat_id ? (
                        <button
                          onClick={() => handleUnlink(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Putuskan koneksi Telegram"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Unlink
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCopyLink(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy link code untuk dikirim ke Telegram bot"
                        >
                          {copiedId === user.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Link Code
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== CLIENTS TAB ====================

function ClientsTab() {
  const { clients, loading, createClient, updateClient, deleteClient } =
    useClients();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingClient(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, description: client.description || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient({ ...formData, is_active: true });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`))
      return;

    try {
      await deleteClient(client.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Clients</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No clients yet. Add one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Description
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {client.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingClient ? "Edit Client" : "Add Client"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== PRODUCTS TAB ====================

function ProductsTab() {
  const { products, loading, createProduct, updateProduct, deleteProduct } =
    useProducts();
  const { clients } = useClients();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: "", prefix: "", client_id: "" });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      prefix: product.prefix,
      client_id: product.client_id || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prefix.trim()) {
      alert("Name and Prefix are required");
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct({ ...formData, is_active: true, client_id: formData.client_id || null });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete product "${product.name}"?`)) return;

    try {
      await deleteProduct(product.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Products</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No products yet. Add one to enable ticket creation.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Prefix
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Client
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-indigo-600 font-semibold">
                      {product.prefix}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {product.client?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProduct ? "Edit Product" : "Add Product"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              label="Prefix (2-5 uppercase letters)"
              value={formData.prefix}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prefix: e.target.value.toUpperCase(),
                })
              }
              required
              maxLength={5}
              placeholder="e.g., ZB, DOB, RZ"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client (Optional)
              </label>
              <select
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== PROJECTS TAB ====================

function ProjectsTab() {
  const { projects, loading, createProject, updateProject, deleteProject } =
    useProjects();
  const { clients } = useClients();
  const { products } = useProducts();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    product_id: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({ name: "", product_id: "", client_id: "" });
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      product_id: project.product_id || "",
      client_id: project.client_id || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject({
          ...formData,
          product_id: formData.product_id || null,
          client_id: formData.client_id || null,
          is_active: true,
        });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"?`)) return;

    try {
      await deleteProject(project.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No projects yet. Projects are optional for organizing tickets.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Product
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Client
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {project.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.product?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.client?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProject ? "Edit Project" : "Add Project"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product (Optional)
              </label>
              <select
                value={formData.product_id}
                onChange={(e) =>
                  setFormData({ ...formData, product_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client (Optional)
              </label>
              <select
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== SPRINTS TAB ====================

function SprintsTab() {
  const { sprints, loading, createSprint, updateSprint, deleteSprint } =
    useSprints();
  const [showModal, setShowModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "Aktif",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingSprint(null);
    setFormData({ name: "", start_date: "", end_date: "", status: "Aktif" });
    setShowModal(true);
  };

  const handleEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.start_date ||
      !formData.end_date
    ) {
      alert("Name, start date, and end date are required");
      return;
    }

    setSaving(true);
    try {
      if (editingSprint) {
        await updateSprint(editingSprint.id, formData);
      } else {
        await createSprint(formData);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sprint: Sprint) => {
    if (!confirm(`Delete sprint "${sprint.name}"?`)) return;

    try {
      await deleteSprint(sprint.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Sprints</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No sprints yet. Sprints are optional for organizing work by time period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  End Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {sprint.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(sprint.start_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(sprint.end_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        sprint.status === "Aktif"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sprint.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(sprint)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingSprint ? "Edit Sprint" : "Add Sprint"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Sprint 24"
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
