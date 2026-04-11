import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "dom-nodes"
  | "reflow-repaint"
  | "viewport"
  | "virtual-list"
  | "overscan"
  | "spacer-trick"
  | "scroll-handler"
  | "windowing-libraries";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "dom-nodes": {
    title: "DOM Nodes",
    subtitle: "The building blocks the browser paints on screen",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "The Analogy",
        accent: "#60a5fa",
        content: (
          <p>
            Think of DOM nodes like <strong>Lego bricks on a table</strong>.
            Each brick is one element — a row, a cell, a button. When you have
            10 bricks, cleaning the table is quick. When you have{" "}
            <strong>10,000 bricks</strong>, just counting them takes ages — and
            moving the table makes them all wobble.
          </p>
        ),
      },
      {
        title: "Why It Matters",
        accent: "#3b82f6",
        content: (
          <>
            <p>
              Every DOM node costs <strong>memory</strong> (the browser stores
              it) and <strong>CPU time</strong> (the browser has to check it
              during layout and paint). More nodes = slower everything.
            </p>
            <p>
              A table with 10,000 rows creates ~10,000 <code>&lt;tr&gt;</code>{" "}
              nodes + thousands of <code>&lt;td&gt;</code> children. That's
              easily <strong>50,000+ DOM nodes</strong> — browsers start
              struggling around 1,500.
            </p>
          </>
        ),
      },
      {
        title: "Key Numbers",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              <strong>Fast page:</strong> &lt; 1,500 DOM nodes total
            </li>
            <li>
              <strong>Sluggish page:</strong> 3,000–5,000 nodes
            </li>
            <li>
              <strong>Frozen page:</strong> 10,000+ nodes
            </li>
          </ul>
        ),
      },
    ],
  },

  "reflow-repaint": {
    title: "Reflow & Repaint",
    subtitle: "The two expensive jobs the browser does after every change",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The Analogy",
        accent: "#f59e0b",
        content: (
          <p>
            Imagine a <strong>seating chart at a wedding</strong>. Reflow is
            recalculating where every chair goes when you add one more guest.
            Repaint is rewriting everyone's name card after the rearrangement.
            One extra guest = every seat rechecked.
          </p>
        ),
      },
      {
        title: "Reflow (Layout)",
        accent: "#fbbf24",
        content: (
          <p>
            The browser recalculates the <strong>size and position</strong> of
            elements. Triggered by adding/removing nodes, changing widths, or
            scrolling. With 10,000 rows, one reflow can take{" "}
            <strong>100+ ms</strong> — that's noticeable jank.
          </p>
        ),
      },
      {
        title: "Repaint",
        accent: "#f59e0b",
        content: (
          <p>
            After knowing where things go, the browser{" "}
            <strong>redraws pixels</strong>. Changing colors, shadows, or
            visibility triggers repaint. Cheaper than reflow, but still adds up
            with thousands of elements.
          </p>
        ),
      },
    ],
  },

  viewport: {
    title: "The Viewport",
    subtitle: "The window you actually see through",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "The Analogy",
        accent: "#06b6d4",
        content: (
          <p>
            Your screen is like a <strong>porthole on a ship</strong>. The ocean
            is massive, but you can only see a small circle at a time. The
            viewport is that porthole — it shows a tiny slice of the full
            content.
          </p>
        ),
      },
      {
        title: "How Big Is It?",
        accent: "#22d3ee",
        content: (
          <>
            <p>
              If your scrollable container is <strong>500px tall</strong> and
              each row is <strong>50px</strong>, you can see exactly{" "}
              <strong>10 rows</strong> at once. That means 9,990 rows are
              invisible. Why render them?
            </p>
            <p>
              <code>visibleCount = Math.ceil(containerHeight / rowHeight)</code>
            </p>
          </>
        ),
      },
    ],
  },

  "virtual-list": {
    title: "Virtual List",
    subtitle: "The core trick — only render what's visible",
    accentColor: "#34d399",
    sections: [
      {
        title: "The Analogy",
        accent: "#34d399",
        content: (
          <p>
            Imagine a <strong>conveyor belt at a sushi restaurant</strong>. The
            kitchen doesn't make 10,000 plates at once and pile them on the
            belt. It makes ~10 plates at a time, and when one leaves your view,
            a new one rolls in. The belt looks full, but only a few plates exist
            at any moment.
          </p>
        ),
      },
      {
        title: "How It Works",
        accent: "#10b981",
        content: (
          <ol>
            <li>
              <strong>Calculate</strong> which rows are in the viewport (start
              index → end index)
            </li>
            <li>
              <strong>Render</strong> only those rows as real DOM nodes
            </li>
            <li>
              <strong>Position</strong> them with{" "}
              <code>transform: translateY</code> so they appear at the right
              scroll offset
            </li>
            <li>
              <strong>Recycle</strong> — as you scroll, old rows unmount and new
              ones mount
            </li>
          </ol>
        ),
      },
      {
        title: "The Math",
        accent: "#34d399",
        content: (
          <pre
            style={{
              background: "#1e293b",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
              overflowX: "auto",
            }}
          >
            {`const startIndex = Math.floor(scrollTop / rowHeight);
const endIndex = startIndex + visibleCount;
const offset = startIndex * rowHeight;

// Render rows[startIndex..endIndex]
// translateY(offset) to position them`}
          </pre>
        ),
      },
    ],
  },

  overscan: {
    title: "Overscan Buffer",
    subtitle: "Extra invisible rows that prevent flash-of-white",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The Analogy",
        accent: "#a78bfa",
        content: (
          <p>
            When you scroll fast, the browser needs time to render new rows. The
            overscan buffer is like{" "}
            <strong>pre-loading the next page of a book</strong> before you
            finish the current one — you keep a few extra rows rendered above
            and below the viewport so there's no blank flash.
          </p>
        ),
      },
      {
        title: "Typical Values",
        accent: "#8b5cf6",
        content: (
          <>
            <p>
              <strong>overscanCount = 3–5 rows</strong> above and below. This
              adds only 6–10 extra DOM nodes but eliminates flicker during
              normal scrolling.
            </p>
            <pre
              style={{
                background: "#1e293b",
                padding: "0.75rem",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
            >
              {`const renderStart = Math.max(0, startIndex - overscan);
const renderEnd = Math.min(total, endIndex + overscan);`}
            </pre>
          </>
        ),
      },
    ],
  },

  "spacer-trick": {
    title: "The Spacer Trick",
    subtitle: "How the scrollbar stays the right size",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "The Analogy",
        accent: "#fbbf24",
        content: (
          <p>
            If you only render 10 rows, the scrollbar thinks the list is tiny.
            The spacer trick is like putting a{" "}
            <strong>tall invisible pillar</strong> inside the container. The
            pillar's height = <code>totalRows × rowHeight</code>. Now the
            scrollbar behaves as if all 10,000 rows exist, even though only 10
            are real.
          </p>
        ),
      },
      {
        title: "Implementation",
        accent: "#f59e0b",
        content: (
          <pre
            style={{
              background: "#1e293b",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
              overflowX: "auto",
            }}
          >
            {`<div style={{ height: totalRows * rowHeight }}>
  {/* rendered rows positioned with translateY */}
</div>

// scrollbar height = container / totalHeight
// = 500px / 500,000px → tiny thumb = lots to scroll`}
          </pre>
        ),
      },
    ],
  },

  "scroll-handler": {
    title: "Scroll Event Handler",
    subtitle: "The listener that triggers recalculation on every frame",
    accentColor: "#f472b6",
    sections: [
      {
        title: "The Analogy",
        accent: "#f472b6",
        content: (
          <p>
            The scroll handler is like a{" "}
            <strong>security camera watching the elevator display</strong>. As
            the floor number changes, it radios "show floor 5 through 15." The
            scroll position is the floor number, and the handler tells React
            which rows to render.
          </p>
        ),
      },
      {
        title: "Performance Tip",
        accent: "#ec4899",
        content: (
          <>
            <p>
              Scroll events fire <strong>dozens of times per second</strong>.
              Use <code>requestAnimationFrame</code> or the browser's passive
              scroll listener to avoid blocking the main thread:
            </p>
            <pre
              style={{
                background: "#1e293b",
                padding: "0.75rem",
                borderRadius: 8,
                fontSize: 12,
                color: "#e2e8f0",
              }}
            >
              {`containerRef.addEventListener('scroll', handler, 
  { passive: true });`}
            </pre>
          </>
        ),
      },
    ],
  },

  "windowing-libraries": {
    title: "Windowing Libraries",
    subtitle: "Don't build it from scratch — use these",
    accentColor: "#86efac",
    sections: [
      {
        title: "Why Use a Library?",
        accent: "#86efac",
        content: (
          <p>
            Virtual scrolling has edge cases — variable row heights, dynamic
            content, horizontal scrolling, sticky headers. Libraries handle all
            of this so you don't have to.
          </p>
        ),
      },
      {
        title: "Top Choices for React",
        accent: "#22c55e",
        content: (
          <ul>
            <li>
              <strong>react-window</strong> — lightweight (6 KB), fixed or
              variable-size rows, the go-to choice
            </li>
            <li>
              <strong>react-virtuoso</strong> — auto-measures row heights,
              handles grouping and sticky headers
            </li>
            <li>
              <strong>@tanstack/react-virtual</strong> — headless (no UI
              opinion), works with any layout — tables, grids, masonry
            </li>
          </ul>
        ),
      },
      {
        title: "Quick Usage (react-window)",
        accent: "#86efac",
        content: (
          <pre
            style={{
              background: "#1e293b",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
              overflowX: "auto",
            }}
          >
            {`import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={500}
  itemCount={10000}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>Row {index}</div>
  )}
</FixedSizeList>`}
          </pre>
        ),
      },
    ],
  },
};
