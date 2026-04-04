import type { ReactNode } from "react";

export type ConceptKey =
  | "lcs"
  | "subproblem-2d"
  | "transition-lcs"
  | "subsequence"
  | "traceback"
  | "base-case";

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
  lcs: {
    title: "Longest Common Subsequence",
    subtitle: "Finding the longest shared ordering between two sequences",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What is LCS?",
        accent: "#3b82f6",
        content: (
          <div>
            <p>
              A <strong>subsequence</strong> is a sequence derived from another
              by deleting some (or no) elements without changing the order of
              the remaining elements.
            </p>
            <p>
              The <strong>Longest Common Subsequence</strong> of two strings is
              the longest subsequence that appears in both. For "abcde" and
              "ace", the LCS is "ace" (length 3).
            </p>
          </div>
        ),
      },
      {
        title: "Real-world uses",
        accent: "#3b82f6",
        content: (
          <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>diff tools</strong> — how git diff finds what changed
            </li>
            <li>
              <strong>DNA matching</strong> — comparing genetic sequences
            </li>
            <li>
              <strong>spell checking</strong> — measuring string similarity
            </li>
            <li>
              <strong>version control</strong> — merging file changes
            </li>
          </ul>
        ),
      },
    ],
  },

  "subproblem-2d": {
    title: "2D Subproblem",
    subtitle: "Each cell answers a smaller version of the question",
    accentColor: "#fb923c",
    sections: [
      {
        title: "What is dp[i][j]?",
        accent: "#fb923c",
        content: (
          <div>
            <p>
              <code style={{ color: "#fbbf24" }}>dp[i][j]</code> = the length of
              the LCS of the <strong>first i characters</strong> of text1 and
              the <strong>first j characters</strong> of text2.
            </p>
            <p>For example, if text1 = "abcde" and text2 = "ace":</p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                dp[2][1] → LCS of "ab" and "a" = "a" → <strong>1</strong>
              </li>
              <li>
                dp[3][2] → LCS of "abc" and "ac" = "ac" → <strong>2</strong>
              </li>
              <li>
                dp[5][3] → LCS of "abcde" and "ace" = "ace" → <strong>3</strong>{" "}
                (the final answer)
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "Base cases",
        accent: "#fb923c",
        content: (
          <p>
            Row 0 and column 0 are all zeros: comparing any string with an empty
            string gives LCS = 0. This is why the first row and column are
            pre-filled.
          </p>
        ),
      },
    ],
  },

  "transition-lcs": {
    title: "LCS Transition",
    subtitle: "The rule that fills each cell from its neighbours",
    accentColor: "#e879f9",
    sections: [
      {
        title: "When characters match",
        accent: "#22c55e",
        content: (
          <div>
            <pre
              style={{
                color: "#86efac",
                fontSize: 13,
                background: "#052e16",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #166534",
              }}
            >
              dp[i][j] = dp[i-1][j-1] + 1
            </pre>
            <p>
              "These characters are part of the LCS! Take the LCS length from
              before both characters (diagonal ↖) and add 1."
            </p>
          </div>
        ),
      },
      {
        title: "When characters don't match",
        accent: "#ef4444",
        content: (
          <div>
            <pre
              style={{
                color: "#fca5a5",
                fontSize: 13,
                background: "#450a0a",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #7f1d1d",
              }}
            >
              dp[i][j] = max(dp[i-1][j], dp[i][j-1])
            </pre>
            <p>
              "These characters don't match, so the LCS can't grow. Carry
              forward the better result — either skip a character from text1 (↑
              up) or skip one from text2 (← left).
            </p>
          </div>
        ),
      },
    ],
  },

  subsequence: {
    title: "Subsequence vs Substring",
    subtitle: "Order matters, but gaps are allowed — and this changes the algorithm",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "The difference",
        accent: "#14b8a6",
        content: (
          <div>
            <p>For the string "abcde":</p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                <strong>"ace"</strong> is a <em>subsequence</em> ✓ (a, skip b,
                c, skip d, e — order preserved)
              </li>
              <li>
                <strong>"aec"</strong> is <em>not</em> a subsequence ✗ (e comes
                before c — order violated)
              </li>
              <li>
                <strong>"abc"</strong> is both a subsequence <em>and</em> a
                substring (contiguous)
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: "Why this matters for the no-match case",
        accent: "#ef4444",
        content: (
          <div>
            <p>
              When <code style={{ color: "#fbbf24" }}>text1[i-1] ≠ text2[j-1]</code>,
              at least one character can't be in the LCS at this position.
              Since a <strong>subsequence allows gaps</strong>, we can skip
              either character and keep going:
            </p>
            <ul style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                <strong>↑ Skip from text1</strong>: maybe the LCS doesn't
                use text1[i-1] → check dp[i-1][j]
              </li>
              <li>
                <strong>← Skip from text2</strong>: maybe the LCS doesn't
                use text2[j-1] → check dp[i][j-1]
              </li>
            </ul>
            <p>
              We take <code style={{ color: "#fbbf24" }}>max()</code> because
              we want the <em>longest</em> result. The subsequence we've
              built so far survives — we just skip past this mismatch.
            </p>
          </div>
        ),
      },
      {
        title: "What if we required contiguous? (Substring)",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              For <strong>Longest Common Substring</strong>, characters must be
              adjacent. The algorithm changes in one key way:
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <pre
                style={{
                  flex: 1,
                  color: "#86efac",
                  fontSize: 11,
                  background: "#052e16",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #166534",
                }}
              >
{`// Sub-SEQUENCE (this viz)
if match:
  dp[i][j] = dp[i-1][j-1]+1
else:
  dp[i][j] = max(↑, ←)
  // carry forward`}
              </pre>
              <pre
                style={{
                  flex: 1,
                  color: "#fde68a",
                  fontSize: 11,
                  background: "#451a03",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #78350f",
                }}
              >
{`// Sub-STRING (contiguous)
if match:
  dp[i][j] = dp[i-1][j-1]+1
else:
  dp[i][j] = 0
  // streak broken!`}
              </pre>
            </div>
            <p style={{ marginTop: 10 }}>
              The critical difference: on a <strong>mismatch</strong>,
              substring resets to <strong>0</strong> because any gap breaks
              the streak. Subsequence takes the <code style={{ color: "#fbbf24" }}>max</code> because
              gaps are allowed — the best result so far survives.
            </p>
            <p style={{ color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>
              This is why subsequence ≥ substring for the same inputs.
              "ace" is a subsequence of "abcde" but not a substring.
            </p>
          </div>
        ),
      },
    ],
  },

  traceback: {
    title: "Traceback",
    subtitle: "Recovering the actual LCS from the DP table",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "How traceback works",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              After filling the table, dp[m][n] gives the <em>length</em> of the
              LCS. But which characters? We trace back from the bottom-right
              corner:
            </p>
            <ol style={{ color: "#e2e8f0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>
                If text1[i] === text2[j] → this character is in the LCS. Move ↖
                diagonally.
              </li>
              <li>Else if dp[i−1][j] ≥ dp[i][j−1] → move ↑ up.</li>
              <li>Else → move ← left.</li>
            </ol>
            <p>
              Collect every character from step 1, reverse the list, and you
              have the LCS string.
            </p>
          </div>
        ),
      },
    ],
  },

  "base-case": {
    title: 'Why the "" Row & Column?',
    subtitle: "The empty-string base case that makes the recurrence work",
    accentColor: "#f472b6",
    sections: [
      {
        title: "The problem",
        accent: "#f472b6",
        content: (
          <div>
            <p>
              The recurrence reaches back to <code style={{ color: "#fbbf24" }}>dp[i-1][j-1]</code>,{" "}
              <code style={{ color: "#fbbf24" }}>dp[i-1][j]</code>, and{" "}
              <code style={{ color: "#fbbf24" }}>dp[i][j-1]</code>.
              When <strong>i=1</strong> or <strong>j=1</strong>, that reaches row 0 or column 0.
            </p>
            <p>
              If those didn't exist, every cell on the first real row/column would
              need a special <code style={{ color: "#fbbf24" }}>if</code> check
              to avoid going out of bounds.
            </p>
          </div>
        ),
      },
      {
        title: "The solution: an extra row & column",
        accent: "#f472b6",
        content: (
          <div>
            <p>
              Row 0 means <em>"0 characters used from text1"</em> — i.e. the empty
              string <code style={{ color: "#fbbf24" }}>""</code>. Column 0 means
              the same for text2.
            </p>
            <p>
              The LCS of <strong>anything</strong> vs <code style={{ color: "#fbbf24" }}>""</code> is
              trivially <strong>0</strong>. That's why the entire first row and
              first column are filled with 0.
            </p>
          </div>
        ),
      },
      {
        title: "That's what +1 means",
        accent: "#f472b6",
        content: (
          <div>
            <pre
              style={{
                color: "#f9a8d4",
                fontSize: 13,
                background: "#500724",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #831843",
              }}
            >
{`Array(m + 1)  // not m!
     ^
     extra slot for ""`}
            </pre>
            <p>
              The <code style={{ color: "#fbbf24" }}>+1</code> in{" "}
              <code style={{ color: "#fbbf24" }}>Array(m+1)</code> isn’t arbitrary —
              it creates space for the <code style={{ color: "#fbbf24" }}>""</code> base
              case so the recurrence can <strong>always</strong> safely look at{" "}
              <code style={{ color: "#fbbf24" }}>[i-1]</code> and{" "}
              <code style={{ color: "#fbbf24" }}>[j-1]</code> without bounds
              checking.
            </p>
            <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
              The <code style={{ color: "#fbbf24" }}>.fill(0)</code> in the
              initialisation <em>is</em> the base case assignment.
            </p>
          </div>
        ),
      },
    ],
  },
};
