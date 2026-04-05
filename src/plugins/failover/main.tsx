import React, { useLayoutEffect, useRef, useEffect } from "react";
import { viz, type PanZoomController } from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { useFailoverAnimation, type Signal } from "./useFailoverAnimation";
import { STRATEGY_PROFILES, SYSTEM_PROFILES } from "./failoverSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 940;
const H = 560;

/* ── Colour helpers ──────────────────────────────────── */

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  up: { fill: "#14532d", stroke: "#22c55e" },
  down: { fill: "#7f1d1d", stroke: "#ef4444" },
  promoting: { fill: "#3b0764", stroke: "#a855f7" },
  recovering: { fill: "#78350f", stroke: "#f59e0b" },
  standby: { fill: "#0c4a6e", stroke: "#38bdf8" },
  cold: { fill: "#1e293b", stroke: "#475569" },
};

function nodeColor(status: string, isSecondary: boolean, isCold: boolean) {
  if (status === "down") return NODE_COLORS.down;
  if (status === "promoting") return NODE_COLORS.promoting;
  if (status === "recovering") return NODE_COLORS.recovering;
  if (isSecondary && isCold) return NODE_COLORS.cold;
  if (isSecondary) return NODE_COLORS.standby;
  return NODE_COLORS.up;
}

const FailoverVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useFailoverAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const {
    strategy,
    replicationMode,
    autoFailover,
    nodes,
    currentRtoSec,
    currentRpoSec,
    cost,
    availabilityPercent,
    lostWrites,
    eventLog,
    explanation,
    hotZones,
    phase,
    failureActive,
    failoverInProgress,
    systemProfile,
  } = runtime;

  const hot = (zone: string) => hotZones.includes(zone);
  const primary = nodes.find((n) => n.id === "primary")!;
  const secondary = nodes.find((n) => n.id === "secondary")!;
  const profile = STRATEGY_PROFILES[strategy];
  const isCold = strategy === "cold";
  const isMultiPrimary = strategy === "multiPrimary";

  /* ── Build VizCraft scene ────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Clients ─────────────────────────────────────── */
    b.node("client-1")
      .at(180, 40)
      .rect(56, 40, 8)
      .fill(hot("client-1") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("client-1") ? "#60a5fa" : "#334155", 1.4)
      .image("/mobile.svg", 20, 20, { dy: -5, position: "center" })
      .label("Client 1", { fill: "#94a3b8", fontSize: 8, dy: 13 });

    b.node("client-2")
      .at(280, 40)
      .rect(56, 40, 8)
      .fill(hot("client-2") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("client-2") ? "#60a5fa" : "#334155", 1.4)
      .image("/mobile.svg", 20, 20, { dy: -5, position: "center" })
      .label("Client 2", { fill: "#94a3b8", fontSize: 8, dy: 13 });

    /* ── Router / LB ──────────────────────────────────── */
    b.node("router")
      .at(W / 2 - 70, 120)
      .rect(140, 50, 12)
      .fill(hot("router") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("router") ? "#60a5fa" : "#334155", 2)
      .label("Router / LB", {
        fill: "#fff",
        fontSize: 13,
        fontWeight: "bold",
      });

    // Client → router edges
    b.edge("client-1", "router", "e-c1-router")
      .arrow(true)
      .stroke(
        hot("client-1") ? "#60a5fa" : "#1e3a8a",
        hot("client-1") ? 1.6 : 0.7,
      );
    b.edge("client-2", "router", "e-c2-router")
      .arrow(true)
      .stroke(
        hot("client-2") ? "#60a5fa" : "#1e3a8a",
        hot("client-2") ? 1.6 : 0.7,
      );

    /* ── Primary server ──────────────────────────────── */
    const pCol = nodeColor(primary.status, false, false);
    b.node("primary")
      .at(170, 250)
      .rect(150, 80, 12)
      .fill(hot("primary") ? pCol.fill : "#0f172a")
      .stroke(pCol.stroke, 2)
      .image("/server2.svg", 18, 18, { dy: -24, position: "center" })
      .richLabel(
        (l) => {
          l.color(
            primary.status === "down"
              ? "FAILED"
              : isMultiPrimary
                ? "Active-1"
                : "Primary",
            pCol.stroke,
            { fontSize: 11, bold: true },
          );
          l.newline();
          l.color(
            primary.status === "down"
              ? "Offline"
              : primary.servingTraffic
                ? "Serving traffic"
                : "Idle",
            "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: 12, lineHeight: 1.6 },
      )
      .onClick(() => openConcept(failureActive ? "rto" : "cold-standby"));

    /* ── Secondary server ────────────────────────────── */
    const sCol = nodeColor(secondary.status, true, isCold);
    b.node("secondary")
      .at(540, 250)
      .rect(150, 80, 12)
      .fill(hot("secondary") ? sCol.fill : "#0f172a")
      .stroke(sCol.stroke, 2)
      .image("/server2.svg", 18, 18, { dy: -24, position: "center" })
      .richLabel(
        (l) => {
          const label =
            secondary.role === "primary"
              ? "Promoted Primary"
              : isMultiPrimary
                ? "Active-2"
                : secondary.status === "promoting"
                  ? "Promoting..."
                  : isCold
                    ? "Cold Standby"
                    : strategy === "warm"
                      ? "Warm Standby"
                      : "Hot Standby";
          l.color(label, sCol.stroke, { fontSize: 11, bold: true });
          l.newline();
          l.color(
            secondary.status === "down"
              ? "Offline"
              : secondary.servingTraffic
                ? "Serving traffic"
                : secondary.status === "promoting"
                  ? "Catching up..."
                  : "Standing by",
            "#94a3b8",
            { fontSize: 9 },
          );
        },
        { fill: "#fff", fontSize: 12, dy: 12, lineHeight: 1.6 },
      )
      .onClick(() =>
        openConcept(strategy === "hot" ? "hot-standby" : "warm-standby"),
      );

    // Router → server edges
    const rPrimActive = hot("router") && hot("primary");
    const ePr = b
      .edge("router", "primary", "e-router-primary")
      .arrow(true)
      .stroke(
        primary.status === "down"
          ? "#ef4444"
          : rPrimActive
            ? "#60a5fa"
            : "#334155",
        rPrimActive ? 2 : 1.2,
      );
    if (primary.status === "down") ePr.dashed();

    const rSecActive = hot("router") && hot("secondary");
    const eSec = b
      .edge("router", "secondary", "e-router-secondary")
      .arrow(true)
      .stroke(
        rSecActive || secondary.servingTraffic ? "#38bdf8" : "#1e293b",
        rSecActive ? 2 : secondary.servingTraffic ? 1.4 : 0.6,
      );
    if (!secondary.servingTraffic && !rSecActive) eSec.dashed();

    /* ── Primary DB ──────────────────────────────────── */
    const pDbActive = hot("primary-db");
    b.node("primary-db")
      .at(170, 410)
      .rect(130, 50, 12)
      .fill(pDbActive ? "#14532d" : "#0f172a")
      .stroke(
        primary.status === "down"
          ? "#ef4444"
          : pDbActive
            ? "#22c55e"
            : "#166534",
        2,
      )
      .label("Primary DB", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    b.edge("primary", "primary-db", "e-prim-pdb")
      .arrow(true)
      .stroke(pDbActive ? "#22c55e" : "#166534", pDbActive ? 2 : 1);

    /* ── Secondary DB ────────────────────────────────── */
    const sDbActive = hot("secondary-db");
    b.node("secondary-db")
      .at(540, 410)
      .rect(130, 50, 12)
      .fill(sDbActive ? "#0c4a6e" : "#0f172a")
      .stroke(sDbActive ? "#38bdf8" : "#1e3a8a", 2)
      .label("Secondary DB", {
        fill: "#fff",
        fontSize: 12,
        fontWeight: "bold",
      });

    b.edge("secondary", "secondary-db", "e-sec-sdb")
      .arrow(true)
      .stroke(sDbActive ? "#38bdf8" : "#1e3a8a", sDbActive ? 2 : 1);

    /* ── Replication edge (DB → DB) ──────────────────── */
    const replActive = hot("primary-db") && hot("secondary-db");
    const replEdge = b
      .edge("primary-db", "secondary-db", "e-replication")
      .arrow(true)
      .stroke(replActive ? "#a855f7" : "#581c87", replActive ? 2.5 : 1.2);

    if (replicationMode === "async") {
      replEdge.dashed();
      replEdge.label("async", {
        fill: "#a78bfa",
        fontSize: 9,
        dy: -8,
      });
    } else if (replicationMode === "backup") {
      replEdge.dashed();
      replEdge.label("backup", {
        fill: "#94a3b8",
        fontSize: 9,
        dy: -8,
      });
    } else {
      replEdge.label("sync", {
        fill: "#c084fc",
        fontSize: 9,
        dy: -8,
      });
    }

    /* ── Failure X overlay ───────────────────────────── */
    if (primary.status === "down") {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 260,
            y: 240,
            text: "✕",
            fill: "#ef4444",
            fontSize: 28,
            fontWeight: 900,
          },
          { key: "fail-x" },
        );
      });
    }

    /* ── Signal overlay ──────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          o.add(
            "signal",
            {
              from: sig.from,
              to: sig.to,
              progress: sig.progress,
              magnitude: sig.magnitude ?? 1,
            },
            { key: sig.id },
          );
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy ─────────────────────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => {
      unsub?.();
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pill definitions ──────────────────────────────── */
  const pills = [
    { key: "rto", label: "RTO", color: "#fca5a5", borderColor: "#ef4444" },
    { key: "rpo", label: "RPO", color: "#fde68a", borderColor: "#f59e0b" },
    {
      key: "backup-vs-async",
      label: "Backup vs Async",
      color: "#bae6fd",
      borderColor: "#38bdf8",
    },
    {
      key: "cold-standby",
      label: "Cold",
      color: "#cbd5e1",
      borderColor: "#94a3b8",
    },
    {
      key: "warm-standby",
      label: "Warm",
      color: "#fde68a",
      borderColor: "#fbbf24",
    },
    {
      key: "hot-standby",
      label: "Hot",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "active-active",
      label: "Active-Active",
      color: "#d8b4fe",
      borderColor: "#a855f7",
    },
    {
      key: "replication",
      label: "Replication",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "split-brain",
      label: "Split Brain",
      color: "#f9a8d4",
      borderColor: "#ec4899",
    },
  ];

  /* ── Format helpers ────────────────────────────────── */
  const fmtTime = (s: number) =>
    s >= 3600
      ? `${Math.round(s / 60)}m`
      : s >= 60
        ? `${Math.round(s / 60)}m`
        : `${s}s`;

  return (
    <div className="failover-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="failover-stage">
            <StageHeader
              title="Failover Lab"
              subtitle="Compare failover strategies — see RTO, RPO, cost, and data loss"
            >
              <StatBadge
                label="Strategy"
                value={profile.label}
                color={
                  strategy === "cold"
                    ? "#94a3b8"
                    : strategy === "warm"
                      ? "#fbbf24"
                      : strategy === "hot"
                        ? "#ef4444"
                        : "#a855f7"
                }
              />
              <StatBadge
                label="RTO"
                value={fmtTime(currentRtoSec)}
                color={currentRtoSec > 60 ? "#fca5a5" : "#86efac"}
              />
              <StatBadge
                label="RPO"
                value={fmtTime(currentRpoSec)}
                color={currentRpoSec > 0 ? "#fde68a" : "#86efac"}
              />
              <StatBadge
                label="Cost"
                value={`$${cost.totalMonthly}/mo`}
                color="#fcd34d"
              />
              <StatBadge
                label="Avail"
                value={`${availabilityPercent}%`}
                color={availabilityPercent >= 99.9 ? "#86efac" : "#fde68a"}
              />
              {lostWrites > 0 && (
                <StatBadge
                  label="Lost Writes"
                  value={lostWrites}
                  color="#ef4444"
                />
              )}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>

            {(() => {
              const PRIORITY_COLOR: Record<string, string> = {
                critical: "#ef4444",
                high: "#f97316",
                medium: "#fbbf24",
                low: "#94a3b8",
              };
              const sp = SYSTEM_PROFILES[systemProfile];
              return (
                <SideCard label="System Profile" variant="info">
                  {systemProfile === "none" ? (
                    <p className="failover-profile-card__hint">
                      Select a system profile above to see real-world RTO vs RPO
                      context.
                    </p>
                  ) : (
                    <div className="failover-profile-card">
                      <div className="failover-profile-card__header">
                        <span className="failover-profile-card__icon">
                          {sp.icon}
                        </span>
                        <span className="failover-profile-card__label">
                          {sp.label}
                        </span>
                      </div>
                      <p className="failover-profile-card__tagline">
                        {sp.tagline}
                      </p>
                      <div className="failover-profile-card__priorities">
                        <div className="failover-profile-card__priority-row">
                          <span className="failover-profile-card__priority-key">
                            RTO priority
                          </span>
                          <span
                            className="failover-profile-card__badge"
                            style={{
                              background: PRIORITY_COLOR[sp.rtoPriority],
                            }}
                          >
                            {sp.rtoPriority.toUpperCase()}
                          </span>
                        </div>
                        <p className="failover-profile-card__reason">
                          {sp.rtoReason}
                        </p>
                        <div className="failover-profile-card__priority-row">
                          <span className="failover-profile-card__priority-key">
                            RPO priority
                          </span>
                          <span
                            className="failover-profile-card__badge"
                            style={{
                              background: PRIORITY_COLOR[sp.rpoPriority],
                            }}
                          >
                            {sp.rpoPriority.toUpperCase()}
                          </span>
                        </div>
                        <p className="failover-profile-card__reason">
                          {sp.rpoReason}
                        </p>
                      </div>
                      <div className="failover-profile-card__examples">
                        <span className="failover-profile-card__priority-key">
                          Examples
                        </span>
                        <ul>
                          {sp.examples.map((ex) => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="failover-profile-card__rec">
                        <span className="failover-profile-card__priority-key">
                          Recommended
                        </span>
                        <div className="failover-profile-card__rec-badges">
                          <span className="failover-profile-card__rec-badge">
                            {STRATEGY_PROFILES[sp.recommendedStrategy].label}
                          </span>
                          <span className="failover-profile-card__rec-badge">
                            {sp.recommendedReplication}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </SideCard>
              );
            })()}

            <SideCard label="Configuration" variant="info">
              <p>
                <strong>Strategy:</strong> {profile.label}
              </p>
              <p>
                <strong>Replication:</strong> {replicationMode}
              </p>
              <p>
                <strong>Auto-failover:</strong> {autoFailover ? "Yes" : "No"}
              </p>
            </SideCard>

            <SideCard label="Tradeoffs" variant="info">
              <div className="failover-metrics">
                <div className="failover-metrics__row">
                  <span>RTO (recovery time)</span>
                  <span
                    style={{
                      color: currentRtoSec > 60 ? "#fca5a5" : "#86efac",
                    }}
                  >
                    ~{fmtTime(currentRtoSec)}
                  </span>
                </div>
                <div className="failover-metrics__row">
                  <span>RPO (data loss window)</span>
                  <span
                    style={{
                      color: currentRpoSec > 0 ? "#fde68a" : "#86efac",
                    }}
                  >
                    ~{fmtTime(currentRpoSec)}
                  </span>
                </div>
                <div className="failover-metrics__row">
                  <span>Monthly cost</span>
                  <span style={{ color: "#fcd34d" }}>${cost.totalMonthly}</span>
                </div>
                <div className="failover-metrics__row">
                  <span>Availability</span>
                  <span
                    style={{
                      color:
                        availabilityPercent >= 99.9 ? "#86efac" : "#fde68a",
                    }}
                  >
                    {availabilityPercent}%
                  </span>
                </div>
                <div className="failover-metrics__row">
                  <span>Complexity</span>
                  <span style={{ color: "#c4b5fd" }}>
                    {runtime.complexityScore}/6
                  </span>
                </div>
              </div>
            </SideCard>

            {eventLog.length > 0 && (
              <SideCard label="Event Log" variant="info">
                <div className="failover-event-log">
                  {eventLog.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default FailoverVisualization;
