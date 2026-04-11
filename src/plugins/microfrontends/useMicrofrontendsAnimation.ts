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
  const persistedRef = useRef<Signal[]>([]);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setSignals([...persistedRef.current]);
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

  const animateSignal = useCallback(
    (
      from: string,
      to: string,
      duration: number,
      color: string,
      onDone: () => void,
    ) => {
      const sigId = `sig-${Date.now()}`;
      const start = performance.now();
      const persisted = persistedRef.current;
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setSignals([
          ...persisted,
          { id: sigId, from, to, progress: p, color, magnitude: 1.2 },
        ]);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const resting: Signal = {
            id: `rest-${from}-${to}`,
            from,
            to,
            progress: 1,
            color,
            magnitude: 1,
          };
          persistedRef.current = [...persisted, resting];
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
      pairs: { from: string; to: string; color?: string }[],
      duration: number,
      onDone: () => void,
    ) => {
      const start = performance.now();
      const persisted = persistedRef.current;
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
        setSignals([...persisted, ...sigs.map((s) => ({ ...s, progress: p }))]);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else {
          const resting = sigs.map((s) => ({
            ...s,
            progress: 1,
            magnitude: 1,
            id: `rest-${s.from}-${s.to}`,
          }));
          persistedRef.current = [...persisted, ...resting];
          setSignals([...persistedRef.current]);
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
          onDone();
          return;
        }
        const hop = hops[hopIdx];
        const sigId = `chain-${hopIdx}-${Date.now()}`;
        const start = performance.now();
        const persisted = persistedRef.current;
        const step = (now: number) => {
          const p = Math.min((now - start) / msPerHop, 1);
          setSignals([
            ...persisted,
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
            const resting: Signal = {
              id: `rest-${hop.from}-${hop.to}`,
              from: hop.from,
              to: hop.to,
              progress: 1,
              color: hop.color ?? "#60a5fa",
              magnitude: 1,
            };
            persistedRef.current = [...persisted, resting];
            setSignals([...persistedRef.current]);
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
        /* ─── Step 0: The Monolith Problem ─────────── */
        case 0:
          dispatch(reset());
          setAnimPhase("idle");
          persistedRef.current = [];
          setSignals([]);
          await sleep(80);
          finish();
          break;

        /* ─── Step 1: Meet the Host Shell ──────────── */
        case 1:
          dispatch(
            patchState({
              phase: "host-shell",
              explanation:
                "The Host Shell is like a building with hallways, a security desk, and empty rooms. It provides the Router (hallways that send you to the right page), Auth (the security desk that checks who you are), and a shared Nav bar (lobby signs). But it doesn't build any of the actual pages — it just has empty slots where other teams plug their apps in.",
              hotZones: ["shell", "router", "auth", "nav"],
            }),
          );
          setAnimPhase("highlight");
          await sleep(80);
          finish();
          break;

        /* ─── Step 2: Independent Team Apps ────────── */
        case 2:
          dispatch(
            patchState({
              phase: "remotes",
              explanation:
                "Three teams, three separate apps: Dashboard, Products, and Settings. Each team has their own code, their own build pipeline, and can ship whenever they want — like separate stores in a mall. Team A can deploy on Monday without waiting for Team B or C.",
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
          await sleep(80);
          finish();
          break;

        /* ─── Step 3: The Glue Problem ─────────────── */
        case 3:
          dispatch(
            patchState({
              phase: "glue-problem",
              explanation:
                "Here's the problem: each team's app bundles its own copy of React. That's like every store in the mall installing its own elevator system. The user's browser downloads React THREE times — slow, wasteful, and different versions can crash into each other. We need a way for these apps to share code at runtime.",
              hotZones: ["slot-a", "slot-b", "slot-c"],
              showDuplicateDeps: true,
            }),
          );
          setAnimPhase("problem");
          await sleep(80);
          finish();
          break;

        /* ─── Step 4: The Hooks Crash ──────────────── */
        case 4:
          dispatch(
            patchState({
              phase: "hooks-crash",
              explanation:
                "Here's exactly why it crashes. Inside React, there's a secret global variable — think of it as a walkie-talkie channel. When the Host Shell starts rendering, it sets the channel to 'I'm rendering now.' When your component calls useState(), it grabs that channel to register its state. But with TWO copies of React, there are TWO walkie-talkies on DIFFERENT channels. The Host Shell (React copy A) sets its channel, then tries to render the Dashboard. But the Dashboard's code was built with React copy B — so its useState() grabs copy B's walkie-talkie, which is silent. Nobody is broadcasting on that channel. React copy B says: 'Nobody told me we're rendering — invalid hook call!' and crashes. That's the whole bug: useState() talked to the wrong React.",
              hotZones: ["slot-a"],
              showDuplicateDeps: true,
              showHooksCrash: true,
            }),
          );
          setAnimPhase("crash");
          await sleep(80);
          finish();
          break;

        /* ─── Step 5: Module Federation: The Fix ───── */
        case 5:
          dispatch(
            patchState({
              phase: "expose",
              explanation:
                "Module Federation is the fix. Each team's build process creates a tiny 'menu' file called remoteEntry.js. Think of it as a restaurant menu — it lists what dishes (components) the team offers, and where to find them. No actual food (code) is shipped yet, just the menu.",
              hotZones: [
                "entry-a",
                "entry-b",
                "entry-c",
                "remote-a",
                "remote-b",
                "remote-c",
              ],
              showEntries: true,
              showDuplicateDeps: false,
              showHooksCrash: false,
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

        /* ─── Step 6: Host Reads the Menus ─────────── */
        case 6:
          dispatch(
            patchState({
              phase: "discovery",
              explanation:
                "When the Host Shell starts up, it fetches each team's menu (remoteEntry.js). Now the Host knows what's available — like reading a mall directory. 'Dashboard is at URL A, Products at URL B, Settings at URL C.' But no actual component code has been downloaded yet. Just the directory.",
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

        /* ─── Step 7: Load Only What's Needed ──────── */
        case 7:
          dispatch(
            patchState({
              phase: "lazy-load",
              explanation:
                "The user clicks /dashboard. The Router says: 'I need the Dashboard.' The MF Runtime looks it up in the menu, fetches ONLY the Dashboard code, and plugs it into its slot. Products and Settings? Not downloaded. It's like walking into one store — you don't carry inventory from every other store.",
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

        /* ─── Step 8: One Copy of React ────────────── */
        case 8:
          dispatch(
            patchState({
              phase: "shared-deps",
              explanation:
                "This is the magic of Module Federation. Remember the three copies of React from Step 3, and the hooks crash from Step 4? Module Federation says: 'The Host already has React 18 — everyone share that one copy.' Instead of downloading React three times, the browser loads it ONCE. No duplicate instances, no hooks crash, no wasted bandwidth. This is why Module Federation exists.",
              hotZones: ["shared"],
              showEntries: true,
              showShared: true,
              showDuplicateDeps: false,
            }),
          );
          setAnimPhase("shared");
          await sleep(80);
          finish();
          break;

        /* ─── Step 9: Version Mismatch ─────────────── */
        case 9:
          dispatch(
            patchState({
              phase: "version-mismatch",
              explanation:
                "But what if Team C ships React 19 while the Host has React 18? Module Federation checks at runtime: 'Settings wants React 19, but I only have 18.' With strictVersion on, it refuses to load — better to fail clearly than crash mysteriously. With strictVersion off, it loads a separate copy of React 19 just for Settings. Safe, but now you're back to two React instances. The best fix? Keep your teams aligned on the same major version.",
              hotZones: ["slot-c", "shared"],
              showEntries: true,
              showShared: true,
              showVersionMismatch: true,
            }),
          );
          setAnimPhase("mismatch");
          await sleep(80);
          finish();
          break;

        /* ─── Step 10: Iframe: Full Isolation ──────── */
        case 10:
          dispatch(
            patchState({
              phase: "iframe",
              explanation:
                "What if you can't trust the other team's code, or they use a totally different framework? Wrap their app in an <iframe> — like putting a store behind a glass wall. It's fully isolated (their CSS, JS, and bugs can't leak out), but you can only communicate by sliding notes under the door (postMessage). Simple but limited.",
              hotZones: ["slot-b"],
              showEntries: true,
              showShared: true,
              showIframe: true,
              showVersionMismatch: false,
            }),
          );
          setAnimPhase("iframe");
          await sleep(80);
          finish();
          break;

        /* ─── Step 11: When Things Break ───────────── */
        case 11:
          dispatch(
            patchState({
              phase: "failure",
              explanation:
                "Team C's server goes down. Their remoteEntry.js returns an error. But watch: the Error Boundary catches it and shows a friendly fallback message. The rest of the app keeps working perfectly. One store closes in the mall, but you can still shop everywhere else.",
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

        /* ─── Step 12: Pick Your Strategy ──────────── */
        case 12:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Module Federation: deep integration, shared dependencies, one copy of React — best when teams use the same framework. Iframes: full isolation, no sharing, clunky communication — best for untrusted or legacy code. Custom Loaders (SystemJS): maximum flexibility, more DIY. Most teams start with Module Federation.",
              hotZones: [],
              showEntries: true,
              showShared: true,
              showIframe: false,
              failedRemote: "",
              showFallback: false,
            }),
          );
          setAnimPhase("idle");
          await sleep(80);
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
