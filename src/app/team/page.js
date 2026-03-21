'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, PIECE_LABELS, PIECE_COLORS, STAGE_LABELS, ROLE_COLORS, CURRENT_PERIOD } from '@/lib/tokens';
import NavHeader from '@/components/NavHeader';

// ── Helpers ──
const ASSIGNED_FIELDS = {
  research:'research_assigned', guion:'guion_assigned', aprobacion:'aprobacion_assigned',
  grabacion:'grabacion_assigned', edicion:'edicion_assigned', revision_cliente:'revision_cliente_assigned',
};
const OUTPUT_FIELDS = {
  research:'research_output', guion:'guion_output', aprobacion:'aprobacion_output',
  grabacion:'grabacion_output', edicion:'edicion_output', revision_cliente:'revision_cliente_output',
};
const OUTPUT_TYPES = {
  research:'url', guion:'text', aprobacion:'approval', grabacion:'file', edicion:'file', revision_cliente:'approval',
};
const STAGE_KEYS = ['pendiente','research','guion','aprobacion','grabacion','edicion','revision_cliente','publicado'];
const PREV_OUTPUT = { research:null, guion:'research_output', aprobacion:'guion_output', grabacion:'aprobacion_output', edicion:'grabacion_output', revision_cliente:'edicion_output' };

function fmtDeadline(d) {
  if (!d) return '—';
  const dt = new Date(d+'T12:00:00'), now = new Date(), diff = Math.ceil((dt-now)/864e5);
  const f = dt.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
  if (diff<0) return `${f} (${Math.abs(diff)}d atraso)`;
  if (diff===0) return `${f} (hoy)`;
  if (diff<=3) return `${f} (${diff}d)`;
  return f;
}
function isOverdue(d){ return d && new Date(d+'T12:00:00') < new Date(); }

// ── Demo pieces for team ──
const DEMO_CLIENTS = {c1:'Cire',c2:'Brillo Mío Valle',c3:'Brillo Mío Santa Fe',c6:'Sandy Arcos',c7:'Profeta Mariana',c8:'Apóstol Víctor'};

function getDemoPieces(username) {
  const all = [
    {id:'c1-0',client_id:'c1',title:'Reel - Resultados láser',type:'reel',status:'edicion',deadline:'2026-03-18',edicion_assigned:'jose_camacho',edicion_output:null,grabacion_output:'grabacion_reel_laser.mp4'},
    {id:'c1-1',client_id:'c1',title:'Reel - Testimonio Karla',type:'reel',status:'edicion',deadline:'2026-03-22',edicion_assigned:'jose_camacho',edicion_output:null,grabacion_output:'grabacion_testimonio.mp4'},
    {id:'c2-0',client_id:'c2',title:'Reel - Transformación color',type:'reel',status:'research',deadline:'2026-03-21',research_assigned:'natha_barragan',research_output:null,research_comment:null},
    {id:'c2-1',client_id:'c2',title:'Carrusel - Tendencias 2026',type:'carrusel',status:'research',deadline:'2026-03-23',research_assigned:'natha_barragan',research_output:null,research_comment:null},
    {id:'c2-2',client_id:'c2',title:'Reel - Balayage tutorial',type:'reel',status:'grabacion',deadline:'2026-03-19',grabacion_assigned:'alhena_taboada',grabacion_output:null,guion_output:'• Intro con antes\n• Proceso paso a paso\n• Reveal final'},
    {id:'c6-0',client_id:'c6',title:'Ep 14 - Emprendimiento digital',type:'episodio_youtube',status:'edicion',deadline:'2026-03-20',edicion_assigned:'jose_camacho',edicion_output:null,grabacion_output:'podcast_ep14_raw.mp4'},
    {id:'c7-0',client_id:'c7',title:'Clip prédica - Fe',type:'clip_predica',status:'edicion',deadline:'2026-03-17',edicion_assigned:'jose_camacho',edicion_output:null,grabacion_output:'predica_fe_raw.mp4'},
    {id:'c1-3',client_id:'c1',title:'Carrusel - Promo mayo',type:'carrusel',status:'grabacion',deadline:'2026-03-25',grabacion_assigned:'mariana_yudico',grabacion_output:null,guion_output:'• Slide 1: Pregunta\n• Slide 2: Dato\n• Slide 3: CTA'},
    {id:'c2-3',client_id:'c2',title:'Fast - Corte express',type:'fast_reel',status:'grabacion',deadline:'2026-03-21',grabacion_assigned:'alhena_taboada',grabacion_output:null,guion_output:'• Corte rápido time-lapse\n• Resultado final'},
  ];
  return all.filter(p => {
    const af = ASSIGNED_FIELDS[p.status];
    return af && p[af] === username;
  }).sort((a,b) => {
    const ao=isOverdue(a.deadline)?0:1, bo=isOverdue(b.deadline)?0:1;
    if(ao!==bo)return ao-bo;
    return new Date(a.deadline)-new Date(b.deadline);
  });
}

function getPepeBriefing(pieces) {
  const od = pieces.filter(p => isOverdue(p.deadline));
  if (od.length > 0) {
    const days = Math.abs(Math.ceil((new Date(od[0].deadline+'T12:00:00') - new Date())/864e5));
    return { p:'urgent', m:`⚡ Tienes ${od.length} pieza${od.length>1?'s':''} atrasada${od.length>1?'s':''}. Prioriza: "${od[0].title}" — ${days} día${days>1?'s':''} de atraso.` };
  }
  const today = new Date().toISOString().split('T')[0];
  const td = pieces.filter(p => p.deadline === today);
  if (td.length > 0) return { p:'today', m:`📌 ${td.length} pieza${td.length>1?'s':''} con deadline hoy. Enfócate en "${td[0].title}" primero.` };
  if (pieces.length > 0) return { p:'normal', m:`✨ Todo al corriente. Tienes ${pieces.length} tarea${pieces.length>1?'s':''} activa${pieces.length>1?'s':''}. Siguiente: "${pieces[0].title}".` };
  return { p:'clear', m:'🎉 No tienes tareas pendientes. ¡Buen trabajo!' };
}

const S = {
  inp: { width:'100%', background:C.card, border:`1px solid ${C.brd}`, borderRadius:8, color:C.txt, padding:'12px 14px', fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' },
};

// ── TaskOutputModal ──
function TaskModal({ piece, clientNames, onClose, onComplete }) {
  const sg = { label: STAGE_LABELS[piece.status] || piece.status, color: (() => { const cs = {research:C.purp,guion:C.blue,aprobacion:C.amb,grabacion:C.cor,edicion:C.purp,revision_cliente:C.amb}; return cs[piece.status]||C.txtM; })() };
  const ot = OUTPUT_TYPES[piece.status];
  const pt = PIECE_LABELS[piece.type] || piece.type;
  const pc = PIECE_COLORS[piece.type] || C.txtS;
  const od = isOverdue(piece.deadline);

  const prevKey = STAGE_KEYS[STAGE_KEYS.indexOf(piece.status)-1];
  const prevField = prevKey ? PREV_OUTPUT[piece.status] : null;
  const prevOut = prevField ? piece[prevField] : null;
  const prevLabel = prevKey ? STAGE_LABELS[prevKey] : '';

  const [url, setUrl] = useState(piece.research_output || '');
  const [comment, setComment] = useState(piece.research_comment || '');
  const [text, setText] = useState(piece[OUTPUT_FIELDS[piece.status]] || '');
  const [file, setFile] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = () => {
    if (ot==='url') return url.trim() && comment.trim();
    if (ot==='text') return text.trim();
    if (ot==='file') return file.trim();
    return false;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    setTimeout(() => { onComplete(piece); setSubmitting(false); }, 300);
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.75)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.cardH, borderRadius:14, border:`1px solid ${C.brdH}`, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 4px 24px rgba(0,0,0,.4)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.brd}`, background:`linear-gradient(135deg, ${sg.color}08, transparent)` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:sg.color }} />
              <span style={{ fontSize:12, fontWeight:700, color:sg.color, textTransform:'uppercase', letterSpacing:'.05em' }}>{sg.label}</span>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:C.txtM, fontSize:18, cursor:'pointer', padding:4 }}>✕</button>
          </div>
          <h2 style={{ fontSize:17, fontWeight:700, color:C.wh, margin:'10px 0 4px' }}>{piece.title}</h2>
          <div style={{ display:'flex', gap:10, fontSize:12, color:C.txtM }}>
            <span>{clientNames[piece.client_id] || piece.client_id}</span>
            <span>·</span>
            <span style={{ color:od?C.red:C.txtM, fontWeight:od?600:400 }}>{fmtDeadline(piece.deadline)}</span>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {/* Prev output */}
          {prevOut && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.txtM, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Referencia ({prevLabel})</div>
              <div style={{ padding:'10px 14px', background:C.card, borderRadius:8, border:`1px solid ${C.brd}`, fontSize:12.5, color:C.txtS, whiteSpace:'pre-wrap', lineHeight:1.6, maxHeight:120, overflowY:'auto' }}>{prevOut}</div>
            </div>
          )}

          <div style={{ fontSize:10, fontWeight:700, color:C.txtM, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Tu output</div>

          {ot === 'url' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input type="url" placeholder="https://instagram.com/reel/... — URL referencia" value={url} onChange={e => setUrl(e.target.value)} style={S.inp} />
              <textarea placeholder="¿Por qué funciona? Hook, formato, CTA…" value={comment} onChange={e => setComment(e.target.value)} rows={4} style={{ ...S.inp, lineHeight:1.6 }} />
            </div>
          )}
          {ot === 'text' && (
            <textarea placeholder="• Abre con pregunta&#10;• Muestra resultado&#10;• CTA" value={text} onChange={e => setText(e.target.value)} rows={8} style={{ ...S.inp, fontFamily:'monospace', lineHeight:1.8 }} />
          )}
          {ot === 'file' && (
            file ? (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:C.card, borderRadius:8, border:`1px solid ${C.teal}33` }}>
                <span style={{ fontSize:22 }}>📎</span>
                <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:C.txt }}>{file}</div><div style={{ fontSize:11, color:C.txtM }}>Listo para enviar</div></div>
                <button onClick={() => setFile('')} style={{ background:'none', border:'none', color:C.red, fontSize:12, cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>Quitar</button>
              </div>
            ) : (
              <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'36px 20px', background:C.card, border:`2px dashed ${C.brdH}`, borderRadius:8, cursor:'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor=C.acc+'44'}
                onMouseLeave={e => e.currentTarget.style.borderColor=C.brdH}
              >
                <span style={{ fontSize:32, opacity:.4 }}>📤</span>
                <span style={{ fontSize:13, color:C.txtS }}>Clic para subir tu archivo</span>
                <input type="file" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f)setFile(f.name); }} />
              </label>
            )
          )}
        </div>

        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.brd}`, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:8, background:C.card, border:`1px solid ${C.brd}`, color:C.txtS, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!canSubmit()||submitting} style={{ padding:'10px 24px', borderRadius:8, border:'none', background:canSubmit()?C.acc:`${C.txtM}44`, color:canSubmit()?C.accTxt:C.txtM, fontSize:13, fontWeight:700, cursor:canSubmit()?'pointer':'default', fontFamily:'inherit', opacity:submitting?.6:1 }}>
            {submitting ? 'Enviando…' : 'Completar y avanzar →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export default function TeamPage() {
  const router = useRouter();
  const [session, setSessionState] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [clientNames, setClientNames] = useState(DEMO_CLIENTS);
  const [completed, setCompleted] = useState(new Set());
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.user) { router.push('/'); return; }
    setSessionState(s);
    loadData(s.user.username);
  }, []);

  async function loadData(username) {
    try {
      const { data: cl } = await supabase.from('clients').select('id, name');
      if (cl?.length) {
        const map = {}; cl.forEach(c => map[c.id] = c.name);
        setClientNames(map);
      }
      const { data: cp } = await supabase.from('content_pieces').select('*').eq('period', CURRENT_PERIOD);
      if (cp?.length) {
        const mine = cp.filter(p => {
          const af = ASSIGNED_FIELDS[p.status];
          return af && p[af] === username;
        }).sort((a,b) => {
          const ao=isOverdue(a.deadline)?0:1, bo=isOverdue(b.deadline)?0:1;
          if(ao!==bo)return ao-bo;
          return new Date(a.deadline)-new Date(b.deadline);
        });
        setPieces(mine);
        return;
      }
    } catch {}
    setPieces(getDemoPieces(username));
  }

  if (!session) return null;

  const user = session.user;
  const activePieces = pieces.filter(p => !completed.has(p.id));
  const donePieces = pieces.filter(p => completed.has(p.id));
  const briefing = getPepeBriefing(activePieces);
  const bc = { urgent:{bg:C.redDim,bd:`${C.red}33`,c:C.red}, today:{bg:C.ambDim,bd:`${C.amb}33`,c:C.amb}, normal:{bg:C.accDim,bd:`${C.acc}22`,c:C.acc}, clear:{bg:C.accDim,bd:`${C.acc}22`,c:C.acc} }[briefing.p];
  const dateStr = new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});

  const handleComplete = (piece) => {
    setCompleted(prev => new Set([...prev, piece.id]));
    setModal(null);
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans', sans-serif", color:C.txt }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <NavHeader />

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 20px' }}>
        {/* Greeting */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.wh, margin:0 }}>
            Hola, {user.display_name || user.username}
          </h1>
          <p style={{ fontSize:13, color:C.txtM, marginTop:4 }}>{dateStr}</p>
        </div>

        {/* Pepe briefing */}
        <div style={{ padding:'14px 18px', borderRadius:10, background:bc.bg, border:`1px solid ${bc.bd}`, marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:`${bc.c}20`, border:`2px solid ${bc.c}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>🤖</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:bc.c, marginBottom:4, textTransform:'uppercase', letterSpacing:'.04em' }}>Pepe — tu PM</div>
            <div style={{ fontSize:13, color:C.txt, lineHeight:1.5 }}>{briefing.m}</div>
          </div>
        </div>

        {/* Active tasks */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:C.wh, margin:0 }}>Tareas activas</h2>
          <span style={{ fontSize:11, fontWeight:700, color:C.acc, background:C.accDim, padding:'2px 8px', borderRadius:10 }}>{activePieces.length}</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
          {activePieces.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 20px', background:C.card, borderRadius:10, border:`1px solid ${C.brd}` }}>
              <span style={{ fontSize:36, display:'block', marginBottom:12 }}>🎉</span>
              <span style={{ fontSize:14, color:C.txtS }}>¡Todo completado! No tienes tareas pendientes.</span>
            </div>
          )}
          {activePieces.map((p, i) => {
            const sc = {research:C.purp,guion:C.blue,aprobacion:C.amb,grabacion:C.cor,edicion:C.purp,revision_cliente:C.amb}[p.status] || C.txtM;
            const pl = PIECE_LABELS[p.type] || p.type;
            const pc = PIECE_COLORS[p.type] || C.txtS;
            const od = isOverdue(p.deadline);
            return (
              <div key={p.id} onClick={() => setModal(p)} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                background:C.card, border:`1px solid ${od?C.red+'22':C.brd}`, borderRadius:10,
                cursor:'pointer', transition:'all .2s ease',
                animation: `fadeSlideIn .3s ease ${i*60}ms both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background=C.cardH; e.currentTarget.style.transform='translateX(4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background=C.card; e.currentTarget.style.transform='translateX(0)'; }}
              >
                <div style={{ width:36, height:36, borderRadius:'50%', background:`${sc}15`, border:`2px solid ${sc}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                  {STAGE_LABELS[p.status]?.[0] || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.wh, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:11.5, color:C.txtM }}>{clientNames[p.client_id] || p.client_id}</span>
                    <span style={{ fontSize:9, color:C.brd }}>●</span>
                    <span style={{ fontSize:11, fontWeight:600, color:sc, padding:'1px 8px', borderRadius:10, background:`${sc}12` }}>{STAGE_LABELS[p.status]}</span>
                  </div>
                </div>
                <div style={{ fontSize:12.5, fontWeight:600, color:od?C.red:C.txtS, textAlign:'right', flexShrink:0 }}>{fmtDeadline(p.deadline)}</div>
                <span style={{ fontSize:16, color:C.txtM, flexShrink:0 }}>›</span>
              </div>
            );
          })}
        </div>

        {/* Completed today */}
        {donePieces.length > 0 && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <h2 style={{ fontSize:14, fontWeight:700, color:C.txtM, margin:0 }}>Completadas hoy</h2>
              <span style={{ fontSize:11, fontWeight:700, color:C.txtM, background:C.card, padding:'2px 8px', borderRadius:10 }}>{donePieces.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {donePieces.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:C.card, borderRadius:8, border:`1px solid ${C.brd}`, opacity:.6 }}>
                  <span style={{ fontSize:16, color:C.teal }}>✓</span>
                  <span style={{ fontSize:13, color:C.txtS, textDecoration:'line-through', flex:1 }}>{p.title}</span>
                  <span style={{ fontSize:11, color:C.txtM }}>{clientNames[p.client_id]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modal && <TaskModal piece={modal} clientNames={clientNames} onClose={() => setModal(null)} onComplete={handleComplete} />}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
