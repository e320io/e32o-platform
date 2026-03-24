"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
// e.32o — Portal del Cliente (/portal) v3
// Multi-client switcher + Anuncios tab + original features
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
  purp: "#AFA9EC",
  txt: "#F5F5F5", txtM: "#888888", txtD: "#555555",
  r: "12px", rS: "8px", rX: "6px",
  f: "'DM Sans', system-ui, sans-serif",
};

// ── Demo data ──
const DEMO_PIECES = [
  { id: "d1", title: "Reel — Transformación balayage", type: "reel", status: "publicado", scheduled_date: "2026-03-03", piece_category: "organic", edicion_output: "reel_balayage_final.mp4", publish_url: "https://instagram.com/reel/abc123" },
  { id: "d2", title: "Carrusel — Cuidado capilar", type: "carrusel", status: "publicado", scheduled_date: "2026-03-05", piece_category: "organic", edicion_output: "carrusel_cuidado.pdf" },
  { id: "d3", title: "Reel — Tendencia primavera", type: "reel", status: "publicado", scheduled_date: "2026-03-07", piece_category: "organic", edicion_output: "reel_primavera.mp4" },
  { id: "d4", title: "Fast reel — Antes/después", type: "fast_reel", status: "publicado", scheduled_date: "2026-03-10", piece_category: "organic", edicion_output: "fast_antes_despues.mp4" },
  { id: "d5", title: "Reel — Color fantasía", type: "reel", status: "publicado", scheduled_date: "2026-03-12", piece_category: "organic", edicion_output: "reel_fantasia.mp4" },
  { id: "d6", title: "Carrusel — Preguntas frecuentes", type: "carrusel", status: "publicado", scheduled_date: "2026-03-14", piece_category: "organic", edicion_output: "carrusel_faq.pdf" },
  { id: "d7", title: "Reel — Keratin treatment", type: "reel", status: "revision_cliente", scheduled_date: "2026-03-19", piece_category: "organic", edicion_output: "reel_keratin_v2.mp4", guion_output: "• Hook: ¿Tu cabello se esponja?\n• Mostrar proceso keratin\n• Resultado 72hrs después\n• CTA: Agenda hoy" },
  { id: "d8", title: "Reel — Corte bob moderno", type: "reel", status: "revision_cliente", scheduled_date: "2026-03-21", piece_category: "organic", edicion_output: "reel_bob_edit.mp4", guion_output: "• Tendencia: bob francés\n• Transición antes/después\n• Tips de styling\n• CTA" },
  { id: "d9", title: "Carrusel — Abril trends", type: "carrusel", status: "edicion", scheduled_date: "2026-03-24", piece_category: "organic" },
  { id: "d10", title: "Reel — Decoloración segura", type: "reel", status: "edicion", scheduled_date: "2026-03-26", piece_category: "organic" },
  { id: "d11", title: "Fast reel — Quick styling", type: "fast_reel", status: "grabacion", scheduled_date: "2026-03-28", piece_category: "organic" },
  // ── Ad creatives ──
  { id: "ad1", title: "Ad Reel — Promo 2x1 mechas", type: "reel", status: "publicado", scheduled_date: "2026-03-06", piece_category: "ad_creative", edicion_output: "ad_promo_mechas.mp4", campaign_name: "Promo Marzo — 2x1 Mechas" },
  { id: "ad2", title: "Ad Carrusel — Antes/después", type: "carrusel", status: "publicado", scheduled_date: "2026-03-10", piece_category: "ad_creative", edicion_output: "ad_carousel_ad.pdf", campaign_name: "Promo Marzo — 2x1 Mechas" },
  { id: "ad3", title: "Ad Reel — Experiencia salón", type: "reel", status: "revision_cliente", scheduled_date: "2026-03-20", piece_category: "ad_creative", edicion_output: "ad_experiencia.mp4", campaign_name: "Branding — Experiencia Salón", guion_output: "• Abre con el espacio del salón\n• Mostrar proceso de atención\n• Testimonial corto\n• CTA: Reserva tu cita" },
  { id: "ad4", title: "Ad Imagen — Retargeting web", type: "imagen", status: "edicion", scheduled_date: "2026-03-25", piece_category: "ad_creative", campaign_name: "Retargeting — Visitas web" },
  { id: "d12", title: "Reel — Promo abril", type: "reel", status: "revision_cliente", scheduled_date: "2026-04-02", piece_category: "organic", edicion_output: "reel_promo_abril.mp4", guion_output: "• Hook visual: transición cabello\n• Promo 2x1 mechas\n• Testimonial real\n• CTA link en bio", research_output: "https://instagram.com/reel/ref456" },
  { id: "d13", title: "Reel — Mechas miel", type: "reel", status: "guion", scheduled_date: "2026-04-05", piece_category: "organic" },
  { id: "d14", title: "Carrusel — Tips post-color", type: "carrusel", status: "research", scheduled_date: "2026-04-08", piece_category: "organic" },
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

// ── Labels/Colors ──
const typeL = { reel: "Reel", carrusel: "Carrusel", fast_reel: "Fast Reel", imagen: "Imagen", video: "Video", gestion_ads: "Ad" };
const typeC = { reel: T.acc, carrusel: T.blue, fast_reel: T.yel, imagen: "#C084FC", video: T.acc, gestion_ads: "#EF9F27" };
const statusL = { pendiente: "Pendiente", research: "Research", guion: "Guión", aprobacion: "Aprobación", grabacion: "Grabación", edicion: "Edición", revision_cliente: "Tu revisión", publicado: "Publicado" };
const statusC = { pendiente: T.txtD, research: T.txtD, guion: T.txtM, aprobacion: T.yel, grabacion: T.blue, edicion: T.blue, revision_cliente: T.yel, publicado: T.acc };

function fmtDate(d) { if (!d) return "—"; return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
function fmtNum(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n); }
function isVideo(f) { if (!f) return false; return /\.(mp4|mov|webm|avi|mkv)$/i.test(f); }
function isImage(f) { if (!f) return false; return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f); }

// ============================================================
// CLIENT SWITCHER — for multi-client users (e.g. Sandra Arcos)
// ============================================================
function ClientSwitcher({ accessibleClients, activeClientId, onSwitch }) {
  const [open, setOpen] = useState(false);

  if (!accessibleClients || accessibleClients.length <= 1) return null;

  const current = accessibleClients.find(c => c.client_id === activeClientId) || accessibleClients[0];

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 12px 6px 8px",
        background: T.card, border: `1px solid ${T.brd}`, borderRadius: 10,
        cursor: "pointer", fontFamily: T.f, transition: "border-color .15s",
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = T.brdL}
        onMouseLeave={e => e.currentTarget.style.borderColor = T.brd}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `${current.color || T.acc}22`, color: current.color || T.acc,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
        }}>{(current.display_label || "?")[0]}</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.txt, lineHeight: 1.2 }}>{current.display_label}</div>
          <div style={{ fontSize: 10, color: T.txtD }}>{accessibleClients.length} cuentas</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="M4 6l4 4 4-4" stroke={T.txtM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, marginTop: 6, width: 240,
            background: T.card, border: `1px solid ${T.brdL}`, borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,.5)", zIndex: 50, overflow: "hidden",
          }}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.brd}` }}>
              <span style={{ fontSize: 11, color: T.txtD }}>Cambiar cuenta</span>
            </div>
            {accessibleClients.map(ac => (
              <button key={ac.client_id} onClick={() => { onSwitch(ac.client_id); setOpen(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", border: "none", cursor: "pointer", fontFamily: T.f,
                background: ac.client_id === activeClientId ? `${T.acc}10` : "transparent",
                transition: "background .1s",
              }}
                onMouseEnter={e => { if (ac.client_id !== activeClientId) e.currentTarget.style.background = "#1A1A1A"; }}
                onMouseLeave={e => { if (ac.client_id !== activeClientId) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: ac.client_id === activeClientId ? `${(ac.color || T.acc)}22` : "#1A1A1A",
                  color: ac.client_id === activeClientId ? (ac.color || T.acc) : T.txtM,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{(ac.display_label || "?")[0]}</div>
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 500, textAlign: "left",
                  color: ac.client_id === activeClientId ? T.acc : T.txt,
                }}>{ac.display_label}</span>
                {ac.client_id === activeClientId && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// ANUNCIOS TAB — Ad creatives separate from editorial calendar
// ============================================================
function AnunciosSection({ pieces, onPieceClick }) {
  const adPieces = pieces.filter(p => p.piece_category === "ad_creative");
  const [filter, setFilter] = useState("all");

  // Group by campaign
  const campaigns = useMemo(() => {
    const map = {};
    adPieces.forEach(p => {
      const name = p.campaign_name || p.campaigns?.name || "Sin campaña";
      if (!map[name]) map[name] = [];
      map[name].push(p);
    });
    return map;
  }, [adPieces]);

  const campaignNames = Object.keys(campaigns);
  const filtered = filter === "all" ? adPieces : (campaigns[filter] || []);

  const stats = {
    total: adPieces.length,
    published: adPieces.filter(p => p.status === "publicado").length,
    inReview: adPieces.filter(p => p.status === "revision_cliente").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Total creativos", value: stats.total, color: T.txt },
          { label: "Activos", value: stats.published, color: T.acc },
          { label: "Pendientes de revisión", value: stats.inReview, color: stats.inReview > 0 ? T.yel : T.txtM },
        ].map(s => (
          <div key={s.label} style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, padding: "16px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.txtM, textTransform: "uppercase", letterSpacing: ".5px" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: "-.5px", marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Campaign filter */}
      {campaignNames.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: T.f, cursor: "pointer", border: "none",
            background: filter === "all" ? T.accDim : T.card,
            color: filter === "all" ? T.acc : T.txtM,
            outline: filter === "all" ? `1px solid ${T.acc}33` : `1px solid ${T.brd}`,
          }}>Todas ({adPieces.length})</button>
          {campaignNames.map(name => (
            <button key={name} onClick={() => setFilter(name)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: T.f, cursor: "pointer", border: "none",
              background: filter === name ? T.accDim : T.card,
              color: filter === name ? T.acc : T.txtM,
              outline: filter === name ? `1px solid ${T.acc}33` : `1px solid ${T.brd}`,
            }}>{name} ({campaigns[name].length})</button>
          ))}
        </div>
      )}

      {/* Pieces list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 36, opacity: .3, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 14, color: T.txtM }}>No hay creativos de ads aún</div>
          <div style={{ fontSize: 12, color: T.txtD, marginTop: 4 }}>Aquí verás los videos e imágenes creados para tus campañas</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => {
            const sc = statusC[p.status] || T.txtD;
            const tc = typeC[p.type] || T.acc;
            const isRev = p.status === "revision_cliente";
            return (
              <div key={p.id} onClick={() => onPieceClick(p)} style={{
                background: T.card, border: `1px solid ${isRev ? `${T.yel}33` : T.brd}`, borderRadius: T.r,
                padding: "14px 18px", cursor: "pointer", transition: "border-color .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = isRev ? `${T.yel}55` : T.brdL}
                onMouseLeave={e => e.currentTarget.style.borderColor = isRev ? `${T.yel}33` : T.brd}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${tc}15`, color: tc, textTransform: "uppercase" }}>{typeL[p.type] || p.type}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${sc}18`, color: sc, textTransform: "uppercase" }}>{statusL[p.status]}</span>
                  <span style={{ fontSize: 12, color: T.txtD, marginLeft: "auto" }}>{fmtDate(p.scheduled_date)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.txt }}>{p.title}</div>
                {p.campaign_name && (
                  <div style={{ fontSize: 11, color: T.txtD, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>📊</span> {p.campaign_name}
                  </div>
                )}
                {isRev && (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: T.yel, background: T.yelDim, padding: "3px 10px", borderRadius: 6 }}>Pendiente de tu revisión</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DELIVERABLES PROGRESS — counts both organic + ad_creative
// ============================================================
function DeliverableProgress({ pieces }) {
  const organic = pieces.filter(p => (p.piece_category || "organic") === "organic");
  const adCreative = pieces.filter(p => p.piece_category === "ad_creative");
  const total = pieces.length;
  const published = pieces.filter(p => p.status === "publicado").length;
  const pct = total > 0 ? Math.round((published / total) * 100) : 0;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: T.r, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>Entrega del mes</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.acc }}>{pct}%</div>
      </div>
      {/* Bar */}
      <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden", display: "flex" }}>
        {pieces.filter(p => p.status === "publicado").length > 0 && <div style={{ width: `${(published / total) * 100}%`, background: T.acc, transition: "width .4s" }} />}
        {pieces.filter(p => p.status === "revision_cliente").length > 0 && <div style={{ width: `${(pieces.filter(p => p.status === "revision_cliente").length / total) * 100}%`, background: T.yel, transition: "width .4s" }} />}
        {pieces.filter(p => !["publicado", "revision_cliente", "pendiente"].includes(p.status)).length > 0 && <div style={{ width: `${(pieces.filter(p => !["publicado", "revision_cliente", "pendiente"].includes(p.status)).length / total) * 100}%`, background: T.blue, transition: "width .4s" }} />}
      </div>
      {/* Desglose orgánico vs ads */}
      {adCreative.length > 0 && (
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: T.acc }} />
            <span style={{ fontSize: 11, color: T.txtM }}>
              Orgánico: {organic.filter(p => p.status === "publicado").length}/{organic.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: "#EF9F27" }} />
            <span style={{ fontSize: 11, color: T.txtM }}>
              Ads: {adCreative.filter(p => p.status === "publicado").length}/{adCreative.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: T.txtM, fontWeight: 600 }}>
              Total: {published}/{total} entregables
            </span>
          </div>
        </div>
      )}
      {/* Legend if no ads */}
      {adCreative.length === 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { label: `${published} publicadas`, color: T.acc },
            { label: `${pieces.filter(p => p.status === "revision_cliente").length} en tu revisión`, color: T.yel },
            { label: `${pieces.filter(p => !["publicado", "revision_cliente", "pendiente"].includes(p.status)).length} en proceso`, color: T.blue },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 11, color: T.txtM }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PIECE DETAIL MODAL (same as before)
// ============================================================
function PieceModal({ piece, onClose, onApprove, onRequestChanges }) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const tc = typeC[piece.type] || T.acc;
  const sc = statusC[piece.status] || T.txtD;
  const file = piece.edicion_output || piece.grabacion_output;
  const isRev = piece.status === "revision_cliente";
  const isAd = piece.piece_category === "ad_creative";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.brdL}`, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,.5)", overflow: "hidden" }}>
        <div style={{ background: T.bg, borderBottom: `1px solid ${T.brd}`, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {file && isVideo(file) ? (
            <div style={{ width: "100%", padding: "20px", textAlign: "center" }}>
              <div style={{ background: "#000", borderRadius: 8, overflow: "hidden", maxWidth: 480, margin: "0 auto", aspectRatio: "9/16", maxHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: T.txtM }}>
                  <span style={{ fontSize: 48, opacity: .4 }}>▶</span>
                  <span style={{ fontSize: 12 }}>{file}</span>
                </div>
              </div>
            </div>
          ) : file ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 40 }}>
              <span style={{ fontSize: 36, opacity: .4 }}>{isImage(file) ? "🖼" : "📎"}</span>
              <span style={{ fontSize: 13, color: T.txtM }}>{file}</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 40, color: T.txtD }}>
              <span style={{ fontSize: 36, opacity: .3 }}>⏳</span>
              <span style={{ fontSize: 13 }}>Archivo en preparación</span>
            </div>
          )}
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
            {isAd && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,159,39,0.18)", color: "#EF9F27", textTransform: "uppercase" }}>Ad creative</span>}
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${sc}18`, color: sc, textTransform: "uppercase" }}>{statusL[piece.status]}</span>
          </div>
          <button onClick={onClose} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,.5)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: "50%", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px", flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${tc}15`, color: tc, textTransform: "uppercase" }}>{typeL[piece.type] || piece.type}</span>
            <span style={{ fontSize: 12, color: T.txtM }}>{fmtDate(piece.scheduled_date)}</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.txt, margin: "0 0 12px", lineHeight: 1.3 }}>{piece.title}</h2>
          {piece.campaign_name && (
            <div style={{ fontSize: 12, color: T.txtD, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📊</span> Campaña: {piece.campaign_name}
            </div>
          )}
          {piece.guion_output && (
            <div style={{ background: T.bg, border: `1px solid ${T.brd}`, borderRadius: T.rS, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.txtM, textTransform: "uppercase", marginBottom: 8 }}>Guión</div>
              <pre style={{ fontSize: 13, color: T.txt, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: T.f, margin: 0 }}>{piece.guion_output}</pre>
            </div>
          )}
          {piece.research_output && (
            <a href={piece.research_output} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: T.acc, textDecoration: "none", padding: "6px 12px", background: T.accDim, borderRadius: T.rX, marginBottom: 12 }}>
              ↗ Ver referencia
            </a>
          )}
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
// CALENDAR (same as before, filters only organic pieces)
// ============================================================
function CalendarSection({ pieces, calMonth, setCalMonth, onPieceClick }) {
  // Only show organic pieces in calendar
  const organicPieces = pieces.filter(p => (p.piece_category || "organic") === "organic");
  const year = calMonth.getFullYear(), month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const today = new Date();

  const piecesByDay = useMemo(() => {
    const map = {};
    organicPieces.forEach(p => {
      if (!p.scheduled_date) return;
      const d = new Date(p.scheduled_date + "T12:00:00");
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [organicPieces, month, year]);

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
          {days.map(d => <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.txtD, textTransform: "uppercase" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {cells.map((day, i) => {
            const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dp = day ? piecesByDay[day] || [] : [];
            return (
              <div key={i} style={{ minHeight: 80, padding: 4, borderRight: (i + 1) % 7 !== 0 ? `1px solid ${T.brd}` : "none", borderBottom: `1px solid ${T.brd}` }}>
                {day && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? T.acc : T.txtM, padding: "3px 5px", ...(isToday ? { background: T.accDim, borderRadius: 4, display: "inline-block" } : {}) }}>{day}</div>
                    {dp.map(p => {
                      const pc = statusC[p.status] || T.txtD;
                      return (
                        <div key={p.id} onClick={() => onPieceClick(p)} style={{
                          margin: "2px 1px", padding: "3px 5px", borderRadius: 4,
                          fontSize: 10, fontWeight: 600, color: pc, background: `${pc}15`,
                          cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          transition: "background .1s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = `${pc}28`}
                          onMouseLeave={e => e.currentTarget.style.background = `${pc}15`}
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
    </div>
  );
}

// ============================================================
// ADS METRICS SECTION (same as before)
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
            <div style={{ fontSize: 10, fontWeight: 700, color: T.txtM, textTransform: "uppercase" }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.c, marginTop: 2 }}>{k.v}</div>
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
// LOGIN
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
            <label style={{ fontSize: 12, color: T.txtM, fontWeight: 600, textTransform: "uppercase" }}>Usuario</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="tu_usuario" style={{ background: T.bg, border: `1px solid ${T.brdL}`, borderRadius: T.rS, padding: "12px 14px", color: T.txt, fontSize: 15, fontFamily: T.f, outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: T.txtM, fontWeight: 600, textTransform: "uppercase" }}>Contraseña</label>
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
// MAIN PORTAL
// ============================================================
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
  // Multi-client state
  const [activeClientId, setActiveClientId] = useState(null);
  const [accessibleClients, setAccessibleClients] = useState([]);

  const showToast = useCallback((msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);

  // ── Check centralized session on mount ──
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("e32o_session"));
      if (stored?.type === "client" && stored?.user) {
        const cid = stored.client_id || stored.user.client_id;
        const clients = stored.accessible_clients || [{
          client_id: cid,
          display_label: stored.client_name || stored.user.client_name || "Cliente",
          role: "viewer", is_default: true, has_ads: false,
        }];
        setSession(stored);
        setAccessibleClients(clients);
        setActiveClientId(cid);
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
        // Check multi-client access
        const accessList = await sbRest("client_user_access", {
          select: "client_id,display_label,role,is_default,clients(id,name,color,has_ads)",
          filters: [["client_user_id", "eq", users[0].id]],
        });

        let clients, defaultClientId, clientName;

        if (accessList.length > 0) {
          clients = accessList.map(a => ({
            client_id: a.client_id,
            display_label: a.display_label || a.clients?.name,
            role: a.role, is_default: a.is_default,
            has_ads: a.clients?.has_ads || false,
            color: a.clients?.color, name: a.clients?.name,
          }));
          const def = clients.find(c => c.is_default) || clients[0];
          defaultClientId = def.client_id;
          clientName = def.display_label;
        } else {
          // Fallback: single client from client_users.client_id
          const cl = await sbRest("clients", { filters: [["id", "eq", users[0].client_id]], limit: 1 });
          defaultClientId = users[0].client_id;
          clientName = cl[0]?.name || users[0].client_name || "Cliente";
          clients = [{ client_id: defaultClientId, display_label: clientName, role: "viewer", is_default: true, has_ads: cl[0]?.has_ads || false, color: cl[0]?.color }];
        }

        const sessionData = {
          user: users[0], type: "client",
          client_id: defaultClientId, client_name: clientName,
          accessible_clients: clients,
        };
        localStorage.setItem("e32o_session", JSON.stringify(sessionData));
        setSession(sessionData);
        setAccessibleClients(clients);
        setActiveClientId(defaultClientId);
        return;
      }
      // Demo fallback
      const demo = {
        brillo_valle: { id: "2ef8b0f0-7995-41bc-a18c-f1fb4bcea91f", name: "Brillo Mío Valle", has_ads: true, color: "#3EF0C8" },
        sandra: { id: "multi-sandra", name: "Sandra Arcos", has_ads: true, color: "#C83EF0", multi: true },
      };
      if (demo[username] && password === "e3202026") {
        let clients;
        if (username === "sandra") {
          // Demo multi-client: Sandra accesses 3 clients
          clients = [
            { client_id: "2ef8b0f0-7995-41bc-a18c-f1fb4bcea91f", display_label: "Brillo Mío Valle", role: "approver", is_default: true, has_ads: true, color: "#3EF0C8" },
            { client_id: "9b1a57b7-bc7e-4920-aade-c00985e6a544", display_label: "Brillo Mío Santa Fe", role: "approver", is_default: false, has_ads: true, color: "#3EB8F0" },
            { client_id: "76b07069-8808-41f7-8955-1eb3122eeda7", display_label: "Niña Levántate", role: "approver", is_default: false, has_ads: false, color: "#C83EF0" },
          ];
        } else {
          clients = [{ client_id: demo[username].id, display_label: demo[username].name, role: "viewer", is_default: true, has_ads: demo[username].has_ads, color: demo[username].color }];
        }
        const sessionData = { user: { username }, type: "client", client_id: clients[0].client_id, client_name: clients[0].display_label, accessible_clients: clients };
        localStorage.setItem("e32o_session", JSON.stringify(sessionData));
        setSession(sessionData);
        setAccessibleClients(clients);
        setActiveClientId(clients[0].client_id);
        setUseDemoData(true);
        return;
      }
      setLoginError("Usuario o contraseña incorrectos");
    } catch { setLoginError("Error de conexión"); }
    finally { setLoginLoading(false); }
  }, []);

  // ── Switch client ──
  const handleSwitchClient = useCallback((newClientId) => {
    setActiveClientId(newClientId);
    setActiveTab("calendar"); // Reset to calendar on switch
    // Update session in localStorage
    const stored = JSON.parse(localStorage.getItem("e32o_session") || "{}");
    const cl = accessibleClients.find(c => c.client_id === newClientId);
    stored.client_id = newClientId;
    stored.client_name = cl?.display_label;
    localStorage.setItem("e32o_session", JSON.stringify(stored));
  }, [accessibleClients]);

  // ── Load data ──
  useEffect(() => {
    if (!session || !activeClientId) return;
    (async () => {
      setLoading(true);
      if (useDemoData) { setPieces(DEMO_PIECES); setAdMetrics(DEMO_AD_METRICS); setLoading(false); return; }
      try {
        const p = await sbRest("content_pieces", { filters: [["client_id", "eq", activeClientId]], order: "scheduled_date.asc" });
        if (p.length > 0) { setPieces(p); } else { setPieces(DEMO_PIECES); setUseDemoData(true); }
      } catch { setPieces(DEMO_PIECES); setUseDemoData(true); }
      setAdMetrics(DEMO_AD_METRICS);
      setLoading(false);
    })();
  }, [session, activeClientId, useDemoData]);

  const handleApprove = useCallback(async (id) => {
    if (!useDemoData) { try { await sbPatch("content_pieces", id, { status: "grabacion" }); } catch {} }
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status: "grabacion" } : p));
    setModalPiece(null);
    showToast("Pieza aprobada. El equipo avanza.");
  }, [useDemoData, showToast]);

  const handleRequestChanges = useCallback(async (id, feedback) => {
    if (!useDemoData) { try { await sbPatch("content_pieces", id, { status: "guion", client_feedback: feedback }); } catch {} }
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status: "guion" } : p));
    setModalPiece(null);
    showToast("Comentario enviado. El equipo ajustará la propuesta.", "info");
  }, [useDemoData, showToast]);

  const reviewPieces = useMemo(() => pieces.filter(p => p.status === "revision_cliente"), [pieces]);
  const activeClient = accessibleClients.find(c => c.client_id === activeClientId);
  const hasAds = activeClient?.has_ads || false;

  // Dynamic tabs based on client capabilities
  const TABS = useMemo(() => {
    const tabs = [
      { id: "calendar", label: "Calendario", icon: "📅" },
    ];
    if (hasAds) {
      tabs.push({ id: "anuncios", label: "Anuncios", icon: "📢" });
    }
    tabs.push({ id: "review", label: "Revisión", icon: "📋" });
    if (hasAds) {
      tabs.push({ id: "ads", label: "Ads", icon: "📊" });
    }
    return tabs;
  }, [hasAds]);

  const handleLogout = () => { localStorage.removeItem("e32o_session"); setSession(null); setUseDemoData(false); setPieces([]); setAccessibleClients([]); setActiveClientId(null); };

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
            {/* Client switcher OR simple name */}
            {accessibleClients.length > 1 ? (
              <ClientSwitcher
                accessibleClients={accessibleClients}
                activeClientId={activeClientId}
                onSwitch={handleSwitchClient}
              />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: T.txtM }}>{activeClient?.display_label || "Cliente"}</span>
            )}
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${T.brd}`, borderRadius: T.rX, padding: "6px 12px", color: T.txtM, fontSize: 12, fontWeight: 600, fontFamily: T.f, cursor: "pointer" }}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 20px 80px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: T.card, borderRadius: T.rS, padding: 4, border: `1px solid ${T.brd}`, marginBottom: 16 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const badge = tab.id === "review" ? reviewPieces.length : tab.id === "anuncios" ? pieces.filter(p => p.piece_category === "ad_creative" && p.status === "revision_cliente").length : 0;
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
                <DeliverableProgress pieces={pieces} />
                <CalendarSection pieces={pieces} calMonth={calMonth} setCalMonth={setCalMonth} onPieceClick={setModalPiece} />
              </>
            )}
            {activeTab === "anuncios" && (
              <AnunciosSection pieces={pieces} onPieceClick={setModalPiece} />
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
                        {p.piece_category === "ad_creative" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(239,159,39,0.15)", color: "#EF9F27", textTransform: "uppercase" }}>Ad</span>}
                        <span style={{ fontSize: 12, color: T.txtM }}>{fmtDate(p.scheduled_date)}</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: T.yel, background: T.yelDim, padding: "2px 8px", borderRadius: 10 }}>Pendiente de revisión</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.txt }}>{p.title}</div>
                    </div>
                  ))}
                </div>
              )
            )}
            {activeTab === "ads" && <AdsSection metrics={adMetrics} />}
          </>
        )}
      </main>

      {modalPiece && <PieceModal piece={modalPiece} onClose={() => setModalPiece(null)} onApprove={handleApprove} onRequestChanges={handleRequestChanges} />}

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: toast.type === "success" ? T.accDim : T.yelDim, border: `1px solid ${toast.type === "success" ? T.acc : T.yel}40`, borderRadius: T.rS, padding: "12px 18px", maxWidth: 360, fontSize: 13, fontWeight: 600, zIndex: 1100, color: toast.type === "success" ? T.acc : T.yel, animation: "slideIn .3s ease-out" }}>
          {toast.msg}
          <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        </div>
      )}

      {useDemoData && <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.brdL}`, borderRadius: 20, padding: "8px 16px", fontSize: 12, color: T.txtM, zIndex: 200 }}>Modo demo — login con "sandra" / "e3202026" para ver multi-cliente</div>}
    </div>
  );
}
