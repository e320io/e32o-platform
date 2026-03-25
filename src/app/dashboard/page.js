"use client";
import { useState, useEffect, useMemo } from "react";
import NavHeader from '@/components/NavHeader';
import { getSession, isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { C, STAGE_LABELS, CURRENT_PERIOD } from '@/lib/tokens';

// ── Helpers ──
function isOverdue(d) { return d && new Date(d + 'T12:00:00') < new Date(); }
function fmtDeadline(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ── Icons ──
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    pieces: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    check: <><path d="M20 6L9 17l-5-5"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    speed: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    team: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
};

// ── Pepe insights engine ──
function generatePepeInsights(pieces, clients) {
  const insights = [];
  const now = new Date();
  const latePieces = pieces.filter(p => p.status !== 'publicado' && isOverdue(p.deadline || p.scheduled_date));
  const totalActive = pieces.filter(p => p.status !== 'publicado').length;
  const totalDone = pieces.filter(p => p.status === 'publicado').length;
  const totalAll = pieces.length;

  if (latePieces.length > 0) {
    const byClient = {};
    latePieces.forEach(p => {
      const cl = clients.find(c => c.id === p.client_id);
      const name = cl?.name || 'Desconocido';
      byClient[name] = (byClient[name] || 0) + 1;
    });
    const worst = Object.entries(byClient).sort((a, b) => b[1] - a[1])[0];
    insights.push({
      type: "alert",
      text: `Hay ${latePieces.length} piezas atrasadas. ${worst[0]} tiene ${worst[1]} — recomiendo priorizar entregas ahí.`
    });
  }

  const stageCount = {};
  pieces.filter(p => p.status !== 'publicado' && p.status !== 'pendiente').forEach(p => {
    stageCount[p.status] = (stageCount[p.status] || 0) + 1;
  });
  const bottleneck = Object.entries(stageCount).sort((a, b) => b[1] - a[1])[0];
  if (bottleneck && bottleneck[1] > 5) {
    insights.push({
      type: "warning",
      text: `Cuello de botella en ${STAGE_LABELS[bottleneck[0]] || bottleneck[0]}: ${bottleneck[1]} piezas acumuladas.`
    });
  }

  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  const dayOfMonth = now.getDate();
  const expectedPct = Math.round((dayOfMonth / 30) * 100);
  if (pct < expectedPct - 15) {
    insights.push({ type: "warning", text: `Vamos al ${pct}% del mes pero deberíamos estar al ~${expectedPct}%. Hay que acelerar.` });
  } else if (pct >= expectedPct) {
    insights.push({ type: "success", text: `Ritmo saludable: ${pct}% completado con ${expectedPct}% del mes transcurrido.` });
  }

  if (insights.length === 0) {
    insights.push({ type: "success", text: "Todo fluye bien. Sin alertas críticas hoy." });
  }
  return insights;
}

// ── Main Dashboard ──
export default function Dashboard() {
  const router = useRouter();
  const [pieces, setPieces] = useState([]);
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pepeOpen, setPepeOpen] = useState(true);
  const [hoveredClient, setHoveredClient] = useState(null);
  const [now] = useState(new Date());

  // Auth
  useEffect(() => {
    const s = getSession();
    if (!s?.user || !isAdmin(s.user)) { router.push('/'); return; }
  }, []);

  // Load real data from Supabase
  useEffect(() => {
    async function load() {
      try {
        // Load clients
        const { data: dbClients } = await supabase.from('clients').select('*').eq('is_active', true);
        const cl = dbClients?.length ? dbClients : [];

        // Load ALL pieces for current period (across all clients)
        const { data: dbPieces } = await supabase.from('content_pieces').select('*').eq('period', CURRENT_PERIOD);
        const pcs = dbPieces || [];

        // Load team
        const { data: dbTeam } = await supabase.from('team_users').select('*').eq('is_active', true);
        const tm = dbTeam?.length ? dbTeam.map(t => ({
          ...t,
          user_id: t.username,
          display_name: t.display_name || t.username,
          avatar: (t.display_name || t.username || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        })) : [];

        setClients(cl);
        setPieces(pcs);
        setTeam(tm);
      } catch (e) {
        console.error('Dashboard load error:', e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── KPIs (calculated from real data) ──
  const kpis = useMemo(() => {
    const total = pieces.length;
    const done = pieces.filter(p => p.status === 'publicado').length;
    const late = pieces.filter(p => p.status !== 'publicado' && isOverdue(p.deadline || p.scheduled_date)).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Avg days: estimate based on pieces that have both created_at and are published
    const completedPieces = pieces.filter(p => p.status === 'publicado' && p.created_at);
    let avgDays = 0;
    if (completedPieces.length > 0) {
      const totalDays = completedPieces.reduce((sum, p) => {
        const created = new Date(p.created_at);
        const now = new Date();
        return sum + Math.max(1, Math.round((now - created) / 86400000));
      }, 0);
      avgDays = Math.round(totalDays / completedPieces.length);
    }
    return { total, done, late, pct, avgDays };
  }, [pieces]);

  // ── Client progress (from real pieces) ──
  const clientProgress = useMemo(() => {
    return clients.map(c => {
      const cp = pieces.filter(p => p.client_id === c.id);
      const total = cp.length;
      const done = cp.filter(p => p.status === 'publicado').length;
      const late = cp.filter(p => p.status !== 'publicado' && isOverdue(p.deadline || p.scheduled_date)).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...c, total, done, late, pct };
    }).sort((a, b) => b.total - a.total);
  }, [clients, pieces]);

  // ── Team load ──
  const teamLoad = useMemo(() => {
    // Count pieces assigned to each team member in any active stage
    const assignFields = ['research_assigned', 'guion_assigned', 'aprobacion_assigned', 'grabacion_assigned', 'edicion_assigned', 'revision_cliente_assigned'];
    return team.map(t => {
      // Active = pieces where this person is assigned to the current stage
      const active = pieces.filter(p => {
        if (p.status === 'publicado' || p.status === 'pendiente') return false;
        const field = p.status + '_assigned';
        return p[field] === t.user_id;
      }).length;
      // Done = pieces where this person was assigned and piece is now published
      const done = pieces.filter(p => {
        if (p.status !== 'publicado') return false;
        return assignFields.some(f => p[f] === t.user_id);
      }).length;
      const total = active + done;
      const eff = total > 0 ? Math.round((done / total) * 100) : 0;
      return { ...t, active, done, total, eff };
    }).sort((a, b) => b.active - a.active);
  }, [team, pieces]);

  // ── Upcoming deadlines ──
  const deadlines = useMemo(() => {
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);
    return pieces
      .filter(p => p.status !== 'publicado' && (p.deadline || p.scheduled_date))
      .filter(p => {
        const d = new Date((p.deadline || p.scheduled_date) + 'T12:00:00');
        return d >= now && d <= in7;
      })
      .sort((a, b) => new Date(a.deadline || a.scheduled_date) - new Date(b.deadline || b.scheduled_date))
      .slice(0, 12);
  }, [pieces, now]);

  // ── Pepe insights ──
  const pepeInsights = useMemo(() => generatePepeInsights(pieces, clients), [pieces, clients]);

  const monthName = now.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingPulse} />
        <p style={styles.loadingText}>Cargando dashboard...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />

      <NavHeader />

      <main style={styles.main}>
        {/* KPI Cards */}
        <section style={styles.kpiRow}>
          {[
            { label: "Piezas del mes", value: kpis.total, icon: "pieces", accent: "#B8F03E" },
            { label: "Completado", value: `${kpis.pct}%`, icon: "check", accent: "#3EF0C8", sub: `${kpis.done} de ${kpis.total}` },
            { label: "Atrasadas", value: kpis.late, icon: "alert", accent: kpis.late > 5 ? "#F04E3E" : "#F0E03E" },
            { label: "Vel. promedio", value: kpis.avgDays > 0 ? `${kpis.avgDays}d` : '—', icon: "speed", accent: "#3EB8F0" },
          ].map((kpi, i) => (
            <div key={i} style={styles.kpiCard}>
              <div style={{ ...styles.kpiIcon, background: `${kpi.accent}18` }}>
                <Icon name={kpi.icon} size={20} color={kpi.accent} />
              </div>
              <div>
                <div style={{ ...styles.kpiValue, color: kpi.accent }}>{kpi.value}</div>
                <div style={styles.kpiLabel}>{kpi.label}</div>
                {kpi.sub && <div style={styles.kpiSub}>{kpi.sub}</div>}
              </div>
            </div>
          ))}
        </section>

        {/* Two column grid */}
        <div style={styles.grid2}>
          {/* Client Progress */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Progreso por cliente</h2>
              <span style={styles.cardBadge}>{clientProgress.length} clientes</span>
            </div>
            <div style={styles.clientBars}>
              {clientProgress.map((c) => (
                <div key={c.id} style={styles.clientRow}
                  onMouseEnter={() => setHoveredClient(c.id)}
                  onMouseLeave={() => setHoveredClient(null)}
                >
                  <div style={styles.clientInfo}>
                    <span style={{ ...styles.clientDot, background: c.color || '#666' }} />
                    <span style={styles.clientName}>{c.name}</span>
                    {c.late > 0 && <span style={styles.lateBadge}>{c.late} atraso{c.late > 1 ? "s" : ""}</span>}
                  </div>
                  <div style={styles.barWrap}>
                    <div style={{
                      ...styles.barFill,
                      width: `${Math.max(c.pct, 2)}%`,
                      background: `linear-gradient(90deg, ${c.color || '#666'}CC, ${c.color || '#666'})`,
                      opacity: hoveredClient === c.id ? 1 : 0.85,
                    }} />
                  </div>
                  <div style={styles.clientStats}>
                    <span style={{ ...styles.clientPct, color: c.color || '#666' }}>{c.pct}%</span>
                    <span style={styles.clientCount}>{c.done}/{c.total}</span>
                  </div>
                </div>
              ))}
              {clientProgress.length === 0 && <p style={{ color: '#444', fontSize: 13, padding: 20, textAlign: 'center' }}>Sin clientes activos</p>}
            </div>
          </section>

          {/* Team Load */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Carga del equipo</h2>
              <Icon name="team" size={18} color="#666" />
            </div>
            <div>
              <div style={styles.teamHeader}>
                <span style={{ ...styles.teamCell, flex: 2 }}>Persona</span>
                <span style={styles.teamCell}>Activas</span>
                <span style={styles.teamCell}>Hechas</span>
                <span style={styles.teamCell}>Eficiencia</span>
              </div>
              {teamLoad.map((t) => (
                <div key={t.user_id} style={styles.teamRow}>
                  <div style={{ ...styles.teamCell, flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...styles.teamAvatar, background: t.role === "founder" ? "#B8F03E22" : "#ffffff0a", color: t.role === "founder" ? "#B8F03E" : "#888" }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={styles.teamName}>{t.display_name}</div>
                      <div style={styles.teamRole}>{t.role}</div>
                    </div>
                  </div>
                  <span style={{ ...styles.teamCell, ...styles.teamNum, color: t.active > 8 ? "#F04E3E" : "#ddd" }}>{t.active}</span>
                  <span style={{ ...styles.teamCell, ...styles.teamNum }}>{t.done}</span>
                  <span style={styles.teamCell}>
                    <div style={styles.effWrap}>
                      <div style={{ ...styles.effBar, width: `${t.eff}%`, background: t.eff >= 60 ? "#B8F03E" : t.eff >= 30 ? "#F0E03E" : "#F04E3E" }} />
                      <span style={styles.effLabel}>{t.eff}%</span>
                    </div>
                  </span>
                </div>
              ))}
              {teamLoad.length === 0 && <p style={{ color: '#444', fontSize: 13, padding: 20, textAlign: 'center' }}>Sin equipo configurado</p>}
            </div>
          </section>
        </div>

        {/* Bottom row */}
        <div style={styles.grid2}>
          {/* Deadlines */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Deadlines próximos 7 días</h2>
              <Icon name="calendar" size={18} color="#666" />
            </div>
            {deadlines.length === 0 ? (
              <p style={styles.emptyText}>Sin deadlines próximos</p>
            ) : (
              <div style={styles.deadlineList}>
                {deadlines.map((p, i) => {
                  const cl = clients.find(c => c.id === p.client_id);
                  const d = new Date((p.deadline || p.scheduled_date) + 'T12:00:00');
                  const daysLeft = Math.round((d - now) / 86400000);
                  return (
                    <div key={i} style={styles.deadlineItem}>
                      <div style={{ ...styles.deadlineDot, background: cl?.color || "#666" }} />
                      <div style={styles.deadlineInfo}>
                        <span style={styles.deadlineTitle}>{cl?.name} — {p.title}</span>
                        <span style={styles.deadlineStage}>{STAGE_LABELS[p.status] || p.status}</span>
                      </div>
                      <div style={{ ...styles.deadlineDays, color: daysLeft <= 1 ? "#F04E3E" : daysLeft <= 3 ? "#F0E03E" : "#888" }}>
                        {daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : `${daysLeft}d`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pepe AI PM */}
          <section style={{ ...styles.card, ...styles.pepeCard }}>
            <div style={styles.cardHeader}>
              <div style={styles.pepeHeader}>
                <div style={styles.pepeAvatar}><span style={styles.pepeEmoji}>🤖</span></div>
                <div>
                  <h2 style={{ ...styles.cardTitle, margin: 0 }}>Pepe</h2>
                  <span style={styles.pepeSub}>PM con IA — Recomendaciones</span>
                </div>
              </div>
              <button onClick={() => setPepeOpen(!pepeOpen)} style={styles.pepeToggle}>{pepeOpen ? "▾" : "▸"}</button>
            </div>
            {pepeOpen && (
              <div style={styles.pepeInsights}>
                {pepeInsights.map((ins, i) => (
                  <div key={i} style={{
                    ...styles.insightItem,
                    borderLeftColor: ins.type === "alert" ? "#F04E3E" : ins.type === "warning" ? "#F0E03E" : "#B8F03E",
                  }}>
                    <div style={{
                      ...styles.insightDot,
                      background: ins.type === "alert" ? "#F04E3E" : ins.type === "warning" ? "#F0E03E" : "#B8F03E",
                    }} />
                    <p style={styles.insightText}>{ins.text}</p>
                  </div>
                ))}
                <div style={styles.pepeTip}>
                  Datos actualizados al {now.toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ── Styles ──
const styles = {
  page: { fontFamily: "'DM Sans', sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#E0E0E0" },
  loadingWrap: { fontFamily: "'DM Sans', sans-serif", background: "#0A0A0A", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  loadingPulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #B8F03E22", borderTopColor: "#B8F03E", animation: "spin 0.8s linear infinite" },
  loadingText: { color: "#666", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  main: { padding: "24px 28px", maxWidth: 1320, margin: "0 auto" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  kpiCard: { background: "#111111", border: "1px solid #1E1E1E", borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  kpiValue: { fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-1px" },
  kpiLabel: { fontSize: 12, color: "#777", marginTop: 2, fontWeight: 500 },
  kpiSub: { fontSize: 11, color: "#555", marginTop: 1 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  card: { background: "#111111", border: "1px solid #1E1E1E", borderRadius: 14, padding: "22px 24px" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#CCC", margin: 0 },
  cardBadge: { fontSize: 11, color: "#888", background: "#1A1A1A", padding: "3px 10px", borderRadius: 20, fontWeight: 500 },
  clientBars: { display: "flex", flexDirection: "column", gap: 10 },
  clientRow: { display: "grid", gridTemplateColumns: "180px 1fr 80px", alignItems: "center", gap: 12, padding: "4px 0", cursor: "default" },
  clientInfo: { display: "flex", alignItems: "center", gap: 8 },
  clientDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  clientName: { fontSize: 13, fontWeight: 500, color: "#CCC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  lateBadge: { fontSize: 10, color: "#F04E3E", background: "#F04E3E18", padding: "1px 7px", borderRadius: 10, fontWeight: 600, whiteSpace: "nowrap" },
  barWrap: { height: 8, background: "#1A1A1A", borderRadius: 6, overflow: "hidden", position: "relative" },
  barFill: { height: "100%", borderRadius: 6, transition: "width 0.6s ease, opacity 0.2s" },
  clientStats: { display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" },
  clientPct: { fontSize: 14, fontWeight: 700 },
  clientCount: { fontSize: 11, color: "#555" },
  teamHeader: { display: "flex", gap: 8, padding: "0 0 10px", borderBottom: "1px solid #1A1A1A", marginBottom: 6 },
  teamCell: { flex: 1, fontSize: 11, color: "#555", fontWeight: 500 },
  teamRow: { display: "flex", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0F0F0F" },
  teamAvatar: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 },
  teamName: { fontSize: 13, fontWeight: 500, color: "#CCC" },
  teamRole: { fontSize: 11, color: "#555" },
  teamNum: { fontSize: 15, fontWeight: 600, color: "#DDD" },
  effWrap: { width: "100%", height: 6, background: "#1A1A1A", borderRadius: 4, position: "relative", overflow: "hidden" },
  effBar: { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  effLabel: { fontSize: 11, color: "#888", position: "absolute", right: 0, top: -16 },
  deadlineList: { display: "flex", flexDirection: "column", gap: 4 },
  deadlineItem: { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #141414" },
  deadlineDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  deadlineInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  deadlineTitle: { fontSize: 13, color: "#CCC", fontWeight: 500 },
  deadlineStage: { fontSize: 11, color: "#666" },
  deadlineDays: { fontSize: 13, fontWeight: 600, flexShrink: 0 },
  emptyText: { color: "#444", fontSize: 13, textAlign: "center", padding: 30 },
  pepeCard: { borderColor: "#B8F03E22" },
  pepeHeader: { display: "flex", alignItems: "center", gap: 12 },
  pepeAvatar: { width: 38, height: 38, borderRadius: 12, background: "#B8F03E18", display: "flex", alignItems: "center", justifyContent: "center" },
  pepeEmoji: { fontSize: 20 },
  pepeSub: { fontSize: 11, color: "#666", fontWeight: 400 },
  pepeToggle: { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16, padding: 4 },
  pepeInsights: { display: "flex", flexDirection: "column", gap: 10 },
  insightItem: { borderLeft: "3px solid", paddingLeft: 14, padding: "10px 14px", background: "#0D0D0D", borderRadius: "0 8px 8px 0", display: "flex", alignItems: "flex-start", gap: 10 },
  insightDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 6 },
  insightText: { fontSize: 13, color: "#BBB", margin: 0, lineHeight: 1.5 },
  pepeTip: { fontSize: 11, color: "#444", textAlign: "right", marginTop: 6 },
};
