import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { viz, type PanZoomController } from "vizcraft";
import { useCoinChangeAnimation } from "./useCoinChangeAnimation";
import { configure } from "./coinChangeSlice";
import { concepts, type ConceptKey } from "./concepts";
import { useConceptModal } from "../../components/plugin-kit/useConceptModal";
import type { PillDef } from "../../components/plugin-kit/ConceptPills";
import ConceptPills from "../../components/plugin-kit/ConceptPills";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const CELL = 54;
const GAP = 6;
const ROW_Y = 130;
const LABEL_Y = ROW_Y - 40;
const ARROW_Y = ROW_Y + 48;

const CODE_LINES = [
  "function coinChange(coins, amount) {",
  "  const dp = Array(amount + 1).fill(Infinity);",
  "  dp[0] = 0;",
  "  for (let i = 1; i <= amount; i++) {",
  "    for (const coin of coins) {",
  "      if (coin <= i && dp[i - coin] + 1 < dp[i])",
  "        dp[i] = dp[i - coin] + 1;",
  "    }",
  "  }",
  "  return dp[amount] === Infinity ? -1 : dp[amount];",
  "}",
];

const PRESETS: { coins: number[]; target: number; label: string }[] = [
  { coins: [1, 3, 4], target: 6, label: "[1,3,4] → 6" },
  { coins: [1, 5, 10, 25], target: 30, label: "[1,5,10,25] → 30" },
  { coins: [2, 5], target: 11, label: "[2,5] → 11" },
  { coins: [3, 7], target: 5, label: "[3,7] → 5 (impossible)" },
];

const pills: PillDef[] = [
  {
    key: "dynamic-programming",
    label: "Dynamic Programming",
    color: "#fbbf24",
    borderColor: "#f59e0b",
  },
  {
    key: "subproblem",
    label: "Subproblem",
    color: "#fdba74",
    borderColor: "#fb923c",
  },
  {
    key: "transition",
    label: "Transition",
    color: "#f0abfc",
    borderColor: "#e879f9",
  },
  {
    key: "optimal-substructure",
    label: "Optimal Substructure",
    color: "#86efac",
    borderColor: "#22c55e",
  },
  {
    key: "overlapping-subproblems",
    label: "Overlapping Subproblems",
    color: "#93c5fd",
    borderColor: "#60a5fa",
  },
  {
    key: "tabulation",
    label: "Tabulation",
    color: "#c4b5fd",
    borderColor: "#a78bfa",
  },
];

const CoinChangeVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const dispatch = useDispatch();
  const { runtime, currentStep } = useCoinChangeAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);

  const [draftCoins, setDraftCoins] = useState(runtime.coins.join(", "));
  const [draftTarget, setDraftTarget] = useState(String(runtime.target));

  const {
    coins,
    target,
    dp,
    phase,
    revealedCount,
    currentAmount,
    currentCandidates,
    highlightCandidate,
    explanation,
    steps,
  } = runtime;

  useEffect(() => {
    setDraftCoins(runtime.coins.join(", "));
    setDraftTarget(String(runtime.target));
  }, [runtime.coins, runtime.target]);

  const handleApply = useCallback(() => {
    if (currentStep !== 0) return;
    const parsed = draftCoins
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => n > 0 && Number.isFinite(n));
    const t = Math.max(1, Math.min(30, Number(draftTarget) || 6));
    if (parsed.length > 0) {
      dispatch(configure({ coins: parsed, target: t }));
    }
  }, [currentStep, draftCoins, draftTarget, dispatch]);

  const handlePreset = useCallback(
    (p: (typeof PRESETS)[number]) => {
      if (currentStep !== 0) return;
      setDraftCoins(p.coins.join(", "));
      setDraftTarget(String(p.target));
      dispatch(configure({ coins: p.coins, target: p.target }));
    },
    [currentStep, dispatch],
  );

  // Active code line
  const activeCodeLine = (() => {
    if (phase === "intro") return 1; // fill Infinity
    if (phase === "filling") return 3; // for i
    if (phase === "tryingCoin") return 5; // if coin <= i
    if (phase === "chosen") return 6; // dp[i] = dp[i - coin] + 1
    if (phase === "result") return 9; // return
    return 2; // dp[0] = 0
  })();

  // ── Build VizCraft scene ────────────────────────────────
  const totalCells = target + 1;
  const totalW = totalCells * (CELL + GAP) - GAP;
  const offsetX = Math.max(30, (Math.max(740, totalW + 80) - totalW) / 2);
  const W = Math.max(740, totalW + 80);
  const H = 280;

  const scene = (() => {
    const b = viz().view(W, H);

    // ── DP cells ──────────────────────────────────────────
    for (let i = 0; i <= target; i++) {
      const cx = offsetX + i * (CELL + GAP) + CELL / 2;
      const cy = ROW_Y;
      const nodeId = `dp-${i}`;
      const val = dp[i];
      const isBase = i === 0;
      const isCurrent = i === currentAmount;
      const isFilled = i > 0 && i < revealedCount + 1 && val !== Infinity;
      const isCandidate =
        highlightCandidate >= 0 &&
        highlightCandidate < currentCandidates.length &&
        currentCandidates[highlightCandidate].fromAmount === i;

      let fill = "#0f172a";
      let stroke = "#334155";
      let strokeW = 1.6;
      let labelFill = "#94a3b8";

      if (isCurrent) {
        fill = "#1e3a5f";
        stroke = "#f59e0b";
        strokeW = 2.6;
        labelFill = "#fbbf24";
      } else if (isCandidate) {
        fill = "#1a1a40";
        stroke = "#a78bfa";
        strokeW = 2.2;
        labelFill = "#c4b5fd";
      } else if (isBase) {
        fill = "#052e16";
        stroke = "#22c55e";
        strokeW = 2;
        labelFill = "#86efac";
      } else if (isFilled) {
        fill = "#0c2340";
        stroke = "#3b82f6";
        strokeW = 2;
        labelFill = "#93c5fd";
      }

      const displayVal = val === Infinity ? "∞" : String(val);

      b.node(nodeId)
        .at(cx, cy)
        .rect(CELL, CELL, 8)
        .fill(fill)
        .stroke(stroke, strokeW)
        .label(displayVal, {
          fill: labelFill,
          fontSize: 18,
          fontWeight: "bold",
        });

      // Amount index label above
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: cx,
            y: LABEL_Y,
            text: String(i),
            fill: isCurrent ? "#fbbf24" : "#64748b",
            fontSize: 11,
            fontWeight: isCurrent ? 700 : 400,
            textAnchor: "middle",
          },
          { key: `amt-${i}` },
        );
      });
    }

    // ── "Amount:" label ───────────────────────────────────
    b.overlay((o) => {
      o.add(
        "text",
        {
          x: offsetX - 10,
          y: LABEL_Y,
          text: "Amount:",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "end",
        },
        { key: "lbl-amount" },
      );
      o.add(
        "text",
        {
          x: offsetX - 10,
          y: ROW_Y + 5,
          text: "dp:",
          fill: "#64748b",
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "end",
        },
        { key: "lbl-dp" },
      );
    });

    // ── Arrow from candidate source to current cell ───────
    if (
      highlightCandidate >= 0 &&
      highlightCandidate < currentCandidates.length &&
      currentAmount > 0
    ) {
      const cand = currentCandidates[highlightCandidate];
      const fromX = offsetX + cand.fromAmount * (CELL + GAP) + CELL / 2;
      const toX = offsetX + currentAmount * (CELL + GAP) + CELL / 2;

      b.overlay((o) => {
        // Curved arrow path
        const midX = (fromX + toX) / 2;
        const curveY = ARROW_Y + 20 + Math.abs(toX - fromX) * 0.08;
        o.add(
          "text",
          {
            x: fromX,
            y: ARROW_Y + 4,
            text: "▼",
            fill: "#a78bfa",
            fontSize: 12,
            textAnchor: "middle",
          },
          { key: "arrow-src" },
        );

        o.add(
          "text",
          {
            x: toX,
            y: ARROW_Y + 4,
            text: "▼",
            fill: "#f59e0b",
            fontSize: 12,
            textAnchor: "middle",
          },
          { key: "arrow-dst" },
        );

        // Coin label in the middle
        o.add(
          "text",
          {
            x: midX,
            y: curveY + 6,
            text: `+coin(${cand.coin})`,
            fill: "#c4b5fd",
            fontSize: 11,
            fontWeight: 600,
            textAnchor: "middle",
          },
          { key: "arrow-coin-lbl" },
        );

        // Result preview
        o.add(
          "text",
          {
            x: midX,
            y: curveY + 22,
            text: `dp[${cand.fromAmount}] + 1 = ${cand.resultValue}`,
            fill: "#94a3b8",
            fontSize: 10,
            textAnchor: "middle",
          },
          { key: "arrow-calc" },
        );
      });
    }

    // ── Result banner ─────────────────────────────────────
    if (phase === "result") {
      const midX = W / 2;
      const ans = dp[target];
      const isSuccess = ans !== Infinity;

      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: midX - 180,
            y: ARROW_Y + 30,
            w: 360,
            h: 40,
            rx: 10,
            ry: 10,
            fill: isSuccess ? "#052e16" : "#450a0a",
            stroke: isSuccess ? "#22c55e" : "#ef4444",
            strokeWidth: 2,
            opacity: 0.95,
          },
          { key: "result-bg" },
        );
        o.add(
          "text",
          {
            x: midX,
            y: ARROW_Y + 55,
            text: isSuccess
              ? `✓ Minimum coins for ${target} = ${ans}`
              : `✗ Cannot make ${target} with [${coins.join(", ")}]`,
            fill: isSuccess ? "#86efac" : "#fca5a5",
            fontSize: 15,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: "result-text" },
        );
      });
    }

    return b;
  })();

  // ── Mount / destroy ─────────────────────────────────────
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

  // ── Trace back coins used (for sidebar) ─────────────────
  const coinsUsed: number[] = [];
  if (phase === "result" && dp[target] !== Infinity) {
    let rem = target;
    while (rem > 0 && runtime.bestCoin[rem] !== null) {
      coinsUsed.push(runtime.bestCoin[rem]!);
      rem -= runtime.bestCoin[rem]!;
    }
  }

  return (
    <div className="cc-root">
      {/* Concept pills bar */}
      <div className="cc-pills">
        <ConceptPills
          pills={pills}
          onOpen={openConcept as (key: string) => void}
        />
      </div>

      <div className="cc-body">
        {/* ── Canvas area ─────────────────────────────── */}
        <div className="cc-stage">
          <div className="cc-stage__head">
            <div className="cc-input-row">
              <label className="cc-input-label">Coins:</label>
              <input
                className="cc-input"
                type="text"
                value={draftCoins}
                onChange={(e) => setDraftCoins(e.target.value)}
                disabled={currentStep !== 0}
                placeholder="e.g. 1, 3, 4"
                maxLength={40}
              />
              <label className="cc-input-label">Target:</label>
              <input
                className="cc-input cc-input--small"
                type="number"
                value={draftTarget}
                onChange={(e) => setDraftTarget(e.target.value)}
                disabled={currentStep !== 0}
                min={1}
                max={30}
              />
              {currentStep === 0 && (
                <button className="cc-apply-btn" onClick={handleApply}>
                  Apply
                </button>
              )}
            </div>
            {currentStep === 0 && (
              <div className="cc-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="cc-preset-btn"
                    onClick={() => handlePreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="cc-stage__stats">
              <div className={`cc-phase cc-phase--${phase}`}>
                <span className="cc-phase__label">Phase</span>
                <span className="cc-phase__value">{phase}</span>
              </div>
              <div className="cc-stat">
                <span className="cc-stat__label">Progress</span>
                <span className="cc-stat__value">
                  {revealedCount}/{steps.length}
                </span>
              </div>
              <div className="cc-stat">
                <span className="cc-stat__label">Coins</span>
                <span className="cc-stat__value">[{coins.join(", ")}]</span>
              </div>
            </div>
          </div>
          <div className="cc-stage__canvas-wrap">
            <div className="cc-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="cc-sidebar">
          {/* Problem statement */}
          <div className="cc-card cc-card--problem">
            <div className="cc-card__label">Problem</div>
            <p className="cc-card__text">
              Given coins <strong>[{coins.join(", ")}]</strong>, find the{" "}
              <strong>minimum number of coins</strong> needed to make amount{" "}
              <strong>{target}</strong>. Each coin can be used unlimited times.
            </p>
          </div>

          {/* Glossary — always visible */}
          <div className="cc-card cc-card--glossary">
            <div className="cc-card__label">Key Concepts</div>
            <dl className="cc-glossary">
              <div className="cc-glossary__row">
                <dt className="cc-glossary__term">coin</dt>
                <dd className="cc-glossary__def">
                  A denomination you have available:{" "}
                  <strong>[{coins.join(", ")}]</strong>. Think of these as the
                  types of physical coins in your pocket.
                </dd>
              </div>
              <div className="cc-glossary__row">
                <dt className="cc-glossary__term">i (amount)</dt>
                <dd className="cc-glossary__def">
                  The amount of money we're currently trying to make
                  {currentAmount > 0 && (
                    <>
                      {" "}
                      — right now <strong>i = {currentAmount}</strong>
                    </>
                  )}
                  . We solve for every amount from 1 up to {target}.
                </dd>
              </div>
              <div className="cc-glossary__row">
                <dt className="cc-glossary__term">dp[i]</dt>
                <dd className="cc-glossary__def">
                  "What is the <em>fewest coins</em> I need to make amount i?"
                  {currentAmount > 0 && (
                    <>
                      {" "}
                      For example, dp[{currentAmount}]{" "}
                      {dp[currentAmount] === Infinity
                        ? "= ∞ (we haven't found a way yet)"
                        : `= ${dp[currentAmount]} (we need ${dp[currentAmount]} coin${dp[currentAmount] !== 1 ? "s" : ""})`}
                    </>
                  )}
                </dd>
              </div>
              <div className="cc-glossary__row">
                <dt className="cc-glossary__term">i − coin</dt>
                <dd className="cc-glossary__def">
                  The <em>remaining amount</em> after using one coin.
                  {currentAmount > 0 &&
                    highlightCandidate >= 0 &&
                    highlightCandidate < currentCandidates.length &&
                    (() => {
                      const c = currentCandidates[highlightCandidate];
                      return (
                        <>
                          {" "}
                          If i = {currentAmount} and coin = {c.coin}, then the
                          remainder is{" "}
                          <strong>
                            {currentAmount} − {c.coin} = {c.fromAmount}
                          </strong>
                          . We already know dp[{c.fromAmount}]{" "}
                          {c.fromValue === Infinity
                            ? "= ∞"
                            : `= ${c.fromValue}`}
                          , so we just add 1 more coin.
                        </>
                      );
                    })()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Explanation */}
          <div className="cc-card cc-card--explanation">
            <div className="cc-card__label">What's happening</div>
            <p className="cc-card__text">{explanation}</p>
          </div>

          {/* Current candidates */}
          {currentCandidates.length > 0 && phase !== "result" && (
            <div className="cc-card cc-card--candidates">
              <div className="cc-card__label">
                Candidates for dp[{currentAmount}]
              </div>
              <div className="cc-candidates">
                {currentCandidates.map((c, ci) => (
                  <div
                    key={ci}
                    className={`cc-candidate ${ci === highlightCandidate ? "cc-candidate--active" : ""} ${c.resultValue === steps[revealedCount]?.bestValue ? "cc-candidate--best" : ""}`}
                  >
                    <span className="cc-candidate__coin">coin {c.coin}</span>
                    <span className="cc-candidate__calc">
                      dp[{c.fromAmount}] + 1 = {c.resultValue}
                    </span>
                    {c.resultValue ===
                      steps[
                        revealedCount === 0
                          ? 0
                          : revealedCount - (phase === "chosen" ? 1 : 0)
                      ]?.bestValue && (
                      <span className="cc-candidate__best">★ best</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Condition breakdown — visible when trying a coin */}
          {phase === "tryingCoin" &&
            highlightCandidate >= 0 &&
            highlightCandidate < currentCandidates.length &&
            (() => {
              const c = currentCandidates[highlightCandidate];
              const currentDpVal = dp[currentAmount];
              const check1 = c.coin <= currentAmount;
              const check2 =
                c.resultValue <
                (currentDpVal === Infinity ? Infinity : currentDpVal);
              const bothPass = check1 && check2;
              return (
                <div className="cc-card cc-card--condition">
                  <div className="cc-card__label">Condition Check</div>
                  <div className="cc-condition">
                    <code className="cc-condition__code">
                      if (coin &lt;= i && dp[i − coin] + 1 &lt; dp[i])
                    </code>
                    <div className="cc-condition__story">
                      <p>
                        "I want to make <strong>{currentAmount}</strong> cents.
                        What if I use a <strong>{c.coin}</strong>-cent coin?
                        Then I only need to make{" "}
                        <strong>
                          {currentAmount} − {c.coin} = {c.fromAmount}
                        </strong>{" "}
                        cents — and I already know that takes{" "}
                        <strong>
                          {c.fromValue === Infinity
                            ? "∞ (impossible)"
                            : `${c.fromValue} coin${c.fromValue !== 1 ? "s" : ""}`}
                        </strong>
                        . So total ={" "}
                        {c.fromValue === Infinity ? "∞" : c.fromValue} + 1 ={" "}
                        <strong>{c.resultValue}</strong>. Is that better than
                        what I currently have (dp[{currentAmount}] ={" "}
                        {currentDpVal === Infinity ? "∞" : currentDpVal})?"
                      </p>
                    </div>
                    <div className="cc-condition__checks">
                      <div
                        className={`cc-check ${check1 ? "cc-check--pass" : "cc-check--fail"}`}
                      >
                        <span className="cc-check__icon">
                          {check1 ? "✓" : "✗"}
                        </span>
                        <span className="cc-check__label">coin ≤ i</span>
                        <span className="cc-check__detail">
                          {c.coin} ≤ {currentAmount}
                        </span>
                      </div>
                      <div
                        className={`cc-check ${check2 ? "cc-check--pass" : "cc-check--fail"}`}
                      >
                        <span className="cc-check__icon">
                          {check2 ? "✓" : "✗"}
                        </span>
                        <span className="cc-check__label">
                          dp[i−coin]+1 &lt; dp[i]
                        </span>
                        <span className="cc-check__detail">
                          {c.resultValue} &lt;{" "}
                          {currentDpVal === Infinity ? "∞" : currentDpVal}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`cc-condition__verdict ${bothPass ? "cc-condition__verdict--pass" : "cc-condition__verdict--fail"}`}
                    >
                      {bothPass
                        ? `✓ Update dp[${currentAmount}] = ${c.resultValue}`
                        : `✗ Skip — ${!check1 ? "coin too large" : "not an improvement"}`}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Code display */}
          <div className="cc-card cc-card--code">
            <div className="cc-card__label">Algorithm</div>
            <pre className="cc-code">
              {CODE_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`cc-code__line ${i === activeCodeLine ? "cc-code__line--active" : ""}`}
                >
                  <span className="cc-code__gutter">{i + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          {/* Coins used trace */}
          {phase === "result" && coinsUsed.length > 0 && (
            <div className="cc-card cc-card--trace">
              <div className="cc-card__label">Coins Used</div>
              <div className="cc-trace">
                {coinsUsed.map((c, i) => (
                  <span key={i} className="cc-trace__coin">
                    {c}
                  </span>
                ))}
              </div>
              <p className="cc-card__text cc-trace__sum">
                {coinsUsed.join(" + ")} = {target}
              </p>
            </div>
          )}

          {/* DP transition formula */}
          <div className="cc-card">
            <div className="cc-card__label">Transition</div>
            <pre className="cc-formula">
              dp[i] = min(dp[i − coin] + 1) for each coin
            </pre>
            <p className="cc-card__text">
              Base case: dp[0] = 0. For each amount, we try every coin and pick
              the minimum. <strong>O(amount × coins) time.</strong>
            </p>
          </div>
        </aside>
      </div>

      <ConceptModal />
    </div>
  );
};

export default CoinChangeVisualization;
