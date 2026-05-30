"use client";

// =====================================================
// useSession — React hook untuk session Supabase Auth
// Sprint 1 / Foundation
//
// Subscribe ke supabase.auth state changes, dan auto-fetch
// profile user dari public.users (berdasar auth_user_id).
//
// Fallback: kalau profile by auth_user_id tidak ditemukan,
// coba lookup by email (kasus migration belum jalan / linkage
// rusak). Status pencarian dilaporkan via field `profileStatus`
// supaya UI bisa kasih pesan jelas, bukan blank screen.
// =====================================================

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import type { SessionUser, User } from "@/types";

export type ProfileStatus =
  | "ok"               // profile ditemukan & linked
  | "linked_by_email"  // profile ada tapi auth_user_id null (perlu repair)
  | "not_found"        // tidak ada profile sama sekali
  | "error";           // query error (RLS / network / etc)

interface UseSessionResult {
  /** undefined = loading, null = tidak login, SessionUser = login OK */
  session: SessionUser | null | undefined;
  loading: boolean;
  /** Status pencarian profile, untuk error UI */
  profileStatus: ProfileStatus | null;
  /** Pesan error kalau ada (network / RLS) */
  profileError: string | null;
  /** Email auth saat ini (kalau login) — berguna saat profile null */
  authEmail: string | null;
  signOut: () => Promise<void>;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<SessionUser | null | undefined>(
    undefined,
  );
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(
    null,
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(authId: string, email: string) {
      setAuthEmail(email);

      // Step 1: lookup by auth_user_id (path normal)
      const byAuthId = await supabase
        .from("users")
        .select("*")
        .eq("auth_user_id", authId)
        .maybeSingle();

      if (cancelled) return;

      if (byAuthId.error) {
        console.error(
          "[useSession] error querying users by auth_user_id:",
          byAuthId.error,
        );
        setProfileStatus("error");
        setProfileError(byAuthId.error.message);
        setSession(null);
        return;
      }

      if (byAuthId.data) {
        setProfileStatus("ok");
        setProfileError(null);
        setSession({
          authId,
          email,
          profile: byAuthId.data as User,
        });
        return;
      }

      // Step 2: fallback — lookup by email
      console.warn(
        `[useSession] profile not found for auth_user_id=${authId}; trying fallback by email=${email}`,
      );

      const byEmail = await supabase
        .from("users")
        .select("*")
        .ilike("email", email)
        .maybeSingle();

      if (cancelled) return;

      if (byEmail.error) {
        console.error(
          "[useSession] error querying users by email:",
          byEmail.error,
        );
        setProfileStatus("error");
        setProfileError(byEmail.error.message);
        setSession(null);
        return;
      }

      if (byEmail.data) {
        console.warn(
          "[useSession] profile found by email but auth_user_id is missing. Run migration 04_repair_profile_linkage.sql.",
        );
        setProfileStatus("linked_by_email");
        setProfileError(null);
        // Tetap sediakan profile supaya app jalan; admin bisa fix linkage nanti.
        setSession({
          authId,
          email,
          profile: byEmail.data as User,
        });
        return;
      }

      console.error(
        `[useSession] profile not found for email=${email}. Run migration 02_seed_auth_users.sql.`,
      );
      setProfileStatus("not_found");
      setProfileError(null);
      setSession(null);
    }

    // Initial check
    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      if (cancelled) return;
      if (!authSession?.user) {
        setSession(null);
        setProfileStatus(null);
        setAuthEmail(null);
        return;
      }
      void loadProfile(authSession.user.id, authSession.user.email ?? "");
    });

    // Subscribe to changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, authSession) => {
        if (cancelled) return;
        if (!authSession?.user) {
          setSession(null);
          setProfileStatus(null);
          setAuthEmail(null);
          return;
        }
        void loadProfile(authSession.user.id, authSession.user.email ?? "");
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfileStatus(null);
    setAuthEmail(null);
    setProfileError(null);
  }

  return {
    session,
    loading: session === undefined,
    profileStatus,
    profileError,
    authEmail,
    signOut,
  };
}
