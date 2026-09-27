import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

let admin: SupabaseClient | null | undefined;
let verifier: SupabaseClient | null | undefined;

/** Service-role client, used only for reminders and account deletion. Never sent to browsers. */
export function supabaseAdmin(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = url() && key ? createClient(url()!, key, options) : null;
  return admin;
}

/** Accounts are on when the server can check who is signed in. */
export function accountsConfigured(): boolean {
  return Boolean(url() && (process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey()));
}

function tokenVerifier(): SupabaseClient | null {
  if (verifier !== undefined) return verifier;
  verifier = supabaseAdmin() ?? (url() && anonKey() ? createClient(url()!, anonKey()!, options) : null);
  return verifier;
}

/** Returns the user id for a signed-in account's token, or null. Anonymous sessions don't count. */
export async function userFromToken(token: string | undefined): Promise<string | null> {
  const sb = tokenVerifier();
  if (!sb || !token) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) return null;
  return data.user.id;
}
