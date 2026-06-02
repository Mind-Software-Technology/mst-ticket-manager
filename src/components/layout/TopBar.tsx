"use client";

// =====================================================
// TopBar — top navigation per PRD §6.1
// Sprint 2 / Modul Gawean
//
// Menu items:
//   - Gawean (semua user)
//   - Check In (semua user)
//   - Config (admin only)
//
// Mobile: hamburger menu yang menampilkan link sebagai stack.
// =====================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck2,
  ChevronDown,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  Settings,
  Shield,
  X,
} from "lucide-react";
import type { SessionUser } from "@/types";
import { canManageConfig } from "@/lib/permissions";

interface TopBarProps {
  session: SessionUser;
  onLogout: () => void | Promise<void>;
}

interface NavLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Match path prefix (mis. /gawean cocok untuk /gawean & /gawean/[id]) */
  match: string;
  show: boolean;
}

export function TopBar({ session, onLogout }: TopBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const links: NavLink[] = [
    { label: "Gawean",   href: "/gawean",  icon: ListChecks,      match: "/gawean",  show: true },
    { label: "Check In", href: "/checkin", icon: CalendarCheck2,  match: "/checkin", show: true },
    {
      label: "Config",
      href: "/config",
      icon: Settings,
      match: "/config",
      show: canManageConfig(session.profile),
    },
  ];

  const isActive = (match: string) =>
    pathname === match || pathname?.startsWith(`${match}/`);

  const initial = session.profile.name?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo + brand */}
        <div className="flex items-center gap-2 md:gap-6 flex-1 min-w-0">
          <Link href="/gawean" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-bold text-slate-900 hidden sm:inline">
              MST Ticket
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links
              .filter((l) => l.show)
              .map((link) => {
                const Icon = link.icon;
                const active = isActive(link.match);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Right side: user menu + hamburger */}
        <div className="flex items-center gap-2">
          {/* User dropdown — desktop & mobile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium text-slate-900">
                  {session.profile.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {session.profile.is_admin ? "Admin" : "Member"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                {/* Backdrop untuk close on outside click */}
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {session.profile.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{session.email}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {session.profile.role}
                    </p>
                    {session.profile.is_admin && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-slate-200 bg-white">
          <ul className="py-2">
            {links
              .filter((l) => l.show)
              .map((link) => {
                const Icon = link.icon;
                const active = isActive(link.match);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                        active
                          ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
      )}
    </header>
  );
}
