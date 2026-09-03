"use client";

// =====================================================
// Ajukan Tiket Baru (Ticket Request)
//
// Untuk user yang tidak punya akses create ticket langsung
// (lihat canCreateTicket di gawean/new). Mereka isi form ini,
// lalu admin melihat & memprosesnya di Dashboard Admin.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/utils/supabase/client";
import { TICKET_PRIORITIES, TICKET_CATEGORIES } from "@/lib/constants";
import type { TicketCategory, TicketPriority } from "@/types";

export default function RequestTicketPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { clients, loading: loadingClients } = useClients();
  const { products, loading: loadingProducts } = useProducts();

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "normal" as TicketPriority,
    category: "" as TicketCategory | "",
    client_id: "",
    product_id: "",
  });

  const filteredProducts = formData.client_id
    ? products.filter((p) => p.client_id === formData.client_id)
    : products;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.subject.trim()) {
      setError("Judul tiket wajib diisi");
      return;
    }
    if (!session?.profile?.id) {
      setError("Sesi tidak valid, silakan login ulang");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("ticket_requests")
        .insert({
          requested_by: session.profile.id,
          subject: formData.subject.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category: formData.category || null,
          client_id: formData.client_id || null,
          product_id: formData.product_id || null,
          status: "pending",
        });

      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit ticket request:", err);
      const message =
        err instanceof Error ? err.message : "Gagal mengajukan tiket";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || loadingClients || loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Pengajuan Terkirim
            </h1>
            <p className="text-slate-600 mb-6">
              Permintaan tiket kamu sudah dikirim ke admin dan akan diproses
              secepatnya.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => router.push("/gawean")}>
                Kembali ke Daftar Tiket
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    subject: "",
                    description: "",
                    priority: "normal",
                    category: "",
                    client_id: "",
                    product_id: "",
                  });
                }}
              >
                Ajukan Lagi
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/gawean")}
          className="mb-4"
        >
          Kembali
        </Button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Ajukan Tiket Baru
        </h1>
        <p className="text-slate-600 mb-6">
          Isi detail kebutuhanmu di bawah. Admin akan meninjau dan membuatkan
          tiketnya.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
        >
          <Input
            label="Judul"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            placeholder="Ringkasan singkat kebutuhan"
            required
            maxLength={500}
          />

          <Textarea
            label="Deskripsi (Opsional)"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Jelaskan detail kebutuhan, konteks, atau lampiran referensi"
            rows={5}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Prioritas"
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as TicketPriority,
                })
              }
              options={TICKET_PRIORITIES.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />

            <Select
              label="Kategori (Opsional)"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as TicketCategory,
                })
              }
              options={[
                { value: "", label: "-- Tidak tahu --" },
                ...TICKET_CATEGORIES.map((c) => ({
                  value: c.value,
                  label: c.label,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Client (Opsional)"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client_id: e.target.value,
                  product_id: "",
                })
              }
              options={[
                { value: "", label: "-- Tidak tahu --" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Select
              label="Product (Opsional)"
              value={formData.product_id}
              onChange={(e) =>
                setFormData({ ...formData, product_id: e.target.value })
              }
              options={[
                { value: "", label: "-- Tidak tahu --" },
                ...filteredProducts.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/gawean")}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              icon={<Send className="w-4 h-4" />}
            >
              Kirim Pengajuan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
