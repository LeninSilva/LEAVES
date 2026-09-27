import { useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Accounts use Supabase Auth. On first launch the app quietly creates an
 * anonymous account so writing can start at once and backups work from the
 * first entry; signing in later with an email link, Apple or Google links that
 * account so nothing moves. Without Supabase settings, everything stays on the
 * device and these helpers do nothing.
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = Boolean(URL_ && KEY);

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function supabase(): Promise<SupabaseClient | null> {
  if (!cloudConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(URL_!, KEY!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
  }
  return clientPromise;
}

export async function accessToken(): Promise<string | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function currentUser(): Promise<User | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

/** Makes sure there is a session, anonymous if needed. Safe to call often. */
export async function ensureSession(): Promise<User | null> {
  const sb = await supabase();
  if (!sb || !navigator.onLine) return null;
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error) return null;
  return anon.user;
}

const redirectTo = () => `${location.origin}/settings/account`;

export async function signInWithEmail(email: string): Promise<{ ok: boolean; message: string }> {
  const sb = await supabase();
  if (!sb) return { ok: false, message: "Sign-in isn't set up on this server." };
  const user = await currentUser();
  if (user?.is_anonymous) {
    const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: redirectTo() });
    if (!error) return { ok: true, message: "Check your email for a link to finish signing in." };
    // The address may already have an account from another device: sign into it instead.
  }
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) return { ok: false, message: "Couldn't send the link. Check the address and try again." };
  return { ok: true, message: "Check your email for a link to finish signing in." };
}

export async function signInWithProvider(provider: "google" | "apple") {
  const sb = await supabase();
  if (!sb) return;
  const user = await currentUser();
  if (user?.is_anonymous) {
    const { error } = await sb.auth.linkIdentity({ provider, options: { redirectTo: redirectTo() } });
    if (!error) return;
  }
  await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
}

export async function signOut() {
  const sb = await supabase();
  await sb?.auth.signOut();
}

export interface AuthState {
  configured: boolean;
  user: User | null;
  /** True for the quiet anonymous account made on first launch. */
  anonymous: boolean;
  ready: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    configured: cloudConfigured,
    user: null,
    anonymous: true,
    ready: !cloudConfigured,
  });
  useEffect(() => {
    let off: (() => void) | undefined;
    supabase().then((sb) => {
      if (!sb) return;
      sb.auth.getSession().then(({ data }) => {
        const user = data.session?.user ?? null;
        setState({ configured: true, user, anonymous: !user || !!user.is_anonymous, ready: true });
      });
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        const user = session?.user ?? null;
        setState({ configured: true, user, anonymous: !user || !!user.is_anonymous, ready: true });
      });
      off = () => data.subscription.unsubscribe();
    });
    return () => off?.();
  }, []);
  return state;
}
