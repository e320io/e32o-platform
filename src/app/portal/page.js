"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// e.32o — Portal del Cliente (/portal)
// ============================================================
// Supabase config
const SUPABASE_URL = "https://fyiukqelspqdvdulczrs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g";

// Supabase REST helper
async function supabaseRest(table, params = {}) {
  const { select = "*", filters = [], order, limit } = params;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  filters.forEach(([col, op, val]) => {
    url += `&${col}=${op}.${encodeURIComponent(val)}`;
  });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

// RPC call helper
async function supabaseRpc(fn, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC ${fn}: ${res.status}`);
  return res.json();
}

// PATCH helper for updating pieces
async function supabasePatch(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${table}: ${res.status}`);
}

// ============================================================
// Design tokens
// ============================================================
const T = {
  bg: "#0A0A0A",
  card: "#111111",
  cardHover: "#161616",
  border: "#1E1E1E",
  borderLight: "#2A2A2A",
  accent: "#B8F03E",
  accentDim: "rgba(184,240,62,0.12)",
  accentGlow: "rgba(184,240,62,0.25)",
  yellow: "#F0E03E",
  yellowDim: "rgba(240,224,62,0.12)",
  red: "#FF6B6B",
  redDim: "rgba(255,107,107,0.12)",
  blue: "#6BB3FF",
  blueDim: "rgba(107,179,255,0.12)",
  text: "#F5F5F5",
  textMuted: "#888888",
  textDim: "#555555",
  radius: "12px",
  radiusSm: "8px",
  radiusXs: "6px",
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ============================================================
// Demo data for when Supabase tables don't exist yet
// ============================================================
const DEMO_PIECES_REVIEW = [
  {
    id: "demo-1",
    title: "Transformación capilar — Balayage natural",
    type: "reel",
    status: "aprobacion_cliente",
    research_url: "https://www.instagram.com/reel/example1",
    script_body:
      "• Hook: '¿Sabías que el balayage puede verse natural?'\n• Mostrar antes y después\n• Explicar técnica de mano alzada\n• CTA: Agenda tu cita hoy",
    scheduled_date: "2026-04-05",
  },
  {
    id: "demo-2",
    title: "Tips de cuidado post-tratamiento",
    type: "carrusel",
    status: "aprobacion_cliente",
    research_url: "https://www.instagram.com/p/example2",
    script_body:
      "• Slide 1: '5 errores que arruinan tu tratamiento'\n• Slide 2: No lavar en 48hrs\n• Slide 3: Evitar plancha la primera semana\n• Slide 4: Usar shampoo sin sulfatos\n• Slide 5: CTA — Pregúntanos por WhatsApp",
    scheduled_date: "2026-04-08",
  },
  {
    id: "demo-3",
    title: "Promo Abril — 2x1 en mechas",
    type: "reel",
    status: "aprobacion_cliente",
    research_url: null,
    script_body:
      "• Hook visual: transición de cabello opaco a brillante\n• Texto en pantalla con la promo\n• Testimonial de clienta real\n• CTA con link en bio",
    scheduled_date: "2026-04-12",
  },
];

const DEMO_PIECES_CALENDAR = [
  { id: "c1", title: "Reel — Transformación balayage", type: "reel", status: "publicado", scheduled_date: "2026-03-03" },
  { id: "c2", title: "Carrusel — Cuidado capilar", type: "carrusel", status: "publicado", scheduled_date: "2026-03-05" },
  { id: "c3", title: "Reel — Tendencia primavera", type: "reel", status: "publicado", scheduled_date: "2026-03-07" },
  { id: "c4", title: "Fast reel — Antes/después", type: "fast_reel", status: "publicado", scheduled_date: "2026-03-10" },
  { id: "c5", title: "Reel — Color fantasía", type: "reel", status: "publicado", scheduled_date: "2026-03-12" },
  { id: "c6", title: "Carrusel — Preguntas frecuentes", type: "carrusel", status: "publicado", scheduled_date: "2026-03-14" },
  { id: "c7", title: "Reel — Keratin treatment", type: "reel", status: "listo", scheduled_date: "2026-03-19" },
  { id: "c8", title: "Reel — Corte bob moderno", type: "reel", status: "listo", scheduled_date: "2026-03-21" },
  { id: "c9", title: "Carrusel — Abril trends", type: "carrusel", status: "edicion", scheduled_date: "2026-03-24" },
  { id: "c10", title: "Reel — Decoloración segura", type: "reel", status: "edicion", scheduled_date: "2026-03-26" },
  { id: "c11", title: "Fast reel — Quick styling", type: "fast_reel", status: "grabacion", scheduled_date: "2026-03-28" },
  { id: "c12", title: "Reel — Promo abril", type: "reel", status: "aprobacion_cliente", scheduled_date: "2026-04-02" },
];

const DEMO_AD_METRICS = {
  spend: 12450,
  impressions: 284300,
  clicks: 4870,
  ctr: 1.71,
  conversions: 127,
  cpc: 2.56,
  roas: 3.8,
  campaigns: [
    { name: "Promo Marzo — 2x1 Mechas", status: "active", spend: 5200, impressions: 128000, clicks: 2150, conversions: 58 },
    { name: "Branding — Experiencia Salón", status: "active", spend: 4100, impressions: 98000, clicks: 1620, conversions: 42 },
    { name: "Retargeting — Visitas web", status: "paused", spend: 3150, impressions: 58300, clicks: 1100, conversions: 27 },
  ],
};

const DEMO_CLIENT = {
  id: "demo-client",
  name: "Brillo Mío Valle",
  plan_name: "Contenido + Ads",
  monthly_amount: 6000,
  has_ads: true,
};

// Clients with ads
const ADS_CLIENTS = ["cire", "brillo_mio_valle", "brillo_mio_santa_fe", "beauty_design_san_jeronimo", "beauty_design_barberia", "sandy_arcos"];

// ============================================================
// Icons (inline SVG components)
// ============================================================
const Icon = {
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  BarChart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  ExternalLink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  MessageCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

// ============================================================
// Utility functions
// ============================================================
const typeLabels = { reel: "Reel", carrusel: "Carrusel", fast_reel: "Fast Reel", imagen: "Imagen", video: "Video", episodio: "Episodio", clip: "Clip" };
const typeColors = { reel: T.accent, carrusel: T.blue, fast_reel: T.yellow, imagen: "#C084FC", video: T.accent, episodio: T.blue, clip: T.yellow };

const statusLabels = {
  research: "Research", guion: "Guión", aprobacion: "Aprobación interna", aprobacion_cliente: "Tu revisión",
  grabacion: "Grabación", edicion: "Edición", revision_cliente: "Revisión", listo: "Listo", publicado: "Publicado",
};
const statusColors = {
  research: T.textDim, guion: T.textMuted, aprobacion: T.yellow, aprobacion_cliente: T.yellow,
  grabacion: T.blue, edicion: T.blue, revision_cliente: T.yellow, listo: T.accent, publicado: T.accent,
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ onLogin, error, loading }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(user, pass);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, fontFamily: T.font, padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "32px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "36px", fontWeight: 800, color: T.text, letterSpacing: "-1.5px",
            marginBottom: "8px",
          }}>
            e<span style={{ color: T.accent }}>.</span>32o
          </div>
          <div style={{ fontSize: "13px", color: T.textMuted, letterSpacing: "2px", textTransform: "uppercase" }}>
            Portal de cliente
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
          padding: "32px", display: "flex", flexDirection: "column", gap: "20px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: T.textMuted, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Usuario
            </label>
            <input
              type="text" value={user} onChange={(e) => setUser(e.target.value)}
              placeholder="tu_usuario"
              style={{
                background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: T.radiusSm,
                padding: "12px 14px", color: T.text, fontSize: "15px", fontFamily: T.font,
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) => (e.target.style.borderColor = T.borderLight)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", color: T.textMuted, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Contraseña
            </label>
            <input
              type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              style={{
                background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: T.radiusSm,
                padding: "12px 14px", color: T.text, fontSize: "15px", fontFamily: T.font,
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.accent)}
              onBlur={(e) => (e.target.style.borderColor = T.borderLight)}
            />
          </div>

          {error && (
            <div style={{
              background: T.redDim, border: `1px solid rgba(255,107,107,0.3)`, borderRadius: T.radiusXs,
              padding: "10px 14px", fontSize: "13px", color: T.red,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || !user || !pass}
            style={{
              background: T.accent, color: "#0A0A0A", border: "none", borderRadius: T.radiusSm,
              padding: "13px", fontSize: "14px", fontWeight: 700, fontFamily: T.font,
              cursor: loading ? "wait" : "pointer", opacity: loading || !user || !pass ? 0.5 : 1,
              transition: "opacity 0.2s, transform 0.1s", letterSpacing: "0.3px",
            }}
          >
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "12px", color: T.textDim }}>
          <Icon.Lock /> Acceso exclusivo para clientes
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REVIEW SECTION — Ideas pending client approval
// ============================================================
function ReviewSection({ pieces, onApprove, onRequestChanges, feedbackPiece, setFeedbackPiece, feedbackText, setFeedbackText }) {
  if (pieces.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "80px 20px", gap: "16px",
      }}>
        <div style={{ fontSize: "48px", opacity: 0.3 }}>
          <Icon.Check />
        </div>
        <div style={{ fontSize: "18px", fontWeight: 600, color: T.text }}>Todo al día</div>
        <div style={{ fontSize: "14px", color: T.textMuted, textAlign: "center", maxWidth: "300px" }}>
          No hay ideas pendientes de tu revisión. Te notificaremos cuando haya nuevas propuestas.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "13px", color: T.textMuted, padding: "0 4px" }}>
        {pieces.length} {pieces.length === 1 ? "pieza pendiente" : "piezas pendientes"} de tu aprobación
      </div>

      {pieces.map((piece) => (
        <div key={piece.id} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
          overflow: "hidden", transition: "border-color 0.2s",
        }}>
          {/* Header */}
          <div style={{
            padding: "18px 20px 14px", display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: "12px",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px",
                  color: typeColors[piece.type] || T.accent,
                  background: `${typeColors[piece.type] || T.accent}15`,
                  padding: "3px 8px", borderRadius: "4px",
                }}>
                  {typeLabels[piece.type] || piece.type}
                </span>
                {piece.scheduled_date && (
                  <span style={{ fontSize: "12px", color: T.textMuted }}>
                    {formatDate(piece.scheduled_date)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: T.text, lineHeight: 1.3 }}>
                {piece.title}
              </div>
            </div>
          </div>

          {/* Reference URL */}
          {piece.research_url && (
            <div style={{ padding: "0 20px 12px" }}>
              <a
                href={piece.research_url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  fontSize: "13px", color: T.accent, textDecoration: "none",
                  padding: "6px 12px", background: T.accentDim, borderRadius: T.radiusXs,
                  transition: "background 0.2s",
                }}
              >
                <Icon.ExternalLink /> Ver referencia
              </a>
            </div>
          )}

          {/* Script */}
          {piece.script_body && (
            <div style={{
              margin: "0 20px 16px", padding: "14px 16px", background: T.bg,
              borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
            }}>
              <div style={{
                fontSize: "11px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.8px",
                textTransform: "uppercase", marginBottom: "8px",
              }}>
                Guión
              </div>
              <pre style={{
                fontSize: "13px", color: T.text, lineHeight: 1.7, whiteSpace: "pre-wrap",
                fontFamily: T.font, margin: 0,
              }}>
                {piece.script_body}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div style={{
            padding: "14px 20px", borderTop: `1px solid ${T.border}`,
            display: "flex", gap: "10px", flexWrap: "wrap",
          }}>
            {feedbackPiece === piece.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                <textarea
                  value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Escribe tu comentario o sugerencia de cambio..."
                  rows={3}
                  style={{
                    background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: T.radiusSm,
                    padding: "10px 12px", color: T.text, fontSize: "13px", fontFamily: T.font,
                    resize: "vertical", outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { onRequestChanges(piece.id, feedbackText); setFeedbackPiece(null); setFeedbackText(""); }}
                    disabled={!feedbackText.trim()}
                    style={{
                      background: T.yellow, color: "#0A0A0A", border: "none", borderRadius: T.radiusXs,
                      padding: "8px 16px", fontSize: "13px", fontWeight: 700, fontFamily: T.font,
                      cursor: "pointer", opacity: !feedbackText.trim() ? 0.4 : 1,
                    }}
                  >
                    Enviar cambios
                  </button>
                  <button
                    onClick={() => { setFeedbackPiece(null); setFeedbackText(""); }}
                    style={{
                      background: "transparent", color: T.textMuted, border: `1px solid ${T.borderLight}`,
                      borderRadius: T.radiusXs, padding: "8px 16px", fontSize: "13px", fontFamily: T.font, cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onApprove(piece.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: T.accent, color: "#0A0A0A", border: "none", borderRadius: T.radiusXs,
                    padding: "9px 18px", fontSize: "13px", fontWeight: 700, fontFamily: T.font, cursor: "pointer",
                    transition: "transform 0.1s",
                  }}
                >
                  <Icon.Check /> Aprobar
                </button>
                <button
                  onClick={() => setFeedbackPiece(piece.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "transparent", color: T.yellow, border: `1px solid ${T.yellow}40`,
                    borderRadius: T.radiusXs, padding: "9px 18px", fontSize: "13px", fontWeight: 600,
                    fontFamily: T.font, cursor: "pointer",
                  }}
                >
                  <Icon.MessageCircle /> Pedir cambios
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// CALENDAR SECTION
// ============================================================
function CalendarSection({ pieces, calMonth, setCalMonth }) {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  // Group pieces by day
  const piecesByDay = useMemo(() => {
    const map = {};
    pieces.forEach((p) => {
      if (!p.scheduled_date) return;
      const d = new Date(p.scheduled_date + "T12:00:00");
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [pieces, month, year]);

  const prevMonth = () => setCalMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCalMonth(new Date(year, month + 1, 1));
  const today = new Date();

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={prevMonth} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusXs,
          padding: "8px", color: T.textMuted, cursor: "pointer", display: "flex",
        }}>
          <Icon.ChevronLeft />
        </button>
        <div style={{
          fontSize: "16px", fontWeight: 700, color: T.text, textTransform: "capitalize",
        }}>
          {monthName}
        </div>
        <button onClick={nextMonth} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusXs,
          padding: "8px", color: T.textMuted, cursor: "pointer", display: "flex",
        }}>
          <Icon.ChevronRight />
        </button>
      </div>

      {/* Grid */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
        overflow: "hidden",
      }}>
        {/* Day headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: `1px solid ${T.border}`,
        }}>
          {dayNames.map((d) => (
            <div key={d} style={{
              padding: "10px 4px", textAlign: "center", fontSize: "11px", fontWeight: 700,
              color: T.textDim, letterSpacing: "0.8px", textTransform: "uppercase",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayPieces = day ? piecesByDay[day] || [] : [];
            return (
              <div
                key={i}
                style={{
                  minHeight: "80px", padding: "4px",
                  borderRight: (i + 1) % 7 !== 0 ? `1px solid ${T.border}` : "none",
                  borderBottom: `1px solid ${T.border}`,
                  background: day ? "transparent" : "rgba(255,255,255,0.01)",
                }}
              >
                {day && (
                  <>
                    <div style={{
                      fontSize: "12px", fontWeight: isToday ? 800 : 500,
                      color: isToday ? T.accent : T.textMuted,
                      padding: "4px 6px",
                      ...(isToday ? {
                        background: T.accentDim, borderRadius: "4px", display: "inline-block",
                      } : {}),
                    }}>
                      {day}
                    </div>
                    {dayPieces.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          margin: "2px 2px", padding: "3px 6px", borderRadius: "4px",
                          fontSize: "10px", fontWeight: 600, lineHeight: 1.3,
                          color: p.status === "publicado" ? T.accent : p.status === "listo" ? T.blue : T.textMuted,
                          background: p.status === "publicado" ? T.accentDim : p.status === "listo" ? T.blueDim : `${T.textDim}20`,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                        title={`${p.title} — ${statusLabels[p.status] || p.status}`}
                      >
                        {typeLabels[p.type] || p.type}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "0 4px" }}>
        {[
          { label: "Publicado", color: T.accent, bg: T.accentDim },
          { label: "Listo", color: T.blue, bg: T.blueDim },
          { label: "En proceso", color: T.textMuted, bg: `${T.textDim}20` },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: l.bg, border: `1px solid ${l.color}40` }} />
            <span style={{ fontSize: "12px", color: T.textMuted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
        <div style={{
          fontSize: "13px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.5px",
          textTransform: "uppercase", padding: "0 4px",
        }}>
          Próximas publicaciones
        </div>
        {pieces
          .filter((p) => ["listo", "edicion", "grabacion", "aprobacion_cliente"].includes(p.status))
          .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || ""))
          .slice(0, 6)
          .map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: "12px",
              background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
              padding: "12px 14px",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                background: statusColors[p.status] || T.textDim,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "13px", fontWeight: 600, color: T.text,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.title}
                </div>
                <div style={{ fontSize: "11px", color: T.textMuted, marginTop: "2px" }}>
                  {typeLabels[p.type] || p.type} · {statusLabels[p.status] || p.status}
                </div>
              </div>
              <div style={{ fontSize: "12px", color: T.textMuted, flexShrink: 0 }}>
                {formatDate(p.scheduled_date)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================
// ADS DASHBOARD SECTION
// ============================================================
function AdsSection({ metrics }) {
  const m = metrics || DEMO_AD_METRICS;

  const kpis = [
    { label: "Inversión", value: `$${formatNumber(m.spend)}`, sub: "MXN este mes", color: T.text },
    { label: "Impresiones", value: formatNumber(m.impressions), sub: "alcance total", color: T.blue },
    { label: "Clics", value: formatNumber(m.clicks), sub: `CTR ${m.ctr}%`, color: T.accent },
    { label: "Conversiones", value: m.conversions.toString(), sub: `CPC $${m.cpc}`, color: T.yellow },
    { label: "ROAS", value: `${m.roas}x`, sub: "retorno", color: T.accent },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* KPI cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px",
      }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: "18px 16px", display: "flex", flexDirection: "column", gap: "4px",
          }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: T.textMuted, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 800, color: kpi.color, letterSpacing: "-0.5px" }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: "11px", color: T.textDim }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Campaigns table */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 18px 12px", borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: T.text }}>Campañas activas</div>
          <div style={{
            fontSize: "11px", color: T.accent, display: "flex", alignItems: "center", gap: "4px",
          }}>
            <Icon.TrendingUp /> En tiempo real
          </div>
        </div>

        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Campaña", "Estado", "Inversión", "Impr.", "Clics", "Conv."].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left", fontWeight: 700,
                    color: T.textDim, fontSize: "11px", letterSpacing: "0.5px",
                    textTransform: "uppercase", borderBottom: `1px solid ${T.border}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.campaigns.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px 14px", color: T.text, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: "4px",
                      color: c.status === "active" ? T.accent : T.textMuted,
                      background: c.status === "active" ? T.accentDim : `${T.textDim}20`,
                    }}>
                      {c.status === "active" ? "Activa" : "Pausada"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: T.textMuted }}>${formatNumber(c.spend)}</td>
                  <td style={{ padding: "12px 14px", color: T.textMuted }}>{formatNumber(c.impressions)}</td>
                  <td style={{ padding: "12px 14px", color: T.textMuted }}>{formatNumber(c.clicks)}</td>
                  <td style={{ padding: "12px 14px", color: T.accent, fontWeight: 600 }}>{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placeholder note */}
      <div style={{
        padding: "14px 16px", background: T.yellowDim, border: `1px solid ${T.yellow}30`,
        borderRadius: T.radiusSm, fontSize: "13px", color: T.yellow, lineHeight: 1.5,
      }}>
        Las métricas se actualizan automáticamente desde Meta Ads. La conexión en tiempo real con la API de Meta se está configurando — estos datos son una vista previa del formato.
      </div>
    </div>
  );
}

// ============================================================
// MAIN PORTAL APP
// ============================================================
const TABS = [
  { id: "review", label: "Revisión de Ideas", icon: Icon.FileText },
  { id: "calendar", label: "Calendario", icon: Icon.Calendar },
  { id: "ads", label: "Dashboard Ads", icon: Icon.BarChart },
];

export default function Portal() {
  // Auth state
  const [session, setSession] = useState(null); // { user, client }
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
// Check if already logged in from main login
useEffect(() => {
  try {
    const stored = JSON.parse(localStorage.getItem('e32o_session'));
    if (stored?.type === 'client' && stored?.user) {
      // Build session from centralized auth
      const clientId = stored.user.client_id;
      setSession({ 
        user: stored.user, 
        client: { id: clientId, name: stored.user.client_name || 'Cliente' } 
      });
      setUseDemoData(false);
    }
  } catch {}
}, []);
  // App state
  const [activeTab, setActiveTab] = useState("review");
  const [reviewPieces, setReviewPieces] = useState([]);
  const [calendarPieces, setCalendarPieces] = useState([]);
  const [adMetrics, setAdMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [feedbackPiece, setFeedbackPiece] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [toast, setToast] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);

  // Show toast
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Login handler
  const handleLogin = useCallback(async (username, password) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      // Try Supabase first
      const users = await supabaseRest("client_users", {
        filters: [["username", "eq", username]],
        limit: 1,
      });

      if (users.length > 0) {
        const user = users[0];
        // Simple password check (in production, use bcrypt via Edge Function)
        if (user.password_hash === password) {
          // Get client info
          const clients = await supabaseRest("clients", {
            filters: [["id", "eq", user.client_id]],
            limit: 1,
          });
          setSession({ user, client: clients[0] || { id: user.client_id, name: "Cliente" } });
          return;
        }
      }

      // Fallback: demo mode for known clients
      const demoClients = {
        brillo_valle: { id: "brillo_mio_valle", name: "Brillo Mío Valle", slug: "brillo_mio_valle" },
        brillo_sf: { id: "brillo_mio_santa_fe", name: "Brillo Mío Santa Fe", slug: "brillo_mio_santa_fe" },
        cire: { id: "cire", name: "Cire", slug: "cire" },
        beauty_sj: { id: "beauty_design_san_jeronimo", name: "Beauty Design San Jerónimo", slug: "beauty_design_san_jeronimo" },
        beauty_barber: { id: "beauty_design_barberia", name: "Beauty Design Barbería", slug: "beauty_design_barberia" },
        sandy: { id: "sandy_arcos", name: "Sandy Arcos", slug: "sandy_arcos" },
        mariana: { id: "profeta_mariana", name: "Profeta Mariana", slug: "profeta_mariana" },
        victor: { id: "apostol_victor", name: "Apóstol Víctor", slug: "apostol_victor" },
        diveland: { id: "diveland", name: "Diveland", slug: "diveland" },
      };

      if (demoClients[username] && password === "e3202026") {
        setSession({ user: { username, client_id: demoClients[username].id }, client: demoClients[username] });
        setUseDemoData(true);
        return;
      }

      setLoginError("Usuario o contraseña incorrectos");
    } catch (err) {
      // If Supabase tables don't exist yet, allow demo login
      const demoClients = {
        brillo_valle: { id: "brillo_mio_valle", name: "Brillo Mío Valle", slug: "brillo_mio_valle" },
        cire: { id: "cire", name: "Cire", slug: "cire" },
        sandy: { id: "sandy_arcos", name: "Sandy Arcos", slug: "sandy_arcos" },
      };
      if (demoClients[username] && password === "e3202026") {
        setSession({ user: { username, client_id: demoClients[username].id }, client: demoClients[username] });
        setUseDemoData(true);
        return;
      }
      setLoginError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // Load data
  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      if (useDemoData) {
        setReviewPieces(DEMO_PIECES_REVIEW);
        setCalendarPieces(DEMO_PIECES_CALENDAR);
        setAdMetrics(DEMO_AD_METRICS);
        setLoading(false);
        return;
      }

      try {
        // Review pieces (client approval stage)
        const review = await supabaseRest("content_pieces", {
          filters: [
            ["client_id", "eq", session.client.id],
            ["status", "eq", "aprobacion_cliente"],
          ],
          order: "scheduled_date.asc",
        });
        setReviewPieces(review);

        // Calendar pieces (all non-research)
        const cal = await supabaseRest("content_pieces", {
          filters: [
            ["client_id", "eq", session.client.id],
            ["status", "neq", "research"],
          ],
          order: "scheduled_date.asc",
        });
        setCalendarPieces(cal);
      } catch {
        // Tables may not exist yet — use demo
        setUseDemoData(true);
        setReviewPieces(DEMO_PIECES_REVIEW);
        setCalendarPieces(DEMO_PIECES_CALENDAR);
        setAdMetrics(DEMO_AD_METRICS);
      }
      setLoading(false);
    };

    loadData();
  }, [session, useDemoData]);

  // Approve piece
  const handleApprove = useCallback(async (pieceId) => {
    if (!useDemoData) {
      try {
        await supabasePatch("content_pieces", pieceId, { status: "grabacion" });
      } catch {}
    }
    setReviewPieces((prev) => prev.filter((p) => p.id !== pieceId));
    showToast("Idea aprobada. El equipo ya puede avanzar a grabación.");
  }, [useDemoData, showToast]);

  // Request changes
  const handleRequestChanges = useCallback(async (pieceId, feedback) => {
    if (!useDemoData) {
      try {
        await supabasePatch("content_pieces", pieceId, {
          status: "guion",
          client_feedback: feedback,
        });
      } catch {}
    }
    setReviewPieces((prev) => prev.filter((p) => p.id !== pieceId));
    showToast("Comentario enviado. El equipo ajustará la propuesta.", "info");
  }, [useDemoData, showToast]);

  // Has ads?
  const clientHasAds = session && ADS_CLIENTS.includes(session.client.id || session.client.slug);
  const visibleTabs = TABS.filter((t) => t.id !== "ads" || clientHasAds);

  // Logout
  const handleLogout = () => {
    setSession(null);
    setUseDemoData(false);
    setReviewPieces([]);
    setCalendarPieces([]);
    setAdMetrics(null);
    setActiveTab("review");
  };

  // ---- RENDER ----
  if (!session) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text,
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,10,0.85)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto", padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.8px" }}>
              e<span style={{ color: T.accent }}>.</span>32o
            </div>
            <div style={{
              width: "1px", height: "20px", background: T.borderLight,
            }} />
            <div style={{ fontSize: "14px", fontWeight: 600, color: T.textMuted }}>
              {session.client.name}
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: T.radiusXs,
            padding: "7px 12px", color: T.textMuted, fontSize: "12px", fontWeight: 600,
            fontFamily: T.font, cursor: "pointer",
          }}>
            <Icon.LogOut /> Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{
        maxWidth: "900px", margin: "0 auto", padding: "16px 20px 0",
      }}>
        <div style={{
          display: "flex", gap: "4px", background: T.card, borderRadius: T.radiusSm,
          padding: "4px", border: `1px solid ${T.border}`,
        }}>
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "10px 12px", borderRadius: T.radiusXs, border: "none",
                  background: active ? T.accentDim : "transparent",
                  color: active ? T.accent : T.textMuted,
                  fontSize: "13px", fontWeight: active ? 700 : 500, fontFamily: T.font,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <TabIcon />
                <span style={{ display: "inline" }}>{tab.label}</span>
                {tab.id === "review" && reviewPieces.length > 0 && (
                  <span style={{
                    background: T.accent, color: "#0A0A0A", fontSize: "10px", fontWeight: 800,
                    padding: "1px 6px", borderRadius: "10px", minWidth: "18px", textAlign: "center",
                  }}>
                    {reviewPieces.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main style={{
        maxWidth: "900px", margin: "0 auto", padding: "20px 20px 80px",
      }}>
        {loading ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "80px 20px", color: T.textMuted, fontSize: "14px",
          }}>
            <div style={{
              width: "24px", height: "24px", border: `2px solid ${T.border}`,
              borderTopColor: T.accent, borderRadius: "50%",
              animation: "spin 0.8s linear infinite", marginRight: "10px",
            }} />
            Cargando...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {activeTab === "review" && (
              <ReviewSection
                pieces={reviewPieces}
                onApprove={handleApprove}
                onRequestChanges={handleRequestChanges}
                feedbackPiece={feedbackPiece}
                setFeedbackPiece={setFeedbackPiece}
                feedbackText={feedbackText}
                setFeedbackText={setFeedbackText}
              />
            )}
            {activeTab === "calendar" && (
              <CalendarSection
                pieces={calendarPieces}
                calMonth={calMonth}
                setCalMonth={setCalMonth}
              />
            )}
            {activeTab === "ads" && <AdsSection metrics={adMetrics} />}
          </>
        )}
      </main>

      {/* Demo badge */}
      {useDemoData && (
        <div style={{
          position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)",
          background: T.card, border: `1px solid ${T.borderLight}`, borderRadius: "20px",
          padding: "8px 16px", fontSize: "12px", color: T.textMuted, zIndex: 200,
          backdropFilter: "blur(10px)",
        }}>
          Modo demo — datos de ejemplo
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px",
          background: toast.type === "success" ? T.accentDim : T.yellowDim,
          border: `1px solid ${toast.type === "success" ? T.accent : T.yellow}40`,
          borderRadius: T.radiusSm, padding: "12px 18px", maxWidth: "360px",
          fontSize: "13px", fontWeight: 600, zIndex: 300,
          color: toast.type === "success" ? T.accent : T.yellow,
          animation: "slideIn 0.3s ease-out",
        }}>
          {toast.msg}
          <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
}
