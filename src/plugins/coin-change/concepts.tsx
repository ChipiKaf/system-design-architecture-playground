import type { ReactNode } from "react";

export type ConceptKey =
  | "dynamic-programming"
  | "subproblem"
  | "transition"
  | "optimal-substructure"
  | "overlapping-subproblems"
  | "tabulation";

interface InfoModalSection {
  title: string;
  content: ReactNode;
  accent?: string;
}

export interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "dynamic-programming": {
    title: "Dynamic Programming",
    subtitle: "Solving problems by combining solutions to subproblems",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What is DP?",
        accent: "#f59e0b",
        content: (
          <p>
            Dynamic Programming is an algorithmic technique that solves complex
            problems by breaking them down into simpler, overlapping
            subproblems. Instead of re-computing each subproblem, DP stores
            results in a table and reuses them — trading space for time.
          </p>
        ),
      },
      {
        title: "Two approaches",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              <strong>Top-down (memoization):</strong> Recursion + cache.
              Compute on demand.
            </p>
            <p>
              <strong>Bottom-up (tabulation):</strong> Fill a table iteratively
              from the smallest subproblems up. This is what we visualize here.
            </p>
          </div>
        ),
      },
    ],
  },

  subproblem: {
    title: "Subproblem",
    subtitle: "The smaller question we solve to answer the bigger one",
    accentColor: "#fb923c",
    sections: [
      {
        title: "What is a subproblem?",
        accent: "#fb923c",
        content: (
          <div>
            <p>
              A <strong>subproblem</strong> is a smaller version of the same
              question. In Coin Change, the big question is:
            </p>
            <p style={{ color: "#fbbf24", fontWeight: 600 }}>
              "What is the fewest coins to make amount {`{target}`}?"
            </p>
            <p>
              The subproblems are the same question for every smaller amount:
            </p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20 }}>
              <li>
                dp[0] — fewest coins to make 0? → <strong>0</strong> (base case)
              </li>
              <li>dp[1] — fewest coins to make 1?</li>
              <li>dp[2] — fewest coins to make 2?</li>
              <li>…and so on up to dp[target]</li>
            </ul>
          </div>
        ),
      },
      {
        title: "How do we define it?",
        accent: "#fb923c",
        content: (
          <div>
            <p>
              <strong>State:</strong>{" "}
              <code style={{ color: "#fbbf24" }}>dp[i]</code> = the minimum
              number of coins needed to make amount <em>i</em>.
            </p>
            <p>
              Each cell in the DP table is one subproblem. We solve them in
              order from smallest (0) to largest (target), because every answer
              depends on answers to smaller amounts.
            </p>
            <p>
              The key insight: if I pick a coin of value <em>c</em>, the
              remainder is <em>i − c</em>. I already solved dp[i − c], so I just
              look it up and add 1.
            </p>
          </div>
        ),
      },
    ],
  },

  transition: {
    title: "Transition",
    subtitle: "The rule that connects subproblems to each other",
    accentColor: "#e879f9",
    sections: [
      {
        title: "What is a transition?",
        accent: "#e879f9",
        content: (
          <div>
            <p>
              A <strong>transition</strong> (or recurrence relation) is the
              formula that tells you how to compute one subproblem from
              previously solved subproblems.
            </p>
            <p>
              It's the core logic of every DP solution — the rule that wires the
              table together.
            </p>
          </div>
        ),
      },
      {
        title: "Coin Change transition",
        accent: "#e879f9",
        content: (
          <div>
            <pre
              style={{
                color: "#e2e8f0",
                fontSize: 13,
                background: "#0f172a",
                padding: 12,
                borderRadius: 6,
              }}
            >
              dp[i] = min(dp[i − coin] + 1) for each coin
            </pre>
            <p>
              In plain English, for each amount <em>i</em>:
            </p>
            <ol style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Look at each coin denomination.</li>
              <li>
                Ask: "If I use this coin, the remainder is <em>i − coin</em>.
                How many coins did that take?"
              </li>
              <li>
                That answer is{" "}
                <code style={{ color: "#fbbf24" }}>dp[i − coin]</code>. Add 1
                (for the coin I just used).
              </li>
              <li>
                Pick the coin that gives the <strong>smallest</strong> total.
              </li>
            </ol>
          </div>
        ),
      },
      {
        title: "Example",
        accent: "#e879f9",
        content: (
          <div>
            <p>Coins = [1, 3, 4], solving dp[5]:</p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                Use coin 1 → dp[4] + 1 = 1 + 1 = <strong>2</strong>
              </li>
              <li>
                Use coin 3 → dp[2] + 1 = 2 + 1 = <strong>3</strong>
              </li>
              <li>
                Use coin 4 → dp[1] + 1 = 1 + 1 = <strong>2</strong>
              </li>
            </ul>
            <p>
              Best = <strong>2</strong>. We can reach 5 in 2 coins (either 4+1
              or 1+4).
            </p>
          </div>
        ),
      },
    ],
  },

  "optimal-substructure": {
    title: "Optimal Substructure",
    subtitle: "Optimal solutions are built from optimal sub-solutions",
    accentColor: "#22c55e",
    sections: [
      {
        title: "The key property",
        accent: "#22c55e",
        content: (
          <p>
            A problem has <strong>optimal substructure</strong> if the optimal
            solution to the whole problem can be built from optimal solutions of
            its sub-problems. For Coin Change: the minimum coins for amount{" "}
            <em>n</em> depends on the minimum coins for amount <em>n − coin</em>{" "}
            for each coin denomination.
          </p>
        ),
      },
    ],
  },

  "overlapping-subproblems": {
    title: "Overlapping Subproblems",
    subtitle: "The same subproblem is solved multiple times",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "Why DP beats recursion",
        accent: "#60a5fa",
        content: (
          <p>
            Without DP, a recursive solution would recompute dp[2] many times
            when solving dp[5] and dp[6]. By storing dp[2] once in our table, we
            avoid exponential redundancy. Watch the arrows — earlier cells get
            referenced over and over.
          </p>
        ),
      },
    ],
  },

  tabulation: {
    title: "Tabulation",
    subtitle: "Bottom-up table filling",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "How it works",
        accent: "#a78bfa",
        content: (
          <div>
            <p>
              Tabulation fills a table from the smallest subproblem (dp[0] = 0)
              to the final answer (dp[target]).
            </p>
            <p>
              At each cell, we try every coin and pick the option that gives the
              minimum. The <strong>transition</strong> is:
            </p>
            <pre style={{ color: "#e2e8f0", fontSize: 13 }}>
              dp[i] = min(dp[i], dp[i − coin] + 1)
            </pre>
          </div>
        ),
      },
    ],
  },
};
