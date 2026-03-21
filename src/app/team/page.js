'use client';

import { useState, useEffect } from 'react';
import {
  STAGES, STAGE_KEYS, STAGE_ASSIGNED_FIELD, STAGE_OUTPUT_FIELD, STAGE_OUTPUT_TYPE,
  getStage, getNextStage, getPieceType, formatDeadline, isOverdue,
} from '../../lib/pipeline-helpers';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// Design tokens (same as pipeline)
// ═══════════════════════════════════════════════════════════════════════════
const T = {
  bg:       '#0A0A0A',
  card:     '#111111',
  cardHov:  '#161616',
  surface:  '#1A1A1A',
  border:   '#222222',
  borderLt: '#2A2A2A',
  accent:   '#B8F03E',
  accentDk: '#8BBF1A',
  warn:     '#F59E0B',
  danger:   '#EF4444',
  muted:    '#666666',
  text:     '#E5E5E5',
  textDim:  '#999999',
  white:    '#FFFFFF',
  radius:   '10px',
  radiusSm: '6px',
  radiusLg: '14px',
  shadow:   '0 4px 24px rgba(0,0,0,.4)',
  font:     "'DM Sans', 'Inter', system-ui, sans-serif",
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA (simulates logged-in team member + their assigned pieces)
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_TEAM_MEMBERS = [
  { username: 'natha_barragan',  display: 'Natha',     role: 'asistente' },
  { username: 'jose_camacho',    display: 'José',      role: 'editor' },
  { username: 'alhena_taboada',  display: 'Alhena',    role: 'crew' },
  { username: 'mariana_yudico',  display: 'Mariana Y', role: 'crew' },
];

const DEMO_CLIENTS = {
  c1: 'Cire',
  c2: 'Brillo Mío Valle',
  c3: 'Brillo Mío Santa Fe',
  c6: 'Sandy Arcos',
  c7: 'Profeta Mariana',
  c8: 'Apóstol Víctor',
};

// Generate pieces where the logged-in user is assigned at the active stage
function getMyPieces(username) {
  const allPieces = [
    {
      id: 'c1-0', client_id: 'c1', title: 'Reel - Resultados láser', type: 'reel',
      status: 'edicion', deadline: '2026-03-18',
      edicion_assigned: 'jose_camacho', edicion_output: null,
      grabacion_output: 'grabacion_reel_laser.mp4',
    },
    {
      id: 'c1-1', client_id: 'c1', title: 'Reel - Testimonio Karla', type: 'reel',
      status: 'edicion', deadline: '2026-03-22',
      edicion_assigned: 'jose_camacho', edicion_output: null,
      grabacion_output: 'grabacion_testimonio_karla.mp4',
    },
    {
      id: 'c2-0', client_id: 'c2', title: 'Reel - Transformación color', type: 'reel',
      status: 'research', deadline: '2026-03-21',
      research_assigned: 'natha_barragan', research_output: null, research_comment: null,
    },
    {
      id: 'c2-1', client_id: 'c2', title: 'Carrusel - Tendencias 2026', type: 'carrusel',
      status: 'research', deadline: '2026-03-23',
      research_assigned: 'natha_barragan', research_output: null, research_comment: null,
    },
    {
      id: 'c2-2', client_id: 'c2', title: 'Reel - Balayage tutorial', type: 'reel',
      status: 'grabacion', deadline: '2026-03-19',
      grabacion_assigned: 'alhena_taboada', grabacion_output: null,
      guion_output: '• Intro con antes\n• Proceso paso a paso\n• Reveal final',
    },
    {
      id: 'c6-0', client_id: 'c6', title: 'Ep 14 - Emprendimiento digital', type: 'episodio',
      status: 'edicion', deadline: '2026-03-20',
      edicion_assigned: 'jose_camacho', edicion_output: null,
      grabacion_output: 'podcast_ep14_raw.mp4',
    },
    {
      id: 'c7-0', client_id: 'c7', title: 'Clip prédica - Fe', type: 'clip',
      status: 'edicion', deadline: '2026-03-17',
      edicion_assigned: 'jose_camacho', edicion_output: null,
      grabacion_output: 'predica_fe_raw.mp4',
    },
    {
      id: 'c1-3', client_id: 'c1', title: 'Carrusel - Promo mayo', type: 'carrusel',
      status: 'grabacion', deadline: '2026-03-25',
      grabacion_assigned: 'mariana_yudico', grabacion_output: null,
      guion_output: '• Slide 1: Pregunta\n• Slide 2: Dato\n• Slide 3: CTA',
    },
    {
      id: 'c2-3', client_id: 'c2', title: 'Fast - Corte express', type: 'fast_reel',
      status: 'grabacion', deadline: '2026-03-21',
      grabacion_assigned: 'alhena_taboada', grabacion_output: null,
      guion_output: '• Corte rápido time-lapse\n• Resultado final',
    },
  ];

  return allPieces.filter(p => {
    const assignField = STAGE_ASSIGNED_FIELD[p.status];
    return assignField && p[assignField] === username;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Pepe AI briefing (simulated)
// ═══════════════════════════════════════════════════════════════════════════
function getPepeBriefing(username, pieces) {
  const overduePieces = pieces.filter(p => isOverdue(p.deadline));
  const todayPieces = pieces.filter(p => {
    const d = p.deadline;
    if (!d) return false;
    const today = new Date().toISOString().split('T')[0];
    return d === today;
  });

  if (overduePieces.length > 0) {
    return {
      priority: 'urgent',
      message: `⚡ Tienes ${overduePieces.length} pieza${overduePieces.length > 1 ? 's' : ''} atrasada${overduePieces.length > 1 ? 's' : ''}. Prioriza: "${overduePieces[0].title}" — ${Math.abs(Math.ceil((new Date(overduePieces[0].deadline) - new Date()) / 86400000))} días de atraso.`,
    };
  }
  if (todayPieces.length > 0) {
    return {
      priority: 'today',
      message: `📌 ${todayPieces.length} pieza${todayPieces.length > 1 ? 's' : ''} con deadline hoy. Enfócate en "${todayPieces[0].title}" primero.`,
    };
  }
  if (pieces.length > 0) {
    return {
      priority: 'normal',
      message: `✨ Todo al corriente. Tienes ${pieces.length} tarea${pieces.length > 1 ? 's' : ''} activa${pieces.length > 1 ? 's' : ''}. Siguiente: "${pieces[0].title}".`,
    };
  }
  return {
    priority: 'clear',
    message: '🎉 No tienes tareas pendientes. ¡Buen trabajo!',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TaskOutputModal (team member completes their output)
// ═══════════════════════════════════════════════════════════════════════════

function TaskOutputModal({ piece, onClose, onComplete }) {
  const stage = getStage(piece.status);
  const outputType = STAGE_OUTPUT_TYPE[piece.status];
  const outputField = STAGE_OUTPUT_FIELD[piece.status];
  const pt = getPieceType(piece.type);

  const [url, setUrl] = useState(piece.research_output || '');
  const [comment, setComment] = useState(piece.research_comment || '');
  const [text, setText] = useState(piece[outputField] || '');
  const [file, setFile] = useState(piece[outputField] || '');
  const [submitting, setSubmitting] = useState(false);

  // Get previous stage output for context
  const prevStageIdx = STAGE_KEYS.indexOf(piece.status) - 1;
  const prevStageKey = prevStageIdx >= 0 ? STAGE_KEYS[prevStageIdx] : null;
  const prevOutputField = prevStageKey ? STAGE_OUTPUT_FIELD[prevStageKey] : null;
  const prevOutput = prevOutputField ? piece[prevOutputField] : null;

  const canSubmit = () => {
    switch (outputType) {
      case 'url+text': return url.trim().length > 0 && comment.trim().length > 0;
      case 'text': return text.trim().length > 0;
      case 'file': return file.trim().length > 0;
      default: return false;
    }
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    const updated = { ...piece };
    const next = getNextStage(piece.status);

    if (outputType === 'url+text') {
      updated.research_output = url;
      updated.research_comment = comment;
    } else {
      updated[outputField] = outputType === 'text' ? text : file;
    }

    if (next) updated.status = next.key;
    setTimeout(() => {
      onComplete(updated);
      setSubmitting(false);
    }, 400);
  };

  const inputStyle = {
    width: '100%', background: T.card, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, color: T.text, padding: '12px 14px',
    fontSize: 13, fontFamily: T.font, outline: 'none', resize: 'vertical',
    transition: 'border-color .15s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: T.surface, borderRadius: T.radiusLg,
        border: `1px solid ${T.borderLt}`,
        width: '100%', maxWidth: 560, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: T.shadow, overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
          background: `linear-gradient(135deg, ${stage.color}08, transparent)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: stage.color,
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {stage.label}
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: T.muted,
              fontSize: 18, cursor: 'pointer', padding: 4,
            }}>✕</button>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: T.white, margin: '10px 0 4px' }}>
            {pt.emoji} {piece.title}
          </h2>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: T.muted }}>
            <span>{DEMO_CLIENTS[piece.client_id] || piece.client_id}</span>
            <span>·</span>
            <span style={{ color: isOverdue(piece.deadline) ? T.danger : T.muted, fontWeight: isOverdue(piece.deadline) ? 600 : 400 }}>
              {formatDeadline(piece.deadline)}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Previous stage output for reference */}
          {prevOutput && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 10, fontWeight: 700, color: T.muted,
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}>
                Referencia de etapa anterior ({getStage(prevStageKey)?.label})
              </label>
              <div style={{
                marginTop: 6, padding: '10px 14px',
                background: T.card, borderRadius: T.radiusSm,
                border: `1px solid ${T.border}`,
                fontSize: 12.5, color: T.textDim, whiteSpace: 'pre-wrap',
                lineHeight: 1.6, maxHeight: 120, overflowY: 'auto',
              }}>
                {prevOutput}
              </div>
            </div>
          )}

          {/* Input area based on output type */}
          <label style={{
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Tu output {outputType === 'url+text' ? '(URL + comentario)' : ''}
          </label>

          <div style={{ marginTop: 8 }}>
            {outputType === 'url+text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="url"
                  placeholder="https://instagram.com/reel/... — URL de referencia viral"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = T.accent + '66'}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
                <textarea
                  placeholder="¿Por qué funciona? Describe: hook, formato, duración, CTA, qué replicar…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={4}
                  style={{ ...inputStyle, lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = T.accent + '66'}
                  onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
            )}

            {outputType === 'text' && (
              <textarea
                placeholder="• Abre con pregunta provocativa&#10;• Muestra resultado en 3 seg&#10;• Transición dinámica&#10;• CTA directo"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={8}
                style={{ ...inputStyle, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}
                onFocus={e => e.target.style.borderColor = T.accent + '66'}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            )}

            {outputType === 'file' && (
              <div>
                {file ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', background: T.card, borderRadius: T.radiusSm,
                    border: `1px solid ${T.accent}33`,
                  }}>
                    <span style={{ fontSize: 22 }}>📎</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{file}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>Listo para enviar</div>
                    </div>
                    <button onClick={() => setFile('')} style={{
                      background: 'none', border: 'none', color: T.danger,
                      fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}>Quitar</button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 10,
                    padding: '36px 20px', background: T.card,
                    border: `2px dashed ${T.borderLt}`,
                    borderRadius: T.radiusSm, cursor: 'pointer',
                    transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + '55'; e.currentTarget.style.background = T.cardHov; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLt; e.currentTarget.style.background = T.card; }}
                  >
                    <span style={{ fontSize: 32, opacity: 0.4 }}>📤</span>
                    <span style={{ fontSize: 13, color: T.textDim }}>Clic para subir tu archivo</span>
                    <span style={{ fontSize: 11, color: T.muted }}>Video, imagen, o documento</span>
                    <input type="file" style={{ display: 'none' }} onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f.name);
                    }} />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: T.radiusSm,
            background: T.card, border: `1px solid ${T.border}`,
            color: T.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!canSubmit() || submitting} style={{
            padding: '10px 24px', borderRadius: T.radiusSm, border: 'none',
            background: canSubmit() ? T.accent : T.muted + '44',
            color: canSubmit() ? '#0A0A0A' : T.muted,
            fontSize: 13, fontWeight: 700, cursor: canSubmit() ? 'pointer' : 'default',
            transition: 'all .15s',
            opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? 'Enviando…' : `Completar y avanzar →`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TaskRow (single task in the list)
// ═══════════════════════════════════════════════════════════════════════════

function TaskRow({ piece, onClick, index }) {
  const stage = getStage(piece.status);
  const pt = getPieceType(piece.type);
  const overdue = isOverdue(piece.deadline);

  return (
    <div
      onClick={() => onClick(piece)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        background: T.card,
        border: `1px solid ${overdue ? T.danger + '33' : T.border}`,
        borderRadius: T.radius,
        cursor: 'pointer',
        transition: 'all .2s ease',
        animation: `fadeSlideIn .3s ease ${index * 60}ms both`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = T.cardHov;
        e.currentTarget.style.borderColor = overdue ? T.danger + '55' : T.borderLt;
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = T.card;
        e.currentTarget.style.borderColor = overdue ? T.danger + '33' : T.border;
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      {/* Stage dot */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `${stage.color}15`, border: `2px solid ${stage.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        {stage.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: T.white,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pt.emoji} {piece.title}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: T.muted }}>
            {DEMO_CLIENTS[piece.client_id] || piece.client_id}
          </span>
          <span style={{ fontSize: 9, color: T.border }}>●</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: stage.color,
            padding: '1px 8px', borderRadius: 10,
            background: `${stage.color}12`,
          }}>{stage.label}</span>
        </div>
      </div>

      {/* Deadline */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: overdue ? T.danger : T.textDim,
        }}>
          {formatDeadline(piece.deadline)}
        </div>
      </div>

      {/* Arrow */}
      <span style={{ fontSize: 16, color: T.muted, flexShrink: 0 }}>›</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE: /team
// ═══════════════════════════════════════════════════════════════════════════

export default function TeamPage() {
  // Simulate: logged-in user selector (in prod this comes from auth)
  const [currentUser, setCurrentUser] = useState(DEMO_TEAM_MEMBERS[1]); // José by default
  const [pieces, setPieces] = useState([]);
  const [modalPiece, setModalPiece] = useState(null);
  const [completedIds, setCompletedIds] = useState(new Set());

  useEffect(() => {
    const myPieces = getMyPieces(currentUser.username);
    // Sort: overdue first, then by deadline
    myPieces.sort((a, b) => {
      const aOver = isOverdue(a.deadline) ? 0 : 1;
      const bOver = isOverdue(b.deadline) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    setPieces(myPieces);
    setCompletedIds(new Set());
  }, [currentUser]);

  const briefing = getPepeBriefing(currentUser.username, pieces.filter(p => !completedIds.has(p.id)));

  const handleComplete = (updated) => {
    setCompletedIds(prev => new Set([...prev, updated.id]));
    setModalPiece(null);
  };

  const activePieces = pieces.filter(p => !completedIds.has(p.id));
  const donePieces = pieces.filter(p => completedIds.has(p.id));

  const briefingColors = {
    urgent: { bg: `${T.danger}10`, border: `${T.danger}33`, accent: T.danger },
    today:  { bg: `${T.warn}10`,   border: `${T.warn}33`,   accent: T.warn },
    normal: { bg: `${T.accent}08`, border: `${T.accent}22`, accent: T.accent },
    clear:  { bg: `${T.accent}08`, border: `${T.accent}22`, accent: T.accent },
  };
  const bc = briefingColors[briefing.priority];

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      fontFamily: T.font,
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.accent, letterSpacing: '-.02em' }}>
            e.32o
          </span>
          <span style={{
            fontSize: 11, color: T.muted, fontWeight: 500,
            padding: '2px 8px', background: T.surface, borderRadius: 4,
          }}>Mi trabajo</span>
        </div>

        {/* User switcher (demo only) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Demo:</span>
          {DEMO_TEAM_MEMBERS.map(m => (
            <button key={m.username} onClick={() => setCurrentUser(m)} style={{
              padding: '5px 12px', borderRadius: 20,
              background: currentUser.username === m.username ? `${T.accent}22` : T.card,
              border: `1.5px solid ${currentUser.username === m.username ? T.accent : T.border}`,
              color: currentUser.username === m.username ? T.accent : T.textDim,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {m.display}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.white, margin: 0 }}>
            Hola, {currentUser.display}
          </h1>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Pepe briefing */}
        <div style={{
          padding: '14px 18px', borderRadius: T.radius,
          background: bc.bg, border: `1px solid ${bc.border}`,
          marginBottom: 24,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `${bc.accent}20`, border: `2px solid ${bc.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: bc.accent, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Pepe — tu PM
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
              {briefing.message}
            </div>
          </div>
        </div>

        {/* Active tasks */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.white, margin: 0 }}>
            Tareas activas
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.accent,
            background: `${T.accent}15`, padding: '2px 8px', borderRadius: 10,
          }}>{activePieces.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {activePieces.map((p, i) => (
            <TaskRow key={p.id} piece={p} index={i} onClick={setModalPiece} />
          ))}
          {activePieces.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: T.card, borderRadius: T.radius,
              border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🎉</span>
              <span style={{ fontSize: 14, color: T.textDim }}>
                ¡Todo completado! No tienes tareas pendientes.
              </span>
            </div>
          )}
        </div>

        {/* Completed today */}
        {donePieces.length > 0 && (
          <>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: T.muted, margin: 0 }}>
                Completadas hoy
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.muted,
                background: T.surface, padding: '2px 8px', borderRadius: 10,
              }}>{donePieces.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {donePieces.map(p => {
                const pt = getPieceType(p.type);
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', background: T.card,
                    borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
                    opacity: 0.6,
                  }}>
                    <span style={{ fontSize: 16, color: T.accent }}>✓</span>
                    <span style={{
                      fontSize: 13, color: T.textDim,
                      textDecoration: 'line-through', flex: 1,
                    }}>
                      {pt.emoji} {p.title}
                    </span>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      {DEMO_CLIENTS[p.client_id]}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalPiece && (
        <TaskOutputModal
          piece={modalPiece}
          onClose={() => setModalPiece(null)}
          onComplete={handleComplete}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
