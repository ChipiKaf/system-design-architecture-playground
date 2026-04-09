import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
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
import { useCiCdBuildAnimation, type Signal } from "./useCiCdBuildAnimation";
import { SCENARIO_PROFILES, type CiCdBuildState } from "./ciCdBuildSlice";
import { getAdapter } from "./build-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const CiCdBuildVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useCiCdBuildAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as CiCdBuildState;
  const { explanation, hotZones, phase, toolType, scenario, result } = st;
  const adapter = getAdapter(toolType);
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // CI trigger node
    b.node("ci-trigger")
      .at(50, 280)
      .rect(100, 50, 10)
      .fill(hot("ci-trigger") ? "#1e3a5f" : "#0f172a")
      .stroke(hot("ci-trigger") ? "#60a5fa" : "#334155", 2)
      .label("CI Trigger", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Build orchestrator node (Nx / Turborepo)
    b.node("build-orchestrator")
      .at(50, 400)
      .rect(100, 50, 10)
      .fill(hot("build-orchestrator") ? adapter.colors.fill : "#0f172a")
      .stroke(hot("build-orchestrator") ? adapter.colors.stroke : "#334155", 2)
      .label(adapter.profile.shortLabel, {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    b.edge("ci-trigger", "build-orchestrator", "edge-ci-orch")
      .stroke("#475569", 1.5)
      .arrow(true);

    // Cache store node
    b.node("cache-store")
      .at(50, 520)
      .rect(100, 50, 10)
      .fill(hot("cache-store") ? "#065f46" : "#0f172a")
      .stroke(hot("cache-store") ? "#22c55e" : "#334155", 2)
      .label("Cache Store", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    b.edge("build-orchestrator", "cache-store", "edge-orch-cache")
      .stroke("#475569", 1.5)
      .arrow(true)
      .dashed();

    // Output bundle node
    b.node("output-bundle")
      .at(780, 400)
      .rect(100, 50, 10)
      .fill(hot("output-bundle") ? "#4c1d95" : "#0f172a")
      .stroke(hot("output-bundle") ? "#a78bfa" : "#334155", 2)
      .label("Bundle Output", {
        fill: "#e2e8f0",
        fontSize: 11,
        fontWeight: "bold",
      });

    // Build the package graph via adapter
    adapter.buildTopology(b, st, { hot, openConcept, phase });

    // Edges from orchestrator to packages
    const pkgs = st.packages;
    if (pkgs.length > 0) {
      const firstPkg = pkgs[0];
      b.edge("build-orchestrator", firstPkg.id, "edge-orch-pkg")
        .stroke("#475569", 1.5)
        .arrow(true)
        .dashed();
    }

    // Edge from last app to output bundle
    const apps = pkgs.filter((p) => p.role === "app");
    if (apps.length > 0) {
      b.edge(apps[0].id, "output-bundle", "edge-app-bundle")
        .stroke("#475569", 1.5)
        .arrow(true)
        .dashed();
    }

    // Adapter-specific annotations
    adapter.buildAnnotationOverlays(b, st, { hot, openConcept, phase }, W);

    // Signals
    if (signals.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      b.overlay((o: any) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, {
            key: id,
            className: colorClass,
          });
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
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

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    {
      key: "build-tools" as ConceptKey,
      label: "Build Tools",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "caching" as ConceptKey,
      label: "Caching",
      color: "#86efac",
      borderColor: "#22c55e",
    },
    {
      key: "tree-shaking" as ConceptKey,
      label: "Tree-Shaking",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "task-graph" as ConceptKey,
      label: "Task Graph",
      color: "#fcd34d",
      borderColor: "#f59e0b",
    },
    {
      key: "affected" as ConceptKey,
      label: "Affected",
      color: "#fda4af",
      borderColor: "#ef4444",
    },
  ];

  const adapterBadges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`ci-cd-build-root ci-cd-build-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="ci-cd-build-stage">
            <StageHeader
              title="CI/CD Build Lab"
              subtitle={`${adapter.profile.shortLabel} — ${SCENARIO_PROFILES[scenario].label}`}
            >
              <StatBadge
                label="Tool"
                value={adapter.profile.shortLabel}
                color={adapter.colors.stroke}
              />
              <StatBadge
                label="Cold"
                value={`${result.coldBuildMs}ms`}
                color="#f59e0b"
              />
              <StatBadge
                label="Warm"
                value={`${result.warmBuildMs}ms`}
                color="#22c55e"
              />
              <StatBadge
                label="Cache Hit"
                value={`${result.cacheHitRate}%`}
                color="#86efac"
              />
              {adapterBadges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  color={badge.color}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Graph Model">
              <p style={{ fontSize: 12, color: "#cbd5e1" }}>
                {adapter.profile.graphModel}
              </p>
            </SideCard>
            <SideCard label="Cache Strategy">
              <p style={{ fontSize: 12, color: "#cbd5e1" }}>
                {adapter.profile.cacheStrategy}
              </p>
            </SideCard>
            <SideCard label="Build Metrics">
              <div className="ci-cd-build-kpis">
                <div className="ci-cd-build-kpis__row">
                  <span>Cold Build</span>
                  <strong style={{ color: "#f59e0b" }}>
                    {result.coldBuildMs}ms
                  </strong>
                </div>
                <div className="ci-cd-build-kpis__row">
                  <span>Warm Build</span>
                  <strong style={{ color: "#22c55e" }}>
                    {result.warmBuildMs}ms
                  </strong>
                </div>
                <div className="ci-cd-build-kpis__row">
                  <span>Cache Hit Rate</span>
                  <strong style={{ color: "#86efac" }}>
                    {result.cacheHitRate}%
                  </strong>
                </div>
                <div className="ci-cd-build-kpis__row">
                  <span>Max Parallelism</span>
                  <strong>{result.parallelism}x</strong>
                </div>
                <div className="ci-cd-build-kpis__row">
                  <span>Tree-Shaken</span>
                  <strong style={{ color: "#a78bfa" }}>
                    {result.treeShakenKb}KB removed
                  </strong>
                </div>
                <div className="ci-cd-build-kpis__row">
                  <span>Affected</span>
                  <strong>
                    {result.affectedCount}/{result.totalPackages} packages
                  </strong>
                </div>
              </div>
            </SideCard>
            <SideCard label="Strengths">
              <ul className="ci-cd-build-traits">
                {adapter.profile.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </SideCard>
            <SideCard label="Weaknesses">
              <ul className="ci-cd-build-traits">
                {adapter.profile.weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default CiCdBuildVisualization;
