'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  STAGES, STAGE_KEYS, STAGE_ASSIGNED_FIELD, STAGE_OUTPUT_FIELD, STAGE_OUTPUT_TYPE,
  getStage, getNextStage, getPieceType, formatDeadline, isOverdue, getMonthOptions,
  isFounder, PIECE_TYPES,
} from '../../lib/pipeline-helpers';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// Design tokens
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
// DEMO DATA  (replace with Supabase queries in production)
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_CLIENTS = [
  { id: 'c1', name: 'Cire' },
  { id: 'c2', name: 'Brillo Mío Valle' },
  { id: 'c3', name: 'Brillo Mío Santa Fe' },
  { id: 'c4', name: 'Beauty Design SJ' },
  { id: 'c5', name: 'Beauty Design Barbería' },
  { id: 'c6', name: 'Sandy Arcos' },
  { id: 'c7', name: 'Profeta Mariana' },
  { id: 'c8', name: 'Apóstol Víctor' },
  { id: 'c9', name: 'Diveland' },
];

const DEMO_TEAM = [
  { username: 'fer_ayala',       display: 'Fer',       role: 'owner' },
  { username: 'yaz_antonio',     display: 'Yaz',       role: 'coowner' },
  { username: 'natha_barragan',  display: 'Natha',     role: 'asistente' },
  { username: 'jose_camacho',    display: 'José',      role: 'editor' },
  { username: 'alhena_taboada',  display: 'Alhena',    role: 'crew' },
  { username: 'mariana_yudico',  display: 'Mariana Y', role: 'crew' },
];

function makeDemoPieces(clientId) {
  const titles = {
    c1: [
      { t: 'Reel - Resultados láser', type: 'reel' },
      { t: 'Reel - Testimonio Karla', type: 'reel' },
      { t: 'Carrusel - Promo mayo', type: 'carrusel' },
      { t: 'Reel - Antes/después', type: 'reel' },
      { t: 'Ad - Conversión WhatsApp', type: 'ad' },
      { t: 'Reel - Proceso láser', type: 'reel' },
      { t: 'Carrusel - Tips cuidado', type: 'carrusel' },
      { t: 'Reel - Modelo sesión', type: 'reel' },
    ],
    c2: [
      { t: 'Reel - Transformación color', type: 'reel' },
      { t: 'Reel - Balayage tutorial', type: 'reel' },
      { t: 'Fast - Corte express', type: 'fast_reel' },
      { t: 'Carrusel - Tendencias 2026', type: 'carrusel' },
      { t: 'Reel - Cliente feliz', type: 'reel' },
      { t: 'Fast - Blow dry ASMR', type: 'fast_reel' },
    ],
    c6: [
      { t: 'Ep 14 - Emprendimiento digital', type: 'episodio' },
      { t: 'Clip 14.1 - Mejor consejo', type: 'clip' },
      { t: 'Clip 14.2 - Error más grande', type: 'clip' },
      { t: 'Reel - Sandy reacts', type: 'reel' },
    ],
    c7: [
      { t: 'Ep - Predica domingo 23', type: 'episodio' },
      { t: 'Clip prédica - Fe', type: 'clip' },
      { t: 'Reel grabación BTS', type: 'reel' },
      { t: 'Carrusel - Versículo semana', type: 'carrusel' },
    ],
  };

  const pieceDefs = titles[clientId] || [
    { t: 'Pieza 1', type: 'reel' },
    { t: 'Pieza 2', type: 'reel' },
    { t: 'Pieza 3', type: 'carrusel' },
  ];

  const statusPool = STAGE_KEYS;
  const teamPool = DEMO_TEAM.map(t => t.username);

  return pieceDefs.map((p, i) => {
    const status = statusPool[i % statusPool.length];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (i * 3 - 5));

    const piece = {
      id: `${clientId}-${i}`,
      client_id: clientId,
      title: p.t,
      type: p.type,
      status,
      deadline: deadline.toISOString().split('T')[0],
      month: '2026-03',
      research_assigned: teamPool[(i + 2) % teamPool.length],
      research_output: status !== 'pendiente' ? 'https://instagram.com/reel/example' : null,
      research_comment: status !== 'pendiente' ? 'Hook fuerte, corte rápido, CTA al final' : null,
      guion_assigned: teamPool[(i + 3) % teamPool.length],
      guion_output: ['guion','aprobacion','grabacion','edicion','rev_cliente','publicado'].includes(status) ? '• Abre con pregunta\n• Muestra resultado\n• CTA' : null,
      aprobacion_assigned: 'fer_ayala',
      aprobacion_output: ['grabacion','edicion','rev_cliente','publicado'].includes(status) ? 'approved' : null,
      grabacion_assigned: teamPool[(i + 4) % teamPool.length],
      grabacion_output: ['edicion','rev_cliente','publicado'].includes(status) ? 'grabacion_reel_cire_14.mp4' : null,
      edicion_assigned: 'jose_camacho',
      edicion_output: ['rev_cliente','publicado'].includes(status) ? 'edit_final_v2.mp4' : null,
      rev_cliente_assigned: null,
      rev_cliente_output: status === 'publicado' ? 'approved' : null,
    };
    return piece;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function Avatar({ username, size = 24 }) {
  const member = DEMO_TEAM.find(t => t.username === username);
  const initials = member ? member.display.slice(0, 2).toUpperCase() : '??';
  const colors = ['#8B5CF6','#3B82F6','#EF4444','#EC4899','#06B6D4','#F59E0B'];
  const idx = username ? username.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
      border: `1.5px solid ${T.bg}`,
    }} title={member?.display || username}>
      {initials}
    </div>
  );
}

function Badge({ children, color = T.accent, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      background: bg || `${color}18`, color,
      fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function StageIndicator({ stageKey, small }) {
  const s = getStage(stageKey);
  return (
    <Badge color={s.color}>
      <span style={{ fontSize: small ? 10 : 12 }}>{s.icon}</span>
      {!small && s.label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PipelineCard  (inside kanban column)
// ═══════════════════════════════════════════════════════════════════════════

function PipelineCard({ piece, onClick }) {
  const pt = getPieceType(piece.type);
  const overdue = isOverdue(piece.deadline) && piece.status !== 'publicado';
  const assignedField = STAGE_ASSIGNED_FIELD[piece.status];
  const assignedUser = assignedField ? piece[assignedField] : null;

  return (
    <div
      onClick={() => onClick(piece)}
      style={{
        background: T.card,
        border: `1px solid ${overdue ? T.danger + '55' : T.border}`,
        borderRadius: T.radiusSm,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all .15s ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = T.cardHov;
        e.currentTarget.style.borderColor = overdue ? T.danger + '88' : T.borderLt;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = T.card;
        e.currentTarget.style.borderColor = overdue ? T.danger + '55' : T.border;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Type emoji + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 13, lineHeight: '18px' }}>{pt.emoji}</span>
        <span style={{
          fontSize: 12.5, fontWeight: 600, color: T.text, lineHeight: '18px',
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{piece.title}</span>
      </div>
      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, color: overdue ? T.danger : T.muted, fontWeight: overdue ? 600 : 400,
        }}>
          {formatDeadline(piece.deadline)}
        </span>
        {assignedUser && <Avatar username={assignedUser} size={20} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KanbanColumn
// ═══════════════════════════════════════════════════════════════════════════

function KanbanColumn({ stage, pieces, onCardClick }) {
  const count = pieces.length;
  return (
    <div style={{
      flex: '0 0 220px', display: 'flex', flexDirection: 'column',
      background: T.bg, borderRadius: T.radius,
      border: `1px solid ${T.border}`,
      minHeight: 200, maxHeight: 'calc(100vh - 180px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: stage.color, flexShrink: 0,
        }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text, letterSpacing: '.01em' }}>
          {stage.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: T.muted, background: T.surface, padding: '1px 7px',
          borderRadius: 10,
        }}>{count}</span>
      </div>
      {/* Cards */}
      <div style={{
        padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
        overflowY: 'auto', flex: 1,
      }}>
        {pieces.map(p => (
          <PipelineCard key={p.id} piece={p} onClick={onCardClick} />
        ))}
        {count === 0 && (
          <div style={{
            padding: 20, textAlign: 'center', fontSize: 12,
            color: T.muted, fontStyle: 'italic',
          }}>Sin piezas</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PieceDetailModal
// ═══════════════════════════════════════════════════════════════════════════

function PieceDetailModal({ piece, onClose, onUpdate, team }) {
  const [localPiece, setLocalPiece] = useState({ ...piece });
  const [tab, setTab] = useState(piece.status === 'pendiente' ? 'research' : piece.status);

  useEffect(() => {
    setLocalPiece({ ...piece });
  }, [piece]);

  const handleAssign = (stageKey, username) => {
    const field = STAGE_ASSIGNED_FIELD[stageKey];
    if (!field) return;
    const updated = { ...localPiece, [field]: username };
    setLocalPiece(updated);
    onUpdate(updated);
  };

  const handleOutputChange = (stageKey, value) => {
    const field = STAGE_OUTPUT_FIELD[stageKey];
    if (!field) return;
    setLocalPiece(prev => ({ ...prev, [field]: value }));
  };

  const handleAdvance = (stageKey) => {
    const next = getNextStage(stageKey);
    if (!next) return;
    const outputField = STAGE_OUTPUT_FIELD[stageKey];
    const updated = { ...localPiece, status: next.key };
    if (outputField) updated[outputField] = localPiece[outputField];
    setLocalPiece(updated);
    onUpdate(updated);
    setTab(next.key);
  };

  const handleSaveOutput = (stageKey) => {
    onUpdate(localPiece);
  };

  const pt = getPieceType(localPiece.type);
  const activeStages = STAGES.filter(s => s.key !== 'pendiente');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: T.surface, borderRadius: T.radiusLg,
        border: `1px solid ${T.borderLt}`,
        width: '100%', maxWidth: 720, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: T.shadow,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>{pt.emoji}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.white, margin: 0 }}>
              {localPiece.title}
            </h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <Badge color={T.textDim}>{pt.label}</Badge>
              <StageIndicator stageKey={localPiece.status} />
              {isOverdue(localPiece.deadline) && localPiece.status !== 'publicado' && (
                <Badge color={T.danger}>Atrasada</Badge>
              )}
              <span style={{ fontSize: 12, color: T.muted, alignSelf: 'center' }}>
                Deadline: {formatDeadline(localPiece.deadline)}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: T.muted, fontSize: 20,
            cursor: 'pointer', padding: 4, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Stage tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`,
          overflowX: 'auto', flexShrink: 0,
        }}>
          {activeStages.map(s => {
            const isActive = tab === s.key;
            const stageIdx = STAGE_KEYS.indexOf(s.key);
            const currentIdx = STAGE_KEYS.indexOf(localPiece.status);
            const isPast = stageIdx < currentIdx;
            const isCurrent = stageIdx === currentIdx;
            const outputField = STAGE_OUTPUT_FIELD[s.key];
            const hasOutput = outputField && localPiece[outputField];

            return (
              <button key={s.key} onClick={() => setTab(s.key)} style={{
                background: isActive ? T.card : 'transparent',
                border: 'none', borderBottom: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                color: isActive ? T.white : isPast ? T.muted : isCurrent ? T.text : T.muted + '88',
                padding: '10px 14px', fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .15s ease',
              }}>
                {isPast && hasOutput && <span style={{ color: T.accent, fontSize: 12 }}>✓</span>}
                {isCurrent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Stage content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <StagePanel
            stageKey={tab}
            piece={localPiece}
            team={team}
            onAssign={handleAssign}
            onOutputChange={handleOutputChange}
            onAdvance={handleAdvance}
            onSave={handleSaveOutput}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// StagePanel  (content for each stage tab in modal)
// ═══════════════════════════════════════════════════════════════════════════

function StagePanel({ stageKey, piece, team, onAssign, onOutputChange, onAdvance, onSave }) {
  const stage = getStage(stageKey);
  const assignedField = STAGE_ASSIGNED_FIELD[stageKey];
  const outputField = STAGE_OUTPUT_FIELD[stageKey];
  const outputType = STAGE_OUTPUT_TYPE[stageKey];
  const assigned = assignedField ? piece[assignedField] : null;
  const output = outputField ? piece[outputField] : null;

  const currentIdx = STAGE_KEYS.indexOf(piece.status);
  const thisIdx = STAGE_KEYS.indexOf(stageKey);
  const isCurrent = thisIdx === currentIdx;
  const isPast = thisIdx < currentIdx;
  const isFuture = thisIdx > currentIdx;

  const canAdvance = isCurrent && output;

  const inputStyle = {
    width: '100%', background: T.card, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, color: T.text, padding: '10px 14px',
    fontSize: 13, fontFamily: T.font, outline: 'none', resize: 'vertical',
  };

  const btnStyle = (primary) => ({
    padding: '8px 18px', borderRadius: T.radiusSm, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: primary ? T.accent : T.card,
    color: primary ? '#0A0A0A' : T.text,
    transition: 'opacity .15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Assigned person */}
      {assignedField && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Responsable
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {team.map(m => {
              const isSelected = assigned === m.username;
              return (
                <button key={m.username} onClick={() => onAssign(stageKey, m.username)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px 5px 6px', borderRadius: 20,
                  background: isSelected ? `${T.accent}22` : T.card,
                  border: `1.5px solid ${isSelected ? T.accent : T.border}`,
                  color: isSelected ? T.accent : T.textDim,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all .15s',
                }}>
                  <Avatar username={m.username} size={20} />
                  {m.display}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Output section */}
      {outputField && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Output {isPast && output ? '✓' : isCurrent ? '(requerido para avanzar)' : ''}
          </label>

          <div style={{ marginTop: 8 }}>
            {/* Research: URL + comment */}
            {outputType === 'url+text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="url"
                  placeholder="URL de referencia viral (Instagram, TikTok…)"
                  value={piece.research_output || ''}
                  onChange={e => onOutputChange(stageKey, e.target.value)}
                  disabled={!isCurrent}
                  style={{ ...inputStyle, opacity: isCurrent ? 1 : 0.6 }}
                />
                <textarea
                  placeholder="¿Por qué funciona esta referencia? Hook, formato, CTA…"
                  value={piece.research_comment || ''}
                  rows={3}
                  disabled={!isCurrent}
                  style={{ ...inputStyle, opacity: isCurrent ? 1 : 0.6 }}
                  onChange={e => {
                    // store comment alongside output
                  }}
                />
              </div>
            )}

            {/* Guión: text bullets */}
            {outputType === 'text' && (
              <textarea
                placeholder="• Abre con pregunta provocativa&#10;• Muestra resultado en 3 segundos&#10;• CTA directo"
                value={output || ''}
                rows={6}
                onChange={e => onOutputChange(stageKey, e.target.value)}
                disabled={!isCurrent}
                style={{ ...inputStyle, opacity: isCurrent ? 1 : 0.6, fontFamily: 'monospace', lineHeight: 1.7 }}
              />
            )}

            {/* Grabación / Edición: file upload */}
            {outputType === 'file' && (
              <div>
                {output ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: T.card, borderRadius: T.radiusSm,
                    border: `1px solid ${T.border}`,
                  }}>
                    <span style={{ fontSize: 20 }}>📎</span>
                    <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{output}</span>
                    {isCurrent && (
                      <button onClick={() => onOutputChange(stageKey, null)} style={{
                        background: 'none', border: 'none', color: T.danger,
                        fontSize: 12, cursor: 'pointer', fontWeight: 600,
                      }}>Quitar</button>
                    )}
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    padding: '28px 20px', background: T.card,
                    border: `2px dashed ${isCurrent ? T.borderLt : T.border}`,
                    borderRadius: T.radiusSm,
                    cursor: isCurrent ? 'pointer' : 'default',
                    opacity: isCurrent ? 1 : 0.5,
                    transition: 'border-color .15s',
                  }}>
                    <span style={{ fontSize: 28, opacity: 0.5 }}>📤</span>
                    <span style={{ fontSize: 12, color: T.muted }}>
                      {isCurrent ? 'Clic para subir archivo' : 'Archivo pendiente'}
                    </span>
                    {isCurrent && (
                      <input type="file" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) onOutputChange(stageKey, file.name);
                      }} />
                    )}
                  </label>
                )}
              </div>
            )}

            {/* Aprobación / Rev cliente */}
            {outputType === 'approval' && (
              <div>
                {output === 'approved' ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', background: `${T.accent}12`,
                    borderRadius: T.radiusSm, border: `1px solid ${T.accent}33`,
                  }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>Aprobado</span>
                  </div>
                ) : output === 'rejected' ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', background: `${T.danger}12`,
                    borderRadius: T.radiusSm, border: `1px solid ${T.danger}33`,
                  }}>
                    <span style={{ fontSize: 18 }}>❌</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.danger }}>Rechazado — requiere cambios</span>
                  </div>
                ) : isCurrent ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { onOutputChange(stageKey, 'approved'); }} style={{
                      ...btnStyle(true), display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      ✓ Aprobar
                    </button>
                    <button onClick={() => { onOutputChange(stageKey, 'rejected'); }} style={{
                      ...btnStyle(false), borderColor: T.danger, color: T.danger,
                      border: `1px solid ${T.danger}44`,
                    }}>
                      ✕ Rechazar
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>
                    Pendiente de revisión
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {isCurrent && outputField && (
          <button onClick={() => onSave(stageKey)} style={btnStyle(false)}>
            Guardar
          </button>
        )}
        {canAdvance && (
          <button onClick={() => onAdvance(stageKey)} style={btnStyle(true)}>
            Avanzar a {getNextStage(stageKey)?.label} →
          </button>
        )}
        {isFuture && (
          <span style={{ fontSize: 12, color: T.muted, fontStyle: 'italic', alignSelf: 'center' }}>
            Esta etapa aún no está activa
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE: /pipeline
// ═══════════════════════════════════════════════════════════════════════════

export default function PipelinePage() {
  const [clients] = useState(DEMO_CLIENTS);
  const [selectedClient, setSelectedClient] = useState(DEMO_CLIENTS[0].id);
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [pieces, setPieces] = useState([]);
  const [modalPiece, setModalPiece] = useState(null);
  const [team] = useState(DEMO_TEAM);
  const kanbanRef = useRef(null);

  // Load pieces when client changes
  useEffect(() => {
    const data = makeDemoPieces(selectedClient);
    setPieces(data.filter(p => p.month === selectedMonth));
  }, [selectedClient, selectedMonth]);

  const handleCardClick = (piece) => setModalPiece(piece);

  const handleUpdatePiece = (updated) => {
    setPieces(prev => prev.map(p => p.id === updated.id ? updated : p));
    setModalPiece(updated);
  };

  const clientName = clients.find(c => c.id === selectedClient)?.name || '';
  const months = getMonthOptions();

  // Stats
  const total = pieces.length;
  const published = pieces.filter(p => p.status === 'publicado').length;
  const overdue = pieces.filter(p => isOverdue(p.deadline) && p.status !== 'publicado').length;

  const selectStyle = {
    background: T.card, border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm, color: T.text, padding: '8px 14px',
    fontSize: 13, fontWeight: 600, fontFamily: T.font,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 30,
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      fontFamily: T.font, padding: '0',
    }}>
      {/* Top bar */}
      <header style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
          <span style={{
            fontSize: 18, fontWeight: 800, color: T.accent,
            letterSpacing: '-.02em',
          }}>e.32o</span>
          <span style={{
            fontSize: 11, color: T.muted, fontWeight: 500,
            padding: '2px 8px', background: T.surface, borderRadius: 4,
          }}>Pipeline</span>
        </div>

        {/* Client selector */}
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          style={selectStyle}
        >
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Month selector */}
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={selectStyle}
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Quick stats */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.white }}>{total}</div>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>Piezas</div>
          </div>
          <div style={{ width: 1, height: 28, background: T.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{published}</div>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>Publicadas</div>
          </div>
          {overdue > 0 && (
            <>
              <div style={{ width: 1, height: 28, background: T.border }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.danger }}>{overdue}</div>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>Atrasadas</div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ padding: '12px 28px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          flex: 1, height: 4, background: T.surface, borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: total ? `${(published / total) * 100}%` : '0%',
            background: `linear-gradient(90deg, ${T.accentDk}, ${T.accent})`,
            transition: 'width .4s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {total ? Math.round((published / total) * 100) : 0}% completado
        </span>
      </div>

      {/* Kanban board */}
      <div ref={kanbanRef} style={{
        display: 'flex', gap: 10, padding: '16px 28px 28px',
        overflowX: 'auto', alignItems: 'flex-start',
      }}>
        {STAGES.map(stage => (
          <KanbanColumn
            key={stage.key}
            stage={stage}
            pieces={pieces.filter(p => p.status === stage.key)}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Modal */}
      {modalPiece && (
        <PieceDetailModal
          piece={modalPiece}
          onClose={() => setModalPiece(null)}
          onUpdate={handleUpdatePiece}
          team={team}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.borderLt}; }
        select option { background: ${T.surface}; color: ${T.text}; }
      `}</style>
    </div>
  );
}
