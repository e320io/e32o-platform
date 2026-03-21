'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  C, FLOW_FULL, FLOW_SHORT, PIECE_LABELS, PIECE_COLORS,
  STAGE_LABELS, ROLE_COLORS, ROLE_LABELS, CURRENT_PERIOD,
} from '@/lib/tokens';
import NavHeader from '@/components/NavHeader';

// ═══════════════════════════════════════════════════════════════════════════
// Constants derived from tokens.js (single source of truth)
// ═══════════════════════════════════════════════════════════════════════════
const KANBAN_COLS = FLOW_FULL.map(f => ({ k: f.k, l: f.l, c: f.c }));
const SK = KANBAN_COLS.map(s => s.k);
const ACTIVE_STAGES = FLOW_FULL.filter(f => f.k !== 'pendiente' && f.k !== 'publicado');

// Build field maps dynamically
const AF = {}, OF = {}, OT = {};
FLOW_FULL.forEach(f => {
  if (f.k !== 'pendiente' && f.k !== 'publicado') {
    AF[f.k] = f.k + '_assigned';
    OF[f.k] = f.k + '_output';
    OT[f.k] = f.ot; // 'url','text','file'
  }
});

// Client plans (mirrors brief)
const CLIENT_PLANS = {
  c1:  { pieces: [{ n: 12, t: 'reel' }, { n: 4, t: 'carrusel' }, { n: 1, t: 'gestion_ads' }], flow: 'full' },
  c2:  { pieces: [{ n: 12, t: 'reel' }, { n: 4, t: 'fast_reel' }, { n: 4, t: 'carrusel' }, { n: 1, t: 'gestion_ads' }], flow: 'full' },
  c3:  { pieces: [{ n: 12, t: 'reel' }, { n: 4, t: 'fast_reel' }, { n: 4, t: 'carrusel' }, { n: 1, t: 'gestion_ads' }], flow: 'full' },
  c4:  { pieces: [{ n: 6, t: 'video' }, { n: 3, t: 'imagen' }, { n: 1, t: 'gestion_ads' }], flow: 'full' },
  c5:  { pieces: [{ n: 6, t: 'video' }, { n: 3, t: 'imagen' }, { n: 1, t: 'gestion_ads' }], flow: 'full' },
  c6:  { pieces: [{ n: 4, t: 'episodio_youtube' }, { n: 24, t: 'reel_episodio' }, { n: 6, t: 'reel_individual' }], flow: 'short' },
  c7:  { pieces: [{ n: 4, t: 'episodio_youtube' }, { n: 8, t: 'reel_grabacion' }, { n: 4, t: 'reel_predica' }, { n: 4, t: 'carrusel' }], flow: 'short' },
  c8:  { pieces: [{ n: 8, t: 'clip_predica' }], flow: 'short' },
  c9:  { pieces: [{ n: 4, t: 'reel' }], flow: 'full' },
};

const DEMO_CLIENTS = [
  { id: 'c1', name: 'Cire', color: '#B8F03E' },
  { id: 'c2', name: 'Brillo Mío Valle', color: '#3EF0C8' },
  { id: 'c3', name: 'Brillo Mío Santa Fe', color: '#3EB8F0' },
  { id: 'c4', name: 'Beauty Design SJ', color: '#F0A03E' },
  { id: 'c5', name: 'Beauty Design Barbería', color: '#F03E7A' },
  { id: 'c6', name: 'Sandy Arcos', color: '#C83EF0' },
  { id: 'c7', name: 'Profeta Mariana', color: '#F0E03E' },
  { id: 'c8', name: 'Apóstol Víctor', color: '#3EF06A' },
  { id: 'c9', name: 'Diveland', color: '#F07A3E' },
];
const DEMO_TEAM = [
  { username: 'fer_ayala', display_name: 'Fer Ayala', role: 'founder' },
  { username: 'yaz_antonio', display_name: 'Yaz Antonio', role: 'cofounder' },
  { username: 'natha_barragan', display_name: 'Natha Barragán', role: 'asistente' },
  { username: 'jose_camacho', display_name: 'José Camacho', role: 'editor' },
  { username: 'alhena_taboada', display_name: 'Alhena Taboada', role: 'filmaker' },
  { username: 'mariana_yudico', display_name: 'Mariana Yudico', role: 'filmaker' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
function stg(k) { return KANBAN_COLS.find(s => s.k === k) || KANBAN_COLS[0]; }
function nextStg(k) { const i = SK.indexOf(k); return i >= 0 && i < SK.length - 1 ? KANBAN_COLS[i + 1] : null; }
function fmtDl(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00'), now = new Date(), diff = Math.ceil((dt - now) / 864e5);
  const f = dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (diff < 0) return `${f} (${Math.abs(diff)}d atraso)`;
  if (diff === 0) return `${f} (hoy)`;
  if (diff <= 3) return `${f} (${diff}d)`;
  return f;
}
function isOD(d) { return d && new Date(d + 'T12:00:00') < new Date(); }
function getMonths() {
  const m = [], now = new Date();
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    m.push({ v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, l: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) });
  }
  return m;
}
function shortName(m) { return (m.display_name || m.username || '').split(' ')[0]; }

// ═══════════════════════════════════════════════════════════════════════════
// PEPE: Auto-generate pieces + round-robin assignment
// ═══════════════════════════════════════════════════════════════════════════
function pepeGeneratePieces(clientId, period, pool) {
  const plan = CLIENT_PLANS[clientId];
  if (!plan) return [];
  const pieces = [];
  let idx = 0;
  const now = new Date();
  const [year, month] = period.split('-').map(Number);

  plan.pieces.forEach(({ n, t }) => {
    for (let i = 0; i < n; i++) {
      idx++;
      const pieceNum = idx;
      const label = PIECE_LABELS[t] || t;
      // Spread deadlines across the month
      const day = Math.min(Math.ceil((idx / plan.pieces.reduce((s, p) => s + p.n, 0)) * 28) + 1, 28);
      const deadline = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const piece = {
        id: `gen-${clientId}-${period}-${idx}`,
        client_id: clientId,
        title: `${label} ${i + 1}`,
        type: t,
        status: 'pendiente',
        deadline,
        period,
      };

      // Round-robin assign from pool for each stage
      ACTIVE_STAGES.forEach(st => {
        const stagePool = pool[st.k] || [];
        if (stagePool.length > 0) {
          piece[AF[st.k]] = stagePool[(idx - 1) % stagePool.length];
        } else {
          piece[AF[st.k]] = null;
        }
        piece[OF[st.k]] = null;
      });

      pieces.push(piece);
    }
  });

  return pieces;
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════
const S = {
  sel: {
    background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8, color: C.txt,
    padding: '8px 30px 8px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23555' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  },
  inp: {
    width: '100%', background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8,
    color: C.txt, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  },
  btn: (primary) => ({
    padding: primary ? '9px 20px' : '8px 16px', borderRadius: 8, border: 'none',
    background: primary ? C.acc : C.card, color: primary ? C.accTxt : C.txt,
    fontSize: 13, fontWeight: primary ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'opacity .15s',
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Small components
// ═══════════════════════════════════════════════════════════════════════════
function Av({ username, team, size = 22 }) {
  const m = team.find(t => t.username === username);
  const ini = m ? shortName(m).slice(0, 2).toUpperCase() : '??';
  const rc = ROLE_COLORS[m?.role] || C.txtS;
  return <div title={m?.display_name || username} style={{ width: size, height: size, borderRadius: '50%', background: `${rc}22`, color: rc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, border: `1.5px solid ${C.bg}` }}>{ini}</div>;
}

function Badge({ children, color = C.acc }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// POOL PANEL (sidebar)
// ═══════════════════════════════════════════════════════════════════════════
function PoolPanel({ pool, setPool, team, clientColor, onGenerate, pieceCount }) {
  const toggle = (stageKey, username) => {
    setPool(prev => {
      const next = { ...prev };
      const list = [...(next[stageKey] || [])];
      const idx = list.indexOf(username);
      if (idx >= 0) list.splice(idx, 1); else list.push(username);
      next[stageKey] = list;
      return next;
    });
  };

  return (
    <div style={{
      width: 280, flexShrink: 0, background: C.card, borderRight: `1px solid ${C.brd}`,
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${C.brd}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.wh, marginBottom: 4 }}>Pool del equipo</div>
        <div style={{ fontSize: 11, color: C.txtM }}>Asigna quién trabaja en cada etapa. Pepe reparte las piezas automáticamente.</div>
      </div>

      {/* Stages */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        {ACTIVE_STAGES.map(st => {
          const assigned = pool[st.k] || [];
          return (
            <div key={st.k} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.c }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.txt, textTransform: 'uppercase', letterSpacing: '.04em' }}>{st.l}</span>
                <span style={{ fontSize: 10, color: C.txtM, marginLeft: 'auto' }}>{assigned.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {team.map(m => {
                  const sel = assigned.includes(m.username);
                  const rc = ROLE_COLORS[m.role] || C.txtS;
                  return (
                    <button key={m.username} onClick={() => toggle(st.k, m.username)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px 3px 4px', borderRadius: 14,
                      background: sel ? `${rc}18` : 'transparent',
                      border: `1px solid ${sel ? rc + '55' : C.brd}`,
                      color: sel ? rc : C.txtM,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all .12s',
                    }}>
                      <Av username={m.username} team={team} size={16} />
                      {shortName(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate button */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.brd}` }}>
        {pieceCount > 0 ? (
          <div style={{ fontSize: 11, color: C.txtM, textAlign: 'center', marginBottom: 8 }}>
            {pieceCount} piezas ya generadas este mes
          </div>
        ) : null}
        <button onClick={onGenerate} style={{
          ...S.btn(true), width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          🤖 {pieceCount > 0 ? 'Regenerar piezas' : 'Generar piezas del mes'}
        </button>
        {pieceCount > 0 && (
          <div style={{ fontSize: 10, color: C.amb, textAlign: 'center', marginTop: 6 }}>
            Regenerar reemplaza las piezas en "Pendiente"
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KANBAN CARD
// ═══════════════════════════════════════════════════════════════════════════
function Card({ piece, onClick, team }) {
  const pl = PIECE_LABELS[piece.type] || piece.type;
  const pc = PIECE_COLORS[piece.type] || C.txtS;
  const od = isOD(piece.deadline) && piece.status !== 'publicado';
  const au = AF[piece.status] ? piece[AF[piece.status]] : null;

  return (
    <div onClick={() => onClick(piece)} style={{
      background: C.card, border: `1px solid ${od ? C.red + '33' : C.brd}`, borderRadius: 8,
      padding: '9px 11px', cursor: 'pointer', transition: 'all .12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = C.cardH; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `${pc}15`, color: pc, fontWeight: 700 }}>{pl}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.txt, lineHeight: '16px', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{piece.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: od ? C.red : C.txtM, fontWeight: od ? 600 : 400 }}>{fmtDl(piece.deadline)}</span>
        {au && <Av username={au} team={team} size={18} />}
      </div>
    </div>
  );
}

function Column({ stage, pieces, onCardClick, team }) {
  return (
    <div style={{ flex: '0 0 195px', display: 'flex', flexDirection: 'column', background: C.bg, borderRadius: 10, border: `1px solid ${C.brd}`, minHeight: 180, maxHeight: 'calc(100vh - 180px)' }}>
      <div style={{ padding: '9px 11px', borderBottom: `1px solid ${C.brd}`, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: stage.c }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.txt }}>{stage.l}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: C.txtM, background: C.card, padding: '1px 6px', borderRadius: 8 }}>{pieces.length}</span>
      </div>
      <div style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
        {pieces.map(p => <Card key={p.id} piece={p} onClick={onCardClick} team={team} />)}
        {!pieces.length && <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: C.txtM, fontStyle: 'italic' }}>—</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIECE DETAIL MODAL — full view/edit for every stage
// ═══════════════════════════════════════════════════════════════════════════
function PieceModal({ piece, onClose, onUpdate, onDelete, team }) {
  const [local, setLocal] = useState({ ...piece });
  const [tab, setTab] = useState(piece.status === 'pendiente' ? 'research' : piece.status);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(false);

  useEffect(() => { setLocal({ ...piece }); }, [piece]);

  const set = (field, val) => setLocal(prev => ({ ...prev, [field]: val }));
  const sg = stg(local.status);
  const od = isOD(local.deadline) && local.status !== 'publicado';
  const pt = PIECE_LABELS[local.type] || local.type;
  const pc = PIECE_COLORS[local.type] || C.txtS;

  const handleSave = async () => {
    setSaving(true);
    if (!local.id.startsWith('gen-') && !local.id.startsWith('new-')) {
      try { await supabase.from('content_pieces').update(local).eq('id', local.id); } catch {}
    }
    onUpdate(local);
    setSaving(false);
  };

  const handleAdvance = (sk) => {
    const ns = nextStg(sk);
    if (!ns) return;
    const up = { ...local, status: ns.k };
    setLocal(up);
    onUpdate(up);
    setTab(ns.k);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#131313', borderRadius: 16, border: `1px solid ${C.brdH}`, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.brd}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              {editTitle ? (
                <input value={local.title} onChange={e => set('title', e.target.value)} onBlur={() => setEditTitle(false)} onKeyDown={e => e.key === 'Enter' && setEditTitle(false)} autoFocus style={{ ...S.inp, fontSize: 16, fontWeight: 700, padding: '4px 8px', background: 'transparent', border: `1px solid ${C.brdH}` }} />
              ) : (
                <h2 onClick={() => setEditTitle(true)} style={{ fontSize: 16, fontWeight: 700, color: C.wh, margin: 0, cursor: 'pointer' }} title="Clic para editar">{local.title}</h2>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge color={pc}>{pt}</Badge>
                <Badge color={sg.c}>{sg.l}</Badge>
                {od && <Badge color={C.red}>Atrasada</Badge>}
                <span style={{ fontSize: 12, color: C.txtM }}>Deadline: </span>
                <input type="date" value={local.deadline || ''} onChange={e => set('deadline', e.target.value)} style={{ background: 'transparent', border: `1px solid ${C.brd}`, borderRadius: 6, color: C.txt, padding: '2px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none', colorScheme: 'dark' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { onDelete(local.id); onClose(); }} style={{ background: 'none', border: `1px solid ${C.red}33`, color: C.red, fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Eliminar</button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.txtM, fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
            </div>
          </div>
        </div>

        {/* ── Stage tabs ── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.brd}`, overflowX: 'auto', flexShrink: 0 }}>
          {KANBAN_COLS.filter(s => s.k !== 'pendiente').map(s => {
            const isAct = tab === s.k;
            const si = SK.indexOf(s.k), ci = SK.indexOf(local.status);
            const isPast = si < ci, isCur = si === ci;
            const hasOut = OF[s.k] && local[OF[s.k]];
            return (
              <button key={s.k} onClick={() => setTab(s.k)} style={{
                background: isAct ? C.card : 'transparent', border: 'none',
                borderBottom: isAct ? `2px solid ${s.c}` : '2px solid transparent',
                color: isAct ? C.wh : isPast ? (hasOut ? C.txtS : C.txtM) : C.txtM,
                padding: '10px 13px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {isPast && hasOut && <span style={{ color: C.teal, fontSize: 11 }}>✓</span>}
                {isCur && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, flexShrink: 0 }} />}
                {s.l}
              </button>
            );
          })}
        </div>

        {/* ── Stage body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {(() => {
            const sk = tab;
            const af = AF[sk], of2 = OF[sk], ot = OT[sk];
            const assigned = af ? local[af] : null;
            const output = of2 ? local[of2] : null;
            const ci = SK.indexOf(local.status), ti = SK.indexOf(sk);
            const isCur = ti === ci, isPast = ti < ci, isFut = ti > ci;
            const ns = nextStg(sk);

            // For publicado tab
            if (sk === 'publicado') {
              return (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  {local.status === 'publicado' ? (
                    <div>
                      <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>✦</span>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>Publicado</div>
                      <input placeholder="Link de publicación" value={local.publish_url || ''} onChange={e => set('publish_url', e.target.value)} style={{ ...S.inp, marginTop: 16, maxWidth: 400, margin: '16px auto 0' }} />
                    </div>
                  ) : (
                    <div style={{ color: C.txtM, fontSize: 13 }}>Esta pieza aún no llega a publicación.</div>
                  )}
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Assigned person */}
                {af && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.txtM, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Responsable</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {team.map(m => {
                        const sel = assigned === m.username;
                        const rc = ROLE_COLORS[m.role] || C.txtS;
                        return (
                          <button key={m.username} onClick={() => set(af, m.username)} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px 4px 5px', borderRadius: 16,
                            background: sel ? `${rc}18` : 'transparent',
                            border: `1.5px solid ${sel ? rc : C.brd}`,
                            color: sel ? rc : C.txtM, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            <Av username={m.username} team={team} size={18} />
                            {shortName(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Output */}
                {of2 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.txtM, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      Output {isPast && output ? '✓ completado' : isCur ? '— requerido para avanzar' : ''}
                    </div>

                    {ot === 'url' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input type="url" placeholder="URL de referencia viral (Instagram, TikTok…)" value={local.research_output || ''} onChange={e => set('research_output', e.target.value)} disabled={isFut} style={{ ...S.inp, opacity: isFut ? .4 : 1 }} />
                        <textarea placeholder="¿Por qué funciona? Hook, formato, duración, CTA…" value={local.research_comment || ''} onChange={e => set('research_comment', e.target.value)} rows={3} disabled={isFut} style={{ ...S.inp, opacity: isFut ? .4 : 1 }} />
                      </div>
                    )}
                    {ot === 'text' && (
                      <textarea placeholder={'• Abre con pregunta provocativa\n• Muestra resultado en 3 seg\n• CTA directo'} value={output || ''} rows={7} onChange={e => set(of2, e.target.value)} disabled={isFut} style={{ ...S.inp, opacity: isFut ? .4 : 1, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
                    )}
                    {ot === 'file' && (
                      output ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: C.card, borderRadius: 8, border: `1px solid ${C.brd}` }}>
                          <span style={{ fontSize: 20 }}>📎</span>
                          <span style={{ fontSize: 13, color: C.txt, flex: 1 }}>{output}</span>
                          {!isFut && <button onClick={() => set(of2, null)} style={{ background: 'none', border: 'none', color: C.red, fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Quitar</button>}
                        </div>
                      ) : (
                        <label style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '30px 20px', background: C.card, border: `2px dashed ${isFut ? C.brd : C.brdH}`,
                          borderRadius: 8, cursor: isFut ? 'default' : 'pointer', opacity: isFut ? .4 : 1,
                          transition: 'border-color .15s',
                        }}>
                          <span style={{ fontSize: 28, opacity: .4 }}>📤</span>
                          <span style={{ fontSize: 12, color: C.txtM }}>{isFut ? 'Pendiente' : 'Clic para subir archivo'}</span>
                          {!isFut && <input type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) set(of2, f.name); }} />}
                        </label>
                      )
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleSave} style={S.btn(false)}>
                    {saving ? 'Guardando…' : '💾 Guardar'}
                  </button>
                  {isCur && output && ns && (
                    <button onClick={() => handleAdvance(sk)} style={S.btn(true)}>
                      Avanzar a {ns.l} →
                    </button>
                  )}
                  {isFut && <span style={{ fontSize: 12, color: C.txtM, fontStyle: 'italic', alignSelf: 'center' }}>Etapa futura</span>}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function PipelinePage() {
  const router = useRouter();
  const [session, setSess] = useState(null);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [selClient, setSelClient] = useState('');
  const [selMonth, setSelMonth] = useState(CURRENT_PERIOD);
  const [pieces, setPieces] = useState([]);
  const [pool, setPool] = useState({});
  const [modal, setModal] = useState(null);
  const [showPool, setShowPool] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Auth
  useEffect(() => {
    const s = getSession();
    if (!s?.user || !isAdmin(s.user)) { router.push('/'); return; }
    setSess(s);
  }, []);

  // Load clients + team
  useEffect(() => {
    if (!session) return;
    (async () => {
      let cl = [], tm = [];
      try {
        const { data: dbCl } = await supabase.from('clients').select('*');
        const { data: dbTm } = await supabase.from('team_users').select('*').eq('is_active', true);
        if (dbCl?.length) cl = dbCl;
        if (dbTm?.length) tm = dbTm;
      } catch {}
      if (!cl.length) { cl = DEMO_CLIENTS; setIsDemo(true); }
      if (!tm.length) tm = DEMO_TEAM;
      setClients(cl);
      setTeam(tm);
      setSelClient(cl[0]?.id || '');
    })();
  }, [session]);

  // Load pieces for selected client/month
  useEffect(() => {
    if (!selClient) return;
    (async () => {
      if (!isDemo) {
        try {
          const { data } = await supabase.from('content_pieces').select('*').eq('client_id', selClient).eq('period', selMonth);
          if (data?.length) { setPieces(data); return; }
        } catch {}
      }
      // No pieces yet — show empty, user will generate
      setPieces([]);
    })();
  }, [selClient, selMonth, isDemo]);

  // Load pool config for client
  useEffect(() => {
    if (!selClient) return;
    (async () => {
      try {
        const { data } = await supabase.from('monthly_team').select('pool_config').eq('client_id', selClient).eq('month', selMonth).single();
        if (data?.pool_config) { setPool(JSON.parse(data.pool_config)); return; }
      } catch {}
      // Default empty pool
      setPool({});
    })();
  }, [selClient, selMonth]);

  // Generate pieces with Pepe
  const handleGenerate = useCallback(() => {
    const generated = pepeGeneratePieces(selClient, selMonth, pool);
    // Keep non-pendiente pieces (already in progress), replace pendiente
    setPieces(prev => {
      const inProgress = prev.filter(p => p.status !== 'pendiente');
      return [...inProgress, ...generated];
    });
    // Save pool config
    (async () => {
      try {
        await supabase.from('monthly_team').upsert({
          client_id: selClient, month: selMonth, pool_config: JSON.stringify(pool),
        });
      } catch {}
    })();
  }, [selClient, selMonth, pool]);

  // Add single piece
  const handleAddPiece = () => {
    const newPiece = {
      id: `new-${Date.now()}`,
      client_id: selClient, title: 'Nueva pieza', type: 'reel', status: 'pendiente',
      deadline: `${selMonth}-15`, period: selMonth,
    };
    ACTIVE_STAGES.forEach(st => {
      const stagePool = pool[st.k] || [];
      newPiece[AF[st.k]] = stagePool.length ? stagePool[0] : null;
      newPiece[OF[st.k]] = null;
    });
    setPieces(prev => [...prev, newPiece]);
    setModal(newPiece);
  };

  const handleUpdate = useCallback((updated) => {
    setPieces(prev => prev.map(p => p.id === updated.id ? updated : p));
    setModal(updated);
  }, []);

  const handleDelete = useCallback((id) => {
    setPieces(prev => prev.filter(p => p.id !== id));
  }, []);

  if (!session) return null;

  const total = pieces.length;
  const published = pieces.filter(p => p.status === 'publicado').length;
  const overdueN = pieces.filter(p => isOD(p.deadline) && p.status !== 'publicado').length;
  const pct = total ? Math.round((published / total) * 100) : 0;
  const months = getMonths();
  const clientColor = clients.find(c => c.id === selClient)?.color || C.acc;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <NavHeader />

      {/* Toolbar */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.brd}`, flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={() => setShowPool(!showPool)} style={{
          ...S.btn(false), fontSize: 12, padding: '6px 12px',
          background: showPool ? C.accDim : C.card, color: showPool ? C.acc : C.txtS,
          border: `1px solid ${showPool ? C.acc + '33' : C.brd}`,
        }}>
          👥 Pool
        </button>
        <select value={selClient} onChange={e => setSelClient(e.target.value)} style={S.sel}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={S.sel}>
          {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
        <button onClick={handleAddPiece} style={{ ...S.btn(false), fontSize: 12, padding: '6px 12px' }}>+ Pieza</button>
        {isDemo && <Badge color={C.amb}>Demo</Badge>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: C.wh }}>{total}</div><div style={{ fontSize: 9, color: C.txtM }}>Piezas</div></div>
          <div style={{ width: 1, height: 22, background: C.brd }} />
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: C.acc }}>{published}</div><div style={{ fontSize: 9, color: C.txtM }}>Publicadas</div></div>
          {overdueN > 0 && <>
            <div style={{ width: 1, height: 22, background: C.brd }} />
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 800, color: C.red }}>{overdueN}</div><div style={{ fontSize: 9, color: C.txtM }}>Atrasadas</div></div>
          </>}
          <div style={{ width: 1, height: 22, background: C.brd }} />
          <div style={{ flex: '0 0 80px', height: 4, background: C.card, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${C.teal},${C.acc})`, borderRadius: 2, transition: 'width .4s' }} />
          </div>
          <span style={{ fontSize: 11, color: C.txtM, fontWeight: 600 }}>{pct}%</span>
        </div>
      </div>

      {/* Main area: pool panel + kanban */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showPool && (
          <PoolPanel
            pool={pool} setPool={setPool} team={team}
            clientColor={clientColor} onGenerate={handleGenerate}
            pieceCount={pieces.length}
          />
        )}

        {/* Kanban */}
        <div style={{ flex: 1, display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', alignItems: 'flex-start' }}>
          {pieces.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 60, color: C.txtM }}>
              <span style={{ fontSize: 48, opacity: .3 }}>🤖</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.txtS }}>Sin piezas este mes</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
                Configura el pool del equipo en el panel izquierdo y presiona "Generar piezas del mes" para que Pepe las cree y asigne automáticamente.
              </div>
            </div>
          ) : (
            KANBAN_COLS.map(s => (
              <Column key={s.k} stage={s} pieces={pieces.filter(p => p.status === s.k)} onCardClick={setModal} team={team} />
            ))
          )}
        </div>
      </div>

      {modal && <PieceModal piece={modal} onClose={() => setModal(null)} onUpdate={handleUpdate} onDelete={handleDelete} team={team} />}
    </div>
  );
}
