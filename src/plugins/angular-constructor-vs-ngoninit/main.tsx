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
import { useAngularConstructorVsNgoninitAnimation, type Signal } from "./useAngularConstructorVsNgoninitAnimation";
import { type AngularConstructorVsNgoninitState } from "./angularConstructorVsNgoninitSlice";
import { getAdapter } from "./angular-constructor-vs-ngoninit-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const AngularConstructorVsNgoninitVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } =
    useAngularConstructorVsNgoninitAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as AngularConstructorVsNgoninitState;
  const { explanation, hotZones, phase, variant } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // Delegate topology building to the adapter
    adapter.buildTopology(b, st, { hot, phase });

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
    { key: "overview", label: "AngularConstructorVsNgoninit", color: "#93c5fd", borderColor: "#3b82f6" },
  ];

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="angular-constructor-vs-ngoninit-root angular-constructor-vs-ngoninit-phase--${phase}">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="angular-constructor-vs-ngoninit-stage">
            <StageHeader
              title="AngularConstructorVsNgoninit"
              subtitle={`Comparing: ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`angular-constructor-vs-ngoninit-phase angular-constructor-vs-ngoninit-phase--${phase}`}
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

export default AngularConstructorVsNgoninitVisualization;
