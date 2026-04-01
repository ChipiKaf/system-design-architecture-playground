import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  setPhase,
  activateNode,
  completeNode,
  updateGraphData,
  mergeTaskResult,
  setTaskRunning,
  addNodePatch,
  type LanggraphState,
} from "./langgraphSlice";

export type AnimPhase = LanggraphState["phase"];
export type Signal = { id: string } & SignalOverlayParams;

export const useLanggraphAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const lgState = useSelector((state: RootState) => state.langgraph);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(timerRef.current);
  }, []);

  /** Animate a signal ball along a chain of hops. */
  const animateChain = useCallback(
    (
      hops: { from: string; to: string }[],
      msPerHop: number,
      onDone: () => void,
      opts?: { extra?: Signal[] },
    ) => {
      const extra = opts?.extra ?? [];
      const total = hops.length * msPerHop;
      const sigId = `chain-${hops[0]?.from}-${hops[hops.length - 1]?.to}`;
      const t0 = performance.now();

      const tick = (now: number) => {
        const raw = Math.min((now - t0) / total, 1);
        setSignals([
          ...extra,
          { id: sigId, chain: hops, progress: raw * hops.length, magnitude: 1 },
        ]);
        if (raw < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setSignals([...extra]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  /** Animate multiple signals in parallel (fan-out). */
  const animateParallel = useCallback(
    (
      pairs: { from: string; to: string }[],
      duration: number,
      onDone: () => void,
      opts?: { extra?: Signal[] },
    ) => {
      const extra = opts?.extra ?? [];
      const t0 = performance.now();

      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setSignals([
          ...extra,
          ...pairs.map((pair, i) => ({
            id: `par-${i}-${pair.to}`,
            from: pair.from,
            to: pair.to,
            progress: p,
            magnitude: 1,
          })),
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setSignals([...extra]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  /* ── Step-driven orchestration ─────────────────────────── */
  useEffect(() => {
    cleanup();

    // Step 0 — Overview: cold graph, no action
    if (currentStep === 0) {
      setAnimPhase("idle");
      setSignals([]);
      setTimeout(() => onCompleteRef.current?.(), 0);
      return cleanup;
    }

    // Step 1 — Classify Input: signal input → analyze, LLM runs
    if (currentStep === 1) {
      setAnimPhase("classifying");
      dispatch(activateNode("input"));

      animateChain([{ from: "input", to: "analyze" }], 700, () => {
        dispatch(completeNode("input"));
        dispatch(activateNode("analyze"));

        // Simulate LLM thinking
        timerRef.current = setTimeout(() => {
          dispatch(
            updateGraphData({
              classification: "complex",
            }),
          );
          dispatch(completeNode("analyze"));
          setAnimPhase("idle");
          onCompleteRef.current?.();
        }, 900);
      });
      return cleanup;
    }

    // Step 2 — Conditional Routing: analyze → router, picks complex path
    if (currentStep === 2) {
      setAnimPhase("routing");
      dispatch(activateNode("router"));

      animateChain([{ from: "analyze", to: "router" }], 500, () => {
        dispatch(updateGraphData({ route: "complex" }));

        // Brief pause to show the routing decision
        timerRef.current = setTimeout(() => {
          setAnimPhase("branching");
          dispatch(completeNode("router"));

          // Signal follows the chosen conditional edge
          animateChain([{ from: "router", to: "complex" }], 600, () => {
            dispatch(activateNode("complex"));

            // Complex processing LLM
            timerRef.current = setTimeout(() => {
              dispatch(
                updateGraphData({
                  analysis: "Needs auth (JWT), PostgreSQL, REST API, React UI",
                }),
              );
              dispatch(completeNode("complex"));
              setAnimPhase("idle");
              onCompleteRef.current?.();
            }, 800);
          });
        }, 500);
      });
      return cleanup;
    }

    // Step 3 — Plan Tasks: complex → planner, LLM generates task list
    if (currentStep === 3) {
      setAnimPhase("planning");
      dispatch(activateNode("planner"));

      animateChain([{ from: "complex", to: "planner" }], 600, () => {
        timerRef.current = setTimeout(() => {
          dispatch(
            updateGraphData({
              tasks: [
                { id: "schema", name: "DB Schema", status: "pending" },
                { id: "api", name: "REST API", status: "pending" },
                { id: "ui", name: "React UI", status: "pending" },
              ],
            }),
          );
          dispatch(completeNode("planner"));
          setAnimPhase("idle");
          onCompleteRef.current?.();
        }, 1000);
      });
      return cleanup;
    }

    // Step 4 — Parallel Fan-Out (Send): planner → 3 tasks concurrently
    if (currentStep === 4) {
      setAnimPhase("fanning-out");

      const taskNodes = ["task-0", "task-1", "task-2"];
      const taskIds = ["schema", "api", "ui"];
      const taskLabels = ["DB Schema", "REST API", "React UI"];
      const taskResults = [
        "Users, Posts, Comments tables with relations + indexes",
        "/auth, /posts, /comments endpoints with JWT middleware",
        "React Router + TanStack Query + Tailwind components",
      ];

      // Fan-out signals (3 parallel)
      animateParallel(
        taskNodes.map((t) => ({ from: "planner", to: t })),
        800,
        () => {
          setAnimPhase("executing");
          taskNodes.forEach((n) => dispatch(activateNode(n)));
          taskIds.forEach((id) => dispatch(setTaskRunning(id)));

          // Staggered task completion
          const finishTask = (idx: number) => {
            timerRef.current = setTimeout(
              () => {
                dispatch(
                  mergeTaskResult({
                    taskId: taskIds[idx],
                    result: taskResults[idx],
                  }),
                );
                dispatch(
                  addNodePatch({
                    nodeId: taskNodes[idx],
                    nodeLabel: taskLabels[idx],
                    patch: { [taskIds[idx]]: taskResults[idx] },
                    ts: Date.now(),
                  }),
                );
                dispatch(completeNode(taskNodes[idx]));

                if (idx < 2) {
                  finishTask(idx + 1);
                } else {
                  // All tasks done — merge step
                  timerRef.current = setTimeout(() => {
                    setAnimPhase("merging");

                    animateParallel(
                      taskNodes.map((t) => ({ from: t, to: "merge" })),
                      600,
                      () => {
                        dispatch(activateNode("merge"));
                        timerRef.current = setTimeout(() => {
                          dispatch(completeNode("merge"));
                          setAnimPhase("idle");
                          onCompleteRef.current?.();
                        }, 500);
                      },
                    );
                  }, 300);
                }
              },
              600 + idx * 500,
            );
          };
          finishTask(0);
        },
      );
      return cleanup;
    }

    // Step 5 — Interrupt & Resume: merge complete, interrupt fires, user approves
    if (currentStep === 5) {
      setAnimPhase("interrupted");
      dispatch(updateGraphData({ interrupted: true }));
      dispatch(activateNode("review"));

      // Wait for user to click "Approve & Resume" (next step button)
      // Just complete the animation so the button unlocks
      timerRef.current = setTimeout(() => {
        onCompleteRef.current?.();
      }, 800);
      return cleanup;
    }

    // Step 6 — Summary: resume and finish
    if (currentStep === 6) {
      setAnimPhase("resuming");
      dispatch(updateGraphData({ interrupted: false, approved: true }));
      dispatch(completeNode("review"));

      animateChain([{ from: "review", to: "end" }], 600, () => {
        dispatch(activateNode("end"));
        timerRef.current = setTimeout(() => {
          dispatch(completeNode("end"));
          setAnimPhase("complete");
          onCompleteRef.current?.();
        }, 400);
      });
      return cleanup;
    }

    return cleanup;
  }, [currentStep, dispatch, cleanup, animateChain, animateParallel]);

  return {
    lgState,
    currentStep,
    animPhase,
    signals,
  };
};
