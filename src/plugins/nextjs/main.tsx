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
import { useNextjsAnimation, type Signal } from "./useNextjsAnimation";
import { type NextjsState } from "./nextjsSlice";
import { getAdapter, TOPICS } from "./nextjs-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

/* ── Topic questions (shown in sidebar) ──────────────── */
const TOPIC_QUESTIONS: Record<string, string> = {
  rendering:
    "Explain the difference between static, dynamic, and streaming rendering in Next.js. When would you choose each?",
  components:
    "How do React Server Components differ from Client Components? What determines the boundary?",
  routing:
    "How does file-based routing work in the App Router? What role do nested layouts play?",
  "data-flow":
    "Walk me through how data fetching and caching work in a Next.js Server Component.",
};

const NextjsVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } = useNextjsAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as NextjsState;
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
  const pills: {
    key: ConceptKey;
    label: string;
    color: string;
    borderColor: string;
  }[] = [
    {
      key: "nextjs-overview",
      label: "Next.js",
      color: "#93c5fd",
      borderColor: "#0070f3",
    },
    {
      key: "server-components",
      label: "Server Components",
      color: "#bfdbfe",
      borderColor: "#60a5fa",
    },
    {
      key: "client-components",
      label: "Client Components",
      color: "#fde68a",
      borderColor: "#fbbf24",
    },
    {
      key: "hydration",
      label: "Hydration",
      color: "#ddd6fe",
      borderColor: "#a78bfa",
    },
    {
      key: "streaming",
      label: "Streaming",
      color: "#a5f3fc",
      borderColor: "#22d3ee",
    },
    {
      key: "caching",
      label: "Caching",
      color: "#bbf7d0",
      borderColor: "#4ade80",
    },
    {
      key: "rsc-payload",
      label: "RSC Payload",
      color: "#bfdbfe",
      borderColor: "#60a5fa",
    },
    {
      key: "file-routing",
      label: "File Routing",
      color: "#bbf7d0",
      borderColor: "#4ade80",
    },
    {
      key: "layouts",
      label: "Layouts",
      color: "#ddd6fe",
      borderColor: "#a78bfa",
    },
  ];

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`nextjs-root nextjs-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="nextjs-stage">
            <StageHeader
              title="Next.js Internals"
              subtitle={`${activeTopic?.label ?? topic} — ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`nextjs-phase nextjs-phase--${phase}`}
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

export default NextjsVisualization;
