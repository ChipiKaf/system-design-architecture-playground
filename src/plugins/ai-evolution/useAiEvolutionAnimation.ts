import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./aiEvolutionSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useAiEvolutionAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.aiEvolution);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [animPhase, setAnimPhase] = useState<string>("idle");
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const finish = useCallback(() => onCompleteRef.current?.(), []);

  const animateChain = useCallback(
    (
      hops: { from: string; to: string; color?: string }[],
      msPerHop: number,
      onDone: () => void,
    ) => {
      const settled: Signal[] = [];
      let hopIdx = 0;
      const startNext = () => {
        if (hopIdx >= hops.length) {
          setSignals([...settled]);
          onDone();
          return;
        }
        const hop = hops[hopIdx];
        const sigId = `chain-${hopIdx}-${Date.now()}`;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / msPerHop, 1);
          setSignals([
            ...settled,
            {
              id: sigId,
              from: hop.from,
              to: hop.to,
              progress: p,
              color: hop.color ?? "#a78bfa",
              magnitude: 1.2,
            },
          ]);
          if (p < 1) rafRef.current = requestAnimationFrame(step);
          else {
            settled.push({
              id: sigId,
              from: hop.from,
              to: hop.to,
              progress: 1,
              color: hop.color ?? "#a78bfa",
              magnitude: 1.2,
            });
            hopIdx++;
            startNext();
          }
        };
        rafRef.current = requestAnimationFrame(step);
      };
      startNext();
    },
    [],
  );

  /* ── Step orchestration ─────────────────────────────── */
  useEffect(() => {
    cleanup();

    const run = async () => {
      switch (currentStep) {
        /* ─── Step 0: Overview ─────────────────────── */
        case 0:
          dispatch(reset());
          setAnimPhase("idle");
          await sleep(0);
          finish();
          break;

        /* ─── Step 1: Traditional ML Pipeline ──────── */
        case 1:
          dispatch(
            patchState({
              phase: "traditional-ml",
              explanation:
                "Traditional ML: Raw data → hand-engineered features → model training (logistic regression, random forest, SVM) → evaluation → deployment. Each step requires deep domain expertise and custom feature extraction code.",
              hotZones: [
                "trad-data",
                "trad-features",
                "trad-model",
                "trad-eval",
              ],
              showTraditional: true,
              showGenAi: false,
            }),
          );
          setAnimPhase("highlight");
          animateChain(
            [
              { from: "trad-data", to: "trad-features", color: "#60a5fa" },
              { from: "trad-features", to: "trad-model", color: "#60a5fa" },
              { from: "trad-model", to: "trad-eval", color: "#60a5fa" },
            ],
            500,
            () => finish(),
          );
          break;

        /* ─── Step 2: Data Pre-processing ──────────── */
        case 2:
          dispatch(
            patchState({
              phase: "data-preproc",
              explanation:
                "Data Pre-processing: Cleaning, normalizing, tokenizing, and preparing data for analysis. In the Gen AI world, this includes building high-quality training corpora, filtering toxic content, and deduplication at internet scale.",
              hotZones: ["gen-preproc"],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("highlight");
          await sleep(1000);
          finish();
          break;

        /* ─── Step 3: Prompt Engineering ───────────── */
        case 3:
          dispatch(
            patchState({
              phase: "prompt-eng",
              explanation:
                "Prompt Engineering & Fine-tuning: Instead of writing feature extraction code, you craft prompts that steer foundation models. Fine-tuning adapts a pre-trained model to your domain with a small labeled dataset (LoRA, QLoRA, RLHF).",
              hotZones: ["gen-prompt"],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("highlight");
          await sleep(1000);
          finish();
          break;

        /* ─── Step 4: Foundation / Fine-tuned LLMs ─── */
        case 4:
          dispatch(
            patchState({
              phase: "foundation-llm",
              explanation:
                "Foundation/Fine-tuned LLMs: Pre-trained on trillions of tokens (GPT-4, Claude, Llama, Gemini, Mistral). Vector databases (Pinecone, Weaviate, Chroma) enable RAG — retrieving relevant context at query time to ground the model's responses.",
              hotZones: ["gen-llm", "vec-db"],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("highlight");
          animateChain(
            [
              { from: "gen-preproc", to: "gen-prompt", color: "#c084fc" },
              { from: "gen-prompt", to: "gen-llm", color: "#e879f9" },
            ],
            600,
            () => finish(),
          );
          break;

        /* ─── Step 5: Deployment & Monitoring ──────── */
        case 5:
          dispatch(
            patchState({
              phase: "deploy-monitor",
              explanation:
                "Deployment & Monitoring: Serving models via APIs, managing GPU infrastructure, monitoring latency/cost/hallucinations, implementing guardrails, A/B testing prompts, and continuous evaluation against benchmarks.",
              hotZones: ["gen-deploy"],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("highlight");
          animateChain(
            [{ from: "gen-llm", to: "gen-deploy", color: "#34d399" }],
            600,
            () => finish(),
          );
          break;

        /* ─── Step 6: Traditional vs Generative ────── */
        case 6:
          dispatch(
            patchState({
              phase: "comparison",
              explanation:
                "Traditional ML excels at structured data with well-defined features (fraud detection, recommendation). Gen AI dominates unstructured tasks (text generation, code, reasoning). Most production systems use both — Gen AI for understanding, ML for scoring.",
              hotZones: [],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("compare");
          await sleep(1200);
          finish();
          break;

        /* ─── Step 7: Summary ──────────────────────── */
        case 7:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "The evolution: Feature engineering → prompt engineering. Custom models → foundation models. Manual evaluation → automated benchmarks & guardrails. The stack changed, but the core workflow (data → model → deploy → monitor) remains the same.",
              hotZones: [],
              showTraditional: true,
              showGenAi: true,
            }),
          );
          setAnimPhase("idle");
          await sleep(0);
          finish();
          break;

        default:
          finish();
      }
    };

    run();
    return cleanup;
  }, [currentStep]);

  return {
    runtime,
    currentStep,
    signals,
    animPhase,
    phase: runtime.phase,
  };
};
