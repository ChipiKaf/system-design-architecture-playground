import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "perfect-squares"
  | "dp-1d"
  | "inner-loop"
  | "base-case"
  | "greedy-trap";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "perfect-squares": {
    title: "Perfect Squares",
    subtitle: "Minimum squares that sum to n",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Problem",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              Given an integer <strong>n</strong>, find the minimum number of
              perfect square numbers (1, 4, 9, 16, 25, …) that sum to{" "}
              <strong>n</strong>.
            </p>
            <p>
              For example, 12 = 4 + 4 + 4 → answer is <strong>3</strong>.
            </p>
          </div>
        ),
      },
      {
        title: "Why DP?",
        accent: "#f59e0b",
        content: (
          <p>
            A greedy approach (always pick the largest square) doesn't always
            work. For n = 12, greedy gives 9 + 1 + 1 + 1 = 4 squares, but the
            optimal is 4 + 4 + 4 = 3 squares. DP tries all options
            systematically.
          </p>
        ),
      },
    ],
  },

  "dp-1d": {
    title: "1D Dynamic Programming",
    subtitle: "A single array stores all sub-problem answers",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is dp[i]?",
        accent: "#3b82f6",
        content: (
          <div>
            <p>
              <code style={{ color: "#fbbf24" }}>dp[i]</code> = the minimum
              number of perfect squares that sum to <strong>i</strong>.
            </p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>dp[0] = 0 — zero squares needed for sum 0</li>
              <li>dp[1] = 1 — just 1²</li>
              <li>dp[4] = 1 — just 2²</li>
              <li>dp[12] = 3 — three 2²'s (4+4+4)</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  "inner-loop": {
    title: "Inner Loop over Squares",
    subtitle: "The key twist compared to simpler DP problems",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The Formula",
        accent: "#a78bfa",
        content: (
          <div>
            <pre
              style={{
                color: "#c4b5fd",
                fontSize: 14,
                background: "#1e1b4b",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {`for j = 1 to √i:\n  dp[i] = min(dp[i], dp[i - j²] + 1)`}
            </pre>
            <p style={{ marginTop: 12 }}>
              For each target sum <strong>i</strong>, we try subtracting every
              perfect square j² and pick whichever leaves the smallest remaining
              count.
            </p>
          </div>
        ),
      },
    ],
  },

  "base-case": {
    title: "Base Case",
    subtitle: "The starting value that anchors the recurrence",
    accentColor: "#22c55e",
    sections: [
      {
        title: "dp[0] = 0",
        accent: "#22c55e",
        content: (
          <div>
            <p>
              To make the sum <strong>0</strong>, you need zero squares. This
              sounds trivial, but it's essential — without it, dp[1] would stay
              at ∞.
            </p>
            <p>
              Everything above 0 starts at ∞ and gets replaced as we find better
              decompositions.
            </p>
          </div>
        ),
      },
    ],
  },

  "greedy-trap": {
    title: "The Greedy Trap",
    subtitle: "Why the biggest square isn't always best",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Counter-Example",
        accent: "#ef4444",
        content: (
          <div>
            <p>
              For <strong>n = 12</strong>, the largest square ≤ 12 is 9. But:
            </p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                Greedy: 9 + 1 + 1 + 1 = <strong>4 squares</strong>
              </li>
              <li>
                Optimal: 4 + 4 + 4 = <strong>3 squares</strong>
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              That's why we need DP — it considers all possibilities.
            </p>
          </div>
        ),
      },
    ],
  },
};
