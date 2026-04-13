import type { ReactNode } from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "climbing-stairs"
  | "dp-1d"
  | "transition"
  | "base-case"
  | "fibonacci";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "climbing-stairs": {
    title: "Climbing Stairs",
    subtitle: "A classic beginner dynamic programming problem",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Problem",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              You are climbing a staircase with <strong>n</strong> steps. Each
              time you can take either <strong>1 step</strong> or{" "}
              <strong>2 steps</strong>. How many distinct ways can you reach
              the top?
            </p>
            <p>
              For example, with n = 3 there are 3 ways: (1+1+1), (1+2), and
              (2+1).
            </p>
          </div>
        ),
      },
      {
        title: "Why DP?",
        accent: "#f59e0b",
        content: (
          <p>
            A brute-force recursive approach has exponential time complexity
            because it recomputes the same sub-problems. DP stores each
            result once, giving us <strong>O(n)</strong> time and space.
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
              <code style={{ color: "#fbbf24" }}>dp[i]</code> = the number of
              distinct ways to reach step <strong>i</strong> from the ground
              (step 0).
            </p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>dp[0] = 1 — one way to be at the ground (do nothing)</li>
              <li>dp[1] = 1 — one way to reach step 1 (single step)</li>
              <li>dp[2] = 2 — (1+1) or (2)</li>
              <li>dp[3] = 3 — (1+1+1), (1+2), or (2+1)</li>
            </ul>
          </div>
        ),
      },
    ],
  },

  transition: {
    title: "Recurrence Relation",
    subtitle: "How each cell is computed from its predecessors",
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
              dp[i] = dp[i-1] + dp[i-2]
            </pre>
            <p style={{ marginTop: 12 }}>
              To reach step <strong>i</strong>, you either came from step{" "}
              <strong>i−1</strong> (took 1 step) or step{" "}
              <strong>i−2</strong> (took 2 steps). The total ways is the sum
              of both.
            </p>
          </div>
        ),
      },
    ],
  },

  "base-case": {
    title: "Base Cases",
    subtitle: "The starting values that anchor the recurrence",
    accentColor: "#22c55e",
    sections: [
      {
        title: "Why dp[0] = 1?",
        accent: "#22c55e",
        content: (
          <p>
            There is exactly <strong>one way</strong> to stay at the ground —
            take zero steps. This might feel counter-intuitive, but it's
            needed so dp[2] = dp[1] + dp[0] = 1 + 1 = 2, which is correct.
          </p>
        ),
      },
      {
        title: "Why dp[1] = 1?",
        accent: "#22c55e",
        content: (
          <p>
            To reach step 1, you can only take a single step from the ground.
            There is exactly one way.
          </p>
        ),
      },
    ],
  },

  fibonacci: {
    title: "Fibonacci Connection",
    subtitle: "Climbing stairs is the Fibonacci sequence in disguise",
    accentColor: "#ec4899",
    sections: [
      {
        title: "Same recurrence!",
        accent: "#ec4899",
        content: (
          <div>
            <p>
              The Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, …
            </p>
            <p>
              The climbing stairs DP array produces exactly the same numbers.
              Both satisfy <code style={{ color: "#f9a8d4" }}>
                f(n) = f(n-1) + f(n-2)
              </code>{" "}
              with f(0) = 1, f(1) = 1.
            </p>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              This means climbing stairs can also be solved in O(1) space
              with two rolling variables, or even O(log n) with matrix
              exponentiation — but the DP table approach is clearest for
              learning.
            </p>
          </div>
        ),
      },
    ],
  },
};
