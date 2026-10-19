// =====================================================
// Leaderboard Image — render papan peringkat jadi PNG (canvas)
//
// Dua format: "story" (1080x1920, IG/WA story) dan "square" (1080x1080,
// feed). Digambar langsung dengan Canvas 2D supaya tidak butuh
// dependensi tambahan dan hasilnya konsisten di semua browser.
// =====================================================

import { BOARDS, avatarColors, hashString, initials, type BoardKey, type BoardRow } from "@/lib/leaderboard";

export type ImageFormat = "story" | "square";

export const IMAGE_FORMATS: Record<ImageFormat, { label: string; width: number; height: number }> = {
  story: { label: "Story 9:16", width: 1080, height: 1920 },
  square: { label: "Persegi 1:1", width: 1080, height: 1080 },
};

export interface LeaderboardImageOptions {
  board: BoardKey;
  rows: BoardRow[];
  format: ImageFormat;
  /** Keterangan konteks, mis. "Bulan Ini · Development". */
  subtitle: string;
  /** font-family CSS yang dipakai di aplikasi (supaya serasi dengan UI). */
  fontFamily?: string;
}

interface Layout {
  pillY: number;
  tagline: boolean;
  titleY: number;
  titleSize: number;
  podiumBase: number;
  podiumScale: number;
  listStart: number;
  listRows: number;
  footerY: number;
}

const LAYOUTS: Record<ImageFormat, Layout> = {
  story: { pillY: 120, tagline: true, titleY: 330, titleSize: 92, podiumBase: 1305, podiumScale: 1, listStart: 1385, listRows: 3, footerY: 1855 },
  square: { pillY: 48, tagline: false, titleY: 192, titleSize: 66, podiumBase: 935, podiumScale: 0.85, listStart: 0, listRows: 0, footerY: 1010 },
};

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const PODIUM_COLORS: ReadonlyArray<{ ring: string; top: string; bottom: string }> = [
  { ring: "#fcd34d", top: "#fde68a", bottom: "#f59e0b" },
  { ring: "#e2e8f0", top: "#f1f5f9", bottom: "#94a3b8" },
  { ring: "#fdba74", top: "#fed7aa", bottom: "#c2410c" },
];

// ─── Helpers ─────────────────────────────────────────

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxW || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, maxW);
    return kept;
  }
  return lines;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, seed: string) {
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, "#1e1b4b");
  bg.addColorStop(0.45, "#4c1d95");
  bg.addColorStop(0.8, "#9d174d");
  bg.addColorStop(1, "#be185d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.85, H * 0.08, W * 0.7, "rgba(251,191,36,0.35)");
  glow(W * 0.05, H * 0.45, W * 0.8, "rgba(99,102,241,0.45)");
  glow(W * 0.9, H * 0.92, W * 0.8, "rgba(244,114,182,0.4)");

  // Konfeti deterministik (seed dari papan) supaya gambar yang sama tiap render.
  let state = hashString(seed) || 1;
  const rand = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const colors = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#ffffff"];
  const count = Math.round((W * H) / 14000);
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const size = 8 + rand() * 18;
    ctx.save();
    ctx.globalAlpha = 0.18 + rand() * 0.35;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    if (rand() > 0.5) {
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  row: BoardRow,
  cx: number,
  cy: number,
  r: number,
  ring: string | null,
  font: string,
) {
  const [c1, c2] = avatarColors(row.userId);
  if (ring) {
    ctx.save();
    ctx.shadowColor = ring;
    ctx.shadowBlur = r * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
    ctx.restore();
  }
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.round(r * 0.78)}px ${font}`;
  ctx.fillText(initials(row.name), cx, cy + r * 0.04);
}

function drawPodium(
  ctx: CanvasRenderingContext2D,
  rows: BoardRow[],
  unit: string,
  W: number,
  L: Layout,
  font: string,
) {
  const s = L.podiumScale;
  const colW = 320;
  const gap = 24;
  const centers = [W / 2, W / 2 - (colW + gap), W / 2 + (colW + gap)]; // juara 1, 2, 3
  const heights = [330 * s, 250 * s, 200 * s];
  const avatarR = [96 * s, 78 * s, 70 * s];

  for (let rank = 0; rank < 3; rank++) {
    const row = rows[rank];
    if (!row) continue;
    const cx = centers[rank];
    const col = PODIUM_COLORS[rank];
    const h = heights[rank];
    const top = L.podiumBase - h;

    // Blok podium
    const g = ctx.createLinearGradient(0, top, 0, L.podiumBase);
    g.addColorStop(0, col.top);
    g.addColorStop(1, col.bottom);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    roundRectPath(ctx, cx - colW / 2, top, colW, h, [28, 28, 0, 0]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // Medali + skor di dalam blok
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${Math.round(78 * s)}px ${font}`;
    ctx.fillStyle = "#000";
    ctx.fillText(MEDALS[rank], cx, top + 92 * s);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 8;
    ctx.font = `900 ${Math.round(70 * s)}px ${font}`;
    const scoreW = ctx.measureText(row.score).width;
    ctx.fillText(row.score, cx - (unit ? 18 * s : 0), top + 92 * s + 78 * s);
    ctx.shadowBlur = 0;
    if (unit) {
      ctx.font = `700 ${Math.round(28 * s)}px ${font}`;
      ctx.textAlign = "left";
      ctx.fillText(unit, cx - 18 * s + scoreW / 2 + 8, top + 92 * s + 78 * s);
      ctx.textAlign = "center";
    }

    // Avatar, nama, gelar (di atas blok)
    const ay = top - avatarR[rank] - 150 * s;
    drawAvatar(ctx, row, cx, ay, avatarR[rank], col.ring, font);
    if (rank === 0) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${Math.round(84 * s)}px ${font}`;
      ctx.fillText("👑", cx, ay - avatarR[rank] - 14);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${Math.round(40 * s)}px ${font}`;
    ctx.fillText(fitText(ctx, row.name, colW), cx, ay + avatarR[rank] + 56 * s);

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = `italic 500 ${Math.round(26 * s)}px ${font}`;
    const lines = wrapLines(ctx, row.title, colW + 10, 2);
    lines.forEach((ln, i) => ctx.fillText(ln, cx, ay + avatarR[rank] + 56 * s + 38 * s + i * 32 * s));
  }
}

function drawList(
  ctx: CanvasRenderingContext2D,
  rows: BoardRow[],
  unit: string,
  W: number,
  L: Layout,
  font: string,
) {
  const items = rows.slice(3, 3 + L.listRows);
  const x = 90;
  const w = W - 180;
  const h = 116;
  const gap = 14;

  items.forEach((row, i) => {
    const y = L.listStart + i * (h + gap);
    roundRectPath(ctx, x, y, w, h, 30);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `900 40px ${font}`;
    ctx.fillText(`#${i + 4}`, x + 62, y + h / 2);

    drawAvatar(ctx, row, x + 160, y + h / 2, 38, null, font);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 34px ${font}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fitText(ctx, row.name, w - 440), x + 220, y + 52);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `italic 500 24px ${font}`;
    ctx.fillText(fitText(ctx, row.title, w - 440), x + 220, y + 88);

    ctx.textAlign = "right";
    ctx.fillStyle = "#fde68a";
    ctx.font = `900 50px ${font}`;
    ctx.textBaseline = "middle";
    ctx.fillText(row.score, x + w - (unit ? 100 : 36), y + h / 2);
    if (unit) {
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `700 24px ${font}`;
      ctx.fillText(unit, x + w - 92, y + h / 2 + 6);
    }
  });

  const more = rows.length - 3 - items.length;
  if (more > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `600 26px ${font}`;
    ctx.fillText(`+ ${more} peserta lainnya`, W / 2, L.listStart + items.length * (h + gap) + 30);
  }
}

// ─── Main ────────────────────────────────────────────

export async function renderLeaderboardImage(opts: LeaderboardImageOptions): Promise<Blob> {
  const { board, rows, format, subtitle } = opts;
  const { width: W, height: H } = IMAGE_FORMATS[format];
  const L = LAYOUTS[format];
  const font = opts.fontFamily || "system-ui, sans-serif";
  const cfg = BOARDS[board];

  // Pastikan font aplikasi sudah termuat sebelum menggambar.
  try {
    await Promise.all(
      ["500", "700", "800", "900"].map((wt) => document.fonts.load(`${wt} 32px ${font}`, "Aa")),
    );
  } catch {
    /* pakai font fallback */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung di browser ini.");

  drawBackground(ctx, W, H, `${board}-${format}`);

  // Header
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const pillY = L.pillY;
  roundRectPath(ctx, W / 2 - 250, pillY, 500, 66, 33);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 30px ${font}`;
  ctx.fillText("🏆  PAPAN PERINGKAT", W / 2, pillY + 44);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${L.titleSize}px ${font}`;
  ctx.fillText(fitText(ctx, `${cfg.emoji} ${cfg.label}`, W - 120), W / 2, L.titleY);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `italic 500 ${format === "story" ? 34 : 28}px ${font}`;
  const taglineLines = L.tagline ? wrapLines(ctx, cfg.tagline, W - 220, 2) : [];
  taglineLines.forEach((ln, i) => ctx.fillText(ln, W / 2, L.titleY + 60 + i * 44));

  const chipY = taglineLines.length > 0 ? L.titleY + 60 + taglineLines.length * 44 + 14 : L.titleY + 30;
  ctx.font = `700 ${format === "story" ? 28 : 24}px ${font}`;
  const chipW = Math.min(W - 160, ctx.measureText(subtitle).width + 70);
  roundRectPath(ctx, W / 2 - chipW / 2, chipY, chipW, 54, 27);
  ctx.fillStyle = "#fde68a";
  ctx.fill();
  ctx.fillStyle = "#78350f";
  ctx.fillText(fitText(ctx, subtitle, chipW - 40), W / 2, chipY + 37);

  // Isi
  drawPodium(ctx, rows, cfg.unit, W, L, font);
  if (L.listRows > 0) drawList(ctx, rows, cfg.unit, W, L, font);

  // Footer
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${format === "story" ? 34 : 28}px ${font}`;
  ctx.fillText("MST Workspace", W / 2, L.footerY);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `500 ${format === "story" ? 24 : 20}px ${font}`;
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillText(`${today} · Yuk kejar posisi #1! 🚀`, W / 2, L.footerY + (format === "story" ? 40 : 34));

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar."))), "image/png");
  });
}
