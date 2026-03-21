'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, FLOW_FULL, FLOW_SHORT, PIECE_LABELS, PIECE_COLORS, STAGE_LABELS, ROLE_COLORS, CURRENT_PERIOD } from '@/lib/tokens';
import NavHeader from '@/components/NavHeader';

// ── All stages for kanban columns ──
const KANBAN_STAGES = [
  { k:'pendiente', l:'Pendiente', c:C.txtM },
  { k:'research', l:'Research', c:C.purp },
  { k:'guion', l:'Guión', c:C.blue },
  { k:'aprobacion', l:'Aprobación', c:C.amb },
  { k:'grabacion', l:'Grabación', c:C.cor },
  { k:'edicion', l:'Edición', c:C.purp },
  { k:'revision_cliente', l:'Rev. cliente', c:C.amb },
  { k:'publicado', l:'Publicado', c:C.teal },
];
const STAGE_KEYS = KANBAN_STAGES.map(s => s.k);

const OUTPUT_FIELDS = {
  research: 'research_output', guion: 'guion_output', aprobacion: 'aprobacion_output',
  grabacion: 'grabacion_output', edicion: 'edicion_output', revision_cliente: 'revision_cliente_output',
};
const ASSIGNED_FIELDS = {
  research: 'research_assigned', guion: 'guion_assigned', aprobacion: 'aprobacion_assigned',
  grabacion: 'grabacion_assigned', edicion: 'edicion_assigned', revision_cliente: 'revision_cliente_assigned',
};
const OUTPUT_TYPES = {
  research:'url', guion:'text', aprobacion:'approval', grabacion:'file', edicion:'file', revision_cliente:'approval',
};

// ── Helpers ──
function getStage(k) { return KANBAN_STAGES.find(s => s.k === k) || KANBAN_STAGES[0]; }
function nextStage(k) { const i = STAGE_KEYS.indexOf(k); return i < 0 || i >= STAGE_KEYS.length - 1 ? null : KANBAN_STAGES[i + 1]; }
function fmtDeadline(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00'), now = new Date();
  const diff = Math.ceil((dt - now) / 864e5);
  const f = dt.toLocaleDateString('es-MX', { day:'numeric', month:'short' });
  if (diff < 0) return `${f} (${Math.abs(diff)}d atraso)`;
  if (diff === 0) return `${f} (hoy)`;
  if (diff <= 3) return `${f} (${diff}d)`;
  return f;
}
function isOverdue(d) { return d && new Date(d + 'T12:00:00') < new Date(); }
function getMonths() {
  const m = [], now = new Date();
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    m.push({ v: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, l: d.toLocaleDateString('es-MX',{month:'long',year:'numeric'}) });
  }
  return m;
}

// ── Demo data ──
const DEMO_CLIENTS = [
  {id:'c1',name:'Cire'},{id:'c2',name:'Brillo Mío Valle'},{id:'c3',name:'Brillo Mío Santa Fe'},
  {id:'c4',name:'Beauty Design SJ'},{id:'c5',name:'Beauty Design Barbería'},
  {id:'c6',name:'Sandy Arcos'},{id:'c7',name:'Profeta Mariana'},{id:'c8',name:'Apóstol Víctor'},{id:'c9',name:'Diveland'},
];
const DEMO_TEAM = [
  {username:'fer_ayala',display_name:'Fer',role:'founder'},
  {username:'yaz_antonio',display_name:'Yaz',role:'cofounder'},
  {username:'natha_barragan',display_name:'Natha',role:'asistente'},
  {username:'jose_camacho',display_name:'José',role:'editor'},
  {username:'alhena_taboada',display_name:'Alhena',role:'filmaker'},
  {username:'mariana_yudico',display_name:'Mariana Y',role:'filmaker'},
];

function makeDemoPieces(clientId) {
  const defs = {
    c1:[{t:'Reel - Resultados láser',y:'reel'},{t:'Reel - Testimonio Karla',y:'reel'},{t:'Carrusel - Promo mayo',y:'carrusel'},{t:'Reel - Antes/después',y:'reel'},{t:'Ad - Conversión WhatsApp',y:'gestion_ads'},{t:'Reel - Proceso láser',y:'reel'},{t:'Carrusel - Tips cuidado',y:'carrusel'},{t:'Reel - Modelo sesión',y:'reel'}],
    c2:[{t:'Reel - Transformación color',y:'reel'},{t:'Reel - Balayage tutorial',y:'reel'},{t:'Fast - Corte express',y:'fast_reel'},{t:'Carrusel - Tendencias 2026',y:'carrusel'},{t:'Reel - Cliente feliz',y:'reel'},{t:'Fast - Blow dry ASMR',y:'fast_reel'}],
    c6:[{t:'Ep 14 - Emprendimiento digital',y:'episodio_youtube'},{t:'Clip 14.1 - Mejor consejo',y:'reel_episodio'},{t:'Clip 14.2 - Error más grande',y:'reel_episodio'},{t:'Reel - Sandy reacts',y:'reel_individual'}],
    c7:[{t:'Ep - Predica domingo 23',y:'episodio_youtube'},{t:'Clip prédica - Fe',y:'clip_predica'},{t:'Reel grabación BTS',y:'reel_grabacion'},{t:'Carrusel - Versículo semana',y:'carrusel'}],
  };
  const p = defs[clientId] || [{t:'Pieza 1',y:'reel'},{t:'Pieza 2',y:'reel'},{t:'Pieza 3',y:'carrusel'}];
  const tu = DEMO_TEAM.map(t=>t.username);
  return p.map((x,i)=>{
    const s = STAGE_KEYS[i % STAGE_KEYS.length];
    const dl = new Date(); dl.setDate(dl.getDate()+(i*3-5));
    return {
      id:`${clientId}-${i}`, client_id:clientId, title:x.t, type:x.y, status:s,
      deadline:dl.toISOString().split('T')[0], period:CURRENT_PERIOD,
      research_assigned:tu[(i+2)%tu.length], research_output:s!=='pendiente'?'https://instagram.com/reel/example':null,
      research_comment:s!=='pendiente'?'Hook fuerte, corte rápido, CTA al final':null,
      guion_assigned:tu[(i+3)%tu.length], guion_output:['guion','aprobacion','grabacion','edicion','revision_cliente','publicado'].includes(s)?'• Abre con pregunta\n• Muestra resultado\n• CTA':null,
      aprobacion_assigned:'fer_ayala', aprobacion_output:['grabacion','edicion','revision_cliente','publicado'].includes(s)?'approved':null,
      grabacion_assigned:tu[(i+4)%tu.length], grabacion_output:['edicion','revision_cliente','publicado'].includes(s)?'grabacion_reel.mp4':null,
      edicion_assigned:'jose_camacho', edicion_output:['revision_cliente','publicado'].includes(s)?'edit_final_v2.mp4':null,
      revision_cliente_assigned:null, revision_cliente_output:s==='publicado'?'approved':null,
    };
  });
}

// ── Styles ──
const S = {
  sel: { background:C.card, border:`1px solid ${C.brd}`, borderRadius:8, color:C.txt, padding:'8px 30px 8px 14px', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', outline:'none', appearance:'none', WebkitAppearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' },
  inp: { width:'100%', background:C.card, border:`1px solid ${C.brd}`, borderRadius:8, color:C.txt, padding:'10px 14px', fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════

function Avatar({ username, size = 22 }) {
  const m = DEMO_TEAM.find(t => t.username === username);
  const ini = m ? m.display_name.slice(0,2).toUpperCase() : '??';
  const rc = ROLE_COLORS[m?.role] || C.txtS;
  return (
    <div title={m?.display_name || username} style={{
      width:size, height:size, borderRadius:'50%',
      background:`${rc}22`, color:rc, display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.4, fontWeight:700, flexShrink:0, border:`1.5px solid ${C.bg}`,
    }}>{ini}</div>
  );
}

function Badge({ children, color = C.acc }) {
  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, background:`${color}18`, color, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{children}</span>;
}

// ── Card ──
function PipelineCard({ piece, onClick }) {
  const pl = PIECE_LABELS[piece.type] || piece.type;
  const pc = PIECE_COLORS[piece.type] || C.txtS;
  const od = isOverdue(piece.deadline) && piece.status !== 'publicado';
  const af = ASSIGNED_FIELDS[piece.status];
  const au = af ? piece[af] : null;

  return (
    <div onClick={() => onClick(piece)} style={{
      background:C.card, border:`1px solid ${od ? C.red+'44' : C.brd}`, borderRadius:8,
      padding:'10px 12px', cursor:'pointer', transition:'all .15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = C.cardH; e.currentTarget.style.borderColor = od ? C.red+'66' : C.brdH; }}
    onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = od ? C.red+'44' : C.brd; }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:6 }}>
        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:`${pc}18`, color:pc, fontWeight:600, whiteSpace:'nowrap', marginTop:1 }}>{pl}</span>
        <span style={{ fontSize:12.5, fontWeight:600, color:C.txt, lineHeight:'17px', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{piece.title}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:od?C.red:C.txtM, fontWeight:od?600:400 }}>{fmtDeadline(piece.deadline)}</span>
        {au && <Avatar username={au} size={20} />}
      </div>
    </div>
  );
}

// ── Column ──
function KanbanColumn({ stage, pieces, onCardClick }) {
  return (
    <div style={{ flex:'0 0 210px', display:'flex', flexDirection:'column', background:C.bg, borderRadius:10, border:`1px solid ${C.brd}`, minHeight:200, maxHeight:'calc(100vh - 170px)' }}>
      <div style={{ padding:'10px 12px', borderBottom:`1px solid ${C.brd}`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:stage.c }} />
        <span style={{ fontSize:12, fontWeight:700, color:C.txt }}>{stage.l}</span>
        <span style={{ marginLeft:'auto', fontSize:11, fontWeight:600, color:C.txtM, background:C.card, padding:'1px 7px', borderRadius:10 }}>{pieces.length}</span>
      </div>
      <div style={{ padding:6, display:'flex', flexDirection:'column', gap:5, overflowY:'auto', flex:1 }}>
        {pieces.map(p => <PipelineCard key={p.id} piece={p} onClick={onCardClick} />)}
        {pieces.length === 0 && <div style={{ padding:20, textAlign:'center', fontSize:12, color:C.txtM, fontStyle:'italic' }}>Sin piezas</div>}
      </div>
    </div>
  );
}

// ── Modal ──
function PieceModal({ piece, onClose, onUpdate, team }) {
  const [local, setLocal] = useState({ ...piece });
  const [tab, setTab] = useState(piece.status === 'pendiente' ? 'research' : piece.status);

  useEffect(() => setLocal({ ...piece }), [piece]);

  const handleAssign = (sk, u) => {
    const f = ASSIGNED_FIELDS[sk]; if (!f) return;
    const up = { ...local, [f]: u }; setLocal(up); onUpdate(up);
  };
  const handleOutput = (sk, v) => {
    const f = OUTPUT_FIELDS[sk]; if (!f) return;
    setLocal(prev => ({ ...prev, [f]: v }));
  };
  const handleAdvance = (sk) => {
    const ns = nextStage(sk); if (!ns) return;
    const up = { ...local, status: ns.k }; setLocal(up); onUpdate(up); setTab(ns.k);
  };
  const handleSave = () => onUpdate(local);

  const pt = PIECE_LABELS[local.type] || local.type;
  const pc = PIECE_COLORS[local.type] || C.txtS;
  const sg = getStage(local.status);
  const od = isOverdue(local.deadline) && local.status !== 'publicado';
  const activeTabs = KANBAN_STAGES.filter(s => s.k !== 'pendiente');

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.cardH, borderRadius:14, border:`1px solid ${C.brdH}`, width:'100%', maxWidth:700, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 4px 24px rgba(0,0,0,.4)' }}>
        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.brd}`, display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:C.wh, margin:0 }}>{local.title}</h2>
            <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap', alignItems:'center' }}>
              <Badge color={pc}>{pt}</Badge>
              <Badge color={sg.c}>{sg.l}</Badge>
              {od && <Badge color={C.red}>Atrasada</Badge>}
              <span style={{ fontSize:12, color:C.txtM }}>Deadline: {fmtDeadline(local.deadline)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.txtM, fontSize:20, cursor:'pointer', padding:4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:`1px solid ${C.brd}`, overflowX:'auto', flexShrink:0 }}>
          {activeTabs.map(s => {
            const isAct = tab === s.k;
            const si = STAGE_KEYS.indexOf(s.k), ci = STAGE_KEYS.indexOf(local.status);
            const isPast = si < ci, isCur = si === ci;
            const of2 = OUTPUT_FIELDS[s.k], ho = of2 && local[of2];
            return (
              <button key={s.k} onClick={() => setTab(s.k)} style={{
                background: isAct ? C.card : 'transparent',
                border:'none', borderBottom: isAct ? `2px solid ${s.c}` : '2px solid transparent',
                color: isAct ? C.wh : C.txtM, padding:'10px 14px', fontSize:11.5, fontWeight:600,
                cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit',
              }}>
                {isPast && ho && <span style={{ color:C.teal, fontSize:12 }}>✓</span>}
                {isCur && <span style={{ width:5, height:5, borderRadius:'50%', background:s.c }} />}
                {s.l}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          <StagePanel stageKey={tab} piece={local} team={team} onAssign={handleAssign} onOutput={handleOutput} onAdvance={handleAdvance} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}

// ── Stage Panel ──
function StagePanel({ stageKey, piece, team, onAssign, onOutput, onAdvance, onSave }) {
  const af = ASSIGNED_FIELDS[stageKey], of2 = OUTPUT_FIELDS[stageKey], ot = OUTPUT_TYPES[stageKey];
  const assigned = af ? piece[af] : null;
  const output = of2 ? piece[of2] : null;
  const ci = STAGE_KEYS.indexOf(piece.status), ti = STAGE_KEYS.indexOf(stageKey);
  const isCur = ti === ci, isPast = ti < ci, isFut = ti > ci;
  const ns = nextStage(stageKey);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {/* Assigned */}
      {af && (
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.txtM, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Responsable</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {team.map(m => {
              const sel = assigned === m.username;
              const rc = ROLE_COLORS[m.role] || C.txtS;
              return (
                <button key={m.username} onClick={() => onAssign(stageKey, m.username)} style={{
                  display:'flex', alignItems:'center', gap:6, padding:'5px 12px 5px 6px', borderRadius:20,
                  background: sel ? `${rc}22` : C.card, border:`1.5px solid ${sel ? rc : C.brd}`,
                  color: sel ? rc : C.txtS, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                }}>
                  <Avatar username={m.username} size={20} />
                  {m.display_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Output */}
      {of2 && (
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:C.txtM, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>
            Output {isPast && output ? '✓' : isCur ? '(requerido para avanzar)' : ''}
          </div>
          {ot === 'url' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <input type="url" placeholder="URL de referencia viral" value={piece.research_output||''} onChange={e => onOutput(stageKey, e.target.value)} disabled={!isCur} style={{ ...S.inp, opacity:isCur?1:.6 }} />
              <textarea placeholder="¿Por qué funciona esta referencia?" value={piece.research_comment||''} rows={3} disabled={!isCur} style={{ ...S.inp, opacity:isCur?1:.6 }} />
            </div>
          )}
          {ot === 'text' && (
            <textarea placeholder="• Abre con pregunta&#10;• Muestra resultado&#10;• CTA directo" value={output||''} rows={6} onChange={e => onOutput(stageKey, e.target.value)} disabled={!isCur} style={{ ...S.inp, opacity:isCur?1:.6, fontFamily:'monospace', lineHeight:1.7 }} />
          )}
          {ot === 'file' && (
            output ? (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:C.card, borderRadius:8, border:`1px solid ${C.brd}` }}>
                <span style={{ fontSize:20 }}>📎</span>
                <span style={{ fontSize:13, color:C.txt, flex:1 }}>{output}</span>
                {isCur && <button onClick={() => onOutput(stageKey, null)} style={{ background:'none', border:'none', color:C.red, fontSize:12, cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Quitar</button>}
              </div>
            ) : (
              <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'28px 20px', background:C.card, border:`2px dashed ${isCur?C.brdH:C.brd}`, borderRadius:8, cursor:isCur?'pointer':'default', opacity:isCur?1:.5 }}>
                <span style={{ fontSize:28, opacity:.5 }}>📤</span>
                <span style={{ fontSize:12, color:C.txtM }}>{isCur ? 'Clic para subir archivo' : 'Archivo pendiente'}</span>
                {isCur && <input type="file" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onOutput(stageKey, f.name); }} />}
              </label>
            )
          )}
          {ot === 'approval' && (
            output === 'approved' ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:C.tealDim, borderRadius:8, border:`1px solid ${C.teal}33` }}>
                <span style={{ fontSize:18 }}>✅</span><span style={{ fontSize:13, fontWeight:600, color:C.teal }}>Aprobado</span>
              </div>
            ) : output === 'rejected' ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:C.redDim, borderRadius:8, border:`1px solid ${C.red}33` }}>
                <span style={{ fontSize:18 }}>❌</span><span style={{ fontSize:13, fontWeight:600, color:C.red }}>Rechazado</span>
              </div>
            ) : isCur ? (
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => onOutput(stageKey, 'approved')} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:C.acc, color:C.accTxt, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>✓ Aprobar</button>
                <button onClick={() => onOutput(stageKey, 'rejected')} style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${C.red}44`, background:'transparent', color:C.red, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>✕ Rechazar</button>
              </div>
            ) : <span style={{ fontSize:12, color:C.txtM, fontStyle:'italic' }}>Pendiente de revisión</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:10, marginTop:8 }}>
        {isCur && of2 && <button onClick={onSave} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:C.card, color:C.txt, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Guardar</button>}
        {isCur && output && ns && <button onClick={() => onAdvance(stageKey)} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:C.acc, color:C.accTxt, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Avanzar a {ns.l} →</button>}
        {isFut && <span style={{ fontSize:12, color:C.txtM, fontStyle:'italic', alignSelf:'center' }}>Esta etapa aún no está activa</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function PipelinePage() {
  const router = useRouter();
  const [session, setSessionState] = useState(null);
  const [clients, setClients] = useState(DEMO_CLIENTS);
  const [team, setTeamState] = useState(DEMO_TEAM);
  const [selectedClient, setSelectedClient] = useState(DEMO_CLIENTS[0].id);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_PERIOD);
  const [pieces, setPieces] = useState([]);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.user || !isAdmin(s.user)) { router.push('/'); return; }
    setSessionState(s);
    loadData();
  }, []);

  useEffect(() => { loadPieces(); }, [selectedClient, selectedMonth]);

  async function loadData() {
    try {
      const { data: cl } = await supabase.from('clients').select('*');
      if (cl?.length) setClients(cl);
      const { data: tm } = await supabase.from('team_users').select('*');
      if (tm?.length) setTeamState(tm);
    } catch {}
    loadPieces();
  }

  async function loadPieces() {
    try {
      const { data } = await supabase.from('content_pieces').select('*').eq('client_id', selectedClient).eq('period', selectedMonth);
      if (data?.length) { setPieces(data); return; }
    } catch {}
    setPieces(makeDemoPieces(selectedClient));
  }

  const handleUpdate = (updated) => {
    setPieces(prev => prev.map(p => p.id === updated.id ? updated : p));
    setModal(updated);
  };

  const total = pieces.length;
  const published = pieces.filter(p => p.status === 'publicado').length;
  const overdue = pieces.filter(p => isOverdue(p.deadline) && p.status !== 'publicado').length;
  const pct = total ? Math.round((published / total) * 100) : 0;
  const months = getMonths();

  if (!session) return null;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <NavHeader />

      {/* Toolbar */}
      <div style={{ padding:'14px 28px', display:'flex', alignItems:'center', gap:14, borderBottom:`1px solid ${C.brd}`, flexWrap:'wrap' }}>
        <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={S.sel}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={S.sel}>
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>

        <div style={{ marginLeft:'auto', display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:18, fontWeight:800, color:C.wh }}>{total}</div><div style={{ fontSize:10, color:C.txtM }}>Piezas</div></div>
          <div style={{ width:1, height:24, background:C.brd }} />
          <div style={{ textAlign:'center' }}><div style={{ fontSize:18, fontWeight:800, color:C.acc }}>{published}</div><div style={{ fontSize:10, color:C.txtM }}>Publicadas</div></div>
          {overdue > 0 && <>
            <div style={{ width:1, height:24, background:C.brd }} />
            <div style={{ textAlign:'center' }}><div style={{ fontSize:18, fontWeight:800, color:C.red }}>{overdue}</div><div style={{ fontSize:10, color:C.txtM }}>Atrasadas</div></div>
          </>}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding:'10px 28px 0', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ flex:1, height:4, background:C.card, borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:2, width:`${pct}%`, background:`linear-gradient(90deg, ${C.teal}, ${C.acc})`, transition:'width .4s ease' }} />
        </div>
        <span style={{ fontSize:11, color:C.txtM, fontWeight:600 }}>{pct}% completado</span>
      </div>

      {/* Kanban */}
      <div style={{ display:'flex', gap:10, padding:'14px 28px 28px', overflowX:'auto', alignItems:'flex-start' }}>
        {KANBAN_STAGES.map(s => (
          <KanbanColumn key={s.k} stage={s} pieces={pieces.filter(p => p.status === s.k)} onCardClick={setModal} />
        ))}
      </div>

      {modal && <PieceModal piece={modal} onClose={() => setModal(null)} onUpdate={handleUpdate} team={team} />}
    </div>
  );
}
