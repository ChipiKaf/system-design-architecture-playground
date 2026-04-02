import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  useConceptModal,
  ConceptPills,
  SidePanel,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import {
  getBinaryTargetIndex,
  getConstantPeekIndex,
  getLinearTargetIndex,
  setInputSize,
  type BigOInputSize,
} from "./bigOSlice";
import { useBigOAnimation } from "./useBigOAnimation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

type CurveKey = "constant" | "logarithmic" | "linear" | "quadratic";

const SIZE_OPTIONS: BigOInputSize[] = [8, 16, 32, 64];
const GRAPH_MAX_N = 64;
const GRAPH_W = 320;
const GRAPH_H = 210;
const GRAPH_PAD = {
  top: 16,
  right: 16,
  bottom: 26,
  left: 34,
};

const logOps = (n: number) => Math.max(1, Math.ceil(Math.log2(n)));
const linearOps = (n: number) => n;
const quadraticOps = (n: number) => n * n;
const curveValue = (curve: CurveKey, n: number) => {
  if (curve === "constant") return 1;
  if (curve === "logarithmic") return Math.max(0, Math.log2(n));
  if (curve === "linear") return n;
  return n * n;
};

const BigOVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const dispatch = useDispatch();
  const { bigO, currentStep } = useBigOAnimation(onAnimationComplete);
  const { openConcept, closeConcept, ConceptModal } =
    useConceptModal<ConceptKey>(concepts);
  const [focusedCurve, setFocusedCurve] = useState<CurveKey | "all">("all");

  const items = useMemo(
    () => Array.from({ length: bigO.inputSize }, (_, index) => index + 1),
    [bigO.inputSize],
  );

  const constantIndex = getConstantPeekIndex(bigO.inputSize);
  const binaryTarget = getBinaryTargetIndex(bigO.inputSize);
  const linearTarget = getLinearTargetIndex(bigO.inputSize);
  const currentBinaryFrame =
    bigO.binaryFrames[
      Math.min(bigO.binaryFrameIndex, Math.max(bigO.binaryFrames.length - 1, 0))
    ];

  const previewSize = Math.min(bigO.inputSize, 12);
  const previewTotal = previewSize * previewSize;

  const activeComplexity =
    currentStep === 1
      ? "constant"
      : currentStep === 2
        ? "logarithmic"
        : currentStep === 3
          ? "linear"
          : currentStep === 4
            ? "quadratic"
            : currentStep === 5
              ? "summary"
              : "intro";

  const comparisonRows: {
    key: CurveKey;
    label: string;
    story: string;
    value: number;
    color: string;
  }[] = [
    {
      key: "constant",
      label: "O(1)",
      story: "one exact peek",
      value: 1,
      color: "#0ea5e9",
    },
    {
      key: "logarithmic",
      label: "O(log n)",
      story: "keep halving",
      value: logOps(bigO.inputSize),
      color: "#8b5cf6",
    },
    {
      key: "linear",
      label: "O(n)",
      story: "check each one",
      value: linearOps(bigO.inputSize),
      color: "#22c55e",
    },
    {
      key: "quadratic",
      label: "O(n^2)",
      story: "everything with everything",
      value: quadraticOps(bigO.inputSize),
      color: "#ef4444",
    },
  ] as const;

  const maxValue = Math.max(...comparisonRows.map((row) => row.value));
  const doubledInput = bigO.inputSize * 2;

  const graphSeries = useMemo(() => {
    const xSpan = GRAPH_W - GRAPH_PAD.left - GRAPH_PAD.right;
    const ySpan = GRAPH_H - GRAPH_PAD.top - GRAPH_PAD.bottom;
    const domain = Array.from({ length: GRAPH_MAX_N }, (_, index) => index + 1);

    return comparisonRows.map((row) => {
      const maxShape = Math.max(
        ...domain.map((n) => curveValue(row.key, n)),
        1,
      );

      const points = domain
        .map((n) => {
          const x = GRAPH_PAD.left + ((n - 1) / (GRAPH_MAX_N - 1)) * xSpan;
          const y =
            GRAPH_H -
            GRAPH_PAD.bottom -
            (curveValue(row.key, n) / maxShape) * ySpan;
          return `${x},${y}`;
        })
        .join(" ");

      const currentX =
        GRAPH_PAD.left + ((bigO.inputSize - 1) / (GRAPH_MAX_N - 1)) * xSpan;
      const currentY =
        GRAPH_H -
        GRAPH_PAD.bottom -
        (curveValue(row.key, bigO.inputSize) / maxShape) * ySpan;

      return {
        ...row,
        points,
        currentX,
        currentY,
      };
    });
  }, [bigO.inputSize, comparisonRows]);

  const focusedSeries =
    focusedCurve === "all"
      ? null
      : (graphSeries.find((series) => series.key === focusedCurve) ?? null);

  useEffect(() => {
    closeConcept();
  }, [bigO.inputSize, currentStep]);

  useEffect(() => {
    if (currentStep === 1) {
      setFocusedCurve("constant");
      return;
    }

    if (currentStep === 2) {
      setFocusedCurve("logarithmic");
      return;
    }

    if (currentStep === 3) {
      setFocusedCurve("linear");
      return;
    }

    if (currentStep === 4) {
      setFocusedCurve("quadratic");
      return;
    }

    setFocusedCurve("all");
  }, [currentStep]);

  const stageTitle =
    currentStep === 0
      ? "Big O asks how work grows"
      : currentStep === 1
        ? "O(1): one magic peek"
        : currentStep === 2
          ? "O(log n): throw away half each time"
          : currentStep === 3
            ? "O(n): one-by-one checking"
            : currentStep === 4
              ? "O(n^2): comparison explosion"
              : "Same input, very different growth";

  const stageSubtitle =
    currentStep === 0
      ? "Pretend each block is a toy box. Change n and then walk through the strategies."
      : currentStep === 1
        ? "You already know the exact drawer, so the number of boxes barely matters."
        : currentStep === 2
          ? "Every peek cuts the search area down fast."
          : currentStep === 3
            ? "Worst case means the target is last, so you may touch them all."
            : currentStep === 4
              ? "The preview grid is only a tiny corner of the total comparisons."
              : "Watch what happens when the same input size hits different growth rules.";

  const renderIntroStage = () => (
    <div className="bo-stage bo-stage--intro">
      <div className="bo-mini-cards">
        <div className="bo-mini-card bo-mini-card--constant">
          <strong>O(1)</strong>
          <span>one exact grab</span>
        </div>
        <div className="bo-mini-card bo-mini-card--logarithmic">
          <strong>O(log n)</strong>
          <span>halve the search</span>
        </div>
        <div className="bo-mini-card bo-mini-card--linear">
          <strong>O(n)</strong>
          <span>check one by one</span>
        </div>
        <div className="bo-mini-card bo-mini-card--quadratic">
          <strong>O(n^2)</strong>
          <span>everything with everything</span>
        </div>
      </div>

      <div className="bo-intro-board">
        <div className="bo-intro-label">
          These {bigO.inputSize} boxes are your input. That means{" "}
          <code>n = {bigO.inputSize}</code>.
        </div>
        <div className="bo-box-grid bo-box-grid--intro">
          {items.map((item, index) => (
            <div key={item} className="bo-box bo-box--intro">
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConstantStage = () => (
    <div className="bo-stage bo-stage--constant">
      <div className="bo-box-row bo-box-row--constant">
        {items.map((item, index) => (
          <div
            key={item}
            className={`bo-box bo-box--constant${index === constantIndex ? " bo-box--peek bo-box--found" : ""}`}
          >
            {index === constantIndex && (
              <span className="bo-box-marker">peek 1</span>
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="bo-stage-callout bo-stage-callout--constant">
        We already know the address: go straight to box #{constantIndex + 1}.
      </div>
    </div>
  );

  const renderLogarithmicStage = () => (
    <div className="bo-stage bo-stage--logarithmic">
      <div className="bo-book-row">
        {items.map((item, index) => {
          const discarded =
            currentBinaryFrame &&
            (index < currentBinaryFrame.low || index > currentBinaryFrame.high);
          const middle = currentBinaryFrame?.mid === index;
          const found =
            currentBinaryFrame?.decision === "found" && index === binaryTarget;

          return (
            <div
              key={item}
              className={`bo-book${discarded ? " bo-book--discarded" : ""}${middle ? " bo-book--middle" : ""}${found ? " bo-book--found" : ""}${index === binaryTarget ? " bo-book--target" : ""}`}
            >
              <span>{item}</span>
            </div>
          );
        })}
      </div>
      <div className="bo-stage-callout bo-stage-callout--logarithmic">
        {currentBinaryFrame?.decision === "found" && (
          <>Middle book #{currentBinaryFrame.mid + 1} is the target. Done.</>
        )}
        {currentBinaryFrame?.decision === "right" && (
          <>
            Middle book #{currentBinaryFrame.mid + 1} is too small. Throw away
            the whole left half.
          </>
        )}
        {currentBinaryFrame?.decision === "left" && (
          <>
            Middle book #{currentBinaryFrame.mid + 1} is too big. Throw away the
            whole right half.
          </>
        )}
      </div>
      <div className="bo-step-trail">
        {bigO.binaryFrames.map((frame, index) => (
          <div
            key={`${frame.low}-${frame.high}-${frame.mid}`}
            className={`bo-step-chip${index <= bigO.binaryFrameIndex ? " bo-step-chip--active" : ""}`}
          >
            peek {index + 1}: middle {frame.mid + 1}
          </div>
        ))}
      </div>
    </div>
  );

  const renderLinearStage = () => (
    <div className="bo-stage bo-stage--linear">
      <div className="bo-box-row bo-box-row--linear">
        {items.map((item, index) => {
          const checked = index < bigO.linearChecks;
          const active =
            bigO.linearChecks < bigO.inputSize && index === bigO.linearChecks;
          const found =
            bigO.linearChecks >= bigO.inputSize && index === linearTarget;

          return (
            <div
              key={item}
              className={`bo-box bo-box--linear${checked ? " bo-box--checked" : ""}${active ? " bo-box--active" : ""}${found ? " bo-box--found" : ""}`}
            >
              <span>{item}</span>
            </div>
          );
        })}
      </div>
      <div className="bo-stage-callout bo-stage-callout--linear">
        Checked {bigO.linearChecks} of {bigO.inputSize} boxes. Worst case means
        the target is last.
      </div>
    </div>
  );

  const renderQuadraticStage = () => (
    <div className="bo-stage bo-stage--quadratic">
      <div className="bo-quadratic-note">
        Previewing the first {previewSize} x {previewSize} corner while the real
        work is {bigO.inputSize} x {bigO.inputSize}.
      </div>
      <div
        className="bo-matrix"
        style={{
          gridTemplateColumns: `repeat(${previewSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: previewTotal }, (_, index) => {
          const active = index === Math.max(0, bigO.quadraticPreviewCount - 1);
          const compared = index < bigO.quadraticPreviewCount;
          return (
            <div
              key={index}
              className={`bo-cell${compared ? " bo-cell--compared" : ""}${active ? " bo-cell--active" : ""}`}
            />
          );
        })}
      </div>
      <div className="bo-stage-callout bo-stage-callout--quadratic">
        Each row compares against each column, so the work grows like a square.
      </div>
    </div>
  );

  const renderSummaryStage = () => (
    <div className="bo-stage bo-stage--summary">
      <div className="bo-summary-chart">
        {comparisonRows.map((row) => (
          <div key={row.key} className="bo-summary-row">
            <div className="bo-summary-meta">
              <strong>{row.label}</strong>
              <span>{row.story}</span>
            </div>
            <div className="bo-summary-bar-wrap">
              <div
                className="bo-summary-bar"
                style={{
                  width: `${Math.max(6, (row.value / maxValue) * 100)}%`,
                  background: row.color,
                }}
              />
            </div>
            <div className="bo-summary-value">{row.value}</div>
          </div>
        ))}
      </div>
      <div className="bo-stage-callout bo-stage-callout--summary">
        With the same {bigO.inputSize} items, the rules grow wildly differently.
      </div>
    </div>
  );

  const boPills = [
    {
      key: "big-o",
      label: "Big O",
      color: "#c2410c",
      borderColor: "rgba(249,115,22,0.22)",
    },
    {
      key: "n",
      label: "n",
      color: "#b45309",
      borderColor: "rgba(245,158,11,0.26)",
    },
    {
      key: "constant",
      label: "O(1)",
      color: "#0369a1",
      borderColor: "rgba(14,165,233,0.25)",
    },
    {
      key: "logarithmic",
      label: "O(log n)",
      color: "#6d28d9",
      borderColor: "rgba(139,92,246,0.25)",
    },
    {
      key: "linear",
      label: "O(n)",
      color: "#15803d",
      borderColor: "rgba(34,197,94,0.28)",
    },
    {
      key: "quadratic",
      label: "O(n^2)",
      color: "#b91c1c",
      borderColor: "rgba(239,68,68,0.28)",
    },
  ];

  return (
    <div className="bo-root">
      <div className="bo-toolbar">
        <div className="bo-size-picker">
          <span className="bo-size-label">How many items?</span>
          <div className="bo-size-buttons">
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                className={`bo-size-btn${bigO.inputSize === size ? " bo-size-btn--active" : ""}`}
                onClick={() => dispatch(setInputSize(size))}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <ConceptPills
          pills={boPills}
          onOpen={openConcept}
          className="bo-pills"
        />
      </div>

      <div className="bo-body">
        <div className="bo-stage-panel">
          <div className="bo-stage-header">
            <div>
              <h2>{stageTitle}</h2>
              <p>{stageSubtitle}</p>
            </div>
            <button
              className="bo-stage-help"
              onClick={() => openConcept("big-o")}
            >
              Help
            </button>
          </div>

          {currentStep === 0 && renderIntroStage()}
          {currentStep === 1 && renderConstantStage()}
          {currentStep === 2 && renderLogarithmicStage()}
          {currentStep === 3 && renderLinearStage()}
          {currentStep === 4 && renderQuadraticStage()}
          {currentStep === 5 && renderSummaryStage()}
        </div>

        <SidePanel className="bo-sidebar">
          <div className="bo-card bo-card--story">
            <h3>Story Mode</h3>
            {activeComplexity === "intro" && (
              <p>
                Big O is the answer to: "If the pile gets bigger, how does my
                work grow?"
              </p>
            )}
            {activeComplexity === "constant" && (
              <p>
                O(1) is like knowing the exact drawer number before you start.
              </p>
            )}
            {activeComplexity === "logarithmic" && (
              <p>
                O(log n) is like a guessing game where every peek cuts the
                puzzle in half.
              </p>
            )}
            {activeComplexity === "linear" && (
              <p>
                O(n) is a hallway walk. If the target is last, you check every
                door.
              </p>
            )}
            {activeComplexity === "quadratic" && (
              <p>
                O(n^2) is a giant comparison board. It grows like a square,
                which gets huge fast.
              </p>
            )}
            {activeComplexity === "summary" && (
              <p>
                The input stayed the same. Only the rule changed. That is why
                algorithm choice matters.
              </p>
            )}
          </div>

          <div className="bo-card bo-card--focus">
            <h3>At n = {bigO.inputSize}</h3>
            {activeComplexity === "intro" && (
              <p>Pick a size, then walk through the strategies.</p>
            )}
            {activeComplexity === "constant" && (
              <p>
                Worst-case work: <strong>1 peek</strong>.
              </p>
            )}
            {activeComplexity === "logarithmic" && (
              <p>
                Worst-case work: <strong>{logOps(bigO.inputSize)} peeks</strong>
                .
              </p>
            )}
            {activeComplexity === "linear" && (
              <p>
                Worst-case work:{" "}
                <strong>{linearOps(bigO.inputSize)} checks</strong>.
              </p>
            )}
            {activeComplexity === "quadratic" && (
              <p>
                Worst-case work:{" "}
                <strong>{quadraticOps(bigO.inputSize)} comparisons</strong>.
              </p>
            )}
            {activeComplexity === "summary" && (
              <p>
                Doubling to {doubledInput} would change the counts a lot. See
                the growth note below.
              </p>
            )}
          </div>

          <div className="bo-card bo-card--compare">
            <h3>Compare Growth</h3>
            <p className="bo-compare-help">
              Click a rule to trace its curve on the graph below.
            </p>
            <div className="bo-compare-list">
              {comparisonRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`bo-compare-row${activeComplexity === row.key || focusedCurve === row.key ? " bo-compare-row--active" : ""}`}
                  onClick={() => setFocusedCurve(row.key)}
                >
                  <span
                    className="bo-compare-name"
                    style={{ color: row.color }}
                  >
                    {row.label}
                  </span>
                  <span className="bo-compare-story">{row.story}</span>
                  <strong className="bo-compare-value">{row.value}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="bo-card bo-card--graph">
            <div className="bo-graph-head">
              <div>
                <h3>How They Look On A Graph</h3>
                <p>
                  Shape view: each curve is scaled to its own height so you can
                  compare how it bends.
                </p>
              </div>
              {focusedCurve !== "all" && (
                <button
                  type="button"
                  className="bo-graph-reset"
                  onClick={() => setFocusedCurve("all")}
                >
                  Show all
                </button>
              )}
            </div>

            <div className="bo-graph-frame">
              <svg
                className="bo-graph-svg"
                viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
                aria-label="Growth curve graph for Big O examples"
                role="img"
              >
                {[0.25, 0.5, 0.75].map((level) => {
                  const y =
                    GRAPH_H -
                    GRAPH_PAD.bottom -
                    (GRAPH_H - GRAPH_PAD.top - GRAPH_PAD.bottom) * level;
                  return (
                    <line
                      key={level}
                      className="bo-graph-grid"
                      x1={GRAPH_PAD.left}
                      x2={GRAPH_W - GRAPH_PAD.right}
                      y1={y}
                      y2={y}
                    />
                  );
                })}

                <line
                  className="bo-graph-axis"
                  x1={GRAPH_PAD.left}
                  x2={GRAPH_PAD.left}
                  y1={GRAPH_PAD.top}
                  y2={GRAPH_H - GRAPH_PAD.bottom}
                />
                <line
                  className="bo-graph-axis"
                  x1={GRAPH_PAD.left}
                  x2={GRAPH_W - GRAPH_PAD.right}
                  y1={GRAPH_H - GRAPH_PAD.bottom}
                  y2={GRAPH_H - GRAPH_PAD.bottom}
                />

                <line
                  className="bo-graph-current"
                  x1={graphSeries[0]?.currentX ?? GRAPH_PAD.left}
                  x2={graphSeries[0]?.currentX ?? GRAPH_PAD.left}
                  y1={GRAPH_PAD.top}
                  y2={GRAPH_H - GRAPH_PAD.bottom}
                />

                {graphSeries.map((series) => {
                  const muted =
                    focusedCurve !== "all" && focusedCurve !== series.key;
                  return (
                    <g key={series.key}>
                      <polyline
                        className={`bo-graph-line${muted ? " bo-graph-line--muted" : ""}`}
                        points={series.points}
                        style={{ stroke: series.color }}
                      />
                      <circle
                        className={`bo-graph-dot${muted ? " bo-graph-dot--muted" : ""}`}
                        cx={series.currentX}
                        cy={series.currentY}
                        r={
                          focusedCurve === "all" || focusedCurve === series.key
                            ? 4.5
                            : 3
                        }
                        style={{ fill: series.color }}
                      />
                    </g>
                  );
                })}

                <text
                  className="bo-graph-label bo-graph-label--y"
                  x={10}
                  y={GRAPH_PAD.top + 8}
                >
                  more work
                </text>
                <text
                  className="bo-graph-label bo-graph-label--x"
                  x={GRAPH_W - GRAPH_PAD.right}
                  y={GRAPH_H - 6}
                >
                  more items (n)
                </text>

                {[1, 8, 16, 32, 64].map((tick) => {
                  const x =
                    GRAPH_PAD.left +
                    ((tick - 1) / (GRAPH_MAX_N - 1)) *
                      (GRAPH_W - GRAPH_PAD.left - GRAPH_PAD.right);
                  return (
                    <g key={tick}>
                      <line
                        className="bo-graph-tick"
                        x1={x}
                        x2={x}
                        y1={GRAPH_H - GRAPH_PAD.bottom}
                        y2={GRAPH_H - GRAPH_PAD.bottom + 5}
                      />
                      <text
                        className="bo-graph-tick-label"
                        x={x}
                        y={GRAPH_H - 10}
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="bo-graph-legend">
              {comparisonRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  className={`bo-graph-chip${focusedCurve === row.key ? " bo-graph-chip--active" : ""}`}
                  style={{ borderColor: row.color, color: row.color }}
                  onClick={() => setFocusedCurve(row.key)}
                >
                  {row.label}
                </button>
              ))}
            </div>

            <div className="bo-graph-caption">
              {focusedSeries ? (
                <>
                  <strong style={{ color: focusedSeries.color }}>
                    {focusedSeries.label}
                  </strong>{" "}
                  at n = {bigO.inputSize} is {focusedSeries.value}. Notice how
                  the curve
                  {focusedSeries.key === "constant" && " stays flat."}
                  {focusedSeries.key === "logarithmic" &&
                    " rises slowly because each step throws away a big chunk."}
                  {focusedSeries.key === "linear" &&
                    " climbs at a steady rate as the input grows."}
                  {focusedSeries.key === "quadratic" &&
                    " bends upward hard, which is why it gets expensive fast."}
                </>
              ) : (
                <>
                  The flatter the line, the gentler the growth. The steeper and
                  more sharply it bends up, the faster the work explodes.
                </>
              )}
            </div>
          </div>

          <div className="bo-card bo-card--growth">
            <h3>What if the input doubles?</h3>
            <div className="bo-growth-grid">
              <div className="bo-growth-head">Rule</div>
              <div className="bo-growth-head">n = {bigO.inputSize}</div>
              <div className="bo-growth-head">2n = {doubledInput}</div>

              <div>O(1)</div>
              <div>1</div>
              <div>1</div>

              <div>O(log n)</div>
              <div>{logOps(bigO.inputSize)}</div>
              <div>{logOps(doubledInput)}</div>

              <div>O(n)</div>
              <div>{linearOps(bigO.inputSize)}</div>
              <div>{linearOps(doubledInput)}</div>

              <div>O(n^2)</div>
              <div>{quadraticOps(bigO.inputSize)}</div>
              <div>{quadraticOps(doubledInput)}</div>
            </div>
          </div>

          {currentStep === 2 && currentBinaryFrame && (
            <div className="bo-card bo-card--binary">
              <h3>Binary Search Trail</h3>
              <p>
                Current search window: {currentBinaryFrame.low + 1} to{" "}
                {currentBinaryFrame.high + 1}
              </p>
              <p>Middle peek: {currentBinaryFrame.mid + 1}</p>
              <p>Target book: {binaryTarget + 1}</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bo-card bo-card--linear-progress">
              <h3>Linear Progress</h3>
              <p>
                The target is box {linearTarget + 1}, so worst-case scanning
                touches the whole list.
              </p>
              <div className="bo-progress-bar">
                <div
                  className="bo-progress-fill"
                  style={{
                    width: `${(bigO.linearChecks / bigO.inputSize) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </SidePanel>
      </div>

      <ConceptModal />
    </div>
  );
};

export default BigOVisualization;
