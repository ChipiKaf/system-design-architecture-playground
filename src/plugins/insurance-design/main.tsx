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
import {
  useInsuranceDesignAnimation,
  type Signal,
} from "./useInsuranceDesignAnimation";
import { type InsuranceDesignState } from "./insuranceDesignSlice";
import { getAdapter, TOPICS } from "./insurance-design-adapters";
import RateLimitPanel from "./RateLimitPanel";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const DEFAULT_W = 900;
const DEFAULT_H = 600;

/* ── Topic questions (shown in sidebar) ──────────────── */
const TOPIC_QUESTIONS: Record<string, string> = {
  "ai-system":
    "How would you design and implement an AI system for an insurance company — covering claims automation, risk scoring, and fraud detection?",
};

/* ── AI concept pills ────────────────────────────────── */
const AI_PILLS: { key: ConceptKey; label: string }[] = [
  { key: "ai-pipeline", label: "AI Pipeline" },
  { key: "bedrock", label: "Bedrock" },
  { key: "sagemaker", label: "SageMaker" },
  { key: "step-functions", label: "Step Functions" },
  { key: "claims-automation", label: "Claims" },
  { key: "risk-scoring", label: "Risk" },
  { key: "fraud-detection", label: "Fraud" },
  { key: "llm-platform", label: "LLM Platform" },
  { key: "langchain", label: "LangChain" },
  { key: "langfuse", label: "Langfuse" },
  { key: "openai-models", label: "Model Costs" },
  { key: "connection-id", label: "connectionId" },
  { key: "sqs-backpressure", label: "SQS Rate Limiting" },
];

const InsuranceDesignVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime, signals } = useInsuranceDesignAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as InsuranceDesignState;
  const { explanation, hotZones, phase, variant, topic } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);
  const activeTopic = TOPICS.find((t) => t.id === topic);

  const canvasW = adapter.canvasSize?.width ?? DEFAULT_W;
  const canvasH = adapter.canvasSize?.height ?? DEFAULT_H;

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(canvasW, canvasH);

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

  /* ── Mount / update scene (preserve pan-zoom) ────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;

    if (!builderRef.current) {
      /* First mount */
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    } else {
      /* Subsequent updates — commit in-place, keep viewport */
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

  /* ── Pill definitions (topic-aware) ────────────────── */
  const pillSource = AI_PILLS;
  const pills = pillSource.map((p) => ({
    key: p.key,
    label: p.label,
    color: "#93c5fd",
    borderColor: adapter.colors.stroke,
  }));

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className={`insurance-design-root insurance-design-phase--${phase}`}>
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="insurance-design-stage">
            <StageHeader
              title="Insurance — System Design"
              subtitle={`${activeTopic?.label ?? topic} → ${adapter.profile.label}`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={`insurance-design-phase insurance-design-phase--${phase}`}
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
            {variant === "ai-llm-platform" && (
              <SideCard label="Rate-Limit Calculator" variant="info">
                <RateLimitPanel />
              </SideCard>
            )}
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

export default InsuranceDesignVisualization;
