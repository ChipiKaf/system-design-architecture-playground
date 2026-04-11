import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./reactBestPracticesSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useReactBestPracticesAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.reactBestPractices);
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

  const animateChain = useCallback(
    (
      hops: { from: string; to: string }[],
      durationPerHop: number,
      color: string,
      onDone: () => void,
    ) => {
      const totalDuration = hops.length * durationPerHop;
      const sigId = `chain-${Date.now()}`;
      const startTime = performance.now();
      const step = (now: number) => {
        const rawP = Math.min((now - startTime) / totalDuration, 1);
        const hopIdx = Math.min(
          Math.floor(rawP * hops.length),
          hops.length - 1,
        );
        const hopP = (rawP * hops.length) % 1;
        setSignals([
          ...persistedRef.current,
          {
            id: sigId,
            from: hops[hopIdx].from,
            to: hops[hopIdx].to,
            progress: rawP >= 1 ? 1 : hopP,
            color,
            magnitude: 1,
          },
        ]);
        if (rawP < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          const last = hops[hops.length - 1];
          persistedRef.current.push({
            id: sigId,
            from: last.from,
            to: last.to,
            progress: 1,
            color,
            magnitude: 1,
          });
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

        /* ── 1 · Functional Components ───────────────── */
        case 1:
          dispatch(
            patchState({
              phase: "functional",
              explanation:
                'Class components are like cooking with a 50-page recipe manual. Functional components with hooks are simple recipe cards — same dish, less clutter. No more "this" confusion.',
              hotZones: ["app", "header", "main", "footer"],
              showClassBad: true,
              showFuncGood: false,
            }),
          );
          await sleep(600);
          animateParallel(
            [
              { from: "app", to: "header", color: "#60a5fa" },
              { from: "app", to: "main", color: "#60a5fa" },
              { from: "app", to: "footer", color: "#60a5fa" },
            ],
            800,
            async () => {
              dispatch(patchState({ showClassBad: false, showFuncGood: true }));
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 2 · Small Components ────────────────────── */
        case 2:
          dispatch(
            patchState({
              phase: "small-units",
              explanation:
                "If one chef tries to cook the whole menu alone, mistakes pile up. One component, one job. Break big components into small, focused pieces.",
              hotZones: ["main", "list", "card"],
              showFuncGood: true,
              showClassBad: false,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "main", to: "list", color: "#a78bfa" },
              { from: "main", to: "card", color: "#a78bfa" },
            ],
            800,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 3 · Memoization ─────────────────────────── */
        case 3:
          dispatch(
            patchState({
              phase: "memo-callback",
              explanation:
                'React re-renders every component by default — like repainting every wall when you only changed one picture. React.memo, useMemo, and useCallback tell React: "this wall is fine, skip it."',
              hotZones: ["list", "card"],
              showMemoShield: true,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateSignal("main", "list", 700, "#fbbf24", async () => {
            // List re-renders, card skips
            await sleep(300);
            animateSignal("main", "card", 400, "#86efac", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* ── 4 · Virtual DOM ─────────────────────────── */
        case 4:
          dispatch(
            patchState({
              phase: "virtual-dom",
              explanation:
                "React doesn't touch the real DOM directly. It keeps a lightweight copy (the virtual DOM), diffs it, and only updates what actually changed — like editing a draft and only reprinting the changed pages.",
              hotZones: ["main", "list", "card", "dom"],
              showVdomDiff: true,
              showMemoShield: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "list", to: "dom", color: "#06b6d4" },
              { from: "card", to: "dom", color: "#06b6d4" },
            ],
            900,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 5 · Feature Folders ─────────────────────── */
        case 5:
          dispatch(
            patchState({
              phase: "feature-folders",
              explanation:
                'Instead of one drawer for ALL components and another for ALL hooks, organise by feature: everything for "auth" in one folder, everything for "products" in another. One place to look, one folder to delete.',
              hotZones: ["hooks", "state", "styles"],
              showFolders: true,
              showVdomDiff: false,
              showFuncGood: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* ── 6 · Custom Hooks ────────────────────────── */
        case 6:
          dispatch(
            patchState({
              phase: "custom-hooks",
              explanation:
                'Three components all need "is the user logged in?" Don\'t copy-paste — put it in one hook: useAuth(). Call it anywhere. One function, one fix when things change.',
              hotZones: ["hooks", "list", "card"],
              showHookExtract: true,
              showFolders: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "hooks", to: "list", color: "#c084fc" },
              { from: "hooks", to: "card", color: "#c084fc" },
            ],
            800,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 7 · Styling & Reusability ───────────────── */
        case 7:
          dispatch(
            patchState({
              phase: "styling",
              explanation:
                "Normally styles live in a separate .css file (shared wardrobe — name collisions happen). CSS-in-JS writes styles inside the component itself (personal wardrobe — scoped, dynamic, no clashes). Change a prop → the style updates. Delete the component → its styles vanish too.",
              hotZones: ["styles", "header", "footer"],
              showTheme: true,
              showHookExtract: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "styles", to: "header", color: "#f472b6" },
              { from: "styles", to: "footer", color: "#f472b6" },
            ],
            800,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 8 · Code Quality ────────────────────────── */
        case 8:
          dispatch(
            patchState({
              phase: "code-quality",
              explanation:
                'ESLint is your spell-checker — it catches "oops, missing dependency" before code runs. Capitalise component names (ProductCard, not productCard). Keep test files next to the code they test.',
              hotZones: ["app", "header", "main", "footer", "list", "card"],
              showLint: true,
              showTheme: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateParallel(
            [
              { from: "app", to: "header", color: "#86efac" },
              { from: "app", to: "main", color: "#86efac" },
              { from: "app", to: "footer", color: "#86efac" },
              { from: "main", to: "list", color: "#86efac" },
              { from: "main", to: "card", color: "#86efac" },
            ],
            900,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* ── 9 · Accessibility & Security ────────────── */
        case 9:
          dispatch(
            patchState({
              phase: "accessibility",
              explanation:
                "Use <button>, not <div onClick>. Add aria-label so screen readers describe your buttons. Never use dangerouslySetInnerHTML without sanitising — it's like leaving your front door unlocked.",
              hotZones: ["header", "dom"],
              showA11y: true,
              showLint: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateSignal("header", "dom", 800, "#38bdf8", async () => {
            await sleep(80);
            finish();
          });
          break;

        /* ── 10 · Summary ────────────────────────────── */
        case 10:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Your React toolkit: functional components, memoisation, feature folders, custom hooks, clean code & accessible UI. Pick the practices that fit your project and grow from there.",
              hotZones: [
                "app",
                "header",
                "main",
                "footer",
                "list",
                "card",
                "hooks",
                "state",
                "styles",
                "dom",
              ],
              showA11y: false,
              showFuncGood: true,
            }),
          );
          await sleep(500);
          animateChain(
            [
              { from: "app", to: "main" },
              { from: "main", to: "list" },
              { from: "list", to: "dom" },
            ],
            400,
            "#34d399",
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
