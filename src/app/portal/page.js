"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// e.32o — Portal del Cliente (/portal) v2
// Clickable calendar, file preview, progress bar, payment reminder
// ============================================================

const SUPABASE_URL = "https://fyiukqelspqdvdulczrs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g";

async function sbRest(table, params = {}) {
  const { select = "*", filters = [], order, limit } = params;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  filters.forEach(([col, op, val]) => { url += `&${col}=${op}.${encodeURIComponent(val)}`; });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

async function sbPatch(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

// ── Tokens ──
const T = {
  bg: "#0A0A0A", card: "#111111", cardH: "#161616",
  brd: "#1E1E1E", brdL: "#2A2A2A",
  acc: "#B8F03E", accDim: "rgba(184,240,62,0.12)",
  yel: "#F0E03E", yelDim: "rgba(240,224,62,0.12)",
  red: "#FF6B6B", redDim: "rgba(255,107,107,0.12)",
  blue: "#6BB3FF", blueDim: "rgba(107,179,255,0.12)",
  txt: "#F5F5F5", txtM: "#888888", txtD: "#555555",
  r: "12px", rS: "8px", rX: "6px",
  f: "'DM Sans', system-ui, sans-serif",
};

// ── Demo data ──
const DEMO_PIECES = [
  { id: "d1", title: "Reel — Transformación balayage", type: "reel", status: "publicado", scheduled_date: "2026-03-03", edicion_output: "reel_balayage_final.mp4", publish_url: "https://instagram.com/reel/abc123" },
  { id: "d2", title: "Carrusel — Cuidado capilar", type: "carrusel", status: "publicado", scheduled_date: "2026-03-05", edicion_output: "carrusel_cuidado.pdf" },
  { id: "d3", title: "Reel — Tendencia primavera", type: "reel", status: "publicado", scheduled_date: "2026-03-07", edicion_output: "reel_primavera.mp4" },
  { id: "d4", title: "Fast reel — Antes/después", type: "fast_reel", status: "publicado", scheduled_date: "2026-03-10", edicion_output: "fast_antes_despues.mp4" },
  { id: "d5", title: "Reel — Color fantasía", type: "reel", status: "publicado", scheduled_date: "2026-03-12", edicion_output: "reel_fantasia.mp4" },
  { id: "d6", title: "Carrusel — Preguntas frecuentes", type: "carrusel", status: "publicado", scheduled_date: "2026-03-14", edicion_output: "carrusel_faq.pdf" },
  { id: "d7", title: "Reel — Keratin treatment", type: "reel", status: "revision_cliente", scheduled_date: "2026-03-19", edicion_output: "reel_keratin_v2.mp4", guion_output: "• Hook: ¿Tu cabello se esponja?\n• Mostrar proceso keratin\n• Resultado 72hrs después\n• CTA: Agenda hoy" },
  { id: "d8", title: "Reel — Corte bob moderno", type: "reel", status: "revision_cliente", scheduled_date: "2026-03-21", edicion_output: "reel_bob_edit.mp4", guion_output: "• Tendencia: bob francés\n• Transición antes/después\n• Tips de styling\n• CTA" },
  { id: "d9", title: "Carrusel — Abril trends", type: "carrusel", status: "edicion", scheduled_date: "2026-03-24", edicion_output: null },
  { id: "d10", title: "Reel — Decoloración segura", type: "reel", status: "edicion", scheduled_date: "2026-03-26", edicion_output: null },
  { id: "d11", title: "Fast reel — Quick styling", type: "fast_reel", status: "grabacion", scheduled_date: "2026-03-28", edicion_output: null },
  { id: "d12", title: "Reel — Promo abril", type: "reel", status: "revision_cliente", scheduled_date: "2026-04-02", edicion_output: "reel_promo_abril.mp4", guion_output: "• Hook visual: transición cabello\n• Promo 2x1 mechas\n• Testimonial real\n• CTA link en bio", research_output: "https://instagram.com/reel/ref456" },
  { id: "d13", title: "Reel — Mechas miel", type: "reel", status: "guion", scheduled_date: "2026-04-05", edicion_output: null },
  { id: "d14", title: "Carrusel — Tips post-color", type: "carrusel", status: "research", scheduled_date: "2026-04-08", edicion_output: null },
  { id: "d15", title: "Fast reel — Blow dry", type: "fast_reel", status: "pendiente", scheduled_date: "2026-04-10", edicion_output: null },
  { id: "d16", title: "Reel — Hidratación profunda", type: "reel", status: "pendiente", scheduled_date: "2026-04-12", edicion_output: null },
  { id: "d17", title: "Carrusel — Errores tinte", type: "carrusel", status: "pendiente", scheduled_date: "2026-04-15", edicion_output: null },
  { id: "d18", title: "Ad — Conversión WhatsApp", type: "gestion_ads", status: "edicion", scheduled_date: "2026-04-01", edicion_output: null },
  { id: "d19", title: "Reel — Ombre tutorial", type: "reel", status: "grabacion", scheduled_date: "2026-04-07", edicion_output: null },
  { id: "d20", title: "Fast reel — Peinado express", type: "fast_reel", status: "aprobacion", scheduled_date: "2026-04-09", edicion_output: null },
  { id: "d21", title: "Reel — Cliente feliz mayo", type: "reel", status: "pendiente", scheduled_date: "2026-04-18", edicion_output: null },
];

const DEMO_AD_METRICS = {
  spend: 12450, impressions: 284300, clicks: 4870, ctr: 1.71,
  conversions: 127, cpc: 2.56, roas: 3.8,
  campaigns: [
    { name: "Promo Marzo — 2x1 Mechas", status: "active", spend: 5200, impressions: 128000, clicks: 2150, conversions: 58 },
    { name: "Branding — Experiencia Salón", status: "active", spend: 4100, impressions: 98000, clicks: 1620, conversions: 42 },
    { name: "Retargeting — Visitas web", status: "paused", spend: 3150, impressions: 58300, clicks: 1100, conversions: 27 },
  ],
};

const ADS_CLIENTS = ["cire", "brillo_mio_valle", "brillo_mio_santa_fe", "beauty_design_san_jeronimo", "beauty_design_barberia", "sandy_arcos"];

// ── Labels/Colors ──
const typeL = { reel: "Reel", carrusel: "Carrusel", fast_reel: "Fast Reel", imagen: "Imagen", video: "Video", gestion_ads: "Ad" };
const typeC = { reel: T.acc, carrusel: T.blue, fast_reel: T.yel, imagen: "#C084FC", video: T.acc, gestion_ads: "#EF9F27" };
const statusL = { pendiente: "Pendiente", research: "Research", guion: "Guión", aprobacion: "Aprobación", grabacion: "Grabación", edicion: "Edición", revision_cliente: "Tu revisión", publicado: "Publicado" };
const statusC = { pendiente: T.txtD, research: T.txtD, guion: T.txtM, aprobacion: T.yel, grabacion: T.blue, edicion: T.blue, revision_cliente: T.yel, publicado: T.acc };

function fmtDate(d) { if (!d) return "—"; return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
function fmtNum(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }

// Is file a video?
function isVideo(f) { if (!f) return false; return /\.(mp4|mov|webm|avi|mkv)$/i.test(f); }
function isImage(f) { if (!f) return false; return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f); }

// ============================================================
// LOGIN (only shows if no centralized session)
// ============================================================
function LoginScreen({ onLogin, error, loading }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.f, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: T.txt, letterSpacing: "-1.5px", marginBottom: 8 }}>e<span style={{ color: T.acc }}>.</span>32o</div>
          <div style={{ fontSize: 13, color: T.txtM, letterSpacing: "2px", textTransform: "uppercase" }}>Portal de cliente</div>
        </div>
        <form onSubmit={e => { e.preventDefault(); onLogin(user, pass); }} style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: T.txtM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Usuario</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="tu_usuario" style={{ background: T.bg, border: `1px solid ${T.brdL}`, borderRadius: T.rS, padding: "12px 14px", color: T.txt, fontSize: 15, fontFamily: T.f, outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: T.txtM, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>Contraseña</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={{ background: T.bg, border: `1px solid ${T.brdL}`, borderRadius: T.rS, padding: "12px 14px", color: T.txt, fontSize: 15, fontFamily: T.f, outline: "none" }} />
          </div>
          {error && <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: T.rX, padding: "10px 14px", fontSize: 13, color: T.red }}>{error}</div>}
          <button type="submit" disabled={loading || !user || !pass} style={{ background: T.acc, color: "#0A0A0A", border: "none", borderRadius: T.rS, padding: 13, fontSize: 14, fontWeight: 700, fontFamily: T.f, cursor: "pointer", opacity: loading || !user || !pass ? .5 : 1 }}>
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// PIECE DETAIL MODAL — clickable from calendar
// ============================================================
function PieceModal({ piece, onClose, onApprove, onRequestChanges }) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const tc = typeC[piece.type] || T.acc;
  const sc = statusC[piece.status] || T.txtD;
  const file = piece.edicion_output || piece.grabacion_output;
  const isRev = piece.status === "revision_cliente";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.brdL}`, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,.5)", overflow: "hidden" }}>
        {/* File preview area */}
        <div style={{ background: T.bg, borderBottom: `1px solid ${T.brd}`, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {file && isVideo(file) ? (
            <div style={{ width: "100%", padding: "20px", textAlign: "center" }}>
              <div style={{ background: "#000", borderRadius: 8, overflow: "hidden", maxWidth: 480, margin: "0 auto", aspectRatio: "9/16", maxHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: T.txtM }}>
                  <span style={{ fontSize: 48, opacity: .4 }}>▶</span>
                  <span style={{ fontSize: 12 }}>{file}</span>
                  <span style={{ fontSize: 11, color: T.txtD }}>Preview disponible con Supabase Storage</span>
                </div>
              </div>
            </div>
          ) : file && isImage(file) ? (
            <div style={{ width: "100%", padding: 20, textAlign: "center" }}>
              <div style={{ background: "#080808", borderRadius: 8, padding: 40, display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 48, opacity: .4 }}>🖼</span>
                <span style={{ fontSize: 12, color: T.txtM }}>{file}</span>
              </div>
            </div>
          ) : file ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 40 }}>
              <span style={{ fontSize: 36, opacity: .4 }}>📎</span>
              <span style={{ fontSize: 13, color: T.txtM }}>{file}</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 40, color: T.txtD }}>
              <span style={{ fontSize: 36, opacity: .3 }}>⏳</span>
              <span style={{ fontSize: 13 }}>Archivo en preparación</span>
              <span style={{ fontSize: 11 }}>{statusL[piece.status] || piece.status}</span>
            </div>
          )}
          {/* Status badge overlay */}
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${sc}18`, color: sc, textTransform: "uppercase", letterSpacing: ".5px" }}>{statusL[piece.status]}</span>
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,.5)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Info */}
        <div style={{ padding: "18px 22px", flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${tc}15`, color: tc, textTransform: "uppercase", letterSpacing: ".5px" }}>{typeL[piece.type] || piece.type}</span>
            <span style={{ fontSize: 12, color: T.txtM }}>{fmtDate(piece.scheduled_date)}</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.txt, margin: "0 0 12px", lineHeight: 1.3 }}>{piece.title}</h2>

          {/* Script/guión if available */}
          {piece.guion_output && (
            <div style={{ background: T.bg, border: `1px solid ${T.brd}`, borderRadius: T.rS, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.txtM, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Guión</div>
              <pre style={{ fontSize: 13, color: T.txt, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: T.f, margin: 0 }}>{piece.guion_output}</pre>
            </div>
          )}

          {/* Reference URL */}
          {piece.research_output && (
            <a href={piece.research_output} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.acc, textDecoration: "none", padding: "6px 12px", background: T.accDim, borderRadius: T.rX, marginBottom: 12 }}>
              ↗ Ver referencia
            </a>
          )}

          {/* Publish URL */}
          {piece.publish_url && (
            <a href={piece.publish_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.acc, textDecoration: "none", padding: "6px 12px", background: T.accDim, borderRadius: T.rX, marginBottom: 12, marginLeft: 6 }}>
              ↗ Ver publicación
            </a>
          )}

          {/* Actions for revision_cliente */}
          {isRev && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.brd}`, paddingTop: 16 }}>
              {showFeedback ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Escribe tu comentario o sugerencia..." rows={3} style={{ background: T.bg, border: `1px solid ${T.brdL}`, borderRadius: T.rS, padding: "10px 12px", color: T.txt, fontSize: 13, fontFamily: T.f, resize: "vertical", outline: "none", width: "100%", boxSizing: "border-box" }} autoFocus />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { onRequestChanges(piece.id, feedback); setShowFeedback(false); setFeedback(""); }} disabled={!feedback.trim()} style={{ background: T.yel, color: "#0A0A0A", border: "none", borderRadius: T.rX, padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: T.f, cursor: "pointer", opacity: !feedback.trim() ? .4 : 1 }}>Enviar cambios</button>
                    <button onClick={() => { setShowFeedback(false); setFeedback(""); }} style={{ background: "transparent", color: T.txtM, border: `1px solid ${T.brdL}`, borderRadius: T.rX, padding: "9px 18px", fontSize: 13, fontFamily: T.f, cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => onApprove(piece.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.acc, color: "#0A0A0A", border: "none", borderRadius: T.rX, padding: "10px 20px", fontSize: 14, fontWeight: 700, fontFamily: T.f, cursor: "pointer" }}>✓ Aprobar</button>
                  <button onClick={() => setShowFeedback(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: T.yel, border: `1px solid ${T.yel}40`, borderRadius: T.rX, padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: T.f, cursor: "pointer" }}>💬 Pedir cambios</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================
function ProgressSection({ pieces }) {
  const total = pieces.length;
  const published = pieces.filter(p => p.status === "publicado").length;
  const inReview = pieces.filter(p => p.status === "revision_cliente").length;
  const inProgress = pieces.filter(p => !["publicado", "revision_cliente", "pendiente"].includes(p.status)).length;
  const pending = pieces.filter(p => p.status === "pendiente").length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>Entrega del mes</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.acc }}>{pct}%</div>
      </div>
      {/* Bar */}
      <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden", display: "flex" }}>
        {published > 0 && <div style={{ width: `${(published / total) * 100}%`, background: T.acc, transition: "width .4s" }} />}
        {inReview > 0 && <div style={{ width: `${(inReview / total) * 100}%`, background: T.yel, transition: "width .4s" }} />}
        {inProgress > 0 && <div style={{ width: `${(inProgress / total) * 100}%`, background: T.blue, transition: "width .4s" }} />}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { label: `${published} publicadas`, color: T.acc },
          { label: `${inReview} en tu revisión`, color: T.yel },
          { label: `${inProgress} en proceso`, color: T.blue },
          { label: `${pending} pendientes`, color: T.txtD },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 11, color: T.txtM }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT REMINDER
// ============================================================
function PaymentReminder({ client, pieces }) {
  // payment_type: 'on_delivery' | 'fixed'
  // payment_day: number (day of month) for fixed
  const payType = client.payment_type || "on_delivery";
  const payDay = client.payment_day || 1;
  const total = pieces.length;
  const published = pieces.filter(p => p.status === "publicado").length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;
  const now = new Date();

  let message, urgency;
  if (payType === "on_delivery") {
    if (pct >= 100) {
      message = "Todos los entregables completados. Pago listo para procesarse.";
      urgency = "ready";
    } else {
      message = `Pago al completar entregables — ${published}/${total} listos (${pct}%)`;
      urgency = "info";
    }
  } else {
    const nextPay = new Date(now.getFullYear(), now.getMonth(), payDay);
    if (nextPay <= now) nextPay.setMonth(nextPay.getMonth() + 1);
    const daysUntil = Math.ceil((nextPay - now) / 864e5);
    if (daysUntil <= 3) {
      message = `Próximo pago en ${daysUntil} día${daysUntil !== 1 ? "s" : ""} (${nextPay.toLocaleDateString("es-MX", { day: "numeric", month: "short" })})`;
      urgency = "soon";
    } else {
      message = `Próximo pago: ${nextPay.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`;
      urgency = "info";
    }
  }

  const colors = { ready: { bg: T.accDim, bd: `${T.acc}33`, c: T.acc }, soon: { bg: T.yelDim, bd: `${T.yel}33`, c: T.yel }, info: { bg: `${T.txtD}15`, bd: T.brd, c: T.txtM } };
  const cl = colors[urgency];

  return (
    <div style={{ background: cl.bg, border: `1px solid ${cl.bd}`, borderRadius: T.rS, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>{urgency === "ready" ? "💰" : urgency === "soon" ? "⏰" : "📅"}</span>
      <span style={{ fontSize: 13, color: cl.c, fontWeight: 500 }}>{message}</span>
    </div>
  );
}

// ============================================================
// CALENDAR with clickable pieces
// ============================================================
function CalendarSection({ pieces, calMonth, setCalMonth, onPieceClick }) {
  const year = calMonth.getFullYear(), month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const today = new Date();

  const piecesByDay = useMemo(() => {
    const map = {};
    pieces.forEach(p => {
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

  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.rX, padding: 8, color: T.txtM, cursor: "pointer", fontSize: 18, lineHeight: 1, display: "flex" }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.txt, textTransform: "capitalize" }}>{monthName}</div>
        <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.rX, padding: 8, color: T.txtM, cursor: "pointer", fontSize: 18, lineHeight: 1, display: "flex" }}>›</button>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${T.brd}` }}>
          {days.map(d => <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.txtD, textTransform: "uppercase", letterSpacing: ".5px" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, i) => {
            const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dp = day ? piecesByDay[day] || [] : [];
            return (
              <div key={i} style={{ minHeight: 80, padding: 4, borderRight: (i + 1) % 7 !== 0 ? `1px solid ${T.brd}` : "none", borderBottom: `1px solid ${T.brd}`, background: day ? "transparent" : "rgba(255,255,255,.01)" }}>
                {day && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? T.acc : T.txtM, padding: "3px 5px", ...(isToday ? { background: T.accDim, borderRadius: 4, display: "inline-block" } : {}) }}>{day}</div>
                    {dp.map(p => {
                      const pc = statusC[p.status] || T.txtD;
                      const hasFile = !!(p.edicion_output || p.grabacion_output);
                      return (
                        <div key={p.id} onClick={() => onPieceClick(p)} style={{
                          margin: "2px 1px", padding: "3px 5px", borderRadius: 4,
                          fontSize: 10, fontWeight: 600, lineHeight: 1.3,
                          color: pc, background: `${pc}15`,
                          cursor: "pointer", transition: "all .12s",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          borderLeft: hasFile ? `2px solid ${pc}` : "none",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = `${pc}28`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = `${pc}15`; }}
                          title={`${p.title} — ${statusL[p.status]}${hasFile ? " (archivo listo)" : ""}`}
                        >
                          {typeL[p.type] || p.type}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {[
          { label: "Publicado", color: T.acc }, { label: "Tu revisión", color: T.yel },
          { label: "En proceso", color: T.blue }, { label: "Pendiente", color: T.txtD },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: `${l.color}18`, border: `1px solid ${l.color}40` }} />
            <span style={{ fontSize: 11, color: T.txtM }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ADS SECTION (kept from original, compacted)
// ============================================================
function AdsSection({ metrics }) {
  const m = metrics || DEMO_AD_METRICS;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 10 }}>
        {[
          { l: "Inversión", v: `$${fmtNum(m.spend)}`, s: "MXN", c: T.txt },
          { l: "Impresiones", v: fmtNum(m.impressions), s: "alcance", c: T.blue },
          { l: "Clics", v: fmtNum(m.clicks), s: `CTR ${m.ctr}%`, c: T.acc },
          { l: "Conversiones", v: String(m.conversions), s: `CPC $${m.cpc}`, c: T.yel },
          { l: "ROAS", v: `${m.roas}x`, s: "retorno", c: T.acc },
        ].map(k => (
          <div key={k.l} style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, padding: "16px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.txtM, textTransform: "uppercase", letterSpacing: ".5px" }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.c, letterSpacing: "-.5px", marginTop: 2 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: T.txtD }}>{k.s}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.brd}`, fontSize: 14, fontWeight: 700, color: T.txt }}>Campañas</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Campaña", "Estado", "Inversión", "Clics", "Conv."].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.txtD, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${T.brd}` }}>{h}</th>)}</tr></thead>
          <tbody>{m.campaigns.map((c, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.brd}` }}>
              <td style={{ padding: "10px 12px", color: T.txt, fontWeight: 600 }}>{c.name}</td>
              <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, color: c.status === "active" ? T.acc : T.txtM, background: c.status === "active" ? T.accDim : `${T.txtD}20`, textTransform: "uppercase" }}>{c.status === "active" ? "Activa" : "Pausada"}</span></td>
              <td style={{ padding: "10px 12px", color: T.txtM }}>${fmtNum(c.spend)}</td>
              <td style={{ padding: "10px 12px", color: T.txtM }}>{fmtNum(c.clicks)}</td>
              <td style={{ padding: "10px 12px", color: T.acc, fontWeight: 600 }}>{c.conversions}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PORTAL
// ============================================================
const TABS = [
  { id: "calendar", label: "Calendario", icon: "📅" },
  { id: "review", label: "Revisión", icon: "📋" },
  { id: "ads", label: "Ads", icon: "📊" },
];

export default function Portal() {
  const [session, setSession] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [pieces, setPieces] = useState([]);
  const [adMetrics, setAdMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [modalPiece, setModalPiece] = useState(null);
  const [toast, setToast] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);

  const showToast = useCallback((msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);

  // ── Check centralized session on mount ──
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("e32o_session"));
      if (stored?.type === "client" && stored?.user) {
        const cid = stored.user.client_id;
        setSession({ user: stored.user, client: { id: cid, name: stored.user.client_name || stored.user.display_name || "Cliente" } });
        return;
      }
    } catch {}
  }, []);

  // ── Fallback login ──
  const handleLogin = useCallback(async (username, password) => {
    setLoginLoading(true); setLoginError(null);
    try {
      const users = await sbRest("client_users", { filters: [["username", "eq", username]], limit: 1 });
      if (users.length > 0 && users[0].password_hash === password) {
        const clients = await sbRest("clients", { filters: [["id", "eq", users[0].client_id]], limit: 1 });
        setSession({ user: users[0], client: clients[0] || { id: users[0].client_id, name: "Cliente" } });
        return;
      }
      const demo = { brillo_valle: { id: "c2", name: "Brillo Mío Valle" }, cire: { id: "c1", name: "Cire" }, sandy: { id: "c6", name: "Sandy Arcos" } };
      if (demo[username] && password === "e3202026") { setSession({ user: { username, client_id: demo[username].id }, client: demo[username] }); setUseDemoData(true); return; }
      setLoginError("Usuario o contraseña incorrectos");
    } catch { setLoginError("Error de conexión"); }
    finally { setLoginLoading(false); }
  }, []);

  // ── Load data ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      if (useDemoData) { setPieces(DEMO_PIECES); setAdMetrics(DEMO_AD_METRICS); setLoading(false); return; }
      try {
        const p = await sbRest("content_pieces", { filters: [["client_id", "eq", session.client.id]], order: "scheduled_date.asc" });
        if (p.length > 0) { setPieces(p); } else { setPieces(DEMO_PIECES); setUseDemoData(true); }
      } catch { setPieces(DEMO_PIECES); setUseDemoData(true); }
      setAdMetrics(DEMO_AD_METRICS);
      setLoading(false);
    })();
  }, [session, useDemoData]);

  const handleApprove = useCallback(async (id) => {
    if (!useDemoData) { try { await sbPatch("content_pieces", id, { status: "grabacion" }); } catch {} }
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status: "grabacion" } : p));
    setModalPiece(null);
    showToast("Idea aprobada. El equipo avanza a grabación.");
  }, [useDemoData, showToast]);

  const handleRequestChanges = useCallback(async (id, feedback) => {
    if (!useDemoData) { try { await sbPatch("content_pieces", id, { status: "guion", client_feedback: feedback }); } catch {} }
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status: "guion" } : p));
    setModalPiece(null);
    showToast("Comentario enviado. El equipo ajustará la propuesta.", "info");
  }, [useDemoData, showToast]);

  const reviewPieces = useMemo(() => pieces.filter(p => p.status === "revision_cliente"), [pieces]);
  const hasAds = session && ADS_CLIENTS.includes(session?.client?.id);
  const visTabs = TABS.filter(t => t.id !== "ads" || hasAds);

  const handleLogout = () => { localStorage.removeItem("e32o_session"); setSession(null); setUseDemoData(false); setPieces([]); };

  if (!session) return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.f, color: T.txt }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,10,.9)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.brd}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.8px" }}>e<span style={{ color: T.acc }}>.</span>32o</span>
            <span style={{ width: 1, height: 20, background: T.brdL }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T.txtM }}>{session.client.name}</span>
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${T.brd}`, borderRadius: T.rX, padding: "6px 12px", color: T.txtM, fontSize: 12, fontWeight: 600, fontFamily: T.f, cursor: "pointer" }}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 20px 80px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: T.card, borderRadius: T.rS, padding: 4, border: `1px solid ${T.brd}`, marginBottom: 16 }}>
          {visTabs.map(tab => {
            const active = activeTab === tab.id;
            const badge = tab.id === "review" ? reviewPieces.length : 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 12px", borderRadius: T.rX, border: "none",
                background: active ? T.accDim : "transparent", color: active ? T.acc : T.txtM,
                fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: T.f, cursor: "pointer",
              }}>
                {tab.icon} {tab.label}
                {badge > 0 && <span style={{ background: T.acc, color: "#0A0A0A", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center" }}>{badge}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, color: T.txtM }}>
            <div style={{ width: 24, height: 24, border: `2px solid ${T.brd}`, borderTopColor: T.acc, borderRadius: "50%", animation: "spin .8s linear infinite", marginRight: 10 }} />
            Cargando...
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {activeTab === "calendar" && (
              <>
                <ProgressSection pieces={pieces} />
                <PaymentReminder client={session.client} pieces={pieces} />
                <CalendarSection pieces={pieces} calMonth={calMonth} setCalMonth={setCalMonth} onPieceClick={setModalPiece} />
              </>
            )}
            {activeTab === "review" && (
              reviewPieces.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 20px" }}>
                  <div style={{ fontSize: 48, opacity: .3, marginBottom: 12 }}>✓</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: T.txt }}>Todo al día</div>
                  <div style={{ fontSize: 14, color: T.txtM, marginTop: 8 }}>No hay piezas pendientes de tu revisión.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, color: T.txtM }}>{reviewPieces.length} pieza{reviewPieces.length > 1 ? "s" : ""} pendiente{reviewPieces.length > 1 ? "s" : ""}</div>
                  {reviewPieces.map(p => (
                    <div key={p.id} onClick={() => setModalPiece(p)} style={{
                      background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r,
                      padding: "16px 18px", cursor: "pointer", transition: "border-color .15s",
                    }} onMouseEnter={e => e.currentTarget.style.borderColor = T.yel + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = T.brd}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${typeC[p.type] || T.acc}15`, color: typeC[p.type] || T.acc, textTransform: "uppercase" }}>{typeL[p.type] || p.type}</span>
                        <span style={{ fontSize: 12, color: T.txtM }}>{fmtDate(p.scheduled_date)}</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: T.yel, background: T.yelDim, padding: "2px 8px", borderRadius: 10 }}>Pendiente de revisión</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.txt }}>{p.title}</div>
                      {p.guion_output && <div style={{ fontSize: 12, color: T.txtM, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.guion_output}</div>}
                    </div>
                  ))}
                </div>
              )
            )}
            {activeTab === "ads" && <AdsSection metrics={adMetrics} />}
          </>
        )}
      </main>

      {/* Piece modal */}
      {modalPiece && <PieceModal piece={modalPiece} onClose={() => setModalPiece(null)} onApprove={handleApprove} onRequestChanges={handleRequestChanges} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: toast.type === "success" ? T.accDim : T.yelDim, border: `1px solid ${toast.type === "success" ? T.acc : T.yel}40`, borderRadius: T.rS, padding: "12px 18px", maxWidth: 360, fontSize: 13, fontWeight: 600, zIndex: 1100, color: toast.type === "success" ? T.acc : T.yel, animation: "slideIn .3s ease-out" }}>
          {toast.msg}
          <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        </div>
      )}

      {useDemoData && <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.brdL}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, color: T.txtM, zIndex: 200 }}>Modo demo</div>}
    </div>
  );
}
