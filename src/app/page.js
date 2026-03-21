'use client';
import { useState, useEffect } from 'react';
import { getSession, loginTeam, loginClient, setSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { C } from '@/lib/tokens';

const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:`1px solid ${C.brdH}`, background:C.bg, color:C.wh, fontSize:14, outline:'none', boxSizing:'border-box' };

export default function Home() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [ic, setIc] = useState(false);
  const [err, setErr] = useState(null);
  const [ld, setLd] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const s = getSession();
    if (s?.user) {
      if (s.type === 'client') router.push('/portal');
      else if (s.user.role === 'founder' || s.user.role === 'cofounder') router.push('/dashboard');
      else router.push('/team');
    }
  }, []);

  async function go() {
    if (!u || !p) return;
    setLd(true); setErr(null);
    const result = ic ? await loginClient(u.toLowerCase().trim(), p) : await loginTeam(u.toLowerCase().trim(), p);
    if (!result) { setErr('Usuario o contraseña incorrectos'); setLd(false); return; }
    setSession(result);
    if (result.type === 'client') router.push('/portal');
    else if (result.user.role === 'founder' || result.user.role === 'cofounder') router.push('/dashboard');
    else router.push('/team');
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:380, padding:'40px 32px', background:C.card, borderRadius:20, border:`1px solid ${C.brd}` }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:28, fontWeight:700, color:C.acc, marginBottom:4 }}>e.32o</div>
          <div style={{ fontSize:13, color:C.txtS }}>Plataforma integral</div>
        </div>
        <div style={{ display:'flex', gap:4, marginBottom:20, background:C.bg, borderRadius:10, padding:3 }}>
          {[['team','Equipo'],['client','Cliente']].map(([k,l]) => (
            <button key={k} onClick={() => setIc(k==='client')} style={{ flex:1, padding:8, borderRadius:8, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:ic===(k==='client')?C.acc:'transparent', color:ic===(k==='client')?C.accTxt:C.txtS }}>{l}</button>
          ))}
        </div>
        {err && <div style={{ background:C.redDim, borderRadius:8, padding:10, marginBottom:16, fontSize:12, color:C.red, textAlign:'center' }}>{err}</div>}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:C.txtS, display:'block', marginBottom:6 }}>Usuario</label>
          <input value={u} onChange={e => setU(e.target.value)} placeholder={ic ? "brillo_valle" : "fer_ayala"} style={inp} onKeyDown={e => e.key==='Enter' && go()} autoFocus />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, color:C.txtS, display:'block', marginBottom:6 }}>Contraseña</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} style={inp} onKeyDown={e => e.key==='Enter' && go()} />
        </div>
        <button onClick={go} disabled={ld||!u||!p} style={{ width:'100%', padding:12, borderRadius:10, fontSize:14, fontWeight:600, background:(ld||!u||!p)?C.brd:C.acc, color:(ld||!u||!p)?C.txtM:C.accTxt, border:'none', cursor:'pointer' }}>
          {ld ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
