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
import { useAiEvolutionAnimation } from "./useAiEvolutionAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1200;
const H = 740;

/* ── Colour palette ────────────────────────────────────── */
const C = {
  bg: "#0f172a",
  dim: "#334155",
  dimEdge: "#1e293b",
  muted: "#64748b",
  text: "#94a3b8",
  blue: "#60a5fa",
  blueFill: "#1e3a5f",
  violet: "#a78bfa",
  violetFill: "#2e1065",
  purple: "#c084fc",
  purpleFill: "#3b0764",
  fuchsia: "#e879f9",
  fuchsiaFill: "#701a75",
  green: "#34d399",
  greenFill: "#064e3b",
  amber: "#fbbf24",
};

const AiEvolutionVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, phase } =
    useAiEvolutionAnimation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { explanation, hotZones, showGenAi, showTraditional } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    /* ── Traditional ML pipeline (left column) ────────── */
    if (showTraditional) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 40,
            y: 60,
            w: 320,
            h: 560,
            rx: 16,
            ry: 16,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("trad-data") ||
              hot("trad-features") ||
              hot("trad-model") ||
              hot("trad-eval")
                ? "rgba(96, 165, 250, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "trad-bg" },
        );
        o.add(
          "text",
          {
            x: 200,
            y: 52,
            text: "TRADITIONAL ML",
            fill: C.blue,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "trad-lbl" },
        );
      });

      b.node("trad-data")
        .at(200, 140)
        .rect(220, 50, 10)
        .fill(hot("trad-data") ? C.blueFill : C.bg)
        .stroke(hot("trad-data") ? C.blue : C.dim, hot("trad-data") ? 2 : 1)
        .label("Raw Data", {
          fill: hot("trad-data") ? "#93c5fd" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("trad-features")
        .at(200, 260)
        .rect(220, 50, 10)
        .fill(hot("trad-features") ? C.blueFill : C.bg)
        .stroke(
          hot("trad-features") ? C.blue : C.dim,
          hot("trad-features") ? 2 : 1,
        )
        .label("Feature Engineering", {
          fill: hot("trad-features") ? "#93c5fd" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("trad-model")
        .at(200, 380)
        .rect(220, 50, 10)
        .fill(hot("trad-model") ? C.blueFill : C.bg)
        .stroke(hot("trad-model") ? C.blue : C.dim, hot("trad-model") ? 2 : 1)
        .label("Model Training", {
          fill: hot("trad-model") ? "#93c5fd" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("trad-eval")
        .at(200, 500)
        .rect(220, 50, 10)
        .fill(hot("trad-eval") ? C.blueFill : C.bg)
        .stroke(hot("trad-eval") ? C.blue : C.dim, hot("trad-eval") ? 2 : 1)
        .label("Evaluation & Deploy", {
          fill: hot("trad-eval") ? "#93c5fd" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      // Traditional edges
      b.edge("trad-data", "trad-features", "e-t1")
        .stroke(
          hot("trad-data") || hot("trad-features") ? C.blue : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("trad-features", "trad-model", "e-t2")
        .stroke(
          hot("trad-features") || hot("trad-model") ? C.blue : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("trad-model", "trad-eval", "e-t3")
        .stroke(hot("trad-model") || hot("trad-eval") ? C.blue : C.dimEdge, 1.5)
        .arrow(true);

      // Subtitles
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 200,
            y: 175,
            text: "(cleaning & data prep for analysis)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "trad-sub-1" },
        );
        o.add(
          "text",
          {
            x: 200,
            y: 295,
            text: "(hand-crafted features, domain expertise)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "trad-sub-2" },
        );
        o.add(
          "text",
          {
            x: 200,
            y: 415,
            text: "(logistic regression, random forest, SVM)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "trad-sub-3" },
        );
        o.add(
          "text",
          {
            x: 200,
            y: 535,
            text: "(accuracy metrics, A/B testing, serving)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "trad-sub-4" },
        );
      });
    }

    /* ── Arrow between columns ────────────────────────── */
    if (showTraditional && showGenAi) {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 490,
            y: 330,
            text: "→",
            fill: C.amber,
            fontSize: 36,
            fontWeight: "bold",
          },
          { key: "arrow-evolve" },
        );
        o.add(
          "text",
          {
            x: 490,
            y: 365,
            text: "evolution",
            fill: C.amber,
            fontSize: 10,
          },
          { key: "arrow-lbl" },
        );
      });
    }

    /* ── Generative AI pipeline (right column) ────────── */
    if (showGenAi) {
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: 540,
            y: 60,
            w: 620,
            h: 610,
            rx: 16,
            ry: 16,
            fill: "rgba(15, 23, 42, 0.5)",
            stroke:
              hot("gen-preproc") ||
              hot("gen-prompt") ||
              hot("gen-llm") ||
              hot("gen-deploy")
                ? "rgba(192, 132, 252, 0.35)"
                : "rgba(51, 65, 85, 0.4)",
            strokeWidth: 1.5,
            opacity: 1,
          },
          { key: "gen-bg" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 52,
            text: "GENERATIVE AI",
            fill: C.purple,
            fontSize: 11,
            fontWeight: "bold",
          },
          { key: "gen-lbl" },
        );
      });

      b.node("gen-preproc")
        .at(660, 140)
        .rect(200, 60, 10)
        .fill(hot("gen-preproc") ? C.violetFill : C.bg)
        .stroke(
          hot("gen-preproc") ? C.violet : C.dim,
          hot("gen-preproc") ? 2.5 : 1,
        )
        .label("Data Pre-processing", {
          fill: hot("gen-preproc") ? "#c4b5fd" : C.text,
          fontSize: 12,
          fontWeight: "bold",
        });

      b.node("gen-prompt")
        .at(850, 280)
        .rect(220, 70, 10)
        .fill(hot("gen-prompt") ? C.purpleFill : C.bg)
        .stroke(
          hot("gen-prompt") ? C.purple : C.dim,
          hot("gen-prompt") ? 2.5 : 1,
        )
        .label("Prompt Engineering /", {
          fill: hot("gen-prompt") ? "#d8b4fe" : C.text,
          fontSize: 12,
          fontWeight: "bold",
          dy: -8,
        });

      b.node("gen-llm")
        .at(1040, 420)
        .rect(220, 70, 10)
        .fill(hot("gen-llm") ? C.fuchsiaFill : C.bg)
        .stroke(hot("gen-llm") ? C.fuchsia : C.dim, hot("gen-llm") ? 2.5 : 1)
        .label("Foundation / Fine-tuned", {
          fill: hot("gen-llm") ? "#f0abfc" : C.text,
          fontSize: 12,
          fontWeight: "bold",
          dy: -8,
        });

      b.node("gen-deploy")
        .at(850, 548)
        .rect(220, 60, 10)
        .fill(hot("gen-deploy") ? C.greenFill : C.bg)
        .stroke(
          hot("gen-deploy") ? C.green : C.dim,
          hot("gen-deploy") ? 2.5 : 1,
        )
        .label("Deployment &", {
          fill: hot("gen-deploy") ? "#6ee7b7" : C.text,
          fontSize: 12,
          fontWeight: "bold",
          dy: -6,
        });

      // Vector Database node
      b.node("vec-db")
        .at(620, 450)
        .rect(160, 50, 8)
        .fill(hot("vec-db") ? "#1e1b4b" : C.bg)
        .stroke(hot("vec-db") ? "#818cf8" : C.dim, hot("vec-db") ? 2 : 1)
        .label("Vector Database", {
          fill: hot("vec-db") ? "#a5b4fc" : C.text,
          fontSize: 11,
          fontWeight: "bold",
        });

      // Gen AI edges (staircase pattern like the diagram)
      b.edge("gen-preproc", "gen-prompt", "e-g1")
        .stroke(
          hot("gen-preproc") || hot("gen-prompt") ? C.violet : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("gen-prompt", "gen-llm", "e-g2")
        .stroke(hot("gen-prompt") || hot("gen-llm") ? C.purple : C.dimEdge, 1.5)
        .arrow(true);
      b.edge("gen-llm", "gen-deploy", "e-g3")
        .stroke(
          hot("gen-llm") || hot("gen-deploy") ? C.fuchsia : C.dimEdge,
          1.5,
        )
        .arrow(true);
      b.edge("vec-db", "gen-llm", "e-vec")
        .stroke(hot("vec-db") || hot("gen-llm") ? "#818cf8" : C.dimEdge, 1.2)
        .arrow(true)
        .dashed();

      // Subtitles & Tech Stack Labels
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: 660,
            y: 182,
            text: "(cleaning and data prep for analysis)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-1" },
        );
        o.add(
          "text",
          {
            x: 660,
            y: 198,
            text: "Spark · dbt · Great Expectations · Airflow",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "gen-tools-1" },
        );

        o.add(
          "text",
          {
            x: 850,
            y: 300,
            text: "Fine-tuning",
            fill: hot("gen-prompt") ? "#d8b4fe" : C.text,
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "gen-prompt-2" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 324,
            text: "(focuses on prompt engineering)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-2" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 340,
            text: "LangChain · LlamaIndex · DSPy · Hugging Face",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "gen-tools-2" },
        );

        o.add(
          "text",
          {
            x: 1040,
            y: 440,
            text: "LLMs",
            fill: hot("gen-llm") ? "#f0abfc" : C.text,
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "gen-llm-2" },
        );
        o.add(
          "text",
          {
            x: 1040,
            y: 462,
            text: "(training models on data &",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-3a" },
        );
        o.add(
          "text",
          {
            x: 1040,
            y: 474,
            text: "adjusting params for optimal perf)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-3b" },
        );
        o.add(
          "text",
          {
            x: 1040,
            y: 490,
            text: "OpenAI GPT-4 · Claude · Llama · Gemini · Mistral",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "gen-tools-3" },
        );

        o.add(
          "text",
          {
            x: 850,
            y: 568,
            text: "Monitoring",
            fill: hot("gen-deploy") ? "#6ee7b7" : C.text,
            fontSize: 12,
            fontWeight: "bold",
          },
          { key: "gen-deploy-2" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 590,
            text: "(implementing models in real-world apps",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-4a" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 602,
            text: "& monitoring their performance)",
            fill: C.muted,
            fontSize: 9,
          },
          { key: "gen-sub-4b" },
        );
        o.add(
          "text",
          {
            x: 850,
            y: 618,
            text: "PromptLayer · Helicone · W&B · vLLM · TensorRT",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "gen-tools-4" },
        );

        // Vector DB tools label
        o.add(
          "text",
          {
            x: 620,
            y: 486,
            text: "Pinecone · Weaviate · Chroma",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "vec-tools-1" },
        );
        o.add(
          "text",
          {
            x: 620,
            y: 498,
            text: "Qdrant · pgvector · Milvus",
            fill: C.amber,
            fontSize: 8,
            opacity: 0.85,
          },
          { key: "vec-tools-2" },
        );
      });
    }

    /* ── Signals ────────────────────────────────────────── */
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
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

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    {
      key: "traditional-ml",
      label: "Traditional ML",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    {
      key: "data-preprocessing",
      label: "Data Pre-processing",
      color: "#c4b5fd",
      borderColor: "#8b5cf6",
    },
    {
      key: "prompt-engineering",
      label: "Prompt Engineering",
      color: "#d8b4fe",
      borderColor: "#a855f7",
    },
    {
      key: "foundation-models",
      label: "Foundation Models",
      color: "#f0abfc",
      borderColor: "#d946ef",
    },
    {
      key: "fine-tuning",
      label: "Fine-tuning",
      color: "#fca5a5",
      borderColor: "#ef4444",
    },
    {
      key: "deployment",
      label: "Deployment",
      color: "#86efac",
      borderColor: "#10b981",
    },
  ];

  const subtitles: Record<string, string> = {
    overview: "Traditional ML to Generative AI",
    "traditional-ml": "Feature engineering → model training → evaluation",
    "data-preproc": "Cleaning, tokenizing, and preparing training data",
    "prompt-eng": "Steering models via prompts & fine-tuning",
    "foundation-llm": "Pre-trained on trillions of tokens",
    "deploy-monitor": "Serving, guardrails, and continuous evaluation",
    comparison: "When to use traditional ML vs Generative AI",
    summary: "Same workflow, different tools",
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="ai-evolution-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="ai-evolution-stage">
            <StageHeader
              title="AI Architecture Evolution"
              subtitle={subtitles[phase] ?? ""}
            >
              <StatBadge
                label="Phase"
                value={phase.replace(/-/g, " ")}
                className={`ai-evolution-phase ai-evolution-phase--${phase}`}
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default AiEvolutionVisualization;
