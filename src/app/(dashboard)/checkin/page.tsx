"use client";

// =====================================================
// Check-In List Page — Daily Standup
//
// Menampilkan check-in harian. Filter default: Check In Today.
// Kolom: Created On, Employee, Divisi, Action Items, Yesterday
// Problem, Tickets — sesuai ERP "Gawean" reference.
// =====================================================

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusCircle, Search, X } from "lucide-react";
import { useCheckins } from "@/hooks/useCheckins";
import { useCheckinStreaks } from "@/hooks/useCheckinStreaks";
import { useSession } from "@/hooks/useSession";
import { Button, Badge, EmptyState } from "@/components/ui";

type GroupBy = "none" | "employee" | "division" | "date";

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Tanpa Group",
  employee: "Employee",
  division: "Divisi",
  date: "Tanggal",
};

export default function CheckinListPage() {
  const router = useRouter();
  const [todayOnly, setTodayOnly] = useState(true);
  const { checkins, loading, error } = useCheckins(todayOnly);
  const { session } = useSession();
  const { getStreakData, loading: streakLoading, refresh: refreshStreaks } = useCheckinStreaks();
  const myStreakData = session ? getStreakData(session.profile.id) : { streak: 0, missedDate: null };
  const myStreak = myStreakData.streak;
  
  const [restoring, setRestoring] = useState(false);

  // Filter & group by (client-side)
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const employeeOptions = useMemo(
    () =>
      Array.from(
        new Set(checkins.map((c) => c.employee?.name).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b)),
    [checkins],
  );
  const divisionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          checkins
            .map((c) => c.division || c.employee?.division)
            .filter(Boolean) as string[],
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [checkins],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return checkins.filter((c) => {
      if (employeeFilter && c.employee?.name !== employeeFilter) return false;
      if (divisionFilter && (c.division || c.employee?.division) !== divisionFilter) return false;
      if (!q) return true;
      const haystack = [
        c.employee?.name,
        c.yesterday_problem,
        ...(c.items || []).flatMap((i) => [
          i.description,
          i.ticket?.ticket_id,
          i.ticket?.subject,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [checkins, search, employeeFilter, divisionFilter]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: "", rows: filtered }];
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const key =
        groupBy === "employee"
          ? c.employee?.name || "(Tanpa nama)"
          : groupBy === "division"
            ? c.division || c.employee?.division || "(Tanpa divisi)"
            : new Date(c.created_at).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              });
      const arr = map.get(key);
      if (arr) arr.push(c);
      else map.set(key, [c]);
    }
    const entries = Array.from(map.entries());
    // Tanggal: urutan asli (terbaru dulu); lainnya: alfabetis
    if (groupBy !== "date") entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([key, rows]) => ({ key, label: key, rows }));
  }, [filtered, groupBy]);

  const hasFilter = !!(search || employeeFilter || divisionFilter);
  const resetFilters = () => {
    setSearch("");
    setEmployeeFilter("");
    setDivisionFilter("");
  };

  const handleRestoreStreak = async () => {
    if (!session || !myStreakData.missedDate) return;
    
    setRestoring(true);
    try {
      const res = await fetch("/api/checkin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employeeId: session.profile.id, 
          missedDate: myStreakData.missedDate 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memulihkan streak");
      
      alert("Streak berhasil dipulihkan!");
      refreshStreaks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Check In</h1>
          <p className="text-sm text-slate-500 mt-1">
            Daily standup — fokus pekerjaan tim hari ini
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!streakLoading && session && (() => {
            const isCheckedInToday = checkins.some(c => 
              c.employee_id === session.profile.id && 
              new Date(c.created_at).toDateString() === new Date().toDateString()
            );
            return (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center cursor-pointer group"
                  title="Streak dihitung hari kerja (Senin-Jumat) saja"
                >
                  <div className="relative">
                    {/* Efek Glow di belakang icon saat hover */}
                    <div className={`absolute -inset-1 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-500 ${isCheckedInToday ? 'bg-orange-500/50' : 'bg-slate-400/50'}`}></div>
                    
                    {/* Icon dengan efek bounce dan rotasi saat hover */}
                    <div className={`relative ${isCheckedInToday ? "animate-bounce" : "opacity-75 grayscale-[0.5]"}`}>
                      <Image
                        src={isCheckedInToday ? "/streak-active.png" : "/streak-inactive.png"}
                        alt="Streak"
                        width={56}
                        height={56}
                        className="object-contain drop-shadow-xl hover:scale-110 hover:rotate-[6deg] transition-all duration-300"
                      />
                    </div>
                  </div>
                  
                  {/* Angka dengan gradient api (fiery gradient) dan gaya gamified */}
                  <span className={`inline-block -ml-2 py-1 pr-1.5 text-3xl font-black italic tracking-tighter transition-all duration-300 ${
                    isCheckedInToday 
                      ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-transparent bg-clip-text drop-shadow-sm group-hover:scale-110 group-hover:-rotate-3" 
                      : "text-slate-400 group-hover:scale-110"
                  }`}>
                    {myStreak}
                  </span>
                </div>
                
                {/* Tombol Pemulihan */}
                {myStreak === 0 && myStreakData.missedDate && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 ml-2"
                    onClick={handleRestoreStreak}
                    disabled={restoring}
                  >
                    {restoring ? "Memulihkan..." : "Pulihkan Streak"}
                  </Button>
                )}
              </div>
            );
          })()}
          <Button

            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push("/checkin/new")}
          >
            New
          </Button>
        </div>
      </div>

      {/* Quick filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          <Button
            variant={todayOnly ? "primary" : "secondary"}
            size="md"
            onClick={() => setTodayOnly(true)}
          >
            Check In Today
          </Button>
          <Button
            variant={!todayOnly ? "primary" : "secondary"}
            size="md"
            onClick={() => setTodayOnly(false)}
          >
            Semua
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari employee, tiket, action item..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Employee</option>
            {employeeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Semua Divisi</option>
            {divisionOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Group by
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
                <option key={g} value={g}>{GROUP_LABELS[g]}</option>
              ))}
            </select>
          </label>
          {hasFilter && (
            <Button variant="secondary" size="md" icon={<X className="w-4 h-4" />} onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-medium w-44">Created On</th>
                <th className="p-4 font-medium">Employee</th>
                <th className="p-4 font-medium">Divisi</th>
                <th className="p-4 font-medium">Action Items</th>
                <th className="p-4 font-medium">Yesterday Problem</th>
                <th className="p-4 font-medium text-center w-24">Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Memuat check-in...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Belum ada check-in"
                      description={
                        hasFilter
                          ? "Tidak ada check-in yang cocok dengan filter."
                          : todayOnly
                          ? "Belum ada yang check-in hari ini. Buat check-in untuk menandai fokus hari ini."
                          : "Belum ada data check-in."
                      }
                      action={
                        <Button
                          variant="primary"
                          onClick={() => router.push("/checkin/new")}
                        >
                          Buat Check-In
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <Fragment key={group.key || "all"}>
                    {groupBy !== "none" && (
                      <tr className="bg-slate-100/70">
                        <td colSpan={6} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                          {GROUP_LABELS[groupBy]}: {group.label}
                          <span className="ml-2 font-normal normal-case text-slate-400">
                            ({group.rows.length})
                          </span>
                        </td>
                      </tr>
                    )}
                    {group.rows.map((checkin) => (
                  <tr
                    key={checkin.id}
                    onClick={() => router.push(`/checkin/${checkin.id}`)}
                    className="hover:bg-slate-50 align-top cursor-pointer"
                  >
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {formatDateTime(checkin.created_at)}
                    </td>
                    <td className="p-4 font-medium text-slate-900 whitespace-nowrap">
                      {checkin.employee?.name || "-"}
                    </td>
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                      {checkin.division || checkin.employee?.division || "-"}
                    </td>
                    <td className="p-4 text-slate-700">
                      {checkin.items && checkin.items.length > 0 ? (
                        <ul className="space-y-1.5">
                          {checkin.items.map((item) => (
                            <li key={item.id} className="flex flex-col gap-0.5">
                              {item.ticket ? (
                                <span
                                  className="flex items-center gap-2 flex-wrap cursor-pointer hover:text-indigo-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/gawean/${item.ticket?.id}?from=checkin&checkinId=${checkin.id}`);
                                  }}
                                >
                                  <span className="text-slate-400">►</span>
                                  <span className="font-mono text-xs font-semibold text-indigo-600">
                                    {item.ticket.ticket_id}
                                  </span>
                                  <span>{item.ticket.subject}</span>
                                  <Badge
                                    variant="state"
                                    state={item.ticket.state}
                                  />
                                </span>
                              ) : (
                                <span className="flex items-start gap-2">
                                  <span className="text-slate-400">-</span>
                                  <span>{item.description}</span>
                                </span>
                              )}
                              {item.ticket && item.description && (
                                <span className="text-slate-500 text-xs ml-5">
                                  {item.description}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs whitespace-pre-wrap">
                      {checkin.yesterday_problem || "-"}
                    </td>
                    <td className="p-4 text-center text-slate-600">
                      {checkin.items?.filter((i) => i.ticket_id).length || 0}{" "}
                      records
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
