import { useEffect, useState } from "react";
import type { AuthError, SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Accounts use Supabase Auth: email and password, Google, or Apple. Each
 * account gets its own notebook on the device (see session.ts). Without
 * Supabase settings, everything stays on the device and these helpers do nothing.
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = Boolean(URL_ && KEY);
export const MIN_PASSWORD = 8;

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

/** A real account. Anonymous sessions from older versions count as guests. */
export function isAccount(user: User | null | undefined): user is User {
  return !!user && !user.is_anonymous;
}

export async function currentUser(): Promise<User | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

export async function accessToken(): Promise<string | null> {
  const sb = await supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return isAccount(data.session?.user) ? data.session.access_token : null;
}

// ---- sign-in methods -------------------------------------------------------

export type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

const NOT_SET_UP: AuthResult = { ok: false, message: "Accounts aren't set up on this server." };

function friendly(error: AuthError): string {
  if (!navigator.onLine || error.name === "AuthRetryableFetchError") return "Couldn't connect. Check your connection and try again.";
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match. Try again, or reset your password.";
    case "email_not_confirmed":
      return "Confirm your email first. Open the link we sent you, then sign in.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with this email. Sign in instead.";
    case "weak_password":
      return `Choose a longer password, with at least ${MIN_PASSWORD} characters.`;
    case "same_password":
      return "That's your current password. Choose a new one.";
    case "email_address_invalid":
      return "Check the email address and try again.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many tries for now. Wait a minute and try again.";
    case "signup_disabled":
      return "New accounts are closed on this server.";
    default:
      return error.status === 429 ? "Too many tries for now. Wait a minute and try again." : "Something went wrong. Try again.";
  }
}

const home = () => `${location.origin}/`;

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const sb = await supabase();
  if (!sb) return NOT_SET_UP;
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: home() } });
  if (error) return { ok: false, message: friendly(error) };
  // With email confirmation on, an address that already has an account comes back with no identities.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, message: "There's already an account with this email. Sign in instead." };
  }
  if (!data.session) return { ok: true, message: `Almost there. Open the link we sent to ${email} to confirm it's you.` };
  return { ok: true };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const sb = await supabase();
  if (!sb) return NOT_SET_UP;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const sb = await supabase();
  if (!sb) return NOT_SET_UP;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
  if (error && (error.status === 429 || !navigator.onLine)) return { ok: false, message: friendly(error) };
  // Same answer either way, so the form never reveals who has an account.
  return { ok: true, message: `If there's an account for ${email}, a link to choose a new password is on its way.` };
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  const sb = await supabase();
  if (!sb) return NOT_SET_UP;
  const { error } = await sb.auth.updateUser({ password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export type Provider = "google" | "apple";

export async function signInWithProvider(provider: Provider, next = "/"): Promise<AuthResult> {
  const sb = await supabase();
  if (!sb) return NOT_SET_UP;
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}${next}` } });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export interface Providers {
  email: boolean;
  google: boolean;
  apple: boolean;
}

let providersPromise: Promise<Providers> | null = null;

/** Which sign-in methods are turned on in Supabase, so no button leads nowhere. */
export function enabledProviders(): Promise<Providers> {
  if (!providersPromise) {
    providersPromise = fetch(`${URL_}/auth/v1/settings`, { headers: { apikey: KEY! } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: { external?: Partial<Providers> }) => ({
        email: s.external?.email !== false,
        google: !!s.external?.google,
        apple: !!s.external?.apple,
      }))
      .catch(() => {
        providersPromise = null;
        return { email: true, google: true, apple: true };
      });
  }
  return providersPromise;
}

/** How this person signs in, for the Account screen. */
export function signInMethod(user: User): "email" | Provider {
  const p = user.app_metadata?.provider;
  return p === "google" || p === "apple" ? p : "email";
}

// ---- state for screens -----------------------------------------------------

export interface AuthState {
  configured: boolean;
  user: User | null;
  signedIn: boolean;
  ready: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    configured: cloudConfigured,
    user: null,
    signedIn: false,
    ready: !cloudConfigured,
  });
  useEffect(() => {
    let off: (() => void) | undefined;
    let live = true;
    supabase().then((sb) => {
      if (!sb || !live) return;
      const set = (user: User | null) => setState({ configured: true, user, signedIn: isAccount(user), ready: true });
      sb.auth.getSession().then(({ data }) => live && set(data.session?.user ?? null));
      const { data } = sb.auth.onAuthStateChange((_event, session) => live && set(session?.user ?? null));
      off = () => data.subscription.unsubscribe();
    });
    return () => {
      live = false;
      off?.();
    };
  }, []);
  return state;
}
