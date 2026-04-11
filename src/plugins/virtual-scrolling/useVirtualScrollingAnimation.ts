import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset } from "./virtualScrollingSlice";

export type Signal = { id: string } & SignalOverlayParams;

export const useVirtualScrollingAnimation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.virtualScrolling);
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
          for (const s of sigs) {
            persistedRef.current.push({ ...s, progress: 1 });
          }
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
        /* Step 0 — The Problem: 10,000 Rows */
        case 0:
          dispatch(reset());
          dispatch(
            patchState({
              phase: "overview",
              explanation:
                "You fetch 10,000 rows from an API. You write <table>{data.map(row => <tr>…</tr>)}</table>. React obediently creates 10,000 <tr> elements. The page freezes for seconds. Let's understand why — and fix it.",
              hotZones: ["app", "data-source"],
              showFullTable: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 1 — Every Row Becomes a Real DOM Node */
        case 1:
          dispatch(
            patchState({
              phase: "browser-render",
              explanation:
                "React calls document.createElement() for EACH of those 10,000 rows. Every <tr> and <td> becomes a real object in the browser's memory — a DOM node. The browser now has to figure out the size and position of every single one (Layout), then draw the pixels (Paint). 10K nodes = seconds of work.",
              hotZones: ["app", "dom-tree", "browser"],
              showFullTable: true,
              showDomCount: true,
            }),
          );
          animateSignal("app", "dom-tree", 600, "#60a5fa", () => {
            animateSignal("dom-tree", "browser", 600, "#f59e0b", async () => {
              await sleep(80);
              finish();
            });
          });
          break;

        /* Step 2 — "But overflow:auto hides them!" — THE MYTH */
        case 2:
          dispatch(
            patchState({
              phase: "overflow-myth",
              explanation:
                "You might think: 'If I set a fixed height and overflow: auto, the browser hides rows outside the box — so it won't bother creating them, right?' WRONG. overflow: auto only clips the PAINTED PIXELS. It's like putting a tiny frame over a giant painting — the painting is still there behind the frame. ALL 10,000 DOM nodes are created, stored in memory, and laid out. The browser just skips painting the off-screen ones. But the expensive part was never the painting — it was creating and laying out 10K nodes.",
              hotZones: ["dom-tree", "browser"],
              showFullTable: true,
              showDomCount: true,
              showOverflowMyth: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 3 — Where the Real Cost Is */
        case 3:
          dispatch(
            patchState({
              phase: "real-cost",
              explanation:
                "Here's a breakdown of what costs what: ① DOM Creation (~40% of time) — the browser allocates memory for each node. ② Layout/Reflow (~45%) — the browser calculates width, height, x, y of every node. ③ Paint (~15%) — drawing pixels. overflow:auto skips painting hidden rows, but that's only 15% of the cost. The other 85% — creating and laying out 10K nodes — still happens in full. That's why the page still freezes.",
              hotZones: ["dom-tree", "browser"],
              showFullTable: true,
              showDomCount: true,
              showMemoryBar: true,
              showRealCost: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 4 — The Key Insight */
        case 4:
          dispatch(
            patchState({
              phase: "key-insight",
              explanation:
                "The fix isn't hiding rows with CSS — it's NEVER CREATING THEM IN THE FIRST PLACE. React controls what gets mounted to the DOM. If we tell React to only render 10 <div> elements (the visible ones), the browser only has to create, lay out, and paint 10 nodes. That's virtual scrolling: the user sees a 10,000-row list, but only ~10 DOM nodes ever exist.",
              hotZones: ["viewport", "visible-rows"],
              showFullTable: false,
              showViewport: true,
              showVisibleRows: true,
              showDomCount: true,
              showMemoryBar: true,
              showOverflowMyth: false,
              showRealCost: false,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 5 — The Viewport Container */
        case 5:
          dispatch(
            patchState({
              phase: "viewport-container",
              explanation:
                "We DO still use a fixed-height div with overflow: auto — but not for hiding DOM nodes. Its job is different now: it gives us a SCROLL EVENT. When the user scrolls, this container fires onScroll with a scrollTop value. We read that number and use it to decide which rows to render. The container is a sensor, not a hider.",
              hotZones: ["viewport", "container"],
              showViewport: true,
              showVisibleRows: true,
            }),
          );
          animateSignal("container", "viewport", 600, "#06b6d4", async () => {
            await sleep(80);
            finish();
          });
          break;

        /* Step 6 — Calculating Visible Items */
        case 6:
          dispatch(
            patchState({
              phase: "calc-visible",
              explanation:
                "When the container fires onScroll, we read scrollTop (how far the user has scrolled in pixels). Since every row is the same height, the math is simple: startIndex = Math.floor(scrollTop / rowHeight). If scrollTop is 2500px and each row is 50px, we start at row 50. We render visibleCount rows from there (container height ÷ row height). Rows 0–49? Never created. Rows 60+? Also never created.",
              hotZones: ["scroll-handler", "viewport", "visible-rows"],
              showViewport: true,
              showVisibleRows: true,
              showScrollHandler: true,
              showRecalc: true,
            }),
          );
          animateSignal(
            "scroll-handler",
            "visible-rows",
            600,
            "#f472b6",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 7 — Rendering Only What's Visible */
        case 7:
          dispatch(
            patchState({
              phase: "render-visible",
              explanation:
                "React now renders ONLY data.slice(startIndex, endIndex).map(…). That's ~10 <div> elements, not 10,000. Each one gets style={{ transform: translateY(startIndex * rowHeight + 'px') }} so it appears at the right position inside the scrollable container. The DOM has 10 nodes. The browser creates 10 nodes. Layout calculates 10 positions. Paint draws 10 rows. Everything is fast.",
              hotZones: ["visible-rows", "dom-tree"],
              showViewport: true,
              showVisibleRows: true,
              showScrollHandler: true,
              showDomCount: true,
            }),
          );
          animateSignal(
            "visible-rows",
            "dom-tree",
            600,
            "#34d399",
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 8 — Scroll Event → Recalculate */
        case 8:
          dispatch(
            patchState({
              phase: "scroll-event",
              explanation:
                "As the user scrolls down, scrollTop increases. The scroll handler fires, recalculates startIndex/endIndex, and React re-renders the new slice. Row 1 unmounts (removed from DOM), row 11 mounts (added to DOM). It's like a conveyor belt — DOM nodes get recycled as you scroll. At no point do more than ~10 nodes exist.",
              hotZones: ["scroll-handler", "viewport", "visible-rows"],
              showViewport: true,
              showVisibleRows: true,
              showScrollHandler: true,
              showRecalc: true,
            }),
          );
          animateSignal("viewport", "scroll-handler", 500, "#f472b6", () => {
            animateSignal(
              "scroll-handler",
              "visible-rows",
              500,
              "#34d399",
              async () => {
                await sleep(80);
                finish();
              },
            );
          });
          break;

        /* Step 9 — The Spacer Trick */
        case 9:
          dispatch(
            patchState({
              phase: "spacer-trick",
              explanation:
                "There's a UX problem: if only 10 <div>s exist, the scrollbar thinks the container has barely any content. The user can't scroll to row 9,990. Fix: add one invisible <div> with height = totalRows × rowHeight (e.g. 10,000 × 50px = 500,000px). This 'spacer' makes the scrollbar the correct size. The user drags the scrollbar, scrollTop changes, and our scroll handler renders the right 10 rows. The user has no idea only 10 DOM nodes exist.",
              hotZones: ["spacer-top", "spacer-bot", "viewport"],
              showViewport: true,
              showVisibleRows: true,
              showSpacers: true,
              showScrollHandler: true,
            }),
          );
          animateParallel(
            [
              { from: "spacer-top", to: "viewport", color: "#fbbf24" },
              { from: "spacer-bot", to: "viewport", color: "#fbbf24" },
            ],
            600,
            async () => {
              await sleep(80);
              finish();
            },
          );
          break;

        /* Step 10 — Overscan Buffer */
        case 10:
          dispatch(
            patchState({
              phase: "overscan",
              explanation:
                "One last edge case: if the user scrolls FAST, React might not re-render quickly enough, causing a white flash where rows haven't loaded yet. Fix: render 3–5 extra rows above AND below the viewport. These 'overscan' rows are hidden behind the container's edge but already exist in the DOM. When the user scrolls, they slide into view instantly. Total DOM nodes: ~16 instead of ~10. Still 99.8% less than 10,000.",
              hotZones: ["overscan-top", "overscan-bot", "visible-rows"],
              showViewport: true,
              showVisibleRows: true,
              showSpacers: true,
              showOverscan: true,
              showScrollHandler: true,
            }),
          );
          await sleep(80);
          finish();
          break;

        /* Step 11 — Your Virtual Scrolling Toolkit */
        case 11:
          dispatch(
            patchState({
              phase: "summary",
              explanation:
                "Recap: overflow:auto clips pixels, but ALL DOM nodes still get created and laid out. Virtual scrolling fixes this by rendering ONLY visible rows (~10 nodes), using a scroll handler to recalculate on every scroll, a spacer div to fake the full height, and overscan rows to prevent flicker. In practice, use react-window or @tanstack/react-virtual instead of building from scratch.",
              hotZones: [
                "viewport",
                "visible-rows",
                "scroll-handler",
                "lib-rw",
                "lib-tv",
              ],
              showViewport: true,
              showVisibleRows: true,
              showSpacers: true,
              showOverscan: true,
              showScrollHandler: true,
              showLibraries: true,
              showMemoryBar: true,
              showDomCount: true,
            }),
          );
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
    phase: runtime.phase,
  };
};
