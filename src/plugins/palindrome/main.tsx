import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { viz, type PanZoomController } from "vizcraft";
import { usePalindromeAnimation } from "./usePalindromeAnimation";
import { setInput } from "./palindromeSlice";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const CELL = 52;
const GAP = 6;
const CHAR_Y = 140;
const INDEX_Y = CHAR_Y - 38;
const POINTER_Y = CHAR_Y + 50;
const CODE_LINES = [
  "function isPalindrome(s) {",
  "  s = s.toLowerCase().replace(/[^a-z0-9]/g, '');",
  "  let left = 0, right = s.length - 1;",
  "  while (left < right) {",
  "    if (s[left] !== s[right]) return false;",
  "    left++;  right--;",
  "  }",
  "  return true;",
  "}",
];

const PalindromeVisualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const dispatch = useDispatch();
  const { runtime, currentStep } = usePalindromeAnimation(onAnimationComplete);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const [draft, setDraft] = useState(runtime.input);

  const {
    cleaned,
    left,
    right,
    steps,
    revealedCount,
    phase,
    isPalindrome,
    explanation,
  } = runtime;

  // Sync draft when runtime input changes (e.g. on reset)
  useEffect(() => {
    setDraft(runtime.input);
  }, [runtime.input]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDraft(val);
      if (currentStep === 0 && val.length > 0) {
        dispatch(setInput(val));
      }
    },
    [currentStep, dispatch],
  );

  // Figure out which code line to highlight
  const activeCodeLine = (() => {
    if (phase === "intro") return 1; // cleaning
    if (phase === "comparing" && revealedCount === 0) return 2; // init pointers
    if (phase === "match") return 5; // left++; right--
    if (phase === "mismatch") return 4; // return false
    if (phase === "result" && isPalindrome) return 7; // return true
    if (phase === "result" && !isPalindrome) return 4;
    return 3; // while loop
  })();

  // ── Build VizCraft scene ──────────────────────────────
  const chars = cleaned.split("");
  const totalW = chars.length * (CELL + GAP) - GAP;
  const offsetX = Math.max(20, (700 - totalW) / 2);
  const W = Math.max(740, totalW + 80);
  const H = 320;

  const scene = (() => {
    const b = viz().view(W, H);

    // ── Character cells ─────────────────────────────────
    chars.forEach((ch, i) => {
      const cx = offsetX + i * (CELL + GAP) + CELL / 2;
      const cy = CHAR_Y;
      const nodeId = `char-${i}`;

      // Determine cell state
      const isLeft = i === left;
      const isRight = i === right;
      const isActive = isLeft || isRight;
      const isChecked = steps
        .slice(0, revealedCount)
        .some((s) => s.left === i || s.right === i);
      const mismatchAt = steps.findIndex((s) => !s.isMatch);
      const isMismatch =
        mismatchAt >= 0 &&
        mismatchAt < revealedCount &&
        (steps[mismatchAt].left === i || steps[mismatchAt].right === i);

      let fill = "#0f172a";
      let stroke = "#334155";
      let strokeW = 1.6;

      if (isMismatch) {
        fill = "#7f1d1d";
        stroke = "#ef4444";
        strokeW = 2.4;
      } else if (isActive) {
        fill = "#1e3a5f";
        stroke = "#60a5fa";
        strokeW = 2.4;
      } else if (isChecked) {
        fill = "#052e16";
        stroke = "#22c55e";
        strokeW = 2;
      }

      b.node(nodeId)
        .at(cx, cy)
        .rect(CELL, CELL, 8)
        .fill(fill)
        .stroke(stroke, strokeW)
        .label(ch.toUpperCase(), {
          fill: isMismatch ? "#fca5a5" : isActive ? "#93c5fd" : isChecked ? "#86efac" : "#e2e8f0",
          fontSize: 20,
          fontWeight: "bold",
        });

      // Index label above
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: cx,
            y: INDEX_Y,
            text: String(i),
            fill: isActive ? "#93c5fd" : "#64748b",
            fontSize: 10,
            textAnchor: "middle",
          },
          { key: `idx-${i}` },
        );
      });
    });

    // ── Pointer arrows ──────────────────────────────────
    if (left >= 0 && left < chars.length) {
      const lx = offsetX + left * (CELL + GAP) + CELL / 2;
      b.overlay((o) => {
        // Arrow pointing up
        o.add(
          "text",
          {
            x: lx,
            y: POINTER_Y,
            text: "▲",
            fill: "#60a5fa",
            fontSize: 16,
            textAnchor: "middle",
          },
          { key: "ptr-left-arrow" },
        );
        o.add(
          "text",
          {
            x: lx,
            y: POINTER_Y + 18,
            text: "L",
            fill: "#60a5fa",
            fontSize: 14,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: "ptr-left-label" },
        );
      });
    }

    if (right >= 0 && right < chars.length) {
      const rx = offsetX + right * (CELL + GAP) + CELL / 2;
      b.overlay((o) => {
        o.add(
          "text",
          {
            x: rx,
            y: POINTER_Y,
            text: "▲",
            fill: "#f97316",
            fontSize: 16,
            textAnchor: "middle",
          },
          { key: "ptr-right-arrow" },
        );
        o.add(
          "text",
          {
            x: rx,
            y: POINTER_Y + 18,
            text: "R",
            fill: "#f97316",
            fontSize: 14,
            fontWeight: 700,
            textAnchor: "middle",
          },
          { key: "ptr-right-label" },
        );
      });
    }

    // ── Result banner ───────────────────────────────────
    if (phase === "result") {
      const midX = W / 2;
      b.overlay((o) => {
        o.add(
          "rect",
          {
            x: midX - 160,
            y: POINTER_Y + 36,
            w: 320,
            h: 40,
            rx: 10,
            ry: 10,
            fill: isPalindrome ? "#052e16" : "#450a0a",
            stroke: isPalindrome ? "#22c55e" : "#ef4444",
            strokeWidth: 2,
            opacity: 0.95,
          },
          { key: "result-bg" },
        );
        o.add(
          "text",
          {
            x: midX,
            y: POINTER_Y + 61,
            text: isPalindrome
              ? `✓  "${runtime.input}" is a palindrome!`
              : `✗  "${runtime.input}" is NOT a palindrome`,
            fill: isPalindrome ? "#86efac" : "#fca5a5",
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

  // ── Mount / destroy ───────────────────────────────────
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
    <div className="pal-root">
      <div className="pal-body">
        {/* ── Canvas area ─────────────────────────────── */}
        <div className="pal-stage">
          <div className="pal-stage__head">
            <div className="pal-input-row">
              <label className="pal-input-label">String:</label>
              <input
                className="pal-input"
                type="text"
                value={draft}
                onChange={handleInputChange}
                disabled={currentStep !== 0}
                placeholder="Type a word or phrase..."
                maxLength={30}
              />
              {currentStep === 0 && (
                <div className="pal-presets">
                  {["racecar", "hello", "A man a plan a canal Panama", "madam", "civic", "javascript"].map(
                    (word) => (
                      <button
                        key={word}
                        className="pal-preset-btn"
                        onClick={() => {
                          setDraft(word);
                          dispatch(setInput(word));
                        }}
                      >
                        {word}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
            <div className="pal-stage__stats">
              <div className={`pal-phase pal-phase--${phase}`}>
                <span className="pal-phase__label">Phase</span>
                <span className="pal-phase__value">{phase}</span>
              </div>
              <div className="pal-stat">
                <span className="pal-stat__label">Length</span>
                <span className="pal-stat__value">{cleaned.length}</span>
              </div>
              <div className="pal-stat">
                <span className="pal-stat__label">Comparisons</span>
                <span className="pal-stat__value">
                  {revealedCount}/{steps.length}
                </span>
              </div>
            </div>
          </div>
          <div className="pal-stage__canvas-wrap">
            <div className="pal-stage__canvas" ref={containerRef} />
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="pal-sidebar">
          {/* Explanation */}
          <div className="pal-card pal-card--explanation">
            <div className="pal-card__label">What's happening</div>
            <p className="pal-card__text">{explanation}</p>
          </div>

          {/* Code display */}
          <div className="pal-card pal-card--code">
            <div className="pal-card__label">Algorithm</div>
            <pre className="pal-code">
              {CODE_LINES.map((line, i) => (
                <div
                  key={i}
                  className={`pal-code__line ${i === activeCodeLine ? "pal-code__line--active" : ""}`}
                >
                  <span className="pal-code__gutter">{i + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          {/* Comparison log */}
          {revealedCount > 0 && (
            <div className="pal-card pal-card--log">
              <div className="pal-card__label">Comparison Log</div>
              <div className="pal-log">
                {steps.slice(0, revealedCount).map((s, i) => (
                  <div
                    key={i}
                    className={`pal-log__entry ${s.isMatch ? "pal-log__entry--match" : "pal-log__entry--miss"}`}
                  >
                    <span className="pal-log__idx">
                      [{s.left}] vs [{s.right}]
                    </span>
                    <span className="pal-log__chars">
                      '{s.charLeft}' {s.isMatch ? "===" : "!=="} '{s.charRight}'
                    </span>
                    <span className="pal-log__icon">
                      {s.isMatch ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-pointer explanation */}
          <div className="pal-card">
            <div className="pal-card__label">Two-Pointer Technique</div>
            <p className="pal-card__text">
              Instead of reversing the string (O(n) space), we compare from both
              ends inward. If every pair matches, it's a palindrome. First
              mismatch → not a palindrome. <strong>O(n) time, O(1) space.</strong>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PalindromeVisualization;
