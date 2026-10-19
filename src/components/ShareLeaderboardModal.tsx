"use client";

// =====================================================
// ShareLeaderboardModal — pratinjau + unduh/bagikan gambar peringkat
// =====================================================

import { useEffect, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import {
  IMAGE_FORMATS,
  renderLeaderboardImage,
  type ImageFormat,
} from "@/lib/leaderboard-image";
import type { BoardKey, BoardRow } from "@/lib/leaderboard";

interface Props {
  board: BoardKey;
  rows: BoardRow[];
  subtitle: string;
  onClose: () => void;
}

export function ShareLeaderboardModal({ board, rows, subtitle, onClose }: Props) {
  const [format, setFormat] = useState<ImageFormat>("story");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setRendering(true);
    setError(null);
    const fontFamily = getComputedStyle(document.body).fontFamily;
    renderLeaderboardImage({ board, rows, format, subtitle, fontFamily })
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal membuat gambar.");
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [board, rows, format, subtitle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filename = `peringkat-${board}-${new Date().toISOString().slice(0, 10)}-${format}.png`;

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Papan Peringkat MST" });
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") setNote("Gagal membagikan. Coba unduh dulu.");
      }
    } else {
      handleDownload();
      setNote("Browser ini belum mendukung berbagi langsung — gambar diunduh, silakan unggah ke story. 📲");
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.canShare;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Bagikan Peringkat</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3 flex gap-2">
          {(Object.keys(IMAGE_FORMATS) as ImageFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                format === f
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {IMAGE_FORMATS[f].label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex justify-center bg-slate-50 mt-3">
          {rendering && !url ? (
            <div className="py-20 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan gambar…
            </div>
          ) : error ? (
            <p className="py-16 text-sm text-red-600">{error}</p>
          ) : (
            url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Pratinjau papan peringkat"
                className={`rounded-xl shadow-lg max-h-[60vh] w-auto ${rendering ? "opacity-50" : ""}`}
              />
            )
          )}
        </div>

        {note && <p className="px-4 pt-2 text-xs text-slate-500">{note}</p>}

        <div className="p-4 flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!blob || rendering}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Unduh PNG
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!blob || rendering}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" /> {canNativeShare ? "Bagikan ke Story" : "Unduh & Bagikan"}
          </button>
        </div>
      </div>
    </div>
  );
}
