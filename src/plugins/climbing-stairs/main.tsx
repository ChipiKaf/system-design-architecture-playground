import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { viz, type PanZoomController } from "vizcraft";
import { useClimbingStairsAnimation } from "./useClimbingStairsAnimation";
import { configure } from "./climbingStairsSlice";
import { concepts, type ConceptKey } from "./concepts";
import { useConceptModal } from "../../components/plugin-kit/useConceptModal";
import ConceptPills from "../../components/plugin-kit/ConceptPills";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const UNIT_W = 52;
const UNIT_GAP = 6;
const STRIDE = UNIT_W + UNIT_GAP;
const STEP_H = 22;
const CELL_H = 52;

const PRESETS = [
  { n: 2, label: "n = 2" },
  { n: 3, label: "n = 3" },
  { n: 5, label: "n = 5" },
  { n: 7, label: "n = 7" },
];

const pills: PillDef[] = [
  {
    key: "climbing-stairs",
    label: "Problem",
    color: "#fbbf24",
    borderColor: "#f59e0b",
  },
  { key: "dp-1d", label: "1D DP", color: "#93c5fd", borderColor: "#3b82f6" },
  {
    key: "transition",
    label: "Transition",
    color: "#c4b5fd",
    borderColor: "#a78bfa",
  },
  {
    key: "base-case",
    label: "Base Cases",
    color: "#86efac",
    borderColor: "#22c55e",
  },
  {
    key: "fibonacci",
    label: "Fibonacci",
    color: "#f9a8d4",
    borderColor: "#ec4899",
  },
];

const CODE_LINES = [
  "function climbStairs(n) {",
  "  const dp = new Array(n + 1);",
  "  dp[0] = 1;",
  "  dp[1] = 1;",
  "  for (let i = 2; i <= n; i++) {",
  "    dp[i] = dp[i-1] + dp[i-2];",
  "  }",
  "  return dp[n];",
  "}",
];

/** Helper: is the phase in the "visual" range (array visible) */
function isArrayPhase(p: string) {
  return (
    p === "init-array" ||
    p === "base-0" ||
    p === "base-1" ||
    p === "filling" ||
    p === "result"
  );
}

const ClimbingStairsVisualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const dispatch = useDispatch();
  const { runtime, currentStep } =
    useClimbingStairsAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);

  const [draftN, setDraftN] = useState(runtime.n);

  const { n, dp, phase, filledUpTo, currentIndex, explanation } = runtime;

  useEffect(() => {
    setDraftN(runtime.n);
  }, [runtime.n]);

  const handleApply = useCallback(() => {
    if (currentStep !== 0) return;
    const val = Math.max(2, Math.min(10, draftN));
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
    if (phase === "base-0") return 2;
    if (phase === "base-1") return 3;
    if (phase === "filling") return 5;
    if (phase === "result") return 7;
    return -1;
  })();

  // ── Compute scene dimensions ──────────────────────────
  const unitCount = n + 1;
  const totalGridW = unitCount * STRIDE - UNIT_GAP;
  const maxStairH = unitCount * STEP_H;
  const MARGIN_TOP = 50;
  const STAIR_BASE_Y = MARGIN_TOP + maxStairH + 20;
  const DP_LABEL_Y = STAIR_BASE_Y + 40;
  const DP_Y = DP_LABEL_Y + 20;
  const W = Math.max(650, totalGridW + 140);
  const H = DP_Y + CELL_H + 60;
  const startX = (W - totalGridW) / 2;

  // ── Build VizCraft scene ──────────────────────────────
  const scene = (() => {
    const b = viz().view(W, H);

    // During reasoning phases (understand/subproblem/recurrence) show just
    // a staircase illustration; no DP array yet
    const showDpArray = isArrayPhase(phase);

    // ── Staircase title ─────────────────────────────────
    b.overlay((o) => {
      o.add(
        "text",
        {
          x: W / 2,
          y: MARGIN_TOP - 20,
          text: `🪜 n = ${n} stairs`,
          fill: "#64748b",
          fontSize: 12,
          textAnchor: "middle",
        },
        { key: "stair-title" },
      );
    });

    // ── Staircase columns ───────────────────────────────
    b.overlay((o) => {
      for (let i = 0; i <= n; i++) {
        const sx = startX + i * STRIDE;
        const topY = STAIR_BASE_Y - (i + 1) * STEP_H;
        const h = (i + 1) * STEP_H;

        let fill: string;
        let stroke: string;
        let strokeW = 1.5;

        if (phase === "result") {
          fill = i === n ? "#052e16" : "#071a0e";
          stroke = i === n ? "#22c55e" : "#16a34a88";
          strokeW = i === n ? 2.5 : 1.2;
        } else if (i === currentIndex && phase === "filling") {
          fill = "#1c1917";
          stroke = "#f59e0b";
          strokeW = 2.2;
        } else if (i === currentIndex && (phase === "base-0" || phase === "base-1")) {
          fill = "#0b2545";
          stroke = "#3b82f6";
          strokeW = 2;
        } else if (i <= filledUpTo && filledUpTo >= 0) {
          fill = "#0b1e3a";
          stroke = "#2563eb55";
          strokeW = 1.2;
        } else if (phase === "understand" || phase === "subproblem" || phase === "recurrence") {
          fill = "#0f172a";
          stroke = "#334155";
          strokeW = 1;
        } else if (phase !== "intro") {
          fill = "#0a0f1a";
          stroke = "#1e293b66";
          strokeW = 0.8;
        } else {
          fill = "#080c14";
          stroke = "#151d2e";
          strokeW = 0.5;
        }

        o.add(
          "rect",
          {
            x: sx,
            y: topY,
            width: UNIT_W,
            height: h,
            fill,
            stroke,
            strokeWidth: strokeW,
            rx: 3,
          },
          { key: `stair-${i}` },
        );

        // Step number at top of column
        o.add(
          "text",
          {
            x: sx + UNIT_W / 2,
            y: topY + 14,
            text: String(i),
            fill:
              phase === "result"
                ? "#4ade80"
                : i === currentIndex
                  ? "#fbbf24"
                  : i <= filledUpTo && filledUpTo >= 0
                    ? "#60a5fa"
                    : "#94a3b8",
            fontSize: 11,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: `stair-num-${i}` },
        );

        // "Ground" / "Top!" labels
        if (i === 0) {
          o.add(
            "text",
            {
              x: sx + UNIT_W / 2,
              y: STAIR_BASE_Y + 14,
              text: "Ground",
              fill: "#475569",
              fontSize: 9,
              textAnchor: "middle",
            },
            { key: "ground-label" },
          );
        }
        if (i === n) {
          o.add(
            "text",
            {
              x: sx + UNIT_W / 2,
              y: topY - 8,
              text: phase === "result" ? `🎉 ${dp[n]} ways!` : "Top!",
              fill: phase === "result" ? "#86efac" : "#94a3b8",
              fontSize: phase === "result" ? 12 : 10,
              fontWeight: phase === "result" ? "bold" : "normal",
              textAnchor: "middle",
            },
            { key: "top-label" },
          );
        }
      }

      // ── "understand" phase: show example paths on staircase ──
      if (phase === "understand" && n <= 5) {
        const exY = STAIR_BASE_Y + 26;
        const examples: string[] = [];
        if (n === 2) examples.push("(1+1)", "(2)");
        else if (n === 3) examples.push("(1+1+1)", "(1+2)", "(2+1)");
        else if (n === 4) examples.push("(1+1+1+1)", "(1+1+2)", "(1+2+1)", "(2+1+1)", "(2+2)");
        else if (n === 5) examples.push("(11111)", "(1+1+1+2)", "(1+1+2+1)", "(1+2+1+1)", "(2+1+1+1)", "(1+2+2)", "(2+1+2)", "(2+2+1)");

        o.add(
          "text",
          {
            x: W / 2,
            y: exY,
            text: `Example ways: ${examples.slice(0, 4).join("  ")}${examples.length > 4 ? " …" : ""}`,
            fill: "#818cf8",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "example-paths" },
        );
      }

      // ── "subproblem" phase: show dp[i] = ? above stairs ──
      if (phase === "subproblem") {
        for (let i = 0; i <= n; i++) {
          const sx = startX + i * STRIDE;
          const topY = STAIR_BASE_Y - (i + 1) * STEP_H;
          o.add(
            "text",
            {
              x: sx + UNIT_W / 2,
              y: topY - 8,
              text: `dp[${i}] = ?`,
              fill: "#a78bfa",
              fontSize: 9,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `sub-q-${i}` },
          );
        }
      }

      // ── "recurrence" phase: show arrows for dp[i] = dp[i-1] + dp[i-2] ──
      if (phase === "recurrence" && n >= 3) {
        const exI = Math.min(3, n);
        const curCx = startX + exI * STRIDE + UNIT_W / 2;
        const curTopY = STAIR_BASE_Y - (exI + 1) * STEP_H;
        const prev1Cx = startX + (exI - 1) * STRIDE + UNIT_W / 2;
        const prev1TopY = STAIR_BASE_Y - exI * STEP_H;
        const prev2Cx = startX + (exI - 2) * STRIDE + UNIT_W / 2;
        const prev2TopY = STAIR_BASE_Y - (exI - 1) * STEP_H;

        o.add(
          "line",
          {
            x1: prev1Cx + 4,
            y1: prev1TopY + 4,
            x2: curCx - 4,
            y2: curTopY + 4,
            stroke: "#a78bfa",
            strokeWidth: 2.5,
            opacity: 0.8,
          },
          { key: "rec-arrow-1" },
        );
        o.add(
          "text",
          {
            x: (prev1Cx + curCx) / 2,
            y: (prev1TopY + curTopY) / 2 - 6,
            text: "+1 step",
            fill: "#a78bfa",
            fontSize: 9,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "rec-arrow-1-label" },
        );

        o.add(
          "line",
          {
            x1: prev2Cx + 4,
            y1: prev2TopY + 4,
            x2: curCx - 4,
            y2: curTopY + 4,
            stroke: "#60a5fa",
            strokeWidth: 2.5,
            opacity: 0.6,
            strokeDasharray: "5,3",
          },
          { key: "rec-arrow-2" },
        );
        o.add(
          "text",
          {
            x: (prev2Cx + curCx) / 2,
            y: (prev2TopY + curTopY) / 2 - 14,
            text: "+2 steps",
            fill: "#60a5fa",
            fontSize: 9,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "rec-arrow-2-label" },
        );

        // Formula below
        const fY = STAIR_BASE_Y + 26;
        o.add(
          "text",
          {
            x: W / 2,
            y: fY,
            text: `dp[${exI}] = dp[${exI - 1}] + dp[${exI - 2}]`,
            fill: "#c084fc",
            fontSize: 12,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "rec-formula" },
        );
      }

      // ── Staircase "+1" / "+2" arrows during filling ──
      if (phase === "filling" && currentIndex >= 2) {
        const curCx = startX + currentIndex * STRIDE + UNIT_W / 2;
        const curTopY = STAIR_BASE_Y - (currentIndex + 1) * STEP_H;
        const prev1Cx = startX + (currentIndex - 1) * STRIDE + UNIT_W / 2;
        const prev1TopY = STAIR_BASE_Y - currentIndex * STEP_H;
        const prev2Cx = startX + (currentIndex - 2) * STRIDE + UNIT_W / 2;
        const prev2TopY = STAIR_BASE_Y - (currentIndex - 1) * STEP_H;

        o.add(
          "line",
          {
            x1: prev1Cx + 4,
            y1: prev1TopY + 4,
            x2: curCx - 4,
            y2: curTopY + 4,
            stroke: "#a78bfa",
            strokeWidth: 2,
            opacity: 0.7,
          },
          { key: "stair-arrow-1" },
        );
        o.add(
          "text",
          {
            x: (prev1Cx + curCx) / 2,
            y: (prev1TopY + curTopY) / 2 - 6,
            text: "+1",
            fill: "#a78bfa",
            fontSize: 10,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "stair-arrow-1-label" },
        );

        o.add(
          "line",
          {
            x1: prev2Cx + 4,
            y1: prev2TopY + 4,
            x2: curCx - 4,
            y2: curTopY + 4,
            stroke: "#60a5fa",
            strokeWidth: 2,
            opacity: 0.5,
            strokeDasharray: "5,3",
          },
          { key: "stair-arrow-2" },
        );
        o.add(
          "text",
          {
            x: (prev2Cx + curCx) / 2,
            y: (prev2TopY + curTopY) / 2 - 14,
            text: "+2",
            fill: "#60a5fa",
            fontSize: 10,
            fontWeight: "bold",
            textAnchor: "middle",
          },
          { key: "stair-arrow-2-label" },
        );
      }
    });

    // ── DP array section (only visible after init-array) ─
    if (showDpArray) {
      // ── DP array label ────────────────────────────────
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: DP_LABEL_Y,
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
      for (let i = 0; i <= n; i++) {
        const cx = startX + i * STRIDE + UNIT_W / 2;
        const cy = DP_Y + CELL_H / 2;

        const isCurrent =
          i === currentIndex &&
          (phase === "filling" || phase === "base-0" || phase === "base-1");
        const isSource =
          phase === "filling" &&
          currentIndex >= 2 &&
          (i === currentIndex - 1 || i === currentIndex - 2);
        const isFilled = i <= filledUpTo && filledUpTo >= 0;

        let fill: string;
        let stroke: string;
        let strokeW: number;
        let labelFill: string;
        let labelText: string;

        if (phase === "result") {
          fill = i === n ? "#052e16" : "#071a0e";
          stroke = i === n ? "#22c55e" : "#16a34a66";
          strokeW = i === n ? 2.5 : 1.4;
          labelFill = i === n ? "#86efac" : "#4ade80";
          labelText = String(dp[i]);
        } else if (isCurrent && phase === "filling") {
          fill = "#1c1917";
          stroke = "#f59e0b";
          strokeW = 2.4;
          labelFill = "#fbbf24";
          labelText = String(dp[i]);
        } else if (isCurrent && (phase === "base-0" || phase === "base-1")) {
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
          labelText = String(dp[i]);
        } else if (isFilled) {
          fill = "#0b1e3a";
          stroke = "#2563eb55";
          strokeW = 1.4;
          labelFill = "#60a5fa";
          labelText = String(dp[i]);
        } else {
          fill = "#0a0f1a";
          stroke = "#1e293b88";
          strokeW = 0.8;
          labelFill = "#334155";
          labelText = "–";
        }

        const node = b
          .node(`dp-${i}`)
          .at(cx, cy)
          .rect(UNIT_W, CELL_H, 6)
          .fill(fill)
          .stroke(stroke, strokeW);

        if (labelText) {
          node.label(labelText, {
            fill: labelFill,
            fontSize: labelText === "–" ? 14 : 16,
            fontWeight: labelText === "–" ? "normal" : "bold",
            fontFamily: '"JetBrains Mono", monospace',
          });
        }
      }

      // ── Index labels below DP cells ───────────────────
      b.overlay((o) => {
        for (let i = 0; i <= n; i++) {
          const cx = startX + i * STRIDE + UNIT_W / 2;
          o.add(
            "text",
            {
              x: cx,
              y: DP_Y + CELL_H + 16,
              text: `[${i}]`,
              fill: "#475569",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `dp-idx-${i}` },
          );
        }
      });
    }

    // ── Formula annotation during filling ───────────────
    if (phase === "filling" && currentIndex >= 2) {
      const cx = startX + currentIndex * STRIDE + UNIT_W / 2;
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: cx,
            y: DP_Y - 22,
            text: `dp[${currentIndex - 1}] + dp[${currentIndex - 2}]`,
            fill: "#fbbf24",
            fontSize: 10,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "formula-label" },
        );
        o.add(
          "text",
          {
            x: cx,
            y: DP_Y - 10,
            text: `= ${dp[currentIndex - 1]} + ${dp[currentIndex - 2]} = ${dp[currentIndex]}`,
            fill: "#fde68a",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "formula-value" },
        );
      });
    }

    // ── Source cell highlight lines to current cell ──────
    if (phase === "filling" && currentIndex >= 2) {
      b.overlay((o) => {
        const src1X = startX + (currentIndex - 1) * STRIDE + UNIT_W;
        const tgtX = startX + currentIndex * STRIDE;
        const midY = DP_Y + CELL_H / 2;

        o.add(
          "line",
          {
            x1: src1X + 2,
            y1: midY,
            x2: tgtX - 2,
            y2: midY,
            stroke: "#a78bfa",
            strokeWidth: 2,
            opacity: 0.6,
          },
          { key: "dp-arrow-1" },
        );

        const src2Cx = startX + (currentIndex - 2) * STRIDE + UNIT_W / 2;
        const tgtCx = startX + currentIndex * STRIDE + UNIT_W / 2;
        const aboveY = DP_Y - 4;

        o.add(
          "line",
          {
            x1: src2Cx,
            y1: DP_Y,
            x2: src2Cx,
            y2: aboveY,
            stroke: "#60a5fa",
            strokeWidth: 1.5,
            opacity: 0.4,
            strokeDasharray: "4,3",
          },
          { key: "dp-arrow-2a" },
        );
        o.add(
          "line",
          {
            x1: src2Cx,
            y1: aboveY,
            x2: tgtCx,
            y2: aboveY,
            stroke: "#60a5fa",
            strokeWidth: 1.5,
            opacity: 0.4,
            strokeDasharray: "4,3",
          },
          { key: "dp-arrow-2b" },
        );
        o.add(
          "line",
          {
            x1: tgtCx,
            y1: aboveY,
            x2: tgtCx,
            y2: DP_Y,
            stroke: "#60a5fa",
            strokeWidth: 1.5,
            opacity: 0.4,
            strokeDasharray: "4,3",
          },
          { key: "dp-arrow-2c" },
        );
      });
    }

    // ── Base-case annotations ───────────────────────────
    if (phase === "base-0") {
      b.overlay((o) => {
        const cx0 = startX + UNIT_W / 2;
        o.add(
          "text",
          {
            x: cx0,
            y: DP_Y - 8,
            text: "dp[0] = 1",
            fill: "#22c55e",
            fontSize: 10,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "base-0-lbl" },
        );
      });
    }

    if (phase === "base-1") {
      b.overlay((o) => {
        const cx0 = startX + UNIT_W / 2;
        const cx1 = startX + STRIDE + UNIT_W / 2;
        o.add(
          "text",
          {
            x: cx0,
            y: DP_Y - 8,
            text: "dp[0] = 1",
            fill: "#22c55e88",
            fontSize: 10,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "base-0-dim" },
        );
        o.add(
          "text",
          {
            x: cx1,
            y: DP_Y - 8,
            text: "dp[1] = 1",
            fill: "#22c55e",
            fontSize: 10,
            fontWeight: "bold",
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "base-1-lbl" },
        );
      });
    }

    // ── Init-array annotation ───────────────────────────
    if (phase === "init-array") {
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: W / 2,
            y: DP_Y + CELL_H + 34,
            text: `const dp = new Array(${n + 1})  →  ${n + 1} slots, one per step`,
            fill: "#47556999",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "init-annotation" },
        );
      });
    }

    // ── Result: Fibonacci note ──────────────────────────
    if (phase === "result") {
      b.overlay((o) => {
        const vals = dp.slice(0, n + 1).join(", ");
        o.add(
          "text",
          {
            x: W / 2,
            y: DP_Y + CELL_H + 34,
            text: `Fibonacci pattern: ${vals}`,
            fill: "#ec489988",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "fib-note" },
        );
      });
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
    <div className="cs-root">
      {/* Concept pills bar */}
      <div className="cs-pills">
        <ConceptPills
          pills={pills}
          onOpen={openConcept as (key: string) => void}
        />
      </div>

      <div className="cs-body">
        {/* ── Canvas area ─────────────────────────────── */}
        <div className="cs-stage">
          <div className="cs-stage__head">
            <div className="cs-input-row">
              <label className="cs-input-label">n =</label>
              <input
                className="cs-input"
                type="number"
                min={2}
                max={10}
                value={draftN}
                onChange={(e) => setDraftN(Number(e.target.value))}
                disabled={currentStep !== 0}
              />
              {currentStep === 0 && (
                <button className="cs-apply-btn" onClick={handleApply}>
                  Apply
                </button>
              )}
            </div>
            {currentStep === 0 && (
              <div className="cs-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.n}
                    className="cs-preset-btn"
                    onClick={() => handlePreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="cs-stage__stats">
              <div className={`cs-phase cs-phase--${phase}`}>
                <span className="cs-phase__label">Phase</span>
                <span className="cs-phase__value">{phase}</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat__label">n</span>
                <span className="cs-stat__value">{n}</span>
              </div>
              {isArrayPhase(phase) && (
                <div className="cs-stat">
                  <span className="cs-stat__label">Filled</span>
                  <span className="cs-stat__value">
                    {filledUpTo >= 0 ? filledUpTo + 1 : 0}/{n + 1}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="cs-stage__canvas-wrap">
            <div className="cs-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="cs-sidebar">
          {/* Persistent problem statement */}
          <div className="cs-card cs-card--problem">
            <div className="cs-card__label">Problem</div>
            <p className="cs-card__text">
              You are climbing a staircase with <strong>{n} steps</strong>.
              Each time you can take <strong>1 step</strong> or{" "}
              <strong>2 steps</strong>. How many distinct ways can you reach
              the top?
            </p>
          </div>

          {/* Explanation — always visible */}
          <div className="cs-card cs-card--explanation">
            <div className="cs-card__label">What's happening</div>
            <p className="cs-card__text">{explanation}</p>
          </div>

          {/* ── Phase-specific reasoning cards ─────────── */}

          {/* Understand: show small examples */}
          {phase === "understand" && (
            <div className="cs-card cs-card--reasoning">
              <div className="cs-card__label">🧩 Think about it</div>
              <div className="cs-card__text">
                <p>For small values of n:</p>
                <div className="cs-examples">
                  <div className="cs-example">
                    <strong>n = 2</strong> → 2 ways: (1+1), (2)
                  </div>
                  <div className="cs-example">
                    <strong>n = 3</strong> → 3 ways: (1+1+1), (1+2), (2+1)
                  </div>
                  <div className="cs-example">
                    <strong>n = 4</strong> → 5 ways: (1111), (112), (121),
                    (211), (22)
                  </div>
                </div>
                <p style={{ marginTop: 8, color: "#818cf8" }}>
                  Notice a pattern? Each answer uses the previous two…
                </p>
              </div>
            </div>
          )}

          {/* Sub-problem: explain the key insight */}
          {phase === "subproblem" && (
            <div className="cs-card cs-card--reasoning">
              <div className="cs-card__label">🔍 The sub-problem</div>
              <div className="cs-card__text">
                <p>
                  <strong>Question:</strong> How do you get to step{" "}
                  <code className="cs-code">i</code>?
                </p>
                <div className="cs-insight">
                  <p>You can only get there from:</p>
                  <ul>
                    <li>
                      Step <code className="cs-code">i−1</code> (taking +1
                      step)
                    </li>
                    <li>
                      Step <code className="cs-code">i−2</code> (taking +2
                      steps)
                    </li>
                  </ul>
                  <p>
                    So: <em>ways to reach step i</em> ={" "}
                    <em>ways to reach i−1</em> + <em>ways to reach i−2</em>
                  </p>
                </div>
                <p style={{ marginTop: 8 }}>
                  Let's define:{" "}
                  <code className="cs-code">dp[i]</code> = number of distinct
                  ways to reach step <strong>i</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Recurrence: show the formula */}
          {phase === "recurrence" && (
            <div className="cs-card cs-card--reasoning">
              <div className="cs-card__label">💡 The recurrence</div>
              <div className="cs-card__text">
                <pre className="cs-formula">
                  dp[i] = dp[i-1] + dp[i-2]
                </pre>
                <p>
                  This is the same formula as the{" "}
                  <strong style={{ color: "#f9a8d4" }}>
                    Fibonacci sequence
                  </strong>
                  !
                </p>
                <p style={{ marginTop: 8 }}>
                  Now we just need:
                </p>
                <ol>
                  <li>An array to store the results</li>
                  <li>Base cases (what we know for sure)</li>
                  <li>A loop to fill the rest</li>
                </ol>
              </div>
            </div>
          )}

          {/* What dp[i] means — visible during array/fill phases */}
          {isArrayPhase(phase) && (
            <div className="cs-card cs-card--dp-meaning">
              <div className="cs-card__label">What is dp[i]?</div>
              <div className="cs-card__text">
                <p>
                  <code className="cs-code">dp[i]</code> = the number of
                  distinct ways to reach step <strong>i</strong> from the
                  ground.
                </p>
                {phase === "filling" && currentIndex >= 2 && (
                  <div className="cs-ij-current">
                    Right now: <code className="cs-code">dp[{currentIndex}]</code>{" "}
                    = ways to reach step {currentIndex} = {dp[currentIndex]}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Base case explainer */}
          {(phase === "base-0" || phase === "base-1") && (
            <div className="cs-card cs-card--base-case">
              <div className="cs-card__label">Why these base cases?</div>
              <div className="cs-card__text">
                {phase === "base-0" && (
                  <>
                    <p>
                      <code className="cs-code">dp[0] = 1</code> —{" "}
                      there is <strong>one way</strong> to be at the ground:
                      do nothing.
                    </p>
                    <p style={{ color: "#94a3b8", marginTop: 6 }}>
                      This feels weird, but it's needed! Without it, dp[2]
                      would be wrong. Try: dp[2] = dp[1] + dp[0] = 1 + 1 = 2.
                      ✓
                    </p>
                  </>
                )}
                {phase === "base-1" && (
                  <>
                    <p>
                      <code className="cs-code">dp[1] = 1</code> —{" "}
                      there is <strong>one way</strong> to reach step 1:
                      take a single step from the ground.
                    </p>
                    <p style={{ color: "#94a3b8", marginTop: 6 }}>
                      Now we have two known values. The loop can begin!
                    </p>
                  </>
                )}
                <button
                  className="cs-base-case-link"
                  onClick={() => openConcept("base-case")}
                >
                  Read more →
                </button>
              </div>
            </div>
          )}

          {/* Loop explainer — visible during filling */}
          {phase === "filling" && (
            <div className="cs-card cs-card--loop">
              <div className="cs-card__label">🔄 The loop</div>
              <div className="cs-card__text">
                <p>
                  <code className="cs-code">
                    for (i = 2; i &lt;= {n}; i++)
                  </code>
                </p>
                <p>
                  We go left → right, computing each cell using the two before
                  it. Since dp[i−1] and dp[i−2] are already filled, we always
                  have the data we need.
                </p>
                <div className="cs-fill-detail">
                  <span style={{ color: "#a78bfa" }}>■</span>
                  <code className="cs-code">dp[{currentIndex - 1}]</code>{" "}
                  = {dp[currentIndex - 1]} (came from +1 step)
                </div>
                <div className="cs-fill-detail">
                  <span style={{ color: "#60a5fa" }}>■</span>
                  <code className="cs-code">dp[{currentIndex - 2}]</code>{" "}
                  = {dp[currentIndex - 2]} (came from +2 steps)
                </div>
              </div>
            </div>
          )}

          {/* Code */}
          <div className="cs-card cs-card--code">
            <div className="cs-card__label">Code</div>
            <pre className="cs-code-block">
              {CODE_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`cs-code-block__line${
                    i === activeCodeLine ? " cs-code-block__line--active" : ""
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

export default ClimbingStairsVisualization;
