import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { viz, type PanZoomController } from "vizcraft";
import { usePerfectSquaresAnimation } from "./usePerfectSquaresAnimation";
import { configure } from "./perfectSquaresSlice";
import { concepts, type ConceptKey } from "./concepts";
import { useConceptModal } from "../../components/plugin-kit/useConceptModal";
import ConceptPills from "../../components/plugin-kit/ConceptPills";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const CELL_W = 46;
const CELL_H = 46;
const CELL_GAP = 4;
const STRIDE = CELL_W + CELL_GAP;
const COLS = 10; // cells per row in the DP grid

const PRESETS = [
  { n: 5, label: "n = 5" },
  { n: 12, label: "n = 12" },
  { n: 13, label: "n = 13" },
  { n: 17, label: "n = 17" },
];

const pills: PillDef[] = [
  {
    key: "perfect-squares",
    label: "Problem",
    color: "#fbbf24",
    borderColor: "#f59e0b",
  },
  { key: "dp-1d", label: "1D DP", color: "#93c5fd", borderColor: "#3b82f6" },
  {
    key: "inner-loop",
    label: "Inner Loop",
    color: "#c4b5fd",
    borderColor: "#a78bfa",
  },
  {
    key: "base-case",
    label: "Base Case",
    color: "#86efac",
    borderColor: "#22c55e",
  },
  {
    key: "greedy-trap",
    label: "Greedy Trap",
    color: "#fca5a5",
    borderColor: "#ef4444",
  },
];

const CODE_LINES = [
  "function numSquares(n) {",
  "  const dp = new Array(n+1).fill(Infinity);",
  "  dp[0] = 0;",
  "  for (let i = 1; i <= n; i++) {",
  "    for (let j = 1; j*j <= i; j++) {",
  "      dp[i] = Math.min(dp[i], dp[i-j*j]+1);",
  "    }",
  "  }",
  "  return dp[n];",
  "}",
];

function isArrayPhase(p: string) {
  return (
    p === "init-array" || p === "base-case" || p === "filling" || p === "result"
  );
}

/** Returns list of perfect squares <= n */
function squaresUpTo(n: number): number[] {
  const res: number[] = [];
  for (let j = 1; j * j <= n; j++) res.push(j * j);
  return res;
}

const PerfectSquaresVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { runtime, currentStep } =
    usePerfectSquaresAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);

  const [draftN, setDraftN] = useState(runtime.n);

  const { n, dp, phase, filledUpTo, currentIndex, bestJ, explanation } =
    runtime;

  useEffect(() => {
    setDraftN(runtime.n);
  }, [runtime.n]);

  const handleApply = useCallback(() => {
    if (currentStep !== 0) return;
    const val = Math.max(1, Math.min(20, draftN));
    dispatch(configure({ n: val }));
  }, [currentStep, draftN, dispatch]);

  const handlePreset = useCallback(
    (p: (typeof PRESETS)[number]) => {
      if (currentStep !== 0) return;
      setDraftN(p.n);
      dispatch(configure({ n: p.n }));
    },
    [currentStep, dispatch],
  );

  // Active code line
  const activeCodeLine = (() => {
    if (phase === "init-array") return 1;
    if (phase === "base-case") return 2;
    if (phase === "filling") return 5;
    if (phase === "result") return 8;
    return -1;
  })();

  // ── Grid layout dimensions ────────────────────────────
  const unitCount = n + 1;
  const cols = Math.min(COLS, unitCount);
  const rows = Math.ceil(unitCount / cols);
  const gridW = cols * STRIDE - CELL_GAP;
  const gridH = rows * STRIDE - CELL_GAP;
  const MARGIN = 40;
  const SQ_PANEL_H = 50;
  const W = Math.max(600, gridW + MARGIN * 2);
  const GRID_Y = MARGIN + SQ_PANEL_H + 20;
  const H = GRID_Y + gridH + 60;
  const startX = (W - gridW) / 2;

  // ── Squares reference for the current n ───────────────
  const squares = squaresUpTo(n);

  // ── Build VizCraft scene ──────────────────────────────
  const scene = (() => {
    const b = viz().view(W, H);
    const showDpArray = isArrayPhase(phase);

    // ── Perfect squares reference bar ───────────────────
    b.overlay((o) => {
      const sqLabel = squares.map((s) => String(s)).join(", ");
      o.add(
        "text",
        {
          x: W / 2,
          y: MARGIN + 12,
          text: `Perfect squares ≤ ${n}: ${sqLabel}`,
          fill: "#64748b",
          fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
          textAnchor: "middle",
        },
        { key: "sq-ref" },
      );

      // Draw small square chips
      const chipW = 28;
      const chipGap = 4;
      const totalChipW =
        squares.length * chipW + (squares.length - 1) * chipGap;
      const chipStartX = (W - totalChipW) / 2;
      const chipY = MARGIN + 24;

      squares.forEach((sq, idx) => {
        const cx = chipStartX + idx * (chipW + chipGap);

        // Highlight the winning square during filling
        const isWinner =
          phase === "filling" &&
          currentIndex >= 1 &&
          bestJ > 0 &&
          sq === bestJ * bestJ;

        o.add(
          "rect",
          {
            x: cx,
            y: chipY,
            width: chipW,
            height: 20,
            fill: isWinner ? "#1c1917" : "#0f172a",
            stroke: isWinner ? "#f59e0b" : "#334155",
            strokeWidth: isWinner ? 2 : 1,
            rx: 4,
          },
          { key: `sq-chip-${idx}` },
        );
        o.add(
          "text",
          {
            x: cx + chipW / 2,
            y: chipY + 14,
            text: String(sq),
            fill: isWinner ? "#fbbf24" : "#94a3b8",
            fontSize: 10,
            fontWeight: isWinner ? "bold" : "normal",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: `sq-chip-txt-${idx}` },
        );
      });
    });

    // ── "understand" phase: show example decompositions ─
    if (phase === "understand") {
      b.overlay((o) => {
        const examples: string[] = [];
        if (n >= 12) {
          examples.push("12 = 4 + 4 + 4  (3 squares)");
          examples.push("12 = 9 + 1 + 1 + 1  (4 squares — worse!)");
        }
        if (n === 13) {
          examples.push("13 = 4 + 9  (2 squares — optimal)");
          examples.push("13 = 9 + 1 + 1 + 1 + 1  (5 — greedy fails)");
        }
        if (n === 5) {
          examples.push("5 = 4 + 1  (2 squares)");
          examples.push("5 = 1+1+1+1+1  (5 — worst case)");
        }
        if (n === 17) {
          examples.push("17 = 16 + 1  (2 squares)");
        }
        if (examples.length === 0) {
          examples.push(`${n} = 1 + 1 + … + 1  (${n} squares — worst case)`);
          examples.push("Can we do better?");
        }

        examples.forEach((ex, idx) => {
          o.add(
            "text",
            {
              x: W / 2,
              y: GRID_Y + 30 + idx * 22,
              text: ex,
              fill: idx === 0 ? "#86efac" : "#94a3b8",
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `ex-${idx}` },
          );
        });
      });
    }

    // ── "subproblem" phase: show dp[i] = ? labels ───────
    if (phase === "subproblem") {
      b.overlay((o) => {
        const showCount = Math.min(unitCount, 8);
        for (let i = 0; i < showCount; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = startX + col * STRIDE + CELL_W / 2;
          const cy = GRID_Y + row * STRIDE + CELL_H / 2;
          o.add(
            "text",
            {
              x: cx,
              y: cy + 4,
              text: `dp[${i}]=?`,
              fill: "#a78bfa",
              fontSize: 9,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `sub-q-${i}` },
          );
        }
        if (unitCount > 8) {
          o.add(
            "text",
            {
              x: W / 2,
              y: GRID_Y + Math.ceil(8 / cols) * STRIDE + 10,
              text: "…",
              fill: "#a78bfa",
              fontSize: 14,
              textAnchor: "middle",
            },
            { key: "sub-dots" },
          );
        }
      });
    }

    // ── "recurrence" phase: show the formula visually ───
    if (phase === "recurrence") {
      b.overlay((o) => {
        const exI = Math.min(5, n);
        const sqsForI = squaresUpTo(exI);

        o.add(
          "text",
          {
            x: W / 2,
            y: GRID_Y + 20,
            text: `For dp[${exI}], try subtracting each square:`,
            fill: "#c084fc",
            fontSize: 12,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "rec-title" },
        );

        sqsForI.forEach((sq, idx) => {
          const remaining = exI - sq;
          o.add(
            "text",
            {
              x: W / 2,
              y: GRID_Y + 48 + idx * 20,
              text: `${exI} − ${sq} = ${remaining}  →  dp[${remaining}] + 1`,
              fill: "#e9d5ff",
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `rec-try-${idx}` },
          );
        });

        o.add(
          "text",
          {
            x: W / 2,
            y: GRID_Y + 58 + sqsForI.length * 20,
            text: `dp[${exI}] = min of all the above`,
            fill: "#fbbf24",
            fontSize: 11,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "rec-result" },
        );
      });
    }

    // ── DP grid (visible from init-array onward) ────────
    if (showDpArray) {
      // ── Grid label ────────────────────────────────────
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: GRID_Y - 8,
            text: "dp[]",
            fill: "#64748b",
            fontSize: 12,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "dp-label" },
        );
      });

      // ── DP cells ──────────────────────────────────────
      for (let i = 0; i < unitCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = startX + col * STRIDE + CELL_W / 2;
        const cy = GRID_Y + row * STRIDE + CELL_H / 2;

        const isCurrent =
          i === currentIndex && (phase === "filling" || phase === "base-case");
        const isSource =
          phase === "filling" &&
          currentIndex >= 1 &&
          bestJ > 0 &&
          i === currentIndex - bestJ * bestJ;
        const isFilled = i <= filledUpTo && filledUpTo >= 0;

        let fill: string;
        let stroke: string;
        let strokeW: number;
        let labelFill: string;
        let labelText: string;

        if (phase === "result") {
          fill = i === n ? "#052e16" : "#071a0e";
          stroke = i === n ? "#22c55e" : "#16a34a66";
          strokeW = i === n ? 2.5 : 1.2;
          labelFill = i === n ? "#86efac" : "#4ade80";
          labelText = dp[i] === Infinity ? "∞" : String(dp[i]);
        } else if (isCurrent && phase === "filling") {
          fill = "#1c1917";
          stroke = "#f59e0b";
          strokeW = 2.4;
          labelFill = "#fbbf24";
          labelText = dp[i] === Infinity ? "∞" : String(dp[i]);
        } else if (isCurrent && phase === "base-case") {
          fill = "#0b2545";
          stroke = "#3b82f6";
          strokeW = 2.4;
          labelFill = "#93c5fd";
          labelText = String(dp[i]);
        } else if (isSource) {
          fill = "#1c1917";
          stroke = "#fbbf24";
          strokeW = 2;
          labelFill = "#fde68a";
          labelText = dp[i] === Infinity ? "∞" : String(dp[i]);
        } else if (isFilled) {
          fill = "#0b1e3a";
          stroke = "#2563eb55";
          strokeW = 1.2;
          labelFill = "#60a5fa";
          labelText = dp[i] === Infinity ? "∞" : String(dp[i]);
        } else {
          fill = "#0a0f1a";
          stroke = "#1e293b88";
          strokeW = 0.8;
          labelFill = "#334155";
          labelText = "∞";
        }

        const node = b
          .node(`dp-${i}`)
          .at(cx, cy)
          .rect(CELL_W, CELL_H, 5)
          .fill(fill)
          .stroke(stroke, strokeW);

        node.label(labelText, {
          fill: labelFill,
          fontSize: labelText === "∞" ? 14 : 14,
          fontWeight: labelText === "∞" ? "normal" : "bold",
          fontFamily: '"JetBrains Mono", monospace',
        });
      }

      // ── Index labels below each cell ──────────────────
      b.overlay((o) => {
        for (let i = 0; i < unitCount; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = startX + col * STRIDE + CELL_W / 2;
          const cy = GRID_Y + row * STRIDE + CELL_H + 4;
          o.add(
            "text",
            {
              x: cx,
              y: cy,
              text: `${i}`,
              fill: "#47556988",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `dp-idx-${i}` },
          );
        }
      });

      // ── Arrow from source cell to current during filling ──
      if (phase === "filling" && currentIndex >= 1 && bestJ > 0) {
        const srcIdx = currentIndex - bestJ * bestJ;
        const srcCol = srcIdx % cols;
        const srcRow = Math.floor(srcIdx / cols);
        const srcCx = startX + srcCol * STRIDE + CELL_W / 2;
        const srcCy = GRID_Y + srcRow * STRIDE + CELL_H / 2;

        const tgtCol = currentIndex % cols;
        const tgtRow = Math.floor(currentIndex / cols);
        const tgtCx = startX + tgtCol * STRIDE + CELL_W / 2;
        const tgtCy = GRID_Y + tgtRow * STRIDE + CELL_H / 2;

        b.overlay((o) => {
          // Highlight line from source to target
          o.add(
            "line",
            {
              x1: srcCx,
              y1: srcCy,
              x2: tgtCx,
              y2: tgtCy,
              stroke: "#a78bfa",
              strokeWidth: 2,
              opacity: 0.5,
              strokeDasharray: "5,3",
            },
            { key: "dp-arrow" },
          );

          // Formula annotation above the current cell
          o.add(
            "text",
            {
              x: tgtCx,
              y: GRID_Y + tgtRow * STRIDE - 16,
              text: `dp[${srcIdx}] + 1 = ${dp[srcIdx]} + 1 = ${dp[currentIndex]}`,
              fill: "#fbbf24",
              fontSize: 9,
              fontWeight: "bold",
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "formula-label" },
          );

          // Show which square was used
          o.add(
            "text",
            {
              x: tgtCx,
              y: GRID_Y + tgtRow * STRIDE - 6,
              text: `used ${bestJ}² = ${bestJ * bestJ}`,
              fill: "#fde68a",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "sq-used" },
          );
        });
      }

      // ── Base case annotation ──────────────────────────
      if (phase === "base-case") {
        b.overlay((o) => {
          o.add(
            "text",
            {
              x: startX + CELL_W / 2,
              y: GRID_Y - 18,
              text: "dp[0] = 0",
              fill: "#22c55e",
              fontSize: 10,
              fontWeight: "bold",
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "base-lbl" },
          );
        });
      }

      // ── Init-array annotation ─────────────────────────
      if (phase === "init-array") {
        b.overlay((o) => {
          o.add(
            "text",
            {
              x: W / 2,
              y: GRID_Y + gridH + 20,
              text: `new Array(${n + 1}).fill(∞)  →  ${n + 1} slots start at ∞`,
              fill: "#47556999",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "init-ann" },
          );
        });
      }

      // ── Result annotation ─────────────────────────────
      if (phase === "result") {
        b.overlay((o) => {
          // Build the decomposition string
          let remaining = n;
          const parts: number[] = [];
          const tempDp = [...dp];
          while (remaining > 0) {
            for (let j = 1; j * j <= remaining; j++) {
              if (tempDp[remaining] === tempDp[remaining - j * j] + 1) {
                parts.push(j * j);
                remaining -= j * j;
                break;
              }
            }
          }
          o.add(
            "text",
            {
              x: W / 2,
              y: GRID_Y + gridH + 20,
              text: `${n} = ${parts.join(" + ")}  →  ${dp[n]} square${dp[n] > 1 ? "s" : ""}`,
              fill: "#86efac",
              fontSize: 11,
              fontWeight: "bold",
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "result-decomp" },
          );
        });
      }
    }

    return b;
  })();

  // ── Mount / destroy VizCraft scene ────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
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

  // ── Render ────────────────────────────────────────────
  return (
    <div className="ps-root">
      {/* Concept pills bar */}
      <div className="ps-pills">
        <ConceptPills
          pills={pills}
          onOpen={openConcept as (key: string) => void}
        />
      </div>

      <div className="ps-body">
        {/* ── Canvas area ─────────────────────────────── */}
        <div className="ps-stage">
          <div className="ps-stage__head">
            <div className="ps-input-row">
              <label className="ps-input-label">n =</label>
              <input
                className="ps-input"
                type="number"
                min={1}
                max={20}
                value={draftN}
                onChange={(e) => setDraftN(Number(e.target.value))}
                disabled={currentStep !== 0}
              />
              {currentStep === 0 && (
                <button className="ps-apply-btn" onClick={handleApply}>
                  Apply
                </button>
              )}
            </div>
            {currentStep === 0 && (
              <div className="ps-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.n}
                    className="ps-preset-btn"
                    onClick={() => handlePreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="ps-stage__stats">
              <div className={`ps-phase ps-phase--${phase}`}>
                <span className="ps-phase__label">Phase</span>
                <span className="ps-phase__value">{phase}</span>
              </div>
              <div className="ps-stat">
                <span className="ps-stat__label">n</span>
                <span className="ps-stat__value">{n}</span>
              </div>
              {isArrayPhase(phase) && (
                <div className="ps-stat">
                  <span className="ps-stat__label">Filled</span>
                  <span className="ps-stat__value">
                    {filledUpTo >= 0 ? filledUpTo + 1 : 0}/{n + 1}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="ps-stage__canvas-wrap">
            <div className="ps-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="ps-sidebar">
          {/* Persistent problem statement */}
          <div className="ps-card ps-card--problem">
            <div className="ps-card__label">Problem</div>
            <p className="ps-card__text">
              Given <strong>n = {n}</strong>, return the{" "}
              <strong>minimum number of perfect square numbers</strong> (1, 4,
              9, 16, …) that sum to n.
            </p>
          </div>

          {/* Explanation */}
          <div className="ps-card ps-card--explanation">
            <div className="ps-card__label">What's happening</div>
            <pre className="ps-card__text ps-card__text--pre">
              {explanation}
            </pre>
          </div>

          {/* ── Phase-specific reasoning cards ─────────── */}

          {/* Understand: examples & greedy trap */}
          {phase === "understand" && (
            <div className="ps-card ps-card--reasoning">
              <div className="ps-card__label">🧩 Think about it</div>
              <div className="ps-card__text">
                <p>
                  The available squares up to {n} are:{" "}
                  <strong>{squares.join(", ")}</strong>
                </p>
                <div className="ps-examples">
                  <div className="ps-example">
                    <strong>Greedy trap:</strong> always picking the largest
                    square doesn't always give the best answer!
                  </div>
                  <div className="ps-example">
                    For n = 12: greedy gives 9+1+1+1 = 4 squares, but 4+4+4 = 3
                    is better.
                  </div>
                </div>
                <p style={{ marginTop: 8, color: "#818cf8" }}>
                  We need to try ALL possible squares at each step…
                </p>
              </div>
            </div>
          )}

          {/* Sub-problem */}
          {phase === "subproblem" && (
            <div className="ps-card ps-card--reasoning">
              <div className="ps-card__label">🔍 The sub-problem</div>
              <div className="ps-card__text">
                <p>
                  <strong>Question:</strong> What's the fewest squares to make
                  sum <code className="ps-code">i</code>?
                </p>
                <div className="ps-insight">
                  <p>
                    If we subtract any square{" "}
                    <code className="ps-code">j²</code> from i, we get a smaller
                    problem: i − j².
                  </p>
                  <p>
                    If we already know dp[i − j²], then using j² costs just 1
                    more square.
                  </p>
                  <p>
                    So: <em>dp[i]</em> = min over all j of{" "}
                    <em>dp[i − j²] + 1</em>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recurrence */}
          {phase === "recurrence" && (
            <div className="ps-card ps-card--reasoning">
              <div className="ps-card__label">💡 The recurrence</div>
              <div className="ps-card__text">
                <pre className="ps-formula">
                  {`for j = 1 to √i:\n  dp[i] = min(dp[i], dp[i-j²] + 1)`}
                </pre>
                <p>
                  Unlike Climbing Stairs (which only looks at i−1 and i−2), here
                  we have an <strong>inner loop</strong> that tries every
                  square.
                </p>
                <ol>
                  <li>Create array of size n+1, fill with ∞</li>
                  <li>Set dp[0] = 0 (base case)</li>
                  <li>For each i from 1 to n, try all squares</li>
                </ol>
              </div>
            </div>
          )}

          {/* dp[i] meaning — visible during array phases */}
          {isArrayPhase(phase) && (
            <div className="ps-card ps-card--dp-meaning">
              <div className="ps-card__label">What is dp[i]?</div>
              <div className="ps-card__text">
                <p>
                  <code className="ps-code">dp[i]</code> = minimum number of
                  perfect squares that sum to <strong>i</strong>.
                </p>
                {phase === "filling" && currentIndex >= 1 && (
                  <div className="ps-ij-current">
                    Now: <code className="ps-code">dp[{currentIndex}]</code> ={" "}
                    {dp[currentIndex]} (used {bestJ}² = {bestJ * bestJ})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Base case explainer */}
          {phase === "base-case" && (
            <div className="ps-card ps-card--base-case">
              <div className="ps-card__label">Why dp[0] = 0?</div>
              <div className="ps-card__text">
                <p>
                  To make the sum <strong>0</strong>, you need{" "}
                  <strong>zero</strong> squares.
                </p>
                <p style={{ color: "#94a3b8", marginTop: 6 }}>
                  Everything else starts at ∞ — meaning "we haven't found a way
                  yet". As we fill left to right, ∞ values get replaced with
                  real answers.
                </p>
                <button
                  className="ps-base-case-link"
                  onClick={() => openConcept("base-case")}
                >
                  Read more →
                </button>
              </div>
            </div>
          )}

          {/* Loop explainer — visible during filling */}
          {phase === "filling" && currentIndex >= 1 && (
            <div className="ps-card ps-card--loop">
              <div className="ps-card__label">
                🔄 Inner loop for dp[{currentIndex}]
              </div>
              <div className="ps-card__text">
                <p>Try each square j² ≤ {currentIndex}:</p>
                {squaresUpTo(currentIndex).map((sq) => {
                  const j = Math.sqrt(sq);
                  const rem = currentIndex - sq;
                  const candidate = dp[rem] + 1;
                  const isBest = j === bestJ;
                  return (
                    <div
                      key={sq}
                      className={`ps-fill-detail${isBest ? " ps-fill-detail--best" : ""}`}
                    >
                      <span style={{ color: isBest ? "#fbbf24" : "#94a3b8" }}>
                        {isBest ? "★" : "·"}
                      </span>{" "}
                      <code className="ps-code">
                        {currentIndex} − {sq} = {rem}
                      </code>{" "}
                      → dp[{rem}] + 1 = {candidate}
                    </div>
                  );
                })}
                <p style={{ marginTop: 6, color: "#fde68a" }}>
                  Best: dp[{currentIndex}] = {dp[currentIndex]} (via {bestJ}² ={" "}
                  {bestJ * bestJ})
                </p>
              </div>
            </div>
          )}

          {/* Code */}
          <div className="ps-card ps-card--code">
            <div className="ps-card__label">Code</div>
            <pre className="ps-code-block">
              {CODE_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`ps-code-block__line${
                    i === activeCodeLine ? " ps-code-block__line--active" : ""
                  }`}
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        </aside>
      </div>
      <ConceptModal />
    </div>
  );
};

export default PerfectSquaresVisualization;
