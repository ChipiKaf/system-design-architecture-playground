import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./microfrontendsSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useMicrofrontendsAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.microfrontends);
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

  /* ── Signal helpers ─────────────────────────────────── */

  const animateParallel = useCallback(
    (
      pairs: { from: string; to: string; color?: string }[],
      duration: number,
      onDone: () => void,
    ) => {
      const start = performance.now();
      const sigs: Signal[] = pairs.map((p, i) => ({
        id: `par-${i}-${Date.now()}`,
        from: p.from,
        to: p.to,
        progress: 0,
        color: p.color ?? "#a78bfa",
        magnitude: 1.2,
      }));
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals(sigs.map((s) => ({ ...s, progress: p })));
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else {
          setSignals([]);
          onDone();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  const animateChain = useCallback(
    (
      hops: { from: string; to: string; color?: string }[],
      msPerHop: number,
      onDone: () => void,
    ) => {
      let hopIdx = 0;
      const startNext = () => {
        if (hopIdx >= hops.length) {
          setSignals([]);
          onDone();
          return;
        }
        const hop = hops[hopIdx];
        const sigId = `chain-${hopIdx}-${Date.now()}`;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / msPerHop, 1);
          setSignals([
            {
              id: sigId,
              from: hop.from,
              to: hop.to,
              progress: p,
              color: hop.color ?? "#60a5fa",
              magnitude: 1.2,
            },
          ]);
          if (p < 1) rafRef.current = requestAnimationFrame(step);
          else {
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

        /* ─── Step 1: Host Shell ───────────────────── */
        case 1:
          dispatch(
            patchState({
              phase: "host-shell",
              explanation:
                "The Host Shell is the container application. It owns top-level routing, authentication context, and the shared navigation bar. It doesn't render domain UI — it provides mount-point slots where remote modules are loaded.",
              hotZones: ["shell", "router", "auth", "nav"],
            }),
          );
          setAnimPhase("highlight");
          await sleep(1000);
          finish();
          break;

        /* ─── Step 2: Remote Modules ───────────────── */
        case 2:
          dispatch(
            patchState({
              phase: "remotes",
              explanation:
                "Each micro-frontend (Dashboard, Products, Settings) is built and deployed independently by a separate team. They have their own repositories, CI pipelines, and release cycles — no cross-team coordination needed to ship.",
              hotZones: [
                "slot-a",
                "slot-b",
                "slot-c",
                "remote-a",
                "remote-b",
                "remote-c",
              ],
            }),
          );
          setAnimPhase("highlight");
          await sleep(1000);
          finish();
          break;

        /* ─── Step 3: Module Federation — Expose ───── */
        case 3:
          dispatch(
            patchState({
              phase: "expose",
              explanation:
                "Each remote's Webpack or Vite config exposes components via Module Federation. The build produces a remoteEntry.js — a manifest that maps exposed module names to their chunk URLs on the CDN.",
              hotZones: [
                "entry-a",
                "entry-b",
                "entry-c",
                "remote-a",
                "remote-b",
                "remote-c",
              ],
              showEntries: true,
            }),
          );
          setAnimPhase("build");
          animateParallel(
            [
              { from: "remote-a", to: "entry-a", color: "#c084fc" },
              { from: "remote-b", to: "entry-b", color: "#c084fc" },
              { from: "remote-c", to: "entry-c", color: "#c084fc" },
            ],
            900,
            () => finish(),
          );
          break;

        /* ─── Step 4: Runtime Discovery ────────────── */
        case 4:
          dispatch(
            patchState({
              phase: "discovery",
              explanation:
                "At startup, the Module Federation runtime fetches each remote's remoteEntry.js. This is the 'discovery' phase — the host learns what modules exist and how to load them. No actual component code is downloaded yet.",
              hotZones: ["mf-runtime", "entry-a", "entry-b", "entry-c"],
              showEntries: true,
            }),
          );
          setAnimPhase("discovery");
          animateParallel(
            [
              { from: "mf-runtime", to: "entry-a", color: "#a78bfa" },
              { from: "mf-runtime", to: "entry-b", color: "#a78bfa" },
              { from: "mf-runtime", to: "entry-c", color: "#a78bfa" },
            ],
            1100,
            () => finish(),
          );
          break;

        /* ─── Step 5: Lazy Loading ─────────────────── */
        case 5:
          dispatch(
            patchState({
              phase: "lazy-load",
              explanation:
                "User navigates to /dashboard → Router matches the route → MF Runtime resolves the remote → fetches the chunk from the CDN → mounts the Dashboard component into its slot. Only the needed code is downloaded.",
              hotZones: ["router", "mf-runtime", "entry-a", "slot-a"],
              showEntries: true,
            }),
          );
          setAnimPhase("loading");
          animateChain(
            [
              { from: "user", to: "router", color: "#94a3b8" },
              { from: "router", to: "mf-runtime", color: "#60a5fa" },
              { from: "mf-runtime", to: "entry-a", color: "#a78bfa" },
              { from: "entry-a", to: "slot-a", color: "#34d399" },
            ],
            450,
            () => finish(),
          );
          break;

        /* ─── Step 6: Shared Dependencies ──────────── */
        case 6:
          dispatch(
            patchState({
              phase: "shared-deps",
              explanation:
                "Module Federation negotiates shared dependencies at runtime. React and ReactDOM are declared as singletons — the host provides them, all remotes consume the same instance. This prevents duplicate bundles and version-mismatch crashes.",
              hotZones: ["shared"],
              showEntries: true,
              showShared: true,
            }),
          );
          setAnimPhase("shared");
          await sleep(1000);
          finish();
          break;

        /* ─── Step 7: Iframe Isolation ─────────────── */
        case 7:
          dispatch(
            patchState({
              phase: "iframe",
              explanation:
                "Alternative strategy: wrap a micro-frontend in an <iframe>. Full JS/CSS isolation, but communication requires postMessage bridges. Best for legacy apps or untrusted third-party modules.",
              hotZones: ["slot-b"],
              showEntries: true,
              showShared: true,
              showIframe: true,
            }),
          );
          setAnimPhase("iframe");
          await sleep(1200);
          finish();
          break;

        /* ─── Step 8: Failure & Fallback ───────────── */
        case 8:
          dispatch(
            patchState({
              phase: "failure",
              explanation:
                "MFE-C fails to load — remoteEntry.js returns a 500. The Error Boundary around its slot catches the failure and renders a graceful fallback. The rest of the app keeps working normally.",
              hotZones: ["slot-c", "entry-c"],
              showEntries: true,
              showShared: true,
              failedRemote: "c",
            }),
          );
          setAnimPhase("failure");
          await sleep(700);
          dispatch(patchState({ showFallback: true, hotZones: ["slot-c"] }));
          await sleep(800);
          finish();
          break;

        /* ─── Step 9: Strategy Comparison ──────────── */
        case 9:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Module Federation: Deep integration, shared deps, complex config. Iframes: Full isolation, PostMessage overhead. Custom Loaders (SystemJS / import maps): Maximum flexibility, more DIY. Choose based on isolation needs, team trust, and infrastructure.",
              hotZones: [],
              showEntries: true,
              showShared: true,
              showIframe: false,
              failedRemote: "",
              showFallback: false,
            }),
          );
          setAnimPhase("idle");
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
