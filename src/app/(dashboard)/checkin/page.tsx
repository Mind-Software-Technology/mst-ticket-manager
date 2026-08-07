"use client";

// =====================================================
// Check-In List Page — Daily Standup
//
// Menampilkan check-in harian. Filter default: Check In Today.
// Kolom: Created On, Employee, Divisi, Action Items, Yesterday
// Problem, Tickets — sesuai ERP "Gawean" reference.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusCircle, Flame } from "lucide-react";
import { useCheckins } from "@/hooks/useCheckins";
import { useCheckinStreaks } from "@/hooks/useCheckinStreaks";
import { useSession } from "@/hooks/useSession";
import { Button, Badge, EmptyState } from "@/components/ui";

export default function CheckinListPage() {
  const router = useRouter();
  const [todayOnly, setTodayOnly] = useState(true);
  const { checkins, loading, error } = useCheckins(todayOnly);
  const { session } = useSession();
  const { getStreak, loading: streakLoading } = useCheckinStreaks();
  const myStreak = session ? getStreak(session.profile.id) : 0;

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
              <div
                className="flex items-center gap-1.5"
                title="Streak dihitung hari kerja (Senin-Jumat) saja"
              >
                <Image
                  src={isCheckedInToday ? "/streak-active.png" : "/streak-inactive.png"}
                  alt="Streak"
                  width={24}
                  height={24}
                  className="object-contain drop-shadow-sm"
                />
                <span className={`text-sm font-bold ${
                  isCheckedInToday ? "text-orange-600" : "text-slate-500"
                }`}>
                  {myStreak} hari beruntun
                </span>
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
              ) : checkins.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      title="Belum ada check-in"
                      description={
                        todayOnly
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
                checkins.map((checkin) => (
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
                                    router.push(`/gawean/${item.ticket?.id}`);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
