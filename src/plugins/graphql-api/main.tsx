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
import { useGraphqlApiAnimation, type Signal } from "./useGraphqlApiAnimation";
import { VARIANT_PROFILES, type GraphqlApiState } from "./graphqlApiSlice";
import { buildSteps } from "./flow-engine";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const GraphqlApiVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } =
    useGraphqlApiAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as GraphqlApiState;
  const { explanation, hotZones, phase, variant } = st;
  const profile = VARIANT_PROFILES[variant];
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // TODO: build your nodes / edges dynamically based on `variant`
    b.node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(hot("node-a") ? "#1e40af" : "#0f172a")
      .stroke(hot("node-a") ? "#60a5fa" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    b.node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(hot("node-b") ? "#065f46" : "#0f172a")
      .stroke(hot("node-b") ? "#34d399" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    b.edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });

    // ── Signals ──────────────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add(
            "signal",
            params as SignalOverlayParams,
            { key: id, className: colorClass },
          );
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
    return () => { unsub?.(); };
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
    { key: "overview", label: "GraphqlApi", color: "#93c5fd", borderColor: "#3b82f6" },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="graphql-api-root graphql-api-phase--${phase}">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="graphql-api-stage">
            <StageHeader
              title="GraphqlApi"
              subtitle={`Comparing: ${profile.label}`}
            >
              <StatBadge
                label="Variant"
                value={profile.label}
                className={`graphql-api-phase graphql-api-phase--${phase}`}
              />
              <StatBadge label="Latency" value={`${st.latencyMs}ms`} />
              <StatBadge label="Throughput" value={`${st.throughput} rps`} />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Active Variant" variant="info">
              <p style={{ color: profile.color, fontWeight: 600 }}>
                {profile.label}
              </p>
              <p>{profile.description}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default GraphqlApiVisualization;
