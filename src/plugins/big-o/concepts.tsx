import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "big-o"
  | "n"
  | "constant"
  | "logarithmic"
  | "linear"
  | "quadratic";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "big-o": {
    title: "Big O Notation",
    subtitle: "A way to describe how work grows as the input gets bigger",
    accentColor: "#f97316",
    sections: [
      {
        title: "Kid Version",
        accent: "#f97316",
        content: (
          <>
            <p>
              Imagine you have toy boxes. Big O asks one simple question:
              <strong>
                {" "}
                if I double the number of boxes, how much more work do I have to
                do?
              </strong>
            </p>
            <p>
              It does <em>not</em> care about tiny details like whether one box
              is blue or red. It cares about the <strong>growth pattern</strong>
              .
            </p>
          </>
        ),
      },
      {
        title: "What It Helps You Predict",
        accent: "#ea580c",
        content: (
          <ul>
            <li>Will this still feel fast when the data gets big?</li>
            <li>Does doubling the input barely matter, or does it explode?</li>
            <li>Which strategy should I choose when there are many items?</li>
          </ul>
        ),
      },
      {
        title: "A Friendly Rule",
        accent: "#c2410c",
        content: (
          <>
            <p>
              Smaller Big O usually means better growth. That does not always
              mean "faster right now," but it often means "safer when the input
              gets huge."
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Think of it like this</h4>
        <p>
          Big O is a <strong>growth story</strong>, not a stopwatch.
        </p>
      </>
    ),
  },
  n: {
    title: "What Is n?",
    subtitle: "The number of things your algorithm has to deal with",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "n Means Size",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              <code>n</code> is just the number of items. It could be boxes,
              books, users, messages, pixels, or rows in a table.
            </p>
            <p>
              In this demo, <code>n</code> is the number of little blocks you
              see. Try changing the size control and watch the work counters
              change.
            </p>
          </>
        ),
      },
      {
        title: "Why n Matters",
        accent: "#d97706",
        content: (
          <>
            <p>
              An algorithm can look fine with 8 items and feel awful with 8,000.
              Big O helps you think about that jump before it becomes a problem.
            </p>
          </>
        ),
      },
    ],
    aside: (
      <>
        <h4>Example</h4>
        <p>
          If there are 32 cards on the screen, then <code>n = 32</code>.
        </p>
      </>
    ),
  },
  constant: {
    title: "O(1) Constant Time",
    subtitle: "The work stays about the same even if n gets bigger",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "The Story",
        accent: "#0ea5e9",
        content: (
          <>
            <p>
              You already know <strong>exactly which drawer</strong> to open.
              You do one peek. That is it.
            </p>
            <p>
              Whether there are 8 drawers or 8,000, you still do one lookup.
            </p>
          </>
        ),
      },
      {
        title: "Common Real Example",
        accent: "#0284c7",
        content: (
          <p>
            Accessing an array item by index: <code>items[3]</code>
          </p>
        ),
      },
    ],
    aside: (
      <>
        <h4>Mental Picture</h4>
        <p>A magic map tells you the exact box. No searching.</p>
      </>
    ),
  },
  logarithmic: {
    title: "O(log n) Logarithmic Time",
    subtitle: "Each peek throws away a big chunk of the work",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "The Story",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              Start in the middle. If the target is bigger, ignore the whole
              left half. If the target is smaller, ignore the whole right half.
            </p>
            <p>
              Every peek cuts the search space roughly in half, so growth stays
              gentle even when <code>n</code> gets large.
            </p>
          </>
        ),
      },
      {
        title: "Common Real Example",
        accent: "#7c3aed",
        content: <p>Binary search on sorted data.</p>,
      },
    ],
    aside: (
      <>
        <h4>Shortcut</h4>
        <p>
          Doubling the input usually adds only{" "}
          <strong>about one more peek</strong>.
        </p>
      </>
    ),
  },
  linear: {
    title: "O(n) Linear Time",
    subtitle: "You may need to check items one by one",
    accentColor: "#22c55e",
    sections: [
      {
        title: "The Story",
        accent: "#22c55e",
        content: (
          <>
            <p>
              You start at the first box and keep checking until you find the
              target. If the target is last, you look at every single box.
            </p>
            <p>
              If <code>n</code> doubles, the worst-case work doubles too.
            </p>
          </>
        ),
      },
      {
        title: "Common Real Example",
        accent: "#16a34a",
        content: <p>Scanning a list for a value when it is not indexed.</p>,
      },
    ],
    aside: (
      <>
        <h4>Mental Picture</h4>
        <p>One flashlight. One hallway. Check each door in order.</p>
      </>
    ),
  },
  quadratic: {
    title: "O(n^2) Quadratic Time",
    subtitle: "Work can explode because every item interacts with every item",
    accentColor: "#ef4444",
    sections: [
      {
        title: "The Story",
        accent: "#ef4444",
        content: (
          <>
            <p>
              Imagine every kid in a class compares stickers with every other
              kid. That creates a giant grid of comparisons.
            </p>
            <p>
              When <code>n</code> doubles, the work grows by about{" "}
              <strong>4x</strong>.
            </p>
          </>
        ),
      },
      {
        title: "Common Real Example",
        accent: "#dc2626",
        content: <p>Nested loops that compare each item with each item.</p>,
      },
    ],
    aside: (
      <>
        <h4>Warning Sign</h4>
        <p>Small inputs may feel okay. Bigger inputs get painful fast.</p>
      </>
    ),
  },
};
