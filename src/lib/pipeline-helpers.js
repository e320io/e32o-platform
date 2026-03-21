// ─── Status / Stage Definitions ────────────────────────────────────────────
export const STAGES = [
  { key: 'pendiente',    label: 'Pendiente',    icon: '◯',  color: '#666' },
  { key: 'research',     label: 'Research',     icon: '🔍', color: '#8B5CF6' },
  { key: 'guion',        label: 'Guión',        icon: '✍️', color: '#3B82F6' },
  { key: 'aprobacion',   label: 'Aprobación',   icon: '✓',  color: '#F59E0B' },
  { key: 'grabacion',    label: 'Grabación',    icon: '🎬', color: '#EF4444' },
  { key: 'edicion',      label: 'Edición',      icon: '✂️', color: '#EC4899' },
  { key: 'rev_cliente',  label: 'Rev. cliente',  icon: '👁', color: '#06B6D4' },
  { key: 'publicado',    label: 'Publicado',    icon: '✦',  color: '#B8F03E' },
];

export const STAGE_KEYS = STAGES.map(s => s.key);

// Map stage key → assigned field name in content_pieces
export const STAGE_ASSIGNED_FIELD = {
  research:    'research_assigned',
  guion:       'guion_assigned',
  aprobacion:  'aprobacion_assigned',
  grabacion:   'grabacion_assigned',
  edicion:     'edicion_assigned',
  rev_cliente: 'rev_cliente_assigned',
};

// Map stage key → output field name in content_pieces
export const STAGE_OUTPUT_FIELD = {
  research:    'research_output',
  guion:       'guion_output',
  aprobacion:  'aprobacion_output',
  grabacion:   'grabacion_output',
  edicion:     'edicion_output',
  rev_cliente: 'rev_cliente_output',
};

// What type of output each stage requires
export const STAGE_OUTPUT_TYPE = {
  research:    'url+text',    // URL de referencia + comentario
  guion:       'text',        // Bullets del guión
  aprobacion:  'approval',    // Aprobar / rechazar
  grabacion:   'file',        // Subida de archivo
  edicion:     'file',        // Subida de archivo
  rev_cliente: 'approval',    // Aprobar / rechazar
};

export const PIECE_TYPES = [
  { key: 'reel',      label: 'Reel',       emoji: '🎞' },
  { key: 'fast_reel', label: 'Fast Reel',  emoji: '⚡' },
  { key: 'carrusel',  label: 'Carrusel',   emoji: '🖼' },
  { key: 'episodio',  label: 'Episodio',   emoji: '🎙' },
  { key: 'clip',      label: 'Clip',       emoji: '✂️' },
  { key: 'imagen',    label: 'Imagen',     emoji: '📷' },
  { key: 'ad',        label: 'Ad',         emoji: '📢' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getStage(key) {
  return STAGES.find(s => s.key === key) || STAGES[0];
}

export function getNextStage(currentKey) {
  const idx = STAGE_KEYS.indexOf(currentKey);
  if (idx < 0 || idx >= STAGE_KEYS.length - 1) return null;
  return STAGES[idx + 1];
}

export function getPieceType(key) {
  return PIECE_TYPES.find(t => t.key === key) || { key, label: key, emoji: '📄' };
}

export function formatDeadline(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (diff < 0) return `${formatted} (${Math.abs(diff)}d atraso)`;
  if (diff === 0) return `${formatted} (hoy)`;
  if (diff <= 3) return `${formatted} (${diff}d)`;
  return formatted;
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export function getMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

// Roles that can see /pipeline
export const FOUNDER_ROLES = ['owner', 'coowner'];

export function isFounder(role) {
  return FOUNDER_ROLES.includes(role);
}
