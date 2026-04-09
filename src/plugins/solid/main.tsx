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
import { useSolidAnimation, type Signal } from "./useSolidAnimation";
import { type SolidState } from "./solidSlice";
import { getAdapter } from "./solid-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 700;
const H = 520;

const SolidVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useSolidAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as SolidState;
  const { explanation, hotZones, phase, variant } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);

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
      key: "solid-overview" as ConceptKey,
      label: "SOLID",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "srp" as ConceptKey,
      label: "SRP",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "ocp" as ConceptKey,
      label: "OCP",
      color: "#6ee7b7",
      borderColor: "#22c55e",
    },
    {
      key: "lsp" as ConceptKey,
      label: "LSP",
      color: "#c4b5fd",
      borderColor: "#a78bfa",
    },
    {
      key: "isp" as ConceptKey,
      label: "ISP",
      color: "#fde68a",
      borderColor: "#eab308",
    },
    {
      key: "dip" as ConceptKey,
      label: "DIP",
      color: "#fda4af",
      borderColor: "#f43f5e",
    },
  ];

  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`solid-root solid-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="solid-stage">
            <StageHeader
              title="SOLID Principles"
              subtitle={`${adapter.profile.acronym} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`solid-phase solid-phase--${phase}`}
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
            <SideCard label="Active Principle" variant="info">
              <p style={{ color: adapter.colors.stroke, fontWeight: 600 }}>
                {adapter.profile.acronym} — {adapter.profile.label}
              </p>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                {adapter.profile.description}
              </p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default SolidVisualization;
