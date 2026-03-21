import { supabase } from './supabase';

export async function loginTeam(username, password) {
  const { data, error } = await supabase.from('team_users').select('*').eq('username', username).eq('password_hash', password).eq('is_active', true).single();
  if (error || !data) return null;
  return { user: data, type: 'team' };
}

export async function loginClient(username, password) {
  const { data, error } = await supabase.from('client_users').select('*').eq('username', username).eq('password_hash', password).eq('is_active', true).single();
  if (error || !data) return null;
  return { user: data, type: 'client' };
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('e32o_session')); } catch { return null; }
}

export function setSession(s) { if (typeof window !== 'undefined') localStorage.setItem('e32o_session', JSON.stringify(s)); }
export function clearSession() { if (typeof window !== 'undefined') localStorage.removeItem('e32o_session'); }
export function isAdmin(user) { return user?.role === 'founder' || user?.role === 'cofounder'; }
