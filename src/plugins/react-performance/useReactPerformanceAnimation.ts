import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./reactPerformanceSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useReactPerformanceAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.reactPerformance);
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(undefined!);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const persistedRef = useRef<Signal[]>([]);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    persistedRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => resolve(), ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const finish = useCallback(() => {
    onCompleteRef.current?.();
  }, []);

  /* ── Signal helpers ──────────────────────────────────── */
  const animateSignal = useCallback(
    (
      from: string,
      to: string,
      duration: number,
      color: string,
      onDone: () => void,
    ) => {
      const sigId = `sig-${from}-${to}-${Date.now()}`;
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persistedRef.current,
          { id: sigId, from, to, progress: p, color, magnitude: 1 },
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const resting: Signal = {
            id: sigId,
            from,
            to,
            progress: 1,
            color,
            magnitude: 1,
          };
          persistedRef.current.push(resting);
          setSignals([...persistedRef.current]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  const animateParallel = useCallback(
    (
      pairs: { from: string; to: string; color: string }[],
      duration: number,
      onDone: () => void,
    ) => {
      const start = performance.now();
      const sigs = pairs.map((p, i) => ({
        id: `par-${i}-${Date.now()}`,
        from: p.from,
        to: p.to,
        color: p.color,
        progress: 0,
        magnitude: 1,
      }));
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persistedRef.current,
          ...sigs.map((s) => ({ ...s, progress: p })),
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const resting = sigs.map((s) => ({ ...s, progress: 1 }));
          persistedRef.current.push(...resting);
          setSignals([...persistedRef.current]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  /* ── Step orchestration ─────────────────────────────── */
  useEffect(() => {
    cleanup();

    const run = async () => {
      switch (currentStep) {
        /* ── 0 · Overview ────────────────────────────── */
        case 0:
          dispatch(reset());
          await sleep(80);
          finish();
          break;

        /* ── 1 · The Render Cycle ────────────────────── */
        case 1:
          dispatch(
            patchState({
              phase: "render-cycle",
              explanation:
                "When state changes, React runs your component function again (render), compares the new output to the old one (diff), and paints only what changed to the real DOM (commit). Think of it as an assembly line: trigger → render → diff → commit.",
              hotZones: ["app", "parent", "vdom", "dom"],
              showRenderWave: true,
            }),
          );
          await sleep(500);
          animateSignal("app", "parent", 600, "#60a5fa", async () => {
            animateSignal("parent", "vdom", 600, "#60a5fa", async () => {
              animateSignal("vdom", "dom", 600, "#60a5fa", async () => {
                await sleep(80);
                finish();
              });
            });
          });
          break;

        /* ── 2 · Wasted Re-renders ───────────────────── */
        case 2:
          dispatch(
            patchState({
              phase: "wasted-renders",
              explanation:
                "By default, when a parent re-renders, ALL its children re-render too — even if their props didn't change. It's like reprinting every page of a book because you fixed one typo. This is the #1 performance killer in React apps.",
              hotZones: ["parent", "child-a", "child-b"],
              showRenderWave: false,
              showWastedRender: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "parent", to: "child-a", color: "#f87171" },
              { from: "parent", to: "child-b", color: "#f87171" },
            ],
            800,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 3 · React.memo Shield ───────────────────── */
        case 3:
          dispatch(
            patchState({
              phase: "memo-shield",
              explanation:
                "Wrap a component in React.memo() and it won't re-render if its props are the same. Parent updates → memo checks props → same? → SKIP. Like putting a bouncer at the door: \"Your invite hasn't changed, you don't need to come in again.\"",
              hotZones: ["parent", "child-b"],
              showWastedRender: false,
              showMemoShield: true,
            }),
          );
          await sleep(500);
          animateSignal("parent", "child-a", 700, "#f87171", async () => {
            await sleep(200);
            animateSignal("parent", "child-b", 400, "#86efac", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* ── 4 · useMemo & useCallback ───────────────── */
        case 4:
          dispatch(
            patchState({
              phase: "memo-hooks",
              explanation:
                'Every render creates NEW objects and functions in memory — even if the content is identical. useMemo caches expensive calculations. useCallback caches function references. Without them, React.memo sees "new" props every time and re-renders anyway.',
              hotZones: ["parent", "child-a", "child-b", "hooks"],
              showMemoShield: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "hooks", to: "child-a", color: "#a78bfa" },
              { from: "hooks", to: "child-b", color: "#a78bfa" },
            ],
            800,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 5 · Code Splitting ──────────────────────── */
        case 5:
          dispatch(
            patchState({
              phase: "code-splitting",
              explanation:
                "By default, all your code ships in ONE giant file. Users on the login page download code for settings, admin, charts — everything. React.lazy + Suspense splits it into small chunks: each page only loads what it needs, when it's visited.",
              hotZones: ["bundle", "chunk-a", "chunk-b", "chunk-c"],
              showMemoShield: false,
              showLazyChunks: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "bundle", to: "chunk-a", color: "#34d399" },
              { from: "bundle", to: "chunk-b", color: "#34d399" },
              { from: "bundle", to: "chunk-c", color: "#34d399" },
            ],
            900,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 6 · Memory Leaks Intro ──────────────────── */
        case 6:
          dispatch(
            patchState({
              phase: "memory-leak-intro",
              explanation:
                "A memory leak is like a bathtub with the tap running and the drain blocked. Your app creates objects (tap) and the garbage collector cleans them up (drain). But if something holds a reference, the drain is blocked — memory climbs until the tab crashes.",
              hotZones: ["app", "heap"],
              showLazyChunks: false,
              showLeakDrip: true,
              showHeapGrowth: true,
            }),
          );
          await sleep(500);
          animateSignal("app", "heap", 900, "#ef4444", async () => {
            await sleep(80);
            finish();
          });
          break;

        /* ── 7 · Leak #1: Forgotten Cleanup ──────────── */
        case 7:
          dispatch(
            patchState({
              phase: "leak-cleanup",
              explanation:
                "Your component starts a setInterval to poll an API every 5 seconds. User navigates away — component unmounts — but the interval keeps running. It calls setState on a dead component. Memory grows. Fix: return a cleanup function from useEffect.",
              hotZones: ["parent", "timer", "heap"],
              showLeakDrip: true,
              showHeapGrowth: true,
              showTimerLeak: true,
            }),
          );
          await sleep(500);
          animateSignal("timer", "parent", 700, "#f59e0b", async () => {
            animateSignal("parent", "heap", 700, "#ef4444", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* ── 8 · Leak #2: Closures ──────────────────── */
        case 8:
          dispatch(
            patchState({
              phase: "leak-closure",
              explanation:
                "A callback inside useEffect captures variables from the component scope. If the callback runs after unmount, it holds a reference to the entire old component tree — preventing garbage collection. Like a guest who left the party but took the house key.",
              hotZones: ["parent", "closure", "heap"],
              showTimerLeak: false,
              showClosureLeak: true,
              showHeapGrowth: true,
            }),
          );
          await sleep(500);
          animateSignal("closure", "parent", 700, "#c084fc", async () => {
            animateSignal("parent", "heap", 700, "#ef4444", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* ── 9 · Heap Snapshots ──────────────────────── */
        case 9:
          dispatch(
            patchState({
              phase: "heap-snapshot",
              explanation:
                "Chrome DevTools → Memory tab → Take Snapshot. Use the app. Take another snapshot. Compare them to see what objects appeared. It's like photographing your fridge before and after a week — anything new and growing is a leak.",
              hotZones: ["heap", "devtools"],
              showClosureLeak: false,
              showHeapGrowth: true,
              showLeakDrip: false,
            }),
          );
          await sleep(500);
          animateSignal("heap", "devtools", 800, "#06b6d4", async () => {
            await sleep(80);
            finish();
          });
          break;

        /* ── 10 · Lighthouse & Web Vitals ────────────── */
        case 10:
          dispatch(
            patchState({
              phase: "lighthouse",
              explanation:
                "Lighthouse gives your app a score out of 100. Core Web Vitals measure three things: LCP (how fast the biggest element loads — under 2.5s), INP (how fast the page reacts to clicks — under 200ms), CLS (how much things jump around — under 0.1).",
              hotZones: ["dom", "devtools"],
              showHeapGrowth: false,
              showLighthouse: true,
            }),
          );
          await sleep(500);
          animateSignal("dom", "devtools", 800, "#86efac", async () => {
            await sleep(80);
            finish();
          });
          break;

        /* ── 11 · React Profiler ─────────────────────── */
        case 11:
          dispatch(
            patchState({
              phase: "profiler",
              explanation:
                "React DevTools → Profiler → Record → interact → Stop. The flame chart shows every component: grey = didn't render, green = fast, orange = slow. Click any bar to see WHY it re-rendered. Like a security camera playback for your components.",
              hotZones: ["parent", "child-a", "child-b", "profiler"],
              showLighthouse: false,
              showProfiler: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "parent", to: "profiler", color: "#c084fc" },
              { from: "child-a", to: "profiler", color: "#c084fc" },
              { from: "child-b", to: "profiler", color: "#c084fc" },
            ],
            900,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 12 · Summary ────────────────────────────── */
        case 12:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Your performance toolkit: React.memo + useMemo/useCallback to stop wasted renders, React.lazy for smaller bundles, useEffect cleanup to prevent memory leaks, heap snapshots to find them, Lighthouse for scores, and the Profiler to see exactly what's slow.",
              hotZones: [
                "app",
                "parent",
                "child-a",
                "child-b",
                "vdom",
                "dom",
                "heap",
                "devtools",
              ],
              showProfiler: false,
              showCleanup: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "app", to: "parent", color: "#34d399" },
              { from: "parent", to: "vdom", color: "#34d399" },
              { from: "vdom", to: "dom", color: "#34d399" },
            ],
            900,
            async () => {
              await sleep(80);
              finish();
            },
          );
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
    phase: runtime.phase,
  };
};
