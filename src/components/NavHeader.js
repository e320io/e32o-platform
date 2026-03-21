'use client';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';
import { C } from '@/lib/tokens';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞', roles: ['founder', 'cofounder'] },
  { href: '/pipeline', label: 'Pipeline', icon: '◫', roles: ['founder', 'cofounder'] },
  { href: '/team', label: 'Mi trabajo', icon: '✦', roles: ['founder', 'cofounder', 'asistente', 'editor', 'filmaker'] },
];

export default function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.user) { router.push('/'); return; }
    setSession(s);
  }, []);

  if (!session) return null;

  const user = session.user;
  const role = user.role;
  const visibleItems = NAV_ITEMS.filter(n => n.roles.includes(role));
  const initials = (user.display_name || user.username || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const monthName = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', height: 56,
      borderBottom: `1px solid ${C.brd}`,
      position: 'sticky', top: 0,
      background: '#0A0A0AEE', backdropFilter: 'blur(12px)', zIndex: 100,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Left: logo + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: C.acc, letterSpacing: '-.5px', cursor: 'pointer' }}
          onClick={() => router.push('/dashboard')}>
          e.32o
        </span>
        <div style={{ width: 1, height: 24, background: C.brd }} />
        <nav style={{ display: 'flex', gap: 4 }}>
          {visibleItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button key={item.href} onClick={() => router.push(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: active ? C.accDim : 'transparent',
                border: 'none', cursor: 'pointer',
                color: active ? C.acc : C.txtS,
                fontSize: 13, fontWeight: active ? 600 : 500,
                fontFamily: 'inherit',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: date + avatar + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: C.txtM, fontSize: 13, textTransform: 'capitalize' }}>{monthName}</span>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: C.accDim, color: C.acc,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
        }}>{initials}</div>
        <button onClick={() => { clearSession(); router.push('/'); }} style={{
          background: 'none', border: 'none', color: C.txtM,
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          padding: '4px 8px', borderRadius: 6,
        }}>Salir</button>
      </div>
    </header>
  );
}
