import { supabase } from './supabase';

export async function loginTeam(username, password) {
  const { data, error } = await supabase.from('team_users').select('*').eq('username', username).eq('password_hash', password).eq('is_active', true).single();
  if (error || !data) return null;
  return { user: data, type: 'team' };
}

export async function loginClient(username, password) {
  const { data, error } = await supabase.from('client_users').select('*').eq('username', username).eq('password_hash', password).eq('is_active', true).single();
  if (error || !data) return null;

  // Cargar clientes accesibles vía client_user_access
  const { data: accessList } = await supabase
    .from('client_user_access')
    .select('client_id, display_label, role, is_default, clients(id, name, color, has_ads, monthly_fee, flow)')
    .eq('client_user_id', data.id);

  // Si tiene accesos en la tabla nueva, usarlos
  if (accessList && accessList.length > 0) {
    const defaultAccess = accessList.find(a => a.is_default) || accessList[0];
    return {
      user: data,
      type: 'client',
      // Cliente activo (el default)
      client_id: defaultAccess.client_id,
      client_name: defaultAccess.display_label || defaultAccess.clients?.name,
      // Todos los clientes accesibles
      accessible_clients: accessList.map(a => ({
        client_id: a.client_id,
        display_label: a.display_label || a.clients?.name,
        role: a.role,
        is_default: a.is_default,
        has_ads: a.clients?.has_ads || false,
        color: a.clients?.color,
        name: a.clients?.name,
      })),
    };
  }

  // Fallback: solo el client_id directo (clientes sin migrar a la tabla nueva)
  return {
    user: data,
    type: 'client',
    client_id: data.client_id,
    client_name: data.client_name,
    accessible_clients: [{
      client_id: data.client_id,
      display_label: data.client_name,
      role: 'viewer',
      is_default: true,
      has_ads: false,
      color: null,
      name: data.client_name,
    }],
  };
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('e32o_session')); } catch { return null; }
}

export function setSession(s) { if (typeof window !== 'undefined') localStorage.setItem('e32o_session', JSON.stringify(s)); }
export function clearSession() { if (typeof window !== 'undefined') localStorage.removeItem('e32o_session'); }
export function isAdmin(user) { return user?.role === 'founder' || user?.role === 'cofounder'; }
