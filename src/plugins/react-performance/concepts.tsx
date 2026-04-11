import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "render-cycle"
  | "wasted-renders"
  | "react-memo"
  | "use-memo-callback"
  | "code-splitting"
  | "memory-leaks"
  | "cleanup-pattern"
  | "heap-snapshots"
  | "lighthouse"
  | "react-profiler";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  /* ── 1. Render Cycle ─────────────────────────────────── */
  "render-cycle": {
    title: "The Render Cycle",
    subtitle: "How React turns your code into pixels",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What happens when state changes?",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              Think of React as a <strong>factory assembly line</strong>:
            </p>
            <ol>
              <li>
                <strong>Trigger</strong> — something changes (you click a
                button, data arrives). React says "time to re-check."
              </li>
              <li>
                <strong>Render</strong> — React calls your component function
                again, producing a new virtual DOM (a lightweight blueprint).
              </li>
              <li>
                <strong>Diff</strong> — React compares the new blueprint to the
                old one. "What actually changed?"
              </li>
              <li>
                <strong>Commit</strong> — Only the changed parts are written to
                the real DOM (the actual page).
              </li>
            </ol>
            <p>
              The problem isn't steps 3-4 (React is fast at diffing). The
              problem is <strong>step 2</strong> — if it runs too often, for too
              many components, the assembly line backs up and the app stutters.
            </p>
          </>
        ),
      },
    ],
  },

  /* ── 2. Wasted Renders ───────────────────────────────── */
  "wasted-renders": {
    title: "Wasted Re-renders",
    subtitle: "The silent performance killer",
    accentColor: "#f87171",
    sections: [
      {
        title: "What's a wasted render?",
        accent: "#f87171",
        content: (
          <p>
            When a parent updates, <strong>all its children</strong> re-render
            by default — even if their props didn't change. It's like reprinting
            every page of a book because you fixed one typo on page 7.
          </p>
        ),
      },
      {
        title: "How to spot them",
        accent: "#fbbf24",
        content: (
          <ol>
            <li>
              Open React DevTools → <strong>Profiler tab</strong>
            </li>
            <li>Click Record → interact with your app → Stop</li>
            <li>
              Components highlighted in <strong>yellow/orange</strong> rendered.
              Grey ones didn't.
            </li>
            <li>
              If a component re-rendered but its output is identical — that's
              wasted work.
            </li>
          </ol>
        ),
      },
      {
        title: "Real-world impact",
        accent: "#60a5fa",
        content: (
          <p>
            A list of 500 items where each row re-renders on every keystroke can
            drop you from 60fps to 10fps. Your users see stuttering, lag, and
            spinning loaders.
          </p>
        ),
      },
    ],
  },

  /* ── 3. React.memo ───────────────────────────────────── */
  "react-memo": {
    title: "React.memo",
    subtitle: "A shield that blocks unnecessary re-renders",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "How it works",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              Wrap a component in <code>React.memo()</code> and React will{" "}
              <strong>skip re-rendering it</strong> if its props haven't
              changed.
            </p>
            <pre
              style={{
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {`const ProductCard = React.memo(({ name, price }) => {
  return <div>{name}: {price}</div>;
});
// Parent re-renders, but if name & price
// are the same → ProductCard skips!`}
            </pre>
          </>
        ),
      },
      {
        title: "The gotcha: object/function props",
        accent: "#f87171",
        content: (
          <p>
            Every render creates a <strong>new object</strong> and a{" "}
            <strong>new function</strong> in memory — even if the content is
            identical. To memo, <code>{`{a:1}`}</code> !=={" "}
            <code>{`{a:1}`}</code> because they're at different addresses.
            That's why you need <code>useMemo</code> and{" "}
            <code>useCallback</code> for complex props.
          </p>
        ),
      },
    ],
  },

  /* ── 4. useMemo & useCallback ────────────────────────── */
  "use-memo-callback": {
    title: "useMemo & useCallback",
    subtitle: "Cache expensive work and stable references",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "useMemo — cache a value",
        accent: "#a78bfa",
        content: (
          <>
            <pre
              style={{
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {`const sorted = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]  // only re-sort when items change
);`}
            </pre>
            <p>
              Without this, sorting runs on <strong>every single render</strong>{" "}
              — even if items haven't changed. Like re-alphabetising your
              bookshelf every time someone walks past it.
            </p>
          </>
        ),
      },
      {
        title: "useCallback — cache a function reference",
        accent: "#60a5fa",
        content: (
          <>
            <pre
              style={{
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {`const handleClick = useCallback(
  () => addToCart(item.id),
  [item.id]  // same function unless item.id changes
);`}
            </pre>
            <p>
              This keeps the <strong>same function reference</strong> across
              renders — so <code>React.memo()</code> children won't see a "new"
              function and won't re-render.
            </p>
          </>
        ),
      },
      {
        title: "Rule of thumb",
        accent: "#34d399",
        content: (
          <p>
            Don't wrap everything. Use <code>useMemo</code> for{" "}
            <strong>heavy calculations</strong> passed as props. Use{" "}
            <code>useCallback</code> for{" "}
            <strong>functions passed to memoized children</strong>. Profile
            first, optimise second.
          </p>
        ),
      },
    ],
  },

  /* ── 5. Code Splitting ───────────────────────────────── */
  "code-splitting": {
    title: "Code Splitting & Lazy Loading",
    subtitle: "Don't ship the whole warehouse — deliver one box at a time",
    accentColor: "#34d399",
    sections: [
      {
        title: "The problem: one giant bundle",
        accent: "#f87171",
        content: (
          <p>
            By default, all your code ships in{" "}
            <strong>one big JavaScript file</strong>. Users on the login page
            download the code for settings, admin dashboard, charts —
            everything. It's like mailing someone a whole encyclopaedia when
            they only asked for the "A" volume.
          </p>
        ),
      },
      {
        title: "The fix: React.lazy + Suspense",
        accent: "#34d399",
        content: (
          <>
            <pre
              style={{
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {`const Settings = React.lazy(
  () => import('./pages/Settings')
);

<Suspense fallback={<Spinner />}>
  <Settings />
</Suspense>`}
            </pre>
            <p>
              <strong>Analogy:</strong> Instead of shipping the whole warehouse,
              the truck comes back with just the box you ordered — only when you
              actually navigate to that page.
            </p>
          </>
        ),
      },
      {
        title: "Impact",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>Initial load shrinks by 30-70%</li>
            <li>
              Users see the first page faster (better Largest Contentful Paint)
            </li>
            <li>Each route loads its own small chunk on demand</li>
          </ul>
        ),
      },
    ],
  },

  /* ── 6. Memory Leaks ─────────────────────────────────── */
  "memory-leaks": {
    title: "Memory Leaks",
    subtitle: "When your app forgets to let go",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What is a memory leak?",
        accent: "#ef4444",
        content: (
          <>
            <p>
              <strong>Analogy:</strong> Imagine a bathtub with the tap running
              (your app creating objects) and a drain (garbage collector
              cleaning up). A memory leak is when{" "}
              <strong>something blocks the drain</strong> — water keeps rising
              until it overflows.
            </p>
            <p>
              In code terms: your app allocates memory for objects, but
              something keeps a reference to them so the garbage collector can't
              reclaim them. Over time, memory climbs and climbs until the
              browser tab crashes or the page becomes unusable.
            </p>
          </>
        ),
      },
      {
        title: "Symptoms you'll notice",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>App gets slower the longer you use it</li>
            <li>Tab memory in Task Manager climbs from 50 MB to 500 MB</li>
            <li>Page eventually freezes or crashes with "Aw, Snap!"</li>
            <li>Animations stutter more over time</li>
          </ul>
        ),
      },
      {
        title: "The top 3 causes in React",
        accent: "#60a5fa",
        content: (
          <ol>
            <li>
              <strong>Forgotten cleanup</strong> — timers, intervals, WebSocket
              listeners, event handlers that keep running after a component
              unmounts
            </li>
            <li>
              <strong>Stale closures</strong> — callbacks that capture old
              state/props and hold references to unmounted component trees
            </li>
            <li>
              <strong>Detached DOM nodes</strong> — refs pointing to elements
              that have been removed from the page but are still held in memory
            </li>
          </ol>
        ),
      },
    ],
  },

  /* ── 7. Cleanup Pattern ──────────────────────────────── */
  "cleanup-pattern": {
    title: "The Cleanup Pattern",
    subtitle: "Always return a cleanup function from useEffect",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "The rule",
        accent: "#f59e0b",
        content: (
          <>
            <p>
              If your <code>useEffect</code> starts something (timer,
              subscription, listener),{" "}
              <strong>the return function must stop it</strong>.
            </p>
            <pre
              style={{
                background: "#0f172a",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {`useEffect(() => {
  const id = setInterval(pollAPI, 5000);
  //        ^── starts the tap

  return () => clearInterval(id);
  //        ^── opens the drain
}, []);`}
            </pre>
          </>
        ),
      },
      {
        title: "Common things that need cleanup",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              <code>setInterval</code> / <code>setTimeout</code> →{" "}
              <code>clearInterval</code> / <code>clearTimeout</code>
            </li>
            <li>
              <code>addEventListener</code> → <code>removeEventListener</code>
            </li>
            <li>
              <code>WebSocket.open</code> → <code>WebSocket.close()</code>
            </li>
            <li>
              <code>observer.observe()</code> →{" "}
              <code>observer.disconnect()</code>
            </li>
            <li>
              Abort controllers for fetch: <code>controller.abort()</code>
            </li>
          </ul>
        ),
      },
      {
        title: 'The "state update on unmounted component" warning',
        accent: "#f87171",
        content: (
          <p>
            If you see{" "}
            <em>
              "Can't perform a React state update on an unmounted component"
            </em>{" "}
            — that's React telling you a <code>useEffect</code> callback is
            still running after the component was removed. The fix: add the
            cleanup return function.
          </p>
        ),
      },
    ],
  },

  /* ── 8. Heap Snapshots ───────────────────────────────── */
  "heap-snapshots": {
    title: "Chrome Heap Snapshots",
    subtitle: "X-ray vision for your app's memory",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "How to take a snapshot",
        accent: "#06b6d4",
        content: (
          <ol>
            <li>
              Open Chrome DevTools → <strong>Memory</strong> tab
            </li>
            <li>
              Select "Heap snapshot" → click <strong>Take snapshot</strong>
            </li>
            <li>Use the app for a while (navigate, open/close modals)</li>
            <li>
              Take a <strong>second snapshot</strong>
            </li>
            <li>
              Compare them: select snapshot 2, then "Objects allocated between
              snapshot 1 and 2"
            </li>
          </ol>
        ),
      },
      {
        title: "What to look for",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              <strong>Detached HTMLDivElement</strong> — DOM nodes that exist in
              memory but aren't on the page
            </li>
            <li>
              <strong>Growing shallow size</strong> — objects getting bigger
              each snapshot
            </li>
            <li>
              <strong>Unreferenced timers</strong> — intervals that should have
              been cleared
            </li>
            <li>
              Click any object → see the <strong>retainer chain</strong> (what's
              holding it in memory)
            </li>
          </ul>
        ),
      },
      {
        title: "Analogy",
        accent: "#34d399",
        content: (
          <p>
            Taking heap snapshots is like photographing your fridge before and
            after a week. If there are containers you didn't put there and
            they're growing mould — those are your memory leaks.
          </p>
        ),
      },
    ],
  },

  /* ── 9. Lighthouse & Web Vitals ──────────────────────── */
  lighthouse: {
    title: "Lighthouse & Web Vitals",
    subtitle: "Your app's report card",
    accentColor: "#86efac",
    sections: [
      {
        title: "Lighthouse",
        accent: "#86efac",
        content: (
          <>
            <p>
              Chrome DevTools → <strong>Lighthouse tab</strong> → Run. It gives
              your page a score out of 100 for Performance, Accessibility, Best
              Practices, and SEO.
            </p>
            <p>
              Think of it as a <strong>school report card</strong>. 90+ is
              great, 50-89 needs work, below 50 is failing.
            </p>
          </>
        ),
      },
      {
        title: "Core Web Vitals — the three numbers that matter",
        accent: "#60a5fa",
        content: (
          <ol>
            <li>
              <strong>LCP (Largest Contentful Paint)</strong> — how fast the
              biggest element loads. Target: <strong>&lt; 2.5 seconds</strong>.
              "How long until the page looks ready?"
            </li>
            <li>
              <strong>INP (Interaction to Next Paint)</strong> — how fast the
              page reacts to clicks/taps. Target: <strong>&lt; 200ms</strong>.
              "How long after I click until something happens?"
            </li>
            <li>
              <strong>CLS (Cumulative Layout Shift)</strong> — how much things
              jump around while loading. Target: <strong>&lt; 0.1</strong>. "Did
              the button move after I tried to click it?"
            </li>
          </ol>
        ),
      },
      {
        title: "Quick wins",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>Compress images (WebP format, lazy-load below the fold)</li>
            <li>
              Code-split routes (<code>React.lazy</code>)
            </li>
            <li>Set explicit width/height on images & videos (prevents CLS)</li>
            <li>Defer third-party scripts (analytics, chat widgets)</li>
          </ul>
        ),
      },
    ],
  },

  /* ── 10. React Profiler ──────────────────────────────── */
  "react-profiler": {
    title: "React DevTools Profiler",
    subtitle: "See exactly which components re-render and why",
    accentColor: "#c084fc",
    sections: [
      {
        title: "How to use it",
        accent: "#c084fc",
        content: (
          <ol>
            <li>
              Install <strong>React DevTools</strong> browser extension
            </li>
            <li>
              Open DevTools → <strong>Profiler</strong> tab
            </li>
            <li>Click the blue ⏺ Record button</li>
            <li>Interact with your app (click buttons, type, navigate)</li>
            <li>Click ⏹ Stop</li>
            <li>
              You'll see a <strong>flame chart</strong> — each bar is a
              component, width = how long it took to render
            </li>
          </ol>
        ),
      },
      {
        title: "Reading the flame chart",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              <strong>Grey bars</strong> = component did NOT re-render (good!)
            </li>
            <li>
              <strong>Green bars</strong> = rendered quickly (OK)
            </li>
            <li>
              <strong>Yellow/orange bars</strong> = rendered slowly
              (investigate!)
            </li>
            <li>
              Click a bar → see <em>"Why did this render?"</em> (requires
              "Record why each component rendered" in settings)
            </li>
          </ul>
        ),
      },
      {
        title: "Analogy",
        accent: "#34d399",
        content: (
          <p>
            The Profiler is like a <strong>security camera</strong> for your
            components. Hit record, do something, stop, and rewind the footage.
            You can see exactly who moved (re-rendered), how long they took, and
            why.
          </p>
        ),
      },
    ],
  },
};
