"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/utils/supabase";
import { Loader2, Plus, Trash2, Lightbulb } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export default function NotesPage() {
  const router = useRouter();
  const { session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    
    // Protect route: Only Nashwa
    if (session.profile.name !== "Nashwa") {
      router.replace("/board");
      return;
    }

    fetchNotes();
  }, [session, router]);

  async function fetchNotes() {
    try {
      const { data, error } = await supabase
        .from("user_notes")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching notes:", error);
      } else {
        setNotes(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || !session) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("user_notes")
        .insert([{ user_id: session.user.id, content: newNote.trim() }])
        .select();
        
      if (error) throw error;
      
      if (data) {
        setNotes((prev) => [data[0], ...prev]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note", err);
      alert("Gagal menyimpan ide. Pastikan tabel user_notes sudah dibuat di Supabase.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus ide ini?")) return;
    
    try {
      const { error } = await supabase.from("user_notes").delete().eq("id", id);
      if (error) throw error;
      
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  if (!session || session.profile.name !== "Nashwa") {
    return null; // Akan dialihkan di useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <div className="p-3 bg-amber-100 rounded-2xl shadow-inner">
            <Lightbulb className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Ide Box Nashwa</h1>
            <p className="text-slate-500 mt-1">Tempat untuk menumpahkan segala kreativitas dan corat-coret.</p>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleAddNote} className="mb-12 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200 to-orange-200 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-start">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ada ide brilian apa hari ini? Ketik di sini..."
              className="flex-1 w-full bg-transparent resize-none border-none outline-none focus:ring-0 text-lg text-slate-700 placeholder-slate-400 min-h-[100px]"
              required
            />
            <button
              type="submit"
              disabled={submitting || !newNote.trim()}
              className="w-full md:w-auto px-6 py-4 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Simpan Ide
                </>
              )}
            </button>
          </div>
        </form>

        {/* Daftar Catatan */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
            <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Belum ada ide yang tersimpan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <div 
                key={note.id} 
                className="group relative bg-amber-50 hover:bg-amber-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-amber-200/50 flex flex-col min-h-[200px]"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
                }}
              >
                {/* Lipatan ujung kertas (Sticky note fold effect) */}
                <div className="absolute bottom-0 right-0 w-[20px] h-[20px] bg-amber-200/80 rounded-tl-lg" />
                
                <p className="text-slate-800 flex-1 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
                <div className="mt-4 flex items-end justify-between pt-4 border-t border-amber-200/50">
                  <p className="text-xs text-amber-700/70 font-medium">
                    {new Date(note.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-amber-600 hover:text-red-500 hover:bg-white/60 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Hapus Ide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
