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
import { useAuroraPostgresAnimation, type Signal } from "./useAuroraPostgresAnimation";
import { type AuroraPostgresState } from "./auroraPostgresSlice";
import { getAdapter, TOPICS } from "./aurora-postgres-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

/* ── Topic questions (shown in sidebar) ──────────────── */
const TOPIC_QUESTIONS: Record<string, string> = {
  "why-relational":
    "Why did you choose a relational database over NoSQL for the insurance platform?",
  "why-postgresql":
    "What made you pick PostgreSQL specifically — over MySQL, Oracle, or SQL Server?",
  "why-aurora":
    "Why Aurora instead of just running PostgreSQL on RDS or self-managed EC2?",
  "insurance-schema":
    "How do claims and policies map to your database schema? Walk me through the data model.",
};

const AuroraPostgresVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } =
    useAuroraPostgresAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as AuroraPostgresState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const activeTopic = TOPICS.find((t) => t.id === topic);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    adapter.buildTopology(b, st, { hot, phase });

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
    { key: "aurora-overview" as ConceptKey, label: "Aurora", color: "#fde68a", borderColor: "#f59e0b" },
    { key: "acid" as ConceptKey, label: "ACID", color: "#86efac", borderColor: "#4ade80" },
    { key: "wal" as ConceptKey, label: "WAL", color: "#a5f3fc", borderColor: "#22d3ee" },
    { key: "jsonb" as ConceptKey, label: "JSONB", color: "#c4b5fd", borderColor: "#a78bfa" },
    { key: "aurora-storage" as ConceptKey, label: "Storage Layer", color: "#fde68a", borderColor: "#f59e0b" },
    { key: "read-replicas" as ConceptKey, label: "Read Replicas", color: "#93c5fd", borderColor: "#60a5fa" },
    { key: "quorum" as ConceptKey, label: "Quorum", color: "#a5f3fc", borderColor: "#22d3ee" },
    { key: "claims-schema" as ConceptKey, label: "Schema Design", color: "#c4b5fd", borderColor: "#a78bfa" },
    { key: "pg-extensions" as ConceptKey, label: "Extensions", color: "#fde68a", borderColor: "#f59e0b" },
  ];

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`aurora-postgres-root aurora-postgres-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="aurora-postgres-stage">
            <StageHeader
              title="Aurora PostgreSQL for Insurance"
              subtitle={`${activeTopic?.label ?? topic} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`aurora-postgres-phase aurora-postgres-phase--${phase}`}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            {TOPIC_QUESTIONS[topic] && (
              <SideCard label="Interview Question" variant="info">
                <p style={{ fontStyle: "italic", color: "#94a3b8" }}>
                  {TOPIC_QUESTIONS[topic]}
                </p>
              </SideCard>
            )}
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Active Variant" variant="info">
              <p style={{ color: adapter.colors.stroke, fontWeight: 600 }}>
                {adapter.profile.label}
              </p>
              <p>{adapter.profile.description}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default AuroraPostgresVisualization;
