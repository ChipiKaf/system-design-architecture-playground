import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "functional-components"
  | "hooks"
  | "memoization"
  | "virtual-dom"
  | "feature-folders"
  | "custom-hooks"
  | "css-in-js"
  | "code-quality"
  | "accessibility";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  /* ── 1. Functional Components ────────────────────────── */
  "functional-components": {
    title: "Functional Components",
    subtitle: "Plain functions that return JSX — the modern React default",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "The old way: class components",
        accent: "#f87171",
        content: (
          <>
            <p>
              Class components are like writing a letter with a typewriter. They
              work, but they come with a lot of ceremony:{" "}
              <code>constructor</code>, <code>this.state</code>,{" "}
              <code>this.setState</code>, <code>render()</code>, lifecycle
              methods like <code>componentDidMount</code>…
            </p>
            <p>
              The word <strong>"this"</strong> is especially confusing for
              beginners — it changes meaning depending on how a function is
              called.
            </p>
          </>
        ),
      },
      {
        title: "The new way: functions + hooks",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              A functional component is just a{" "}
              <strong>JavaScript function</strong> that returns HTML-like code
              (JSX). Need state? Call <code>useState()</code>. Need to fetch
              data? Call <code>useEffect()</code>. No "this", no class
              boilerplate.
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
              {`// That's it — a complete component
function Greeting({ name }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>
    Hi {name}, clicked {count}×
  </button>;
}`}
            </pre>
          </>
        ),
      },
      {
        title: "Why it matters",
        accent: "#34d399",
        content: (
          <ul>
            <li>Shorter code — less room for bugs</li>
            <li>Easier to test — it's just a function</li>
            <li>
              Hooks let you share logic between components (impossible with
              class lifecycle methods)
            </li>
            <li>
              React's future features (Server Components, Suspense) are built
              for functions
            </li>
          </ul>
        ),
      },
    ],
  },

  /* ── 2. Hooks ────────────────────────────────────────── */
  hooks: {
    title: "React Hooks",
    subtitle: "Special functions that let you tap into React features",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What is a hook?",
        accent: "#a78bfa",
        content: (
          <p>
            Think of hooks as <strong>plug-in sockets</strong> on a power strip.
            Your component (the device) plugs into React's features
            (electricity) through these sockets: <code>useState</code> for
            memory, <code>useEffect</code> for side-effects, <code>useRef</code>{" "}
            for holding values that don't trigger re-renders.
          </p>
        ),
      },
      {
        title: "The essential three",
        accent: "#60a5fa",
        content: (
          <ol>
            <li>
              <code>useState(initial)</code> — gives your component a piece of
              memory. Returns <code>[value, setValue]</code>.
            </li>
            <li>
              <code>useEffect(fn, [deps])</code> — runs code after render. Fetch
              data, start timers, subscribe to events.
            </li>
            <li>
              <code>useRef(initial)</code> — a box that holds a value without
              triggering re-renders. Great for DOM refs and timers.
            </li>
          </ol>
        ),
      },
      {
        title: "Golden rule",
        accent: "#fbbf24",
        content: (
          <p>
            Only call hooks <strong>at the top level</strong> of your component
            — never inside loops, conditions, or nested functions. React relies
            on the <em>order</em> of hook calls being the same every render.
          </p>
        ),
      },
    ],
  },

  /* ── 3. Memoization ──────────────────────────────────── */
  memoization: {
    title: "Memoization",
    subtitle: "Skip work React has already done",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "The problem: wasted re-renders",
        accent: "#f87171",
        content: (
          <p>
            By default, when a parent re-renders, <strong>every child</strong>{" "}
            re-renders too — even if its props didn't change. In a big app
            that's like repainting every wall when you only changed one picture.
          </p>
        ),
      },
      {
        title: "The three shields",
        accent: "#fbbf24",
        content: (
          <ol>
            <li>
              <code>React.memo(Component)</code> — wraps a component so it only
              re-renders when its <em>props</em> actually change.
            </li>
            <li>
              <code>useMemo(() =&gt; value, [deps])</code> — caches an expensive
              calculation so it doesn't rerun every render.
            </li>
            <li>
              <code>useCallback(fn, [deps])</code> — caches a function reference
              so child components wrapped in <code>memo</code> don't see a "new"
              function every time.
            </li>
          </ol>
        ),
      },
      {
        title: "When to use (and when NOT to)",
        accent: "#34d399",
        content: (
          <>
            <p>
              <strong>Use</strong> when a component re-renders often with the
              same props, or when a calculation is genuinely heavy (sorting
              10,000 items).
            </p>
            <p>
              <strong>Don't</strong> wrap every single component in memo — the
              comparison itself costs something. Profile first, optimise second.
            </p>
          </>
        ),
      },
    ],
  },

  /* ── 4. Virtual DOM ──────────────────────────────────── */
  "virtual-dom": {
    title: "The Virtual DOM",
    subtitle: "React's lightweight copy of the real page",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "Why not just update the real DOM?",
        accent: "#f87171",
        content: (
          <p>
            The browser DOM is <strong>slow to touch</strong>. Every change
            triggers layout recalculation, repainting, and compositing. Changing
            100 things one-by-one can freeze the page.
          </p>
        ),
      },
      {
        title: "React's trick: diff, then patch",
        accent: "#06b6d4",
        content: (
          <ol>
            <li>
              You update state → React builds a{" "}
              <strong>new virtual DOM tree</strong> (a plain JS object)
            </li>
            <li>
              React <strong>diffs</strong> the new tree against the previous one
            </li>
            <li>
              It figures out the <strong>minimum changes</strong> needed
            </li>
            <li>
              Those changes are <strong>batched</strong> and applied to the real
              DOM in one go
            </li>
          </ol>
        ),
      },
      {
        title: "Analogy",
        accent: "#34d399",
        content: (
          <p>
            It's like editing a Google Doc draft (virtual DOM) and only printing
            the pages that actually changed (real DOM), instead of re-printing
            the entire document every time.
          </p>
        ),
      },
    ],
  },

  /* ── 5. Feature Folders ──────────────────────────────── */
  "feature-folders": {
    title: "Feature-Based Folders",
    subtitle: "Organise by what the feature does, not what the file is",
    accentColor: "#34d399",
    sections: [
      {
        title: "The old way: by type",
        accent: "#f87171",
        content: (
          <pre
            style={{
              background: "#0f172a",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              color: "#f87171",
            }}
          >
            {`src/
  components/   ← 47 files 😵
    Header.tsx
    ProductCard.tsx
    LoginForm.tsx
  hooks/
    useAuth.ts
    useProducts.ts
  services/
    authService.ts
    productService.ts`}
          </pre>
        ),
      },
      {
        title: "The better way: by feature",
        accent: "#34d399",
        content: (
          <pre
            style={{
              background: "#0f172a",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              color: "#34d399",
            }}
          >
            {`src/
  features/
    auth/
      LoginForm.tsx
      useAuth.ts
      authService.ts
      auth.test.ts
    products/
      ProductCard.tsx
      useProducts.ts
      productService.ts`}
          </pre>
        ),
      },
      {
        title: "Why it works",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>Everything for "auth" is in one folder — one place to look</li>
            <li>Deleting a feature = deleting one folder</li>
            <li>New team members find code in seconds instead of minutes</li>
            <li>
              Think of it like a filing cabinet: one drawer per topic, not one
              drawer for all letters and another for all receipts
            </li>
          </ul>
        ),
      },
    ],
  },

  /* ── 6. Custom Hooks ─────────────────────────────────── */
  "custom-hooks": {
    title: "Custom Hooks",
    subtitle: "Extract repeated logic into reusable functions",
    accentColor: "#c084fc",
    sections: [
      {
        title: "The problem: copy-paste logic",
        accent: "#f87171",
        content: (
          <p>
            Three different components all need to check "is the user logged
            in?". Without custom hooks, you'd copy-paste the same{" "}
            <code>useState</code> + <code>useEffect</code> logic into all three.
            When the auth API changes, you have to fix three places.
          </p>
        ),
      },
      {
        title: "The fix: useAuth()",
        accent: "#c084fc",
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
              {`function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    authService.getUser().then(setUser);
  }, []);
  return { user, isLoggedIn: !!user };
}

// Any component can now:
function Header() {
  const { user, isLoggedIn } = useAuth();
  // ...
}`}
            </pre>
            <p>One function, one fix when things change, zero copy-paste.</p>
          </>
        ),
      },
      {
        title: "Naming rule",
        accent: "#fbbf24",
        content: (
          <p>
            Custom hooks <strong>must</strong> start with <code>use</code>. This
            tells React to enforce the rules of hooks (top-level only) and tells
            other devs "this uses React internals."
          </p>
        ),
      },
    ],
  },

  /* ── 7. CSS-in-JS ────────────────────────────────────── */
  "css-in-js": {
    title: "Styling & Reusability",
    subtitle: "CSS-in-JS, children, and Higher-Order Components",
    accentColor: "#f472b6",
    sections: [
      {
        title: "CSS-in-JS — what does it actually mean?",
        accent: "#f472b6",
        content: (
          <>
            <p>
              Normally you write styles in a separate <code>.css</code> file and
              link it to your HTML. <strong>CSS-in-JS flips that</strong>: you
              write styles <em>right inside your JavaScript component</em>,
              using a library like <code>styled-components</code> or{" "}
              <code>Emotion</code>.
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
              {`// Traditional CSS (separate file)
/* Button.css */
.btn { background: blue; color: white; }

// CSS-in-JS (inside the component file)
const Button = styled.button\`
  background: \${props => props.primary ? 'blue' : 'gray'};
  color: white;
\`;
// Usage: <Button primary>Click me</Button>`}
            </pre>
            <p>
              <strong>Analogy:</strong> Traditional CSS is like a shared
              wardrobe — everyone picks clothes from the same closet, and two
              people might grab the same shirt (class name collision). CSS-in-JS
              gives every component its <em>own personal wardrobe</em> — the
              styles are scoped and can't clash.
            </p>
            <p>
              <strong>Benefits:</strong>
            </p>
            <ul>
              <li>
                Styles live next to the component that uses them — no hunting
                through separate files
              </li>
              <li>
                Dynamic: change colours based on props (e.g.{" "}
                <code>primary</code> → blue, otherwise → gray)
              </li>
              <li>
                Theming: swap light/dark mode from one provider, every component
                updates
              </li>
              <li>
                Dead code elimination: delete a component and its styles go with
                it
              </li>
            </ul>
          </>
        ),
      },
      {
        title: "props.children — the slot pattern",
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
              {`function Card({ children }) {
  return <div className="card">{children}</div>;
}

// Use it like a shell:
<Card>
  <h2>Any content goes here</h2>
  <p>The Card doesn't care what's inside</p>
</Card>`}
            </pre>
            <p>
              <code>children</code> makes a component a reusable wrapper — like
              a picture frame that fits any photo.
            </p>
          </>
        ),
      },
      {
        title: "Higher-Order Components (HOCs)",
        accent: "#fbbf24",
        content: (
          <p>
            A HOC is a function that takes a component and returns an enhanced
            version: <code>withAuth(Dashboard)</code> adds auth-checking to
            Dashboard without changing Dashboard's code. Think of it as a
            "power-up" wrapper. (Today, custom hooks often replace HOCs.)
          </p>
        ),
      },
    ],
  },

  /* ── 8. Code Quality ─────────────────────────────────── */
  "code-quality": {
    title: "Code Quality",
    subtitle: "ESLint, naming rules, and test placement",
    accentColor: "#86efac",
    sections: [
      {
        title: "ESLint — your spell-checker",
        accent: "#86efac",
        content: (
          <p>
            ESLint scans your code <strong>before it runs</strong> and catches
            mistakes: missing hook dependencies, unused variables, inconsistent
            formatting. It's like a spell-checker for code — red squiggles
            before you hit send.
          </p>
        ),
      },
      {
        title: "Naming conventions",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              <strong>Components</strong>: PascalCase — <code>ProductCard</code>
              , not <code>productCard</code>. React uses the capital letter to
              tell components apart from HTML tags.
            </li>
            <li>
              <strong>Hooks</strong>: start with <code>use</code> —{" "}
              <code>useAuth</code>, <code>useFetch</code>
            </li>
            <li>
              <strong>Constants</strong>: UPPER_SNAKE — <code>MAX_RETRIES</code>
            </li>
            <li>
              <strong>Files</strong>: match the component name —{" "}
              <code>ProductCard.tsx</code>
            </li>
          </ul>
        ),
      },
      {
        title: "Co-locate tests",
        accent: "#fbbf24",
        content: (
          <p>
            Keep <code>ProductCard.test.tsx</code> next to{" "}
            <code>ProductCard.tsx</code>. When you're fixing a component, the
            test is right there — no hunting through a separate{" "}
            <code>__tests__</code> tree.
          </p>
        ),
      },
    ],
  },

  /* ── 9. Accessibility ────────────────────────────────── */
  accessibility: {
    title: "Accessibility & Security",
    subtitle: "Build for everyone — and keep it safe",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "Semantic HTML — say what you mean",
        accent: "#38bdf8",
        content: (
          <>
            <p>
              Use <code>&lt;button&gt;</code> for clickable actions, not{" "}
              <code>&lt;div onClick&gt;</code>. Use <code>&lt;nav&gt;</code>,{" "}
              <code>&lt;main&gt;</code>, <code>&lt;header&gt;</code>. Screen
              readers and keyboards understand semantic tags automatically.
            </p>
            <p>
              Think of it like road signs — use the real shape (stop sign), not
              a blank white board with "STOP" written on it.
            </p>
          </>
        ),
      },
      {
        title: "ARIA attributes",
        accent: "#a78bfa",
        content: (
          <p>
            When HTML semantics aren't enough, add <code>aria-label</code>,{" "}
            <code>aria-live</code>, or <code>role</code> attributes. Example:{" "}
            <code>&lt;button aria-label="Close menu"&gt;✕&lt;/button&gt;</code>{" "}
            — a screen reader says "Close menu" instead of just "button, X".
          </p>
        ),
      },
      {
        title: "Security: dangerouslySetInnerHTML",
        accent: "#f87171",
        content: (
          <>
            <p>
              This prop injects raw HTML into the page.{" "}
              <strong>
                If an attacker controls that HTML, they own your user's session
              </strong>{" "}
              (XSS attack).
            </p>
            <p>
              Rule: <strong>always sanitize</strong> with a library like{" "}
              <code>DOMPurify</code> before injecting. If you don't need raw
              HTML, don't use it at all.
            </p>
          </>
        ),
      },
    ],
  },
};
