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
import { usePostgresqlAnimation, type Signal } from "./usePostgresqlAnimation";
import { type PostgresqlState } from "./postgresqlSlice";
import { getAdapter, TOPICS, type TopicKey } from "./postgresql-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1820;
const H = 680;

const TOPIC_PILLS: Record<TopicKey, { key: ConceptKey; label: string }[]> = {
  "indexing-strategies": [
    { key: "indexing-strategies", label: "Framework" },
    { key: "oltp", label: "OLTP" },
    { key: "wal", label: "WAL" },
    { key: "btree", label: "B-tree" },
    { key: "containment-operator", label: "@>" },
    { key: "gin", label: "GIN" },
    { key: "gist", label: "GiST" },
    { key: "brin", label: "BRIN" },
    { key: "hash", label: "Hash" },
    { key: "composite-indexes", label: "Composite" },
  ],
};

/* ── Topic questions (shown in sidebar) ──────────────── */
const TOPIC_QUESTIONS: Record<TopicKey, string> = {
  "indexing-strategies":
    "How do you decide which columns should be indexed, and how do you choose between B-tree, GIN, GiST, BRIN, or hash indexes for different query patterns?",
};

const PostgresqlVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = usePostgresqlAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as PostgresqlState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const activeTopic = TOPICS.find((t) => t.id === topic);
  const pills = TOPIC_PILLS[topic] ?? TOPIC_PILLS["indexing-strategies"];

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    adapter.buildTopology(b, st, { hot, phase });

    if (signals.length > 0) {
      b.overlay((o) => {
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

  /* ── Mount (once) / commit (updates) VizCraft scene ── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;

    if (!builderRef.current) {
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      scene.commit(containerRef.current);
      builderRef.current = scene;
      if (saved) {
        pzRef.current?.setZoom(saved.zoom);
        pzRef.current?.setPan(saved.pan);
      }
    }

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

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`postgresql-root postgresql-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="postgresql-stage">
            <StageHeader
              title="Postgresql"
              subtitle={`${activeTopic?.label ?? topic} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`postgresql-phase postgresql-phase--${phase}`}
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
            <SideCard label="Representative SQL" variant="info">
              <pre className="postgresql-code">{adapter.notes.exampleSql}</pre>
            </SideCard>
            {adapter.notes.exampleTable && (
              <SideCard label="Example Data" variant="info">
                <div className="postgresql-table-wrap">
                  <table className="postgresql-table">
                    <thead>
                      <tr>
                        {adapter.notes.exampleTable.header.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adapter.notes.exampleTable.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

export default PostgresqlVisualization;
