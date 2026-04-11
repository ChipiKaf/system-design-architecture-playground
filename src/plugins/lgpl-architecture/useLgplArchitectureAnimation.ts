import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./lgplArchitectureSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useLgplArchitectureAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.lgplArchitecture);
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

  /* ── Step orchestration ─────────────────────────────────── */
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

        /* ─── Step 1: Layers ──────────────────────── */
        case 1:
          dispatch(
            patchState({
              phase: "layers",
              explanation:
                "Layers organise a system into horizontal tiers of responsibility. Each layer communicates only with adjacent layers — presentation calls business logic, business logic calls data access, never skipping a tier.",
              hotZones: [
                "layer-presentation",
                "layer-business",
                "layer-data",
                "layer-db",
              ],
              showLayers: true,
              showGates: false,
              showPipes: false,
              showLoops: false,
            }),
          );
          setAnimPhase("highlight");
          animateChain(
            [
              {
                from: "layer-presentation",
                to: "layer-business",
                color: "#60a5fa",
              },
              { from: "layer-business", to: "layer-data", color: "#60a5fa" },
              { from: "layer-data", to: "layer-db", color: "#60a5fa" },
            ],
            500,
            () => finish(),
          );
          break;

        /* ─── Step 2: Layer Detail ────────────────── */
        case 2:
          dispatch(
            patchState({
              phase: "layer-detail",
              explanation:
                "Each layer encapsulates a concern: the Presentation layer handles UI/API, Business Logic enforces rules and workflows, Data Access abstracts storage operations, and the Database layer manages persistence. This separation enables independent testing and swapping of implementations.",
              hotZones: [
                "layer-presentation",
                "layer-business",
                "layer-data",
                "layer-db",
              ],
              showLayers: true,
            }),
          );
          setAnimPhase("highlight");
          await sleep(800);
          finish();
          break;

        /* ─── Step 3: Gates ──────────────────────── */
        case 3:
          dispatch(
            patchState({
              phase: "gates",
              explanation:
                "Gates are conditional checkpoints that filter, validate, or route data between layers. Think authentication middleware, validation guards, rate limiters, and circuit breakers — they decide whether data passes through or gets rejected.",
              hotZones: ["gate-auth", "gate-validate", "gate-rate"],
              showLayers: true,
              showGates: true,
              showPipes: false,
              showLoops: false,
            }),
          );
          setAnimPhase("highlight");
          await sleep(800);
          finish();
          break;

        /* ─── Step 4: Gate Routing ───────────────── */
        case 4:
          dispatch(
            patchState({
              phase: "gate-routing",
              explanation:
                "A request hits the Auth Gate first — only authenticated requests pass. Next, the Validation Gate checks data shape and constraints. If both pass, the request proceeds to business logic. Rejection at any gate short-circuits processing and returns an error response.",
              hotZones: ["gate-auth", "gate-validate"],
              showLayers: true,
              showGates: true,
            }),
          );
          setAnimPhase("routing");
          animateChain(
            [
              { from: "layer-presentation", to: "gate-auth", color: "#fbbf24" },
              { from: "gate-auth", to: "gate-validate", color: "#fbbf24" },
              { from: "gate-validate", to: "layer-business", color: "#34d399" },
            ],
            600,
            () => finish(),
          );
          break;

        /* ─── Step 5: Pipes ──────────────────────── */
        case 5:
          dispatch(
            patchState({
              phase: "pipes",
              explanation:
                "Pipes are data transformation channels connecting components. Each pipe takes an input, transforms it, and passes the output to the next stage — like Unix pipes. Serialisation, mapping, enrichment, and compression are common pipe operations.",
              hotZones: ["pipe-serialize", "pipe-transform", "pipe-enrich"],
              showLayers: true,
              showGates: true,
              showPipes: true,
              showLoops: false,
            }),
          );
          setAnimPhase("highlight");
          await sleep(800);
          finish();
          break;

        /* ─── Step 6: Pipe Transforms ────────────── */
        case 6:
          dispatch(
            patchState({
              phase: "pipe-transform",
              explanation:
                "Data flows through the pipe chain: Serialize (DTO → JSON) → Transform (map fields, apply business rules) → Enrich (add metadata, timestamps, tracing IDs). Each pipe is single-responsibility and independently testable.",
              hotZones: ["pipe-serialize", "pipe-transform", "pipe-enrich"],
              showLayers: true,
              showGates: true,
              showPipes: true,
            }),
          );
          setAnimPhase("transform");
          animateChain(
            [
              {
                from: "layer-business",
                to: "pipe-serialize",
                color: "#c084fc",
              },
              {
                from: "pipe-serialize",
                to: "pipe-transform",
                color: "#c084fc",
              },
              { from: "pipe-transform", to: "pipe-enrich", color: "#c084fc" },
              { from: "pipe-enrich", to: "layer-data", color: "#c084fc" },
            ],
            500,
            () => finish(),
          );
          break;

        /* ─── Step 7: Loops ──────────────────────── */
        case 7:
          dispatch(
            patchState({
              phase: "loops",
              explanation:
                "Loops introduce feedback cycles into the architecture. Retry loops handle transient failures, polling loops check for state changes, event loops process async messages, and reconciliation loops ensure eventual consistency.",
              hotZones: ["loop-retry", "loop-event"],
              showLayers: true,
              showGates: true,
              showPipes: true,
              showLoops: true,
            }),
          );
          setAnimPhase("highlight");
          await sleep(800);
          finish();
          break;

        /* ─── Step 8: Loop Feedback ─────────────── */
        case 8:
          dispatch(
            patchState({
              phase: "loop-feedback",
              explanation:
                "The Retry Loop catches failures from the Data layer and re-attempts with exponential backoff. The Event Loop continuously processes incoming messages from a queue, dispatching each to the appropriate handler in the Business layer.",
              hotZones: ["loop-retry", "loop-event"],
              showLayers: true,
              showGates: true,
              showPipes: true,
              showLoops: true,
            }),
          );
          setAnimPhase("feedback");
          animateChain(
            [
              { from: "layer-data", to: "loop-retry", color: "#f87171" },
              { from: "loop-retry", to: "layer-data", color: "#f87171" },
            ],
            600,
            () => finish(),
          );
          break;

        /* ─── Step 9: Full Flow ─────────────────── */
        case 9:
          dispatch(
            patchState({
              phase: "full-flow",
              explanation:
                "The complete LGPL flow: a request enters the Presentation Layer → passes through Gates (auth, validation) → Business Logic processes it → Pipes transform data (serialize, map, enrich) → Data Layer persists → Loops handle retries and async events. All four primitives work together.",
              hotZones: [
                "layer-presentation",
                "gate-auth",
                "layer-business",
                "pipe-serialize",
                "layer-data",
                "loop-retry",
              ],
              showLayers: true,
              showGates: true,
              showPipes: true,
              showLoops: true,
            }),
          );
          setAnimPhase("full");
          animateChain(
            [
              { from: "layer-presentation", to: "gate-auth", color: "#fbbf24" },
              { from: "gate-auth", to: "gate-validate", color: "#fbbf24" },
              { from: "gate-validate", to: "layer-business", color: "#34d399" },
              {
                from: "layer-business",
                to: "pipe-serialize",
                color: "#c084fc",
              },
              {
                from: "pipe-serialize",
                to: "pipe-transform",
                color: "#c084fc",
              },
              { from: "pipe-transform", to: "pipe-enrich", color: "#c084fc" },
              { from: "pipe-enrich", to: "layer-data", color: "#60a5fa" },
              { from: "layer-data", to: "layer-db", color: "#60a5fa" },
            ],
            450,
            () => finish(),
          );
          break;

        /* ─── Step 10: Summary ─────────────────── */
        case 10:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "LGPL architecture composes four primitives: Layers (horizontal separation of concerns), Gates (conditional routing and validation), Pipes (data transformation chains), and Loops (feedback and retry cycles). Together they create modular, testable, resilient systems.",
              hotZones: [],
              showLayers: true,
              showGates: true,
              showPipes: true,
              showLoops: true,
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
