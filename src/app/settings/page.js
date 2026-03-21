import { useState, useEffect, useMemo, useCallback } from "react";

// ── Supabase lightweight client ──
const SUPABASE_URL = "https://fyiukqelspqdvdulczrs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g";

const sb = {
  async select(table, columns = "*") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    return res.ok ? res.json() : [];
  },
  async upsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  },
};

// ── Demo data ──
const DEMO_CLIENTS = [
  { id: "c1", name: "Cire", color: "#B8F03E", flow: "full", monthly_fee: 17000 },
  { id: "c2", name: "Brillo Mío Valle", color: "#3EF0C8", flow: "full", monthly_fee: 6000 },
  { id: "c3", name: "Brillo Mío Santa Fe", color: "#3EB8F0", flow: "full", monthly_fee: 6000 },
  { id: "c4", name: "Beauty Design SJ", color: "#F0A03E", flow: "full", monthly_fee: 9500 },
  { id: "c5", name: "Beauty Design Barbería", color: "#F03E7A", flow: "full", monthly_fee: 0 },
  { id: "c6", name: "Sandy Arcos", color: "#C83EF0", flow: "short", monthly_fee: 6000 },
  { id: "c7", name: "Profeta Mariana", color: "#F0E03E", flow: "short", monthly_fee: 6000 },
  { id: "c8", name: "Apóstol Víctor", color: "#3EF06A", flow: "short", monthly_fee: 4000 },
  { id: "c9", name: "Diveland", color: "#F07A3E", flow: "full", monthly_fee: 2000 },
];

const DEMO_PLANS = {
  c1: { reels: 12, carousels: 4, ads_sets: 1, total: 17, label: "12 reels + 4 carruseles + ads" },
  c2: { reels: 12, fast_reels: 4, carousels: 4, ads_sets: 1, total: 21, label: "12 reels + 4 fast + 4 carruseles + ads" },
  c3: { reels: 12, fast_reels: 4, carousels: 4, ads_sets: 1, total: 21, label: "12 reels + 4 fast + 4 carruseles + ads" },
  c4: { videos: 6, images: 3, ads_sets: 1, total: 10, label: "6 videos + 3 imágenes + ads" },
  c5: { videos: 6, images: 3, ads_sets: 1, total: 10, label: "6 videos + 3 imágenes + ads" },
  c6: { episodes: 4, reels_ep: 24, reels_indiv: 6, total: 34, label: "4 eps YouTube + 24 reels ep + 6 reels indiv" },
  c7: { episodes: 4, reels_grab: 8, reels_predica: 4, carousels: 4, total: 20, label: "4 eps + 8 reels grab + 4 reel prédica + 4 carruseles" },
  c8: { clips: 8, total: 8, label: "8 clips prédica" },
  c9: { total: 4, label: "Por definir (~4 piezas)" },
};

const DEMO_TEAM = [
  { user_id: "fer_ayala", display_name: "Fer Ayala", role: "founder", avatar: "FA", current_load: 18 },
  { user_id: "yaz_antonio", display_name: "Yaz Antonio", role: "cofounder", avatar: "YA", current_load: 6 },
  { user_id: "natha_barragan", display_name: "Natha Barragán", role: "assistant", avatar: "NB", current_load: 22 },
  { user_id: "jose_camacho", display_name: "José Camacho", role: "editor", avatar: "JC", current_load: 30 },
  { user_id: "alhena_taboada", display_name: "Alhena Taboada", role: "filmmaker", avatar: "AT", current_load: 14 },
  { user_id: "mariana_yudico", display_name: "Mariana Yudico", role: "filmmaker", avatar: "MY", current_load: 12 },
];

const STAGES_FULL = ["research", "scripting", "approval", "recording", "editing", "client_review"];
const STAGES_SHORT = ["editing"];
const STAGE_LABELS = {
  research: "Research", scripting: "Guión", approval: "Aprobación",
  recording: "Grabación", editing: "Edición", client_review: "Rev. Cliente",
};
const STAGE_DESCRIPTIONS = {
  research: "Buscar referencias virales y guardar análisis",
  scripting: "Escribir guiones con apoyo de IA",
  approval: "Aprobar guiones (founder/cofounder)",
  recording: "Filmar el contenido",
  editing: "Editar videos/imágenes",
  client_review: "Revisión y aprobación del cliente",
};

// ── Pepe's smart distribution engine ──
function pepeRecommendPool(client, plan, team) {
  const isShort = client.flow === "short";
  const stages = isShort ? STAGES_SHORT : STAGES_FULL;
  const pool = {};

  stages.forEach(stage => {
    // Smart assignment based on role + current load
    let candidates = [];
    switch (stage) {
      case "research":
      case "scripting":
        candidates = team.filter(t => ["assistant", "founder", "cofounder"].includes(t.role));
        break;
      case "approval":
        candidates = team.filter(t => ["founder", "cofounder"].includes(t.role));
        break;
      case "recording":
        candidates = team.filter(t => ["filmmaker", "founder"].includes(t.role));
        break;
      case "editing":
        candidates = team.filter(t => ["editor", "assistant"].includes(t.role));
        break;
      case "client_review":
        candidates = team.filter(t => ["founder", "cofounder", "assistant"].includes(t.role));
        break;
      default:
        candidates = team;
    }

    // Sort by lowest current load
    candidates.sort((a, b) => a.current_load - b.current_load);
    pool[stage] = candidates.length > 0 ? [candidates[0].user_id] : [];
    if (candidates.length > 1 && plan.total > 10) {
      pool[stage].push(candidates[1].user_id);
    }
  });

  return pool;
}

function generatePieceDistribution(plan, isFirstHalf) {
  const total = plan.total || 0;
  const half1 = Math.ceil(total / 2);
  const half2 = total - half1;
  return {
    pieces: isFirstHalf ? half1 : half2,
    total,
    label: isFirstHalf ? "Primera mitad (inicio de mes)" : "Segunda mitad (2 semanas)",
  };
}

// ── Tabs ──
const TABS = [
  { id: "pools", label: "Pools Mensuales", icon: "👥" },
  { id: "plans", label: "Planes de Contenido", icon: "📋" },
  { id: "team", label: "Equipo", icon: "🛠" },
];

export default function Settings() {
  const [clients, setClients] = useState([]);
  const [team, setTeam] = useState([]);
  const [plans, setPlans] = useState({});
  const [pools, setPools] = useState({});
  const [activeTab, setActiveTab] = useState("pools");
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pepeThinking, setPepeThinking] = useState(false);
  const [generatedPieces, setGeneratedPieces] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [dbC, dbT] = await Promise.all([sb.select("clients"), sb.select("team_users")]);
        if (dbC.length > 0) {
          setClients(dbC);
          setTeam(dbT);
        } else {
          setClients(DEMO_CLIENTS);
          setTeam(DEMO_TEAM);
          setPlans(DEMO_PLANS);
        }
      } catch {
        setClients(DEMO_CLIENTS);
        setTeam(DEMO_TEAM);
        setPlans(DEMO_PLANS);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id);
    }
  }, [clients, selectedClient]);

  // Get stages for selected client
  const selectedClientData = clients.find(c => c.id === selectedClient);
  const stages = selectedClientData?.flow === "short" ? STAGES_SHORT : STAGES_FULL;

  // ── Pool management ──
  const togglePersonInStage = (stage, userId) => {
    setPools(prev => {
      const clientPool = { ...(prev[selectedClient] || {}) };
      const stageList = [...(clientPool[stage] || [])];
      const idx = stageList.indexOf(userId);
      if (idx >= 0) stageList.splice(idx, 1);
      else stageList.push(userId);
      clientPool[stage] = stageList;
      return { ...prev, [selectedClient]: clientPool };
    });
    setSaved(false);
  };

  const applyPepeRecommendation = useCallback(() => {
    if (!selectedClient || !selectedClientData) return;
    setPepeThinking(true);
    setTimeout(() => {
      const plan = plans[selectedClient] || { total: 10 };
      const recommended = pepeRecommendPool(selectedClientData, plan, team);
      setPools(prev => ({ ...prev, [selectedClient]: recommended }));
      setPepeThinking(false);
      setSaved(false);
    }, 800);
  }, [selectedClient, selectedClientData, plans, team]);

  const handleSavePool = async () => {
    setSaving(true);
    const plan = plans[selectedClient] || { total: 10 };
    const total = plan.total;
    const half1 = Math.ceil(total / 2);
    const half2 = total - half1;
    const researchScripting = total; // All at once

    // Generate piece distribution
    const dist = {
      client: selectedClientData?.name,
      total,
      first_half: half1,
      second_half: half2,
      research_scripting: researchScripting,
      note_research: "Research + Scripting se suelta TODO al inicio del mes",
      note_first: `Primeras ${half1} piezas (grabación, edición, publicación) se asignan al inicio`,
      note_second: `Restantes ${half2} piezas se sueltan a las 2 semanas`,
      pool: pools[selectedClient],
    };

    setGeneratedPieces(dist);

    // Try to save to Supabase
    try {
      await sb.upsert("monthly_team", {
        client_id: selectedClient,
        month: new Date().toISOString().slice(0, 7),
        pool_config: JSON.stringify(pools[selectedClient]),
      });
    } catch { /* demo mode */ }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ── Plan editing ──
  const handlePlanChange = (clientId, field, value) => {
    setPlans(prev => {
      const p = { ...(prev[clientId] || {}) };
      p[field] = parseInt(value) || 0;
      // Recalc total
      const { total, label, ...fields } = p;
      p.total = Object.values(fields).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      return { ...prev, [clientId]: p };
    });
  };

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>e.32o</span>
          <span style={s.sep}>|</span>
          <span style={s.headerTitle}>Configuración</span>
        </div>
        <div style={s.avatarSmall}>FA</div>
      </header>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...s.tab,
              ...(activeTab === tab.id ? s.tabActive : {}),
            }}
          >
            <span style={s.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <main style={s.main}>
        {/* ══════════ POOLS TAB ══════════ */}
        {activeTab === "pools" && (
          <div style={s.poolLayout}>
            {/* Client selector sidebar */}
            <div style={s.clientSidebar}>
              <div style={s.sidebarTitle}>Clientes</div>
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClient(c.id); setGeneratedPieces(null); }}
                  style={{
                    ...s.clientBtn,
                    ...(selectedClient === c.id ? {
                      background: "#1A1A1A",
                      borderColor: c.color + "44",
                    } : {}),
                  }}
                >
                  <span style={{ ...s.clientDot, background: c.color }} />
                  <span style={s.clientBtnName}>{c.name}</span>
                  {pools[c.id] && <span style={s.configuredBadge}>✓</span>}
                </button>
              ))}
            </div>

            {/* Pool config area */}
            <div style={s.poolMain}>
              {selectedClient && selectedClientData && (
                <>
                  {/* Client header */}
                  <div style={s.poolHeader}>
                    <div>
                      <h2 style={{ ...s.poolClientName, color: selectedClientData.color }}>
                        {selectedClientData.name}
                      </h2>
                      <p style={s.poolFlowLabel}>
                        Flujo {selectedClientData.flow === "short" ? "corto" : "completo"} — {plans[selectedClient]?.total || "?"} piezas/mes
                      </p>
                    </div>
                    <div style={s.poolActions}>
                      <button onClick={applyPepeRecommendation} style={s.pepeBtn} disabled={pepeThinking}>
                        {pepeThinking ? (
                          <span style={s.pepeBtnLoading}>⏳ Pepe pensando...</span>
                        ) : (
                          <>🤖 Pepe recomienda</>
                        )}
                      </button>
                      <button onClick={handleSavePool} style={s.saveBtn} disabled={saving}>
                        {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar y generar piezas"}
                      </button>
                    </div>
                  </div>

                  {/* Stage → Person assignment grid */}
                  <div style={s.stageGrid}>
                    {stages.map(stage => {
                      const assigned = pools[selectedClient]?.[stage] || [];
                      return (
                        <div key={stage} style={s.stageCard}>
                          <div style={s.stageHeader}>
                            <h3 style={s.stageName}>{STAGE_LABELS[stage]}</h3>
                            <span style={s.stageDesc}>{STAGE_DESCRIPTIONS[stage]}</span>
                          </div>
                          <div style={s.personChips}>
                            {team.map(t => {
                              const isAssigned = assigned.includes(t.user_id);
                              return (
                                <button
                                  key={t.user_id}
                                  onClick={() => togglePersonInStage(stage, t.user_id)}
                                  style={{
                                    ...s.personChip,
                                    ...(isAssigned ? {
                                      background: selectedClientData.color + "22",
                                      borderColor: selectedClientData.color + "55",
                                      color: selectedClientData.color,
                                    } : {}),
                                  }}
                                >
                                  <span style={{ ...s.chipAvatar, background: isAssigned ? selectedClientData.color + "33" : "#1A1A1A" }}>
                                    {t.avatar}
                                  </span>
                                  {t.display_name.split(" ")[0]}
                                  {isAssigned && <span style={s.chipCheck}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                          {assigned.length === 0 && (
                            <p style={s.noAssigned}>Sin asignar</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Distribution preview (after save) */}
                  {generatedPieces && (
                    <div style={s.distCard}>
                      <div style={s.distHeader}>
                        <span style={s.distIcon}>🤖</span>
                        <h3 style={s.distTitle}>Pepe — Distribución generada</h3>
                      </div>
                      <div style={s.distGrid}>
                        <div style={s.distItem}>
                          <span style={s.distNum}>{generatedPieces.total}</span>
                          <span style={s.distLabel}>Piezas totales</span>
                        </div>
                        <div style={s.distItem}>
                          <span style={{ ...s.distNum, color: "#3EF0C8" }}>{generatedPieces.research_scripting}</span>
                          <span style={s.distLabel}>Research + Guión (todo junto)</span>
                        </div>
                        <div style={s.distItem}>
                          <span style={{ ...s.distNum, color: "#B8F03E" }}>{generatedPieces.first_half}</span>
                          <span style={s.distLabel}>1ª mitad — inicio de mes</span>
                        </div>
                        <div style={s.distItem}>
                          <span style={{ ...s.distNum, color: "#F0E03E" }}>{generatedPieces.second_half}</span>
                          <span style={s.distLabel}>2ª mitad — a las 2 semanas</span>
                        </div>
                      </div>
                      <div style={s.distRules}>
                        <p style={s.distRule}>✦ {generatedPieces.note_research}</p>
                        <p style={s.distRule}>✦ {generatedPieces.note_first}</p>
                        <p style={s.distRule}>✦ {generatedPieces.note_second}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════ PLANS TAB ══════════ */}
        {activeTab === "plans" && (
          <div style={s.plansGrid}>
            {clients.map(c => {
              const plan = plans[c.id] || {};
              const isEditing = editingPlan === c.id;
              const { total, label, ...fields } = plan;
              return (
                <div key={c.id} style={{ ...s.planCard, borderColor: isEditing ? c.color + "55" : "#1E1E1E" }}>
                  <div style={s.planHeader}>
                    <div style={s.planHeaderLeft}>
                      <span style={{ ...s.clientDot, background: c.color }} />
                      <h3 style={s.planName}>{c.name}</h3>
                    </div>
                    <button
                      onClick={() => setEditingPlan(isEditing ? null : c.id)}
                      style={{ ...s.editBtn, color: isEditing ? c.color : "#666" }}
                    >
                      {isEditing ? "Cerrar" : "Editar"}
                    </button>
                  </div>
                  <p style={s.planLabel}>{label || `${total || 0} piezas`}</p>
                  <div style={s.planTotal}>
                    <span style={{ ...s.planTotalNum, color: c.color }}>{total || 0}</span>
                    <span style={s.planTotalLabel}>piezas/mes</span>
                  </div>
                  {c.monthly_fee > 0 && (
                    <div style={s.planFee}>${c.monthly_fee?.toLocaleString()} MXN/mes</div>
                  )}
                  {isEditing && (
                    <div style={s.planFields}>
                      {Object.entries(fields).map(([key, val]) => (
                        <div key={key} style={s.planField}>
                          <label style={s.planFieldLabel}>{key.replace(/_/g, " ")}</label>
                          <input
                            type="number"
                            value={val}
                            onChange={e => handlePlanChange(c.id, key, e.target.value)}
                            style={s.planInput}
                            min={0}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ TEAM TAB ══════════ */}
        {activeTab === "team" && (
          <div style={s.teamGrid}>
            {team.map(t => (
              <div key={t.user_id} style={s.teamCard}>
                <div style={{
                  ...s.teamAvatar,
                  background: t.role === "founder" ? "#B8F03E22" : t.role === "cofounder" ? "#B8F03E15" : "#1A1A1A",
                  color: t.role === "founder" || t.role === "cofounder" ? "#B8F03E" : "#888",
                }}>
                  {t.avatar}
                </div>
                <h3 style={s.teamName}>{t.display_name}</h3>
                <span style={s.teamRole}>{t.role}</span>
                <div style={s.teamLoadBar}>
                  <div style={{
                    ...s.teamLoadFill,
                    width: `${Math.min((t.current_load / 35) * 100, 100)}%`,
                    background: t.current_load > 25 ? "#F04E3E" : t.current_load > 15 ? "#F0E03E" : "#B8F03E",
                  }} />
                </div>
                <span style={s.teamLoadLabel}>{t.current_load} piezas activas</span>
                <div style={s.teamClients}>
                  {clients.filter(c => {
                    const pool = pools[c.id];
                    if (!pool) return false;
                    return Object.values(pool).some(arr => arr.includes(t.user_id));
                  }).map(c => (
                    <span key={c.id} style={{ ...s.teamClientTag, borderColor: c.color + "44", color: c.color }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Styles ──
const s = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#0A0A0A",
    minHeight: "100vh",
    color: "#E0E0E0",
  },
  loadingWrap: {
    fontFamily: "'DM Sans', sans-serif",
    background: "#0A0A0A",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 40, height: 40, borderRadius: "50%",
    border: "3px solid #B8F03E22", borderTopColor: "#B8F03E",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#666", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 28px", borderBottom: "1px solid #1A1A1A",
    position: "sticky", top: 0, background: "#0A0A0AEE",
    backdropFilter: "blur(12px)", zIndex: 100,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontSize: 20, fontWeight: 700, color: "#B8F03E", letterSpacing: "-0.5px" },
  sep: { color: "#2A2A2A", fontSize: 20 },
  headerTitle: { color: "#888", fontSize: 14, fontWeight: 400 },
  avatarSmall: {
    width: 32, height: 32, borderRadius: "50%", background: "#B8F03E18",
    color: "#B8F03E", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 600,
  },

  // Tabs
  tabBar: {
    display: "flex", gap: 4, padding: "12px 28px", borderBottom: "1px solid #141414",
    background: "#0C0C0C",
  },
  tab: {
    background: "none", border: "1px solid transparent", borderRadius: 10,
    padding: "10px 18px", color: "#666", fontSize: 13, fontWeight: 500,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
    fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },
  tabActive: {
    background: "#151515", borderColor: "#222", color: "#DDD",
  },
  tabIcon: { fontSize: 15 },

  main: { padding: "24px 28px", maxWidth: 1320, margin: "0 auto" },

  // Pool layout
  poolLayout: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 },
  clientSidebar: {
    background: "#0E0E0E", border: "1px solid #1A1A1A", borderRadius: 14,
    padding: 14, display: "flex", flexDirection: "column", gap: 4,
    height: "fit-content", position: "sticky", top: 80,
  },
  sidebarTitle: { fontSize: 11, color: "#555", fontWeight: 600, padding: "4px 8px", textTransform: "uppercase", letterSpacing: 1 },
  clientBtn: {
    background: "none", border: "1px solid transparent", borderRadius: 10,
    padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
    fontSize: 13, color: "#AAA", textAlign: "left",
  },
  clientDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  clientBtnName: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  configuredBadge: { fontSize: 11, color: "#B8F03E", fontWeight: 600 },

  // Pool main
  poolMain: { display: "flex", flexDirection: "column", gap: 20 },
  poolHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    flexWrap: "wrap", gap: 16,
  },
  poolClientName: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" },
  poolFlowLabel: { fontSize: 13, color: "#666", margin: "4px 0 0" },
  poolActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  pepeBtn: {
    background: "#B8F03E15", border: "1px solid #B8F03E33", borderRadius: 10,
    padding: "10px 18px", color: "#B8F03E", fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },
  pepeBtnLoading: { opacity: 0.7 },
  saveBtn: {
    background: "#B8F03E", border: "none", borderRadius: 10,
    padding: "10px 22px", color: "#0A0A0A", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
  },

  // Stage grid
  stageGrid: { display: "flex", flexDirection: "column", gap: 12 },
  stageCard: {
    background: "#111", border: "1px solid #1E1E1E", borderRadius: 14,
    padding: "18px 22px",
  },
  stageHeader: { marginBottom: 14 },
  stageName: { fontSize: 15, fontWeight: 600, color: "#CCC", margin: 0 },
  stageDesc: { fontSize: 12, color: "#555", marginTop: 2, display: "block" },
  personChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  personChip: {
    background: "#0D0D0D", border: "1px solid #222", borderRadius: 10,
    padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer", fontSize: 13, color: "#888", fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500, transition: "all 0.15s",
  },
  chipAvatar: {
    width: 26, height: 26, borderRadius: 8, display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600,
  },
  chipCheck: { fontSize: 12, fontWeight: 700 },
  noAssigned: { fontSize: 12, color: "#444", margin: "6px 0 0", fontStyle: "italic" },

  // Distribution card
  distCard: {
    background: "#0D0D0D", border: "1px solid #B8F03E22", borderRadius: 14,
    padding: "22px 26px",
  },
  distHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  distIcon: { fontSize: 20 },
  distTitle: { fontSize: 15, fontWeight: 600, color: "#CCC", margin: 0 },
  distGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 18,
  },
  distItem: { display: "flex", flexDirection: "column", gap: 4 },
  distNum: { fontSize: 28, fontWeight: 700, color: "#DDD", letterSpacing: "-1px" },
  distLabel: { fontSize: 12, color: "#666" },
  distRules: {
    borderTop: "1px solid #1A1A1A", paddingTop: 14,
    display: "flex", flexDirection: "column", gap: 6,
  },
  distRule: { fontSize: 13, color: "#888", margin: 0, lineHeight: 1.5 },

  // Plans grid
  plansGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
  },
  planCard: {
    background: "#111", border: "1px solid #1E1E1E", borderRadius: 14,
    padding: "22px 24px", transition: "border-color 0.2s",
  },
  planHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  planHeaderLeft: { display: "flex", alignItems: "center", gap: 10 },
  planName: { fontSize: 15, fontWeight: 600, color: "#CCC", margin: 0 },
  editBtn: {
    background: "none", border: "1px solid #222", borderRadius: 8,
    padding: "5px 12px", fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: "all 0.15s",
  },
  planLabel: { fontSize: 12, color: "#555", margin: "0 0 14px" },
  planTotal: { display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 },
  planTotalNum: { fontSize: 32, fontWeight: 700, letterSpacing: "-1px" },
  planTotalLabel: { fontSize: 12, color: "#555" },
  planFee: { fontSize: 13, color: "#666", fontWeight: 500 },
  planFields: {
    marginTop: 16, paddingTop: 16, borderTop: "1px solid #1A1A1A",
    display: "flex", flexDirection: "column", gap: 10,
  },
  planField: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  planFieldLabel: { fontSize: 12, color: "#777", textTransform: "capitalize" },
  planInput: {
    width: 64, background: "#0A0A0A", border: "1px solid #222",
    borderRadius: 8, padding: "6px 10px", color: "#DDD", fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", textAlign: "center", fontWeight: 600,
    outline: "none",
  },

  // Team grid
  teamGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  teamCard: {
    background: "#111", border: "1px solid #1E1E1E", borderRadius: 14,
    padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
  },
  teamAvatar: {
    width: 52, height: 52, borderRadius: 16, display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700,
  },
  teamName: { fontSize: 15, fontWeight: 600, color: "#CCC", margin: 0 },
  teamRole: { fontSize: 12, color: "#666", textTransform: "capitalize" },
  teamLoadBar: {
    width: "100%", height: 6, background: "#1A1A1A", borderRadius: 4,
    overflow: "hidden", marginTop: 4,
  },
  teamLoadFill: { height: "100%", borderRadius: 4, transition: "width 0.5s" },
  teamLoadLabel: { fontSize: 11, color: "#555" },
  teamClients: {
    display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6,
  },
  teamClientTag: {
    fontSize: 10, border: "1px solid", borderRadius: 6,
    padding: "2px 8px", fontWeight: 500,
  },
};
