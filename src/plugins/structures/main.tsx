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
import { useStructuresAnimation, type Signal } from "./useStructuresAnimation";
import type { VariantKey, StructuresState } from "./structuresSlice";
import { getAdapter, TOPICS, type TopicKey } from "./structures-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1400;
const H = 680;

const VARIANT_PILLS: Record<VariantKey, { key: ConceptKey; label: string }[]> =
  {
    "btree-struct": [
      { key: "btree-overview", label: "B-tree" },
      { key: "pages", label: "Pages" },
      { key: "tids", label: "TIDs" },
      { key: "page-splits", label: "Splits" },
      { key: "internal-nodes", label: "Internal Nodes" },
      { key: "fill-factor", label: "Fill Factor" },
      { key: "balance", label: "Balance" },
    ],
    "gin-struct": [
      { key: "gin-overview", label: "GIN" },
      { key: "posting-lists", label: "Posting Lists" },
      { key: "containment-op", label: "Operators" },
      { key: "fastupdate", label: "Fastupdate" },
      { key: "gin-vs-btree", label: "GIN vs B-tree" },
    ],
    "gist-struct": [
      { key: "gist-overview", label: "GiST" },
      { key: "mbr", label: "MBR" },
      { key: "penalty-fn", label: "Penalty & Split" },
      { key: "knn", label: "KNN" },
      { key: "gist-vs-btree-gin", label: "GiST vs Others" },
    ],
  };

/* ── Topic questions (shown in sidebar) ──────────────── */
const VARIANT_QUESTIONS: Record<VariantKey, string> = {
  "btree-struct":
    "Explain how a B-tree index grows from an empty root as rows are inserted. What happens when a page is full, how does the tree deepen, and why does every leaf stay at the same depth?",
  "gin-struct":
    "Explain how a GIN inverted index works. How does inserting a row with multiple values create multiple index entries? How do posting lists grow, and how does PostgreSQL use them to answer containment queries?",
  "gist-struct":
    "Explain how a GiST spatial index works. How do bounding boxes nest and overlap? How does the penalty function choose where to insert? How does GiST answer overlap (&&) and KNN (ORDER BY <->) queries?",
};

const StructuresVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useStructuresAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as StructuresState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const activeTopic = TOPICS.find((t) => t.id === topic);
  const pills = VARIANT_PILLS[variant] ?? VARIANT_PILLS["btree-struct"];

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
  const tableData = adapter.getTableData(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`structures-root structures-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="structures-stage">
            <StageHeader
              title="Structures"
              subtitle={`${activeTopic?.label ?? topic} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`structures-phase structures-phase--${phase}`}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            {VARIANT_QUESTIONS[variant] && (
              <SideCard label="Interview Question" variant="info">
                <p style={{ fontStyle: "italic", color: "#94a3b8" }}>
                  {VARIANT_QUESTIONS[variant]}
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
            <SideCard label="Key Rule" variant="info">
              <p
                style={{
                  color: "#fbbf24",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                {adapter.notes.keyRule}
              </p>
            </SideCard>
            {tableData && (
              <SideCard label="Heap Table" variant="info">
                <table className="structures-heap-table">
                  <thead>
                    <tr>
                      {tableData.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row, i) => (
                      <tr
                        key={i}
                        className={
                          row.isHighlight
                            ? "structures-heap-row--highlight"
                            : row.isNew
                              ? "structures-heap-row--new"
                              : ""
                        }
                      >
                        {row.cells.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SideCard>
            )}
            <SideCard label="Summary" variant="info">
              <p style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                {adapter.notes.summary}
              </p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default StructuresVisualization;
