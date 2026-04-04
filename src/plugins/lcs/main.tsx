import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { viz, type PanZoomController } from "vizcraft";
import { useLcsAnimation } from "./useLcsAnimation";
import { configure } from "./lcsSlice";
import { concepts, type ConceptKey } from "./concepts";
import { useConceptModal } from "../../components/plugin-kit/useConceptModal";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import ConceptPills from "../../components/plugin-kit/ConceptPills";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const CELL = 46;
const GAP = 2;
const GRID_X = 50;
const GRID_Y = 46;

const PRESETS: { text1: string; text2: string; label: string }[] = [
  { text1: "abcde", text2: "ace", label: '"abcde" vs "ace"' },
  { text1: "abc", text2: "abc", label: '"abc" vs "abc"' },
  { text1: "abc", text2: "def", label: '"abc" vs "def"' },
  { text1: "AGCAT", text2: "GAC", label: '"AGCAT" vs "GAC"' },
];

const pills: PillDef[] = [
  { key: "lcs", label: "LCS", color: "#93c5fd", borderColor: "#3b82f6" },
  {
    key: "subproblem-2d",
    label: "2D Subproblem",
    color: "#fdba74",
    borderColor: "#fb923c",
  },
  {
    key: "transition-lcs",
    label: "Transition",
    color: "#f0abfc",
    borderColor: "#e879f9",
  },
  {
    key: "subsequence",
    label: "Subsequence",
    color: "#5eead4",
    borderColor: "#14b8a6",
  },
  {
    key: "traceback",
    label: "Traceback",
    color: "#fbbf24",
    borderColor: "#f59e0b",
  },
  {
    key: "base-case",
    label: 'Why ""?',
    color: "#f9a8d4",
    borderColor: "#f472b6",
  },
];

const CODE_LINES = [
  "function lcs(text1, text2) {",
  "  const m = text1.length, n = text2.length;",
  "  const dp = Array(m+1).fill(null)",
  "    .map(() => Array(n+1).fill(0));",
  "  for (let i = 1; i <= m; i++) {",
  "    for (let j = 1; j <= n; j++) {",
  "      if (text1[i-1] === text2[j-1])",
  "        dp[i][j] = dp[i-1][j-1] + 1;",
  "      else",
  "        dp[i][j] = Math.max(",
  "          dp[i-1][j], dp[i][j-1]);",
  "    }",
  "  }",
  "  return dp[m][n];",
  "}",
];

const LcsVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const dispatch = useDispatch();
  const { runtime, currentStep } = useLcsAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);

  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);

  const [draftT1, setDraftT1] = useState(runtime.text1);
  const [draftT2, setDraftT2] = useState(runtime.text2);

  const {
    text1,
    text2,
    dp,
    phase,
    revealedCount,
    currentRow,
    currentCol,
    explanation,
    steps,
    lcsString,
    tracePath,
  } = runtime;

  const rows = text1.length + 1;
  const cols = text2.length + 1;

  useEffect(() => {
    setDraftT1(runtime.text1);
    setDraftT2(runtime.text2);
  }, [runtime.text1, runtime.text2]);

  const handleApply = useCallback(() => {
    if (currentStep !== 0) return;
    const t1 = draftT1.trim();
    const t2 = draftT2.trim();
    if (t1.length > 0 && t2.length > 0) {
      dispatch(configure({ text1: t1, text2: t2 }));
    }
  }, [currentStep, draftT1, draftT2, dispatch]);

  const handlePreset = useCallback(
    (p: (typeof PRESETS)[number]) => {
      if (currentStep !== 0) return;
      setDraftT1(p.text1);
      setDraftT2(p.text2);
      dispatch(configure({ text1: p.text1, text2: p.text2 }));
    },
    [currentStep, dispatch],
  );

  // Which cells have been filled so far
  const filledSet = new Set<string>();
  for (let k = 0; k < revealedCount; k++) {
    const s = steps[k];
    filledSet.add(`${s.row},${s.col}`);
  }

  // Trace path lookup
  const traceSet = new Set<string>();
  tracePath.forEach((p) => traceSet.add(`${p.row},${p.col}`));

  // Current step info
  const currentStepData =
    revealedCount > 0 && revealedCount <= steps.length
      ? steps[revealedCount - 1]
      : null;

  // Active code line
  const activeCodeLine = (() => {
    if (phase === "intro") return -1; // nothing highlighted
    if (phase === "init-null") return 2; // Array(m+1).fill(null)
    if (phase === "init-zero") return 3; // .map(() => Array(n+1).fill(0))
    if (phase === "filling") return 6; // if text1[i-1] === text2[j-1]
    if (phase === "match") return 7; // dp[i][j] = dp[i-1][j-1] + 1
    if (phase === "noMatch") return 9; // dp[i][j] = max(...)
    if (phase === "result") return 13; // return
    return 4; // for loops
  })();

  // ── Build VizCraft scene ────────────────────────────────
  const nullPhaseW = GRID_X + rows * (CELL + GAP) + 60;
  const zeroPhaseW = GRID_X + cols * (CELL + GAP) + 220;
  const fillPhaseW = GRID_X + cols * (CELL + GAP) + 180;
  const gridPhaseW = GRID_X + cols * (CELL + GAP) + 40;
  const W =
    phase === "init-zero"
      ? Math.max(zeroPhaseW, gridPhaseW)
      : isFillPhase(phase)
        ? Math.max(fillPhaseW, gridPhaseW)
        : Math.max(nullPhaseW, gridPhaseW);
  const fillAnnotationH = isFillPhase(phase) ? 50 : 0;
  const H = GRID_Y + rows * (CELL + GAP) + 30 + fillAnnotationH;

  const scene = (() => {
    const b = viz().view(W, H);

    // ── Column headers (text2 chars) ──────────────────────
    const hideColHeaders = phase === "init-null";
    b.overlay((o) => {
      // Empty corner label
      o.add(
        "text",
        {
          x: GRID_X + (CELL + GAP) / 2,
          y: GRID_Y - 12,
          text: '""',
          fill: hideColHeaders ? "transparent" : "#475569",
          fontSize: 10,
          fontFamily: '"JetBrains Mono", monospace',
          textAnchor: "middle",
        },
        { key: "col-hdr-empty" },
      );
      for (let j = 1; j < cols; j++) {
        const cx = GRID_X + j * (CELL + GAP) + (CELL + GAP) / 2;
        const isActive = currentCol === j && isFillPhase(phase);
        o.add(
          "text",
          {
            x: cx,
            y: GRID_Y - 12,
            text: text2[j - 1],
            fill: hideColHeaders
              ? "transparent"
              : isActive
                ? "#fbbf24"
                : "#94a3b8",
            fontSize: isActive ? 16 : 13,
            fontWeight: isActive ? 700 : 500,
            textAnchor: "middle",
          },
          { key: `col-hdr-${j}` },
        );
        // Underline the active column header
        if (isActive) {
          o.add(
            "rect",
            {
              x: cx - 8,
              y: GRID_Y - 6,
              width: 16,
              height: 2,
              fill: "#f59e0b",
              rx: 1,
            },
            { key: `col-hdr-bar-${j}` },
          );
        }
      }
      // "text2 →" label
      o.add(
        "text",
        {
          x: GRID_X + (cols * (CELL + GAP)) / 2,
          y: GRID_Y - 30,
          text: `text2 → "${text2}"`,
          fill: hideColHeaders ? "transparent" : "#64748b",
          fontSize: 10,
          textAnchor: "middle",
        },
        { key: "text2-label" },
      );
    });

    // ── Row headers (text1 chars) ─────────────────────────
    const hideRowHeaders = phase === "init-null";
    b.overlay((o) => {
      o.add(
        "text",
        {
          x: GRID_X - 12,
          y: GRID_Y + (CELL + GAP) / 2 + 4,
          text: '""',
          fill: hideRowHeaders ? "transparent" : "#475569",
          fontSize: 10,
          fontFamily: '"JetBrains Mono", monospace',
          textAnchor: "end",
        },
        { key: "row-hdr-empty" },
      );
      for (let i = 1; i < rows; i++) {
        const cy = GRID_Y + i * (CELL + GAP) + (CELL + GAP) / 2 + 4;
        const isActive = currentRow === i && isFillPhase(phase);
        o.add(
          "text",
          {
            x: GRID_X - 12,
            y: cy,
            text: text1[i - 1],
            fill: hideRowHeaders
              ? "transparent"
              : isActive
                ? "#fbbf24"
                : "#94a3b8",
            fontSize: isActive ? 16 : 13,
            fontWeight: isActive ? 700 : 500,
            textAnchor: "end",
          },
          { key: `row-hdr-${i}` },
        );
        // Left bar for active row header
        if (isActive) {
          o.add(
            "rect",
            {
              x: GRID_X - 6,
              y: cy - 10,
              width: 2,
              height: 16,
              fill: "#f59e0b",
              rx: 1,
            },
            { key: `row-hdr-bar-${i}` },
          );
        }
      }
      // "text1 ↓" label
      o.add(
        "text",
        {
          x: GRID_X - 36,
          y: GRID_Y + (rows * (CELL + GAP)) / 2,
          text: hideRowHeaders ? "" : "text1 ↓",
          fill: "#64748b",
          fontSize: 10,
          textAnchor: "middle",
          transform: `rotate(-90, ${GRID_X - 36}, ${GRID_Y + (rows * (CELL + GAP)) / 2})`,
        },
        { key: "text1-label" },
      );
    });

    // ── Grid cells ────────────────────────────────────────
    const { initPhase } = runtime;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const cx = GRID_X + j * (CELL + GAP) + (CELL + GAP) / 2;
        const cy = GRID_Y + i * (CELL + GAP) + (CELL + GAP) / 2;
        // During init-null, lay out j=0 cells as a horizontal 1D array
        const posX =
          phase === "init-null" && j === 0
            ? GRID_X + i * (CELL + GAP) + (CELL + GAP) / 2
            : cx;
        const posY =
          phase === "init-null" && j === 0 ? GRID_Y + (CELL + GAP) / 2 : cy;
        const key = `${i},${j}`;
        const isCurrent = i === currentRow && j === currentCol;
        const isFilled = filledSet.has(key);
        const isBase = i === 0 || j === 0;
        const isOnTrace = phase === "result" && traceSet.has(key);
        const val = dp[i]?.[j] ?? 0;

        // Is this cell a source for the current decision?
        let isSourceCell = false;
        if (isFillPhase(phase) && currentRow > 0 && currentCol > 0) {
          if (i === currentRow - 1 && j === currentCol - 1) isSourceCell = true;
          if (i === currentRow - 1 && j === currentCol) isSourceCell = true;
          if (i === currentRow && j === currentCol - 1) isSourceCell = true;
        }

        // Determine visual style
        let fill = "#0a0e1a";
        let stroke = "#151d2e";
        let strokeW = 1;
        let labelFill = "#283040";
        let labelText = "";
        let labelSize = 15;

        // ── Init phases: show null → 0 progression ────
        if (phase === "init-null") {
          if (j === 0) {
            // Array(m+1).fill(null) — only a 1D column exists
            fill = "#1a0e0e";
            stroke = "#78350f55";
            strokeW = 1;
            labelFill = "#92400e";
            labelText = "null";
            labelSize = 10;
          } else {
            // 2D grid doesn't exist yet — hide these cells
            fill = "transparent";
            stroke = "transparent";
            strokeW = 0;
          }
        } else if (phase === "init-zero") {
          if (isBase) {
            // Base row/col: these are the 0s from .fill(0)
            fill = "#0c1222";
            stroke = "#334155";
            strokeW = 1.2;
            labelFill = "#64748b";
            labelText = "0";
          } else {
            // Inner cells: also 0 from .fill(0)
            fill = "#0a0f1a";
            stroke = "#1e293b88";
            strokeW = 0.8;
            labelFill = "#334155";
            labelText = "0";
          }
          // ── Filling / result phases ───────────────────
        } else if (isCurrent && (phase === "match" || phase === "noMatch")) {
          fill = phase === "match" ? "#1a1a40" : "#0c2340";
          stroke = phase === "match" ? "#a78bfa" : "#60a5fa";
          strokeW = 2.8;
          labelFill = "#fbbf24";
          labelText = String(val);
        } else if (isCurrent && phase === "filling") {
          fill = "#1e2d3d";
          stroke = "#f59e0b";
          strokeW = 2.4;
          labelFill = "#fbbf24";
          labelText = "?";
          labelSize = 18;
        } else if (isOnTrace) {
          fill = "#052e16";
          stroke = "#22c55e";
          strokeW = 2.2;
          labelFill = "#86efac";
          labelText = String(val);
        } else if (isSourceCell && isFilled) {
          fill = "#1c1917";
          stroke = "#fbbf24";
          strokeW = 2;
          labelFill = "#fde68a";
          labelText = String(val);
        } else if (isFilled) {
          const stepData = steps.find((s) => s.row === i && s.col === j);
          if (stepData?.isMatch) {
            fill = "#16103a";
            stroke = "#7c3aed66";
            strokeW = 1.4;
            labelFill = "#a78bfa";
          } else {
            fill = "#0b1e3a";
            stroke = "#2563eb55";
            strokeW = 1.4;
            labelFill = "#60a5fa";
          }
          labelText = String(val);
        } else if (isBase && initPhase === "zero") {
          // Base row/col visible once we've passed init-zero
          fill = "#0c1222";
          stroke = "#334155";
          strokeW = 1;
          labelFill = "#475569";
          labelText = "0";
        } else if (initPhase !== "none") {
          // Inner cells not yet filled — show dim 0
          fill = "#080c14";
          stroke = "#151d2e";
          strokeW = 0.5;
          labelFill = "#1e293b";
          labelText = "0";
          labelSize = 12;
        } else {
          // Intro — completely dark/empty
          fill = "#080c14";
          stroke = "#151d2e";
          strokeW = 0.5;
        }

        const node = b
          .node(`cell-${i}-${j}`)
          .at(posX, posY)
          .rect(CELL, CELL, 4)
          .fill(fill)
          .stroke(stroke, strokeW);

        if (labelText) {
          node.label(labelText, {
            fill: labelFill,
            fontSize: labelSize,
            fontWeight: labelText === "null" ? "normal" : "bold",
            fontFamily:
              labelText === "null" ? '"JetBrains Mono", monospace' : undefined,
          });
        }
      }
    }

    // ── Init-null: 1D array bracket decorations ───────────
    if (phase === "init-null") {
      b.overlay((o) => {
        const midY = GRID_Y + (CELL + GAP) / 2 + 4;
        // "dp = [" before first cell
        o.add(
          "text",
          {
            x: GRID_X - 8,
            y: midY,
            text: "dp = [",
            fill: "#92400e",
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "end",
          },
          { key: "arr-open" },
        );
        // "]" after last cell
        o.add(
          "text",
          {
            x: GRID_X + rows * (CELL + GAP) + 6,
            y: midY,
            text: "]",
            fill: "#92400e",
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "start",
          },
          { key: "arr-close" },
        );
        // Index labels below each cell
        for (let i = 0; i < rows; i++) {
          o.add(
            "text",
            {
              x: GRID_X + i * (CELL + GAP) + (CELL + GAP) / 2,
              y: GRID_Y + CELL + 16,
              text: `[${i}]`,
              fill: "#78350f",
              fontSize: 9,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: `arr-idx-${i}` },
          );
        }
        // Annotation
        o.add(
          "text",
          {
            x: GRID_X + (rows * (CELL + GAP)) / 2,
            y: GRID_Y + CELL + 34,
            text: `Array(${rows}).fill(null)  →  ${rows} elements, each is null`,
            fill: "#78350faa",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "arr-annotation" },
        );
      });
    }

    // ── Init-zero: array-of-arrays bracket decorations ────
    if (phase === "init-zero") {
      b.overlay((o) => {
        // "dp = [" top-left
        o.add(
          "text",
          {
            x: GRID_X - 4,
            y: GRID_Y - 6,
            text: "dp = [",
            fill: "#475569",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "end",
          },
          { key: "dp-open" },
        );
        // Row brackets
        for (let i = 0; i < rows; i++) {
          const ry = GRID_Y + i * (CELL + GAP) + (CELL + GAP) / 2 + 4;
          // "[" before row
          o.add(
            "text",
            {
              x: GRID_X - 2,
              y: ry,
              text: "[",
              fill: "#475569",
              fontSize: 13,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "end",
            },
            { key: `row-br-o-${i}` },
          );
          // "]," after row
          o.add(
            "text",
            {
              x: GRID_X + cols * (CELL + GAP) + 4,
              y: ry,
              text: i < rows - 1 ? "]," : "]",
              fill: "#475569",
              fontSize: 13,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: `row-br-c-${i}` },
          );
        }
        // "]" bottom-left
        o.add(
          "text",
          {
            x: GRID_X - 4,
            y: GRID_Y + rows * (CELL + GAP) + 10,
            text: "]",
            fill: "#475569",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "end",
          },
          { key: "dp-close" },
        );
        // Annotation
        o.add(
          "text",
          {
            x: GRID_X + (cols * (CELL + GAP)) / 2,
            y: GRID_Y + rows * (CELL + GAP) + 16,
            text: `.map(() => Array(${cols}).fill(0))  →  ${rows} rows × ${cols} cols`,
            fill: "#47556999",
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "middle",
          },
          { key: "zero-annotation" },
        );

        // Row 0 annotation: what the first row means
        const t2 = text2;
        o.add(
          "text",
          {
            x: GRID_X + cols * (CELL + GAP) + 24,
            y: GRID_Y + (CELL + GAP) / 2 + 4,
            text: `← LCS("", "${t2}") = 0`,
            fill: "#f472b6",
            fontSize: 9,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "start",
          },
          { key: "row0-explain" },
        );
        o.add(
          "text",
          {
            x: GRID_X + cols * (CELL + GAP) + 24,
            y: GRID_Y + (CELL + GAP) / 2 + 16,
            text: '  "" has no characters → always 0',
            fill: "#f472b699",
            fontSize: 8,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "start",
          },
          { key: "row0-sub" },
        );

        // Column 0 annotation: show alongside the last row
        o.add(
          "text",
          {
            x: GRID_X + cols * (CELL + GAP) + 24,
            y: GRID_Y + (rows - 1) * (CELL + GAP) + (CELL + GAP) / 2 + 4,
            text: `← LCS("${text1}", "") = 0`,
            fill: "#f472b6",
            fontSize: 9,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "start",
          },
          { key: "col0-explain" },
        );
        o.add(
          "text",
          {
            x: GRID_X + cols * (CELL + GAP) + 24,
            y: GRID_Y + (rows - 1) * (CELL + GAP) + (CELL + GAP) / 2 + 16,
            text: '  "" has no characters → always 0',
            fill: "#f472b699",
            fontSize: 8,
            fontFamily: '"JetBrains Mono", monospace',
            textAnchor: "start",
          },
          { key: "col0-sub" },
        );

        // Highlight base row with a subtle pink tint
        o.add(
          "rect",
          {
            x: GRID_X,
            y: GRID_Y,
            width: cols * (CELL + GAP),
            height: CELL + GAP,
            fill: "#f472b6",
            opacity: 0.06,
            rx: 3,
          },
          { key: "row0-tint" },
        );
        // Highlight base column with a subtle pink tint
        o.add(
          "rect",
          {
            x: GRID_X,
            y: GRID_Y,
            width: CELL + GAP,
            height: rows * (CELL + GAP),
            fill: "#f472b6",
            opacity: 0.06,
            rx: 3,
          },
          { key: "col0-tint" },
        );
      });
    }

    // ── Scanning-row / scanning-col indicators ────────────
    if (currentRow > 0 && currentCol > 0 && isFillPhase(phase)) {
      const rowY = GRID_Y + currentRow * (CELL + GAP);
      const colX = GRID_X + currentCol * (CELL + GAP);

      b.overlay((o) => {
        // Horizontal row band
        o.add(
          "rect",
          {
            x: GRID_X,
            y: rowY,
            width: cols * (CELL + GAP),
            height: CELL + GAP,
            fill: "#f59e0b",
            opacity: 0.04,
            rx: 3,
          },
          { key: "scan-row" },
        );
        // Vertical col band
        o.add(
          "rect",
          {
            x: colX,
            y: GRID_Y,
            width: CELL + GAP,
            height: rows * (CELL + GAP),
            fill: "#f59e0b",
            opacity: 0.04,
            rx: 3,
          },
          { key: "scan-col" },
        );
      });
    }

    // ── Arrow showing where value came from ───────────────
    if (
      isFillPhase(phase) &&
      currentRow > 0 &&
      currentCol > 0 &&
      currentStepData
    ) {
      const toCx = GRID_X + currentCol * (CELL + GAP) + (CELL + GAP) / 2;
      const toCy = GRID_Y + currentRow * (CELL + GAP) + (CELL + GAP) / 2;

      const char1 = text1[currentRow - 1];
      const char2 = text2[currentCol - 1];
      const diagVal = dp[currentRow - 1]?.[currentCol - 1] ?? 0;
      const upVal = dp[currentRow - 1]?.[currentCol] ?? 0;
      const leftVal = dp[currentRow]?.[currentCol - 1] ?? 0;
      const t1Before = text1.slice(0, currentRow - 1);
      const t2Before = text2.slice(0, currentCol - 1);
      const t1Full = text1.slice(0, currentRow);
      const t2Full = text2.slice(0, currentCol);

      if (phase === "filling") {
        // ── Compare phase: show all 3 candidates with faint dashes ──
        const candidates = [
          { r: currentRow - 1, c: currentCol - 1, color: "#a78bfa" },
          { r: currentRow - 1, c: currentCol, color: "#60a5fa" },
          { r: currentRow, c: currentCol - 1, color: "#60a5fa" },
        ];
        b.overlay((o) => {
          candidates.forEach((src, idx) => {
            const fx = GRID_X + src.c * (CELL + GAP) + (CELL + GAP) / 2;
            const fy = GRID_Y + src.r * (CELL + GAP) + (CELL + GAP) / 2;
            o.add(
              "line",
              {
                x1: fx,
                y1: fy,
                x2: toCx,
                y2: toCy,
                stroke: src.color,
                strokeWidth: 1.2,
                opacity: 0.3,
                strokeDasharray: "4,3",
              },
              { key: `cand-line-${idx}` },
            );
          });
        });
      } else if (phase === "match") {
        // ── Match: diagonal arrow + annotation ──
        const diagCx =
          GRID_X + (currentCol - 1) * (CELL + GAP) + (CELL + GAP) / 2;
        const diagCy =
          GRID_Y + (currentRow - 1) * (CELL + GAP) + (CELL + GAP) / 2;

        b.overlay((o) => {
          // Arrow line from diagonal → current
          o.add(
            "line",
            {
              x1: diagCx,
              y1: diagCy,
              x2: toCx,
              y2: toCy,
              stroke: "#a78bfa",
              strokeWidth: 2.5,
              opacity: 0.9,
            },
            { key: "match-line" },
          );
          // Arrow label
          const midX = (diagCx + toCx) / 2 - 8;
          const midY = (diagCy + toCy) / 2 - 8;
          o.add(
            "text",
            {
              x: midX,
              y: midY,
              text: "↖ +1",
              fill: "#a78bfa",
              fontSize: 13,
              fontWeight: 700,
              textAnchor: "middle",
            },
            { key: "match-arrow" },
          );

          // Annotation below grid
          const noteY = GRID_Y + rows * (CELL + GAP) + 14;
          o.add(
            "text",
            {
              x: GRID_X,
              y: noteY,
              text: `"${char1}" === "${char2}" → use both! Look ↖ before either char:`,
              fill: "#c4b5fd",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "match-n1" },
          );
          o.add(
            "text",
            {
              x: GRID_X,
              y: noteY + 14,
              text: `↖ LCS("${t1Before}","${t2Before}") = ${diagVal}  →  ${diagVal} + 1 = ${diagVal + 1}`,
              fill: "#a78bfa",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "match-n2" },
          );
        });
      } else if (phase === "noMatch") {
        // ── No match: two options with arrows + intuitive labels ──
        const upCx = GRID_X + currentCol * (CELL + GAP) + (CELL + GAP) / 2;
        const upCy =
          GRID_Y + (currentRow - 1) * (CELL + GAP) + (CELL + GAP) / 2;
        const leftCx =
          GRID_X + (currentCol - 1) * (CELL + GAP) + (CELL + GAP) / 2;
        const leftCy = GRID_Y + currentRow * (CELL + GAP) + (CELL + GAP) / 2;

        const upWins = upVal >= leftVal;
        const leftWins = leftVal > upVal;
        const tie = upVal === leftVal;

        b.overlay((o) => {
          // ── Arrow from ↑ to current ──
          o.add(
            "line",
            {
              x1: upCx,
              y1: upCy,
              x2: toCx,
              y2: toCy,
              stroke: "#60a5fa",
              strokeWidth: upWins || tie ? 2.5 : 1.2,
              opacity: upWins || tie ? 0.9 : 0.3,
              strokeDasharray: upWins || tie ? "none" : "4,3",
            },
            { key: "nm-up-line" },
          );
          // ↑ arrow label
          o.add(
            "text",
            {
              x: (upCx + toCx) / 2 + 8,
              y: (upCy + toCy) / 2,
              text: "↑",
              fill: upWins || tie ? "#60a5fa" : "#334155",
              fontSize: 14,
              fontWeight: 700,
              textAnchor: "middle",
            },
            { key: "nm-up-arrow" },
          );

          // ── Arrow from ← to current ──
          o.add(
            "line",
            {
              x1: leftCx,
              y1: leftCy,
              x2: toCx,
              y2: toCy,
              stroke: "#60a5fa",
              strokeWidth: leftWins || tie ? 2.5 : 1.2,
              opacity: leftWins || tie ? 0.9 : 0.3,
              strokeDasharray: leftWins || tie ? "none" : "4,3",
            },
            { key: "nm-left-line" },
          );
          // ← arrow label
          o.add(
            "text",
            {
              x: (leftCx + toCx) / 2,
              y: (leftCy + toCy) / 2 - 8,
              text: "←",
              fill: leftWins || tie ? "#60a5fa" : "#334155",
              fontSize: 14,
              fontWeight: 700,
              textAnchor: "middle",
            },
            { key: "nm-left-arrow" },
          );

          // ── ↑ annotation: drop text1 char, keep all text2 ──
          const upLabelX = upCx + CELL / 2 + 6;
          o.add(
            "text",
            {
              x: upLabelX,
              y: upCy - 6,
              text: `↑ Drop "${char1}" from text1`,
              fill: upWins || tie ? "#93c5fd" : "#475569",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-up-drop" },
          );
          o.add(
            "text",
            {
              x: upLabelX,
              y: upCy + 6,
              text: `Keep all of "${t2Full}"`,
              fill: upWins || tie ? "#60a5fa88" : "#334155",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-up-keep" },
          );
          o.add(
            "text",
            {
              x: upLabelX,
              y: upCy + 17,
              text: `= LCS("${t1Before}","${t2Full}") = ${upVal}`,
              fill: upWins || tie ? "#60a5fa" : "#334155",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-up-val" },
          );

          // ── ← annotation: drop text2 char, keep all text1 ──
          const leftLabelY = leftCy + CELL / 2 + 12;
          o.add(
            "text",
            {
              x: leftCx,
              y: leftLabelY,
              text: `← Drop "${char2}" from text2`,
              fill: leftWins || tie ? "#93c5fd" : "#475569",
              fontSize: 9,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "nm-left-drop" },
          );
          o.add(
            "text",
            {
              x: leftCx,
              y: leftLabelY + 12,
              text: `Keep all of "${t1Full}"`,
              fill: leftWins || tie ? "#60a5fa88" : "#334155",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "nm-left-keep" },
          );
          o.add(
            "text",
            {
              x: leftCx,
              y: leftLabelY + 23,
              text: `= LCS("${t1Full}","${t2Before}") = ${leftVal}`,
              fill: leftWins || tie ? "#60a5fa" : "#334155",
              fontSize: 8,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "middle",
            },
            { key: "nm-left-val" },
          );

          // ── Winner annotation below grid ──
          const noteY = GRID_Y + rows * (CELL + GAP) + 14;
          o.add(
            "text",
            {
              x: GRID_X,
              y: noteY,
              text: `"${char1}" ≠ "${char2}" → can't use both. Which char do we drop?`,
              fill: "#94a3b8",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-q" },
          );

          const winnerDir = tie ? "↑" : upWins ? "↑" : "←";
          const winnerDrop = tie || upWins ? char1 : char2;
          const winnerKeep = tie || upWins ? `"${t2Full}"` : `"${t1Full}"`;
          const winnerVal = Math.max(upVal, leftVal);

          o.add(
            "text",
            {
              x: GRID_X,
              y: noteY + 14,
              text: `${winnerDir} Drop "${winnerDrop}", keep ${winnerKeep} → ${winnerVal} is better`,
              fill: "#fbbf24",
              fontSize: 10,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-winner" },
          );

          o.add(
            "text",
            {
              x: GRID_X,
              y: noteY + 28,
              text: `dp[${currentRow}][${currentCol}] = max(${upVal}, ${leftVal}) = ${winnerVal}`,
              fill: "#60a5fa",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              textAnchor: "start",
            },
            { key: "nm-result" },
          );
        });
      }
    }

    // ── Result: trace path highlight on answer ────────────
    if (phase === "result" && lcsString.length > 0) {
      const ansY = GRID_Y + rows * (CELL + GAP) + 16;
      const ansX = GRID_X + (cols * (CELL + GAP)) / 2;

      b.overlay((o) => {
        o.add(
          "text",
          {
            x: ansX,
            y: ansY,
            text: `LCS = "${lcsString}" (length ${lcsString.length})`,
            fill: "#86efac",
            fontSize: 14,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: "result-text" },
        );

        // Draw lines connecting trace-path cells
        for (let k = 0; k < tracePath.length - 1; k++) {
          const a = tracePath[k];
          const bPt = tracePath[k + 1];
          const ax = GRID_X + a.col * (CELL + GAP) + (CELL + GAP) / 2;
          const ay = GRID_Y + a.row * (CELL + GAP) + (CELL + GAP) / 2;
          const bx = GRID_X + bPt.col * (CELL + GAP) + (CELL + GAP) / 2;
          const by = GRID_Y + bPt.row * (CELL + GAP) + (CELL + GAP) / 2;
          o.add(
            "line",
            {
              x1: ax,
              y1: ay,
              x2: bx,
              y2: by,
              stroke: "#22c55e",
              strokeWidth: 2.5,
              opacity: 0.6,
            },
            { key: `trace-line-${k}` },
          );
        }
      });
    }

    return b;
  })();

  // ── Mount / destroy ─────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? null;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  return (
    <div className="lcs-root">
      {/* Concept pills bar */}
      <div className="lcs-pills">
        <ConceptPills
          pills={pills}
          onOpen={openConcept as (key: string) => void}
        />
      </div>

      <div className="lcs-body">
        {/* ── Canvas area ─────────────────────────────── */}
        <div className="lcs-stage">
          <div className="lcs-stage__head">
            <div className="lcs-input-row">
              <label className="lcs-input-label">text1:</label>
              <input
                className="lcs-input"
                type="text"
                value={draftT1}
                onChange={(e) => setDraftT1(e.target.value)}
                disabled={currentStep !== 0}
                placeholder='e.g. "abcde"'
                maxLength={12}
              />
              <label className="lcs-input-label">text2:</label>
              <input
                className="lcs-input"
                type="text"
                value={draftT2}
                onChange={(e) => setDraftT2(e.target.value)}
                disabled={currentStep !== 0}
                placeholder='e.g. "ace"'
                maxLength={12}
              />
              {currentStep === 0 && (
                <button className="lcs-apply-btn" onClick={handleApply}>
                  Apply
                </button>
              )}
            </div>
            {currentStep === 0 && (
              <div className="lcs-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="lcs-preset-btn"
                    onClick={() => handlePreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="lcs-stage__stats">
              <div className={`lcs-phase lcs-phase--${phase}`}>
                <span className="lcs-phase__label">Phase</span>
                <span className="lcs-phase__value">{phase}</span>
              </div>
              {isFillPhase(phase) && currentRow > 0 && currentCol > 0 && (
                <div className="lcs-stat lcs-stat--ij">
                  <span className="lcs-stat__label">i, j</span>
                  <span className="lcs-stat__value">
                    {currentRow}, {currentCol}
                  </span>
                </div>
              )}
              <div className="lcs-stat">
                <span className="lcs-stat__label">Cells filled</span>
                <span className="lcs-stat__value">
                  {revealedCount}/{steps.length}
                </span>
              </div>
              <div className="lcs-stat">
                <span className="lcs-stat__label">Grid</span>
                <span className="lcs-stat__value">
                  {rows} × {cols}
                </span>
              </div>
            </div>
          </div>
          <div className="lcs-stage__canvas-wrap">
            <div className="lcs-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="lcs-sidebar">
          {/* Problem statement */}
          <div className="lcs-card lcs-card--problem">
            <div className="lcs-card__label">Problem</div>
            <p className="lcs-card__text">
              Find the <strong>longest common subsequence</strong> of{" "}
              <strong>"{text1}"</strong> and <strong>"{text2}"</strong>.
              Characters must appear in the same order but don't need to be
              contiguous.
            </p>
          </div>

          {/* Explanation */}
          <div className="lcs-card lcs-card--explanation">
            <div className="lcs-card__label">What's happening</div>
            <p className="lcs-card__text">{explanation}</p>
          </div>

          {/* What i and j mean — visible after intro */}
          {phase !== "intro" && (
            <div className="lcs-card lcs-card--ij">
              <div className="lcs-card__label">What are i and j?</div>
              <div className="lcs-card__text">
                <div className="lcs-ij-grid">
                  <div className="lcs-ij-row">
                    <code className="lcs-ij-var">i</code>
                    <span>
                      = how many characters of <strong>text1</strong> we're
                      considering
                    </span>
                  </div>
                  <div className="lcs-ij-row">
                    <code className="lcs-ij-var">j</code>
                    <span>
                      = how many characters of <strong>text2</strong> we're
                      considering
                    </span>
                  </div>
                  <div className="lcs-ij-row">
                    <code className="lcs-ij-var">dp[i][j]</code>
                    <span>
                      = LCS length of <code>text1[0..{"{i-1}"}]</code> and{" "}
                      <code>text2[0..{"{j-1}"}]</code>
                    </span>
                  </div>
                </div>
                {isFillPhase(phase) && currentRow > 0 && currentCol > 0 && (
                  <div className="lcs-ij-current">
                    Right now:{" "}
                    <code>
                      dp[{currentRow}][{currentCol}]
                    </code>{" "}
                    = LCS(<code>"{text1.slice(0, currentRow)}"</code>,{" "}
                    <code>"{text2.slice(0, currentCol)}"</code>)
                  </div>
                )}
                <p className="lcs-ij-compare">
                  <em>Compare with Coin Change</em>: there, <code>dp[i]</code>{" "}
                  meant "min coins to make amount <strong>i</strong>." Here we
                  have <strong>two strings</strong>, so we need{" "}
                  <strong>two indices</strong> → a 2D table.
                </p>
              </div>
            </div>
          )}

          {/* Base case explainer — visible during init-null */}
          {phase === "init-null" && (
            <div className="lcs-card lcs-card--base-case">
              <div className="lcs-card__label">Why "" and +1?</div>
              <div className="lcs-card__text">
                <p>
                  The recurrence looks at <code>dp[i-1]</code> and{" "}
                  <code>dp[j-1]</code>. When <strong>i=1</strong>, that reaches
                  row 0 — which represents the empty string <code>""</code>.
                </p>
                <p style={{ marginTop: 6 }}>
                  LCS of anything vs <code>""</code> = <strong>0</strong>. So{" "}
                  <code>.fill(0)</code> <em>is</em> the base case. The{" "}
                  <code>+1</code> in <code>Array(m+1)</code> creates space for
                  it — no bounds checking needed.
                </p>
                <button
                  className="lcs-base-case-link"
                  onClick={() => openConcept("base-case")}
                >
                  Read more →
                </button>
              </div>
            </div>
          )}

          {/* Cell meaning — visible during init-zero */}
          {phase === "init-zero" && (
            <div className="lcs-card lcs-card--base-case">
              <div className="lcs-card__label">What each cell means</div>
              <div className="lcs-card__text">
                <p>
                  <code>dp[i][j]</code> = LCS length using the{" "}
                  <strong>first i</strong> chars of text1 and{" "}
                  <strong>first j</strong> chars of text2.
                </p>
                <div className="lcs-cell-examples">
                  <div className="lcs-cell-example">
                    <strong>Row 0</strong> (highlighted): <code>dp[0][j]</code>{" "}
                    = LCS(<code>""</code>, text2[0..j])
                    <br />
                    <span style={{ color: "#f472b6" }}>
                      Empty string vs anything → always <strong>0</strong>
                    </span>
                  </div>
                  <div className="lcs-cell-example">
                    <strong>Col 0</strong> (highlighted): <code>dp[i][0]</code>{" "}
                    = LCS(text1[0..i], <code>""</code>)
                    <br />
                    <span style={{ color: "#f472b6" }}>
                      Anything vs empty string → always <strong>0</strong>
                    </span>
                  </div>
                  <div className="lcs-cell-example">
                    <strong>Inner cells</strong>: e.g. <code>dp[2][1]</code> =
                    LCS("{text1.slice(0, 2)}", "{text2.slice(0, 1)}")
                  </div>
                </div>
                <p
                  style={{
                    marginTop: 6,
                    fontStyle: "italic",
                    color: "#64748b",
                  }}
                >
                  The <code>.fill(0)</code> sets every cell to 0. Row 0 and col
                  0 stay 0 forever — that's the base case. Inner cells get
                  overwritten during filling.
                </p>
                <button
                  className="lcs-base-case-link"
                  onClick={() => openConcept("base-case")}
                >
                  Read more →
                </button>
              </div>
            </div>
          )}

          {/* Cell decision — visible during fill phases */}
          {(phase === "filling" || phase === "match" || phase === "noMatch") &&
            currentRow > 0 &&
            currentCol > 0 &&
            (() => {
              const char1 = text1[currentRow - 1];
              const char2 = text2[currentCol - 1];
              const isMatch = char1 === char2;
              const diagVal = dp[currentRow - 1]?.[currentCol - 1] ?? 0;
              const upVal = dp[currentRow - 1]?.[currentCol] ?? 0;
              const leftVal = dp[currentRow]?.[currentCol - 1] ?? 0;
              return (
                <div className="lcs-card lcs-card--decision">
                  <div className="lcs-card__label">
                    Cell ({currentRow}, {currentCol})
                  </div>
                  <div className="lcs-decision">
                    <div className="lcs-decision__compare">
                      <span
                        className={`lcs-decision__char ${isMatch ? "lcs-decision__char--match" : ""}`}
                      >
                        text1[{currentRow - 1}] = "{char1}"
                      </span>
                      <span className="lcs-decision__vs">
                        {isMatch ? "===" : "≠"}
                      </span>
                      <span
                        className={`lcs-decision__char ${isMatch ? "lcs-decision__char--match" : ""}`}
                      >
                        text2[{currentCol - 1}] = "{char2}"
                      </span>
                    </div>
                    {isMatch ? (
                      <div className="lcs-decision__rule lcs-decision__rule--match">
                        <div className="lcs-decision__arrow">
                          ↖ diagonal + 1
                        </div>
                        <div className="lcs-decision__calc">
                          dp[{currentRow - 1}][{currentCol - 1}] + 1 = {diagVal}{" "}
                          + 1 = <strong>{diagVal + 1}</strong>
                        </div>
                        <p className="lcs-decision__story">
                          "These characters match! We extend the subsequence we
                          had before both of them."
                        </p>
                        <div className="lcs-decision__why">
                          <div className="lcs-decision__why-label">
                            Why diagonal?
                          </div>
                          <p>
                            Since "{char1}" === "{char2}", we want to use both.
                            Where was the LCS <em>before</em> we had either of
                            them?
                          </p>
                          <ul>
                            <li>
                              <strong>
                                ↖ dp[{currentRow - 1}][{currentCol - 1}]
                              </strong>{" "}
                              = {diagVal}— the LCS of "
                              {text1.slice(0, currentRow - 1)}" and "
                              {text2.slice(0, currentCol - 1)}"
                            </li>
                          </ul>
                          <p>
                            That's one fewer char from <em>each</em> string —
                            i.e. <strong>diagonal</strong>. We add 1 because
                            this matching pair extends that subsequence.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="lcs-decision__rule lcs-decision__rule--nomatch">
                        <div className="lcs-decision__options">
                          <div
                            className={`lcs-decision__opt ${upVal >= leftVal ? "lcs-decision__opt--chosen" : ""}`}
                          >
                            <span>
                              ↑ dp[{currentRow - 1}][{currentCol}] = {upVal}
                            </span>
                          </div>
                          <div
                            className={`lcs-decision__opt ${leftVal > upVal ? "lcs-decision__opt--chosen" : ""}`}
                          >
                            <span>
                              ← dp[{currentRow}][{currentCol - 1}] = {leftVal}
                            </span>
                          </div>
                        </div>
                        <div className="lcs-decision__calc">
                          max({upVal}, {leftVal}) ={" "}
                          <strong>{Math.max(upVal, leftVal)}</strong>
                        </div>
                        <p className="lcs-decision__story">
                          "No match — carry the better result. Either skip a
                          character from text1 (↑) or text2 (←)."
                        </p>
                        <div className="lcs-decision__why">
                          <div className="lcs-decision__why-label">
                            Why max?
                          </div>
                          <p>
                            Since "{char1}" ≠ "{char2}", at least one of them
                            can't be in the LCS at this position. We try both:
                          </p>
                          <ul>
                            <li>
                              <strong>↑ Skip "{char1}"</strong>: pretend text1
                              is one char shorter → use dp[{currentRow - 1}][
                              {currentCol}] = {upVal}
                            </li>
                            <li>
                              <strong>← Skip "{char2}"</strong>: pretend text2
                              is one char shorter → use dp[{currentRow}][
                              {currentCol - 1}] = {leftVal}
                            </li>
                          </ul>
                          <p>
                            We pick whichever gave a longer LCS. This works
                            because a <em>subsequence</em> allows gaps — we can
                            always skip characters.
                          </p>
                          <button
                            className="lcs-base-case-link"
                            onClick={() => openConcept("subsequence")}
                          >
                            What if we required contiguous? →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* Result trace */}
          {phase === "result" && lcsString.length > 0 && (
            <div className="lcs-card lcs-card--trace">
              <div className="lcs-card__label">LCS Found</div>
              <div className="lcs-trace">
                {lcsString.split("").map((ch, i) => (
                  <span key={i} className="lcs-trace__char">
                    {ch}
                  </span>
                ))}
              </div>
              <p className="lcs-card__text">
                Length = <strong>{lcsString.length}</strong>. The green cells
                show the traceback path.
              </p>
            </div>
          )}

          {/* Code display */}
          <div className="lcs-card lcs-card--code">
            <div className="lcs-card__label">Algorithm</div>
            <pre className="lcs-code">
              {CODE_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`lcs-code__line ${i === activeCodeLine ? "lcs-code__line--active" : ""}`}
                >
                  <span className="lcs-code__gutter">{i + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          {/* Direction cheat sheet */}
          <div className="lcs-card lcs-card--directions">
            <div className="lcs-card__label">Direction Cheat Sheet</div>
            <div className="lcs-card__text">
              <p style={{ marginBottom: 8, color: "#64748b", fontSize: 10 }}>
                Each direction means "what was the LCS <em>before</em>…"
              </p>
            </div>
            <div className="lcs-directions">
              <div className="lcs-dir lcs-dir--diag">
                <span className="lcs-dir__arrow">↖</span>
                <div className="lcs-dir__body">
                  <div className="lcs-dir__title">Diagonal — dp[i-1][j-1]</div>
                  <div className="lcs-dir__meaning">
                    "Before <strong>both</strong> characters"
                  </div>
                  <div className="lcs-dir__when">
                    Used when they <strong>match</strong> — we consumed both, so
                    look back past both. Then <strong>+1</strong>.
                  </div>
                </div>
              </div>
              <div className="lcs-dir lcs-dir--up">
                <span className="lcs-dir__arrow">↑</span>
                <div className="lcs-dir__body">
                  <div className="lcs-dir__title">Up — dp[i-1][j]</div>
                  <div className="lcs-dir__meaning">
                    "Before this <strong>text1</strong> character"
                  </div>
                  <div className="lcs-dir__when">
                    Skip text1[i-1] — maybe it's not useful. Same j (text2
                    unchanged).
                  </div>
                </div>
              </div>
              <div className="lcs-dir lcs-dir--left">
                <span className="lcs-dir__arrow">←</span>
                <div className="lcs-dir__body">
                  <div className="lcs-dir__title">Left — dp[i][j-1]</div>
                  <div className="lcs-dir__meaning">
                    "Before this <strong>text2</strong> character"
                  </div>
                  <div className="lcs-dir__when">
                    Skip text2[j-1] — maybe it's not useful. Same i (text1
                    unchanged).
                  </div>
                </div>
              </div>
            </div>
            <div className="lcs-dir-summary">
              <strong>Match?</strong> → ↖ + 1 (use both chars)
              <br />
              <strong>No match?</strong> → max(↑, ←) (skip the less useful one)
            </div>
          </div>
        </aside>
      </div>

      <ConceptModal />
    </div>
  );
};

function isFillPhase(p: string): boolean {
  return p === "filling" || p === "match" || p === "noMatch";
}

export default LcsVisualization;
