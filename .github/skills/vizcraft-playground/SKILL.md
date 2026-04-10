---
name: vizcraft-playground
description: "Build, extend, and debug VizCraft interactive visualization playgrounds. USE WHEN: the workspace depends on 'vizcraft' in package.json, has src/registry.ts with PluginCategory[], has src/components/plugin-kit/, or has scripts/generate-plugin.js. USE FOR: creating new plugins, building VizCraft scenes (nodes, edges, signals, overlays), writing animation hooks, defining concept pills and InfoModal content, configuring Redux slices for plugin state, styling plugins with dark-theme SCSS, managing signal persistence and multi-hop chains, wiring plugins into the category registry, and applying walkthrough UX rules (button-gated steps, smooth signal animation, numbered edges, progressive disclosure, and one thing or movement per step; split chained changes into separate steps). DO NOT USE FOR: non-VizCraft React projects, general Redux questions unrelated to plugins."
---

# VizCraft Playground Skill

Use this skill whenever working inside a VizCraft playground — any project scaffolded by `create-vizcraft-playground` or matching these markers:

- `package.json` depends on `vizcraft`
- `src/registry.ts` exports `PluginCategory[]`
- `src/components/plugin-kit/` exists
- `src/types/ModelPlugin.ts` defines `DemoPlugin`
- `scripts/generate-plugin.js` exists

## Playground architecture

A VizCraft playground is a **plugin-based interactive visualization platform**.

| Layer      | Files                                 | Purpose                                         |
| ---------- | ------------------------------------- | ----------------------------------------------- |
| Config     | `src/playground.config.ts`            | Branding: title, subtitle, accent               |
| Registry   | `src/registry.ts`                     | Single source of truth for categories + plugins |
| Store      | `src/store/store.ts`                  | Redux store from `pluginReducerMap`             |
| Simulation | `src/store/slices/simulationSlice.ts` | Shared `currentStep`, `passCount`, `isPlaying`  |
| Shell      | `src/components/Shell.tsx`            | Step lifecycle, restart, nav                    |
| Plugin Kit | `src/components/plugin-kit/`          | Reusable UI building blocks                     |
| Plugins    | `src/plugins/{name}/`                 | Self-contained demos                            |

## Plugin anatomy

Every plugin lives in `src/plugins/{kebab-name}/` with exactly six files.

| File                          | Naming                          | Purpose                                    |
| ----------------------------- | ------------------------------- | ------------------------------------------ |
| `index.ts`                    | —                               | DemoPlugin export, steps, restart config   |
| `{camelName}Slice.ts`         | `eventStreamingSlice.ts`        | Redux slice: state type, reducers, actions |
| `use{PascalName}Animation.ts` | `useEventStreamingAnimation.ts` | Step-driven animation orchestration        |
| `main.tsx`                    | —                               | React component rendering VizCraft scene   |
| `concepts.tsx`                | —                               | ConceptKey type + ConceptDefinition record |
| `main.scss`                   | —                               | Plugin-specific dark-theme styles          |

### Scaffolding

```bash
npm run generate -- my-plugin --category "Category Name"
# or with a mode:
npm run generate -- my-plugin --category "Category Name" --sandbox
npm run generate -- my-plugin --category "Category Name" --comparison
npm run generate -- my-plugin --category "Category Name" --modular
```

Modes: `--sandbox` / `-s`, `--timeline` / `-t`, `--comparison` / `-l`, `--modular` / `-m`.

For mode-specific rules see: vizcraft-sandbox-plugin, vizcraft-comparison-lab-plugin, vizcraft-modular-plugin.

If the category exists, the plugin is appended into its `plugins` array.
If the category does not exist, a new entry is created in the `categories` array.

## DemoPlugin interface

```typescript
interface DemoPlugin<State, Actions, TRootState, TDispatch> {
  id: string; // kebab-case
  name: string; // Display name
  description: string; // One-liner
  initialState: State;
  reducer: Reducer<State, Actions>;
  Component: React.FC<{ onAnimationComplete?: () => void }>;
  Controls?: React.FC;
  restartConfig?: { text?: string; color?: string };
  getSteps: (state: State) => (string | DemoStep)[];
  init: (dispatch: TDispatch) => void;
  selector: (state: TRootState) => State;
}

interface DemoStep {
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  processingText?: string;
  nextButtonColor?: string;
}
```

## Step granularity

Keep walkthroughs comprehensive overall, but make each step singular:

- One step = one idea, one movement, or one state change.
- If a step needs multiple transitions or explanations, split it.
- The viewer should be able to say what changed at the end of the step without referencing later steps.

The `selector` uses a local root type: `type LocalRootState = { [camelName]: State }`.

## Plugin-kit components

Import from `../../components/plugin-kit`. All classes use the `vc-` prefix.

### PluginLayout

Two-column layout: toolbar → body (canvas + optional sidebar).

```tsx
<PluginLayout
  toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
  canvas={<div className="my-stage"><StageHeader .../><CanvasStage canvasRef={ref} /></div>}
  sidebar={<SidePanel>...</SidePanel>}
/>
```

Props: `toolbar?: ReactNode`, `canvas: ReactNode`, `sidebar?: ReactNode`, `className?`.
When `sidebar` is omitted, the canvas takes full width.

### CanvasStage

Wrapper for the VizCraft mount point with a dot-grid background.

```tsx
<CanvasStage canvasRef={containerRef}>
  <VizInfoBeacon ... />  {/* Optional overlays */}
</CanvasStage>
```

Props: `canvasRef?: Ref<HTMLDivElement>`, `children?: ReactNode`, `className?`.

### ConceptPills

Horizontal row of clickable info pills.

```tsx
const pills: PillDef[] = [
  { key: "kafka", label: "Kafka", color: "#7dd3fc", borderColor: "#0ea5e9" },
];
<ConceptPills pills={pills} onOpen={openConcept} />;
```

Props: `pills: PillDef[]`, `onOpen: (key: string) => void`, `className?`.

**PillDef:** `{ key, label, variant?, color?, borderColor? }`.
Use inline `color`/`borderColor` for pill colours (not variant classes).

### useConceptModal

Hook that manages the InfoModal lifecycle.

```tsx
const { openConcept, closeConcept, ConceptModal } =
  useConceptModal<ConceptKey>(concepts);
// Render <ConceptModal /> anywhere in JSX
```

Generic over `K extends string`. Returns `{ activeConcept, openConcept, closeConcept, ConceptModal }`.

### StageHeader

Title + subtitle + right-aligned stats area.

```tsx
<StageHeader title="ECS Autoscaling" subtitle="Watch containers scale">
  <StatBadge label="Phase" value="alarm" color="#fda4af" />
</StageHeader>
```

Props: `title: string`, `subtitle?: string`, `children?: ReactNode` (stat badges), `className?`.

### StatBadge

Small stat chip: uppercase label + bold coloured value.

```tsx
<StatBadge label="Tasks" value="3/5" color="#86efac" />
```

Props: `label: string`, `value: ReactNode`, `color?: string`, `className?`.

### SidePanel and SideCard

Scrollable sidebar with labelled cards.

```tsx
<SidePanel>
  <SideCard label="What's happening" variant="explanation">
    <p>{explanation}</p>
  </SideCard>
</SidePanel>
```

SideCard props: `label?`, `heading?`, `sub?`, `variant?`, `children`, `className?`.

### VizInfoBeacon

Floating info indicator over a scene region. Opens concepts on click.

```tsx
<VizInfoBeacon
  viewWidth={900}
  viewHeight={600}
  hoverRegion={{ x: 100, y: 200, width: 140, height: 60 }}
  indicatorPosition={{ x: 170, y: 195 }}
  ariaLabel="Learn about Producer"
  onActivate={() => openConcept("producer")}
/>
```

### InfoModal

Full-screen modal for concept definitions. Typically managed by `useConceptModal`, not used directly.

```typescript
interface InfoModalSection {
  title: string;
  content: ReactNode;
  accent?: string;
}
```

## VizCraft builder API

### Scene setup

```typescript
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";

const b = viz().view(width, height);
```

### Nodes

```typescript
b.node("my-node")
  .at(x, y)
  .rect(w, h, cornerRadius) // or .circle(radius)
  .fill(color)
  .stroke(color, width)
  .label(text, { fill, fontSize, fontWeight, dy })
  .tooltip({ title, sections: [{ label, value }] })
  .badge(label, { position })
  .onClick(handler);
```

### Edges

```typescript
b.edge("from-id", "to-id", "edge-id")
  .stroke(color, width)
  .arrow(true)
  .label(text, { fill, fontSize })
  .dashed()
  .animate("flow", { duration: "2s" });
```

### Overlays

```typescript
b.overlay((o) => {
  o.add(
    "rect",
    { x, y, w, h, rx, ry, fill, stroke, strokeWidth, opacity },
    { key, className },
  );
  o.add("text", { x, y, text, fill, fontSize, fontWeight }, { key });
  o.add("circle", { x, y, r, fill, stroke }, { key });
  o.add("signal", signalParams, { key });
});
```

### Mounting

```typescript
const pz = scene.mount(containerEl, {
  autoplay: true,
  panZoom: true,
  initialZoom: saved?.zoom ?? 1,
  initialPan: saved?.pan ?? { x: 0, y: 0 },
});
// pz.getState() → { zoom, pan: { x, y } }
```

Always preserve pan/zoom across rebuilds:

```typescript
const pzRef = useRef<PanZoomController | null>(null);

useLayoutEffect(() => {
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
  };
}, []);
```

## Signals: the core animation primitive

A signal is an animated ball traveling along an edge between nodes.

```typescript
type Signal = { id: string } & SignalOverlayParams;

// SignalOverlayParams:
{
  from: string;       // start node
  to: string;         // end node
  progress: number;   // 0 = at from, 1 = at to
  magnitude?: number; // ball size multiplier
  color?: string;
}
```

### Persistent vs transient signals

**This is critical.** When signals represent persistent state (events sitting in a partition, messages stored in a queue, data at rest), they must remain visible after animation completes. When signals represent transient events (a request in flight), they disappear after reaching their destination.

**Transient** — disappear after arrival:

```typescript
animateChain(hops, 500, () => setSignals([]));
```

**Persistent** — stay visible at destination:

```typescript
// After animation, keep as resting circles
persistedRef.current.push({
  id: `rest-${Date.now()}`,
  nodeId: "partition-0",
  offsetX: 8,
  offsetY: -4,
});
// Render resting signals as circle overlays
b.overlay((o) => {
  persistedRef.current.forEach((s) => {
    const pos = nodePositions[s.nodeId];
    o.add(
      "circle",
      {
        x: pos.x + s.offsetX,
        y: pos.y + s.offsetY,
        r: 5,
        fill: "#fbbf24",
      },
      { key: s.id },
    );
  });
});
```

Use `useRef` to carry persistent signal state across step changes. Maintain a position map for nodes where signals rest.

### Multi-hop signal chains

Signals natively travel one edge. For multi-hop chains, use `requestAnimationFrame`:

```typescript
const animateSignalChain = useCallback(
  (
    hops: { from: string; to: string }[],
    durationPerHop: number,
    onDone: () => void,
    options?: { keepFinal?: boolean; extra?: Signal[] },
  ) => {
    const extra = options?.extra ?? [];
    const totalDuration = hops.length * durationPerHop;
    const sigId = `chain-${Date.now()}`;
    const startTime = performance.now();

    const step = (now: number) => {
      const rawP = Math.min((now - startTime) / totalDuration, 1);
      const progress = rawP * hops.length;
      setSignals([
        ...extra,
        { id: sigId, chain: hops, progress, magnitude: 1 },
      ]);
      if (rawP < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        if (!options?.keepFinal) setSignals([...extra]);
        onDone();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  },
  [],
);
```

### Parallel signals (fan-out / fan-in)

```typescript
const animateSignalsParallel = useCallback(
  (
    pairs: { from: string; to: string }[],
    duration: number,
    onDone: () => void,
    options?: { extra?: Signal[] },
  ) => {
    const start = performance.now();
    const sigs = pairs.map((p, i) => ({
      id: `par-${i}`,
      from: p.from,
      to: p.to,
      progress: 0,
    }));
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setSignals([
        ...(options?.extra ?? []),
        ...sigs.map((s) => ({ ...s, progress: p })),
      ]);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else onDone();
    };
    rafRef.current = requestAnimationFrame(step);
  },
  [],
);
```

## Animation hook pattern

Every plugin has a `use{PascalName}Animation` hook. Follow this exact structure:

```typescript
export const useMyPluginAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.myPlugin);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [animPhase, setAnimPhase] = useState<string>("idle");

  // Refs
  const rafRef = useRef<number>(undefined!);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timeoutsRef.current.push(id);
      }),
    [],
  );

  const finish = useCallback(() => onCompleteRef.current?.(), []);

  // Step orchestration
  useEffect(() => {
    cleanup();
    const run = async () => {
      switch (currentStep) {
        case 0:
          dispatch(reset());
          finish();
          break;
        case 1:
          dispatch(patchState({ phase: "running", explanation: "..." }));
          // animate...
          await sleep(1200);
          finish();
          break;
        // more steps...
        default:
          finish();
      }
    };
    run();
    return cleanup;
  }, [currentStep]);

  return { runtime, currentStep, signals, animPhase };
};
```

Key rules:

- Always call `cleanup()` at the start of each step.
- Always call `finish()` when a step's animation is done — this enables the Next button.
- Use `onCompleteRef` to avoid stale closure issues.
- The `useEffect` dependency should be `[currentStep]`.
- For steps with `autoAdvance: true`, the Shell auto-advances when `finish()` fires.
- Return `signals` so the component can pass them to the overlay.

## Redux slice pattern

Use the `patchState` pattern for flexible updates:

```typescript
interface MyPluginState {
  phase: "idle" | "running" | "done";
  explanation: string;
  hotZones: string[];
  // domain-specific fields
}

const slice = createSlice({
  name: "myPlugin",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<MyPluginState>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
    // domain-specific reducers as needed
  },
});
```

Always export `initialState` and `reset` — the plugin registration and Shell need them.

## Concepts file pattern

```typescript
export type ConceptKey = "concept-a" | "concept-b";

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "concept-a": {
    title: "Concept A",
    subtitle: "Brief description",
    accentColor: "#60a5fa",
    sections: [
      { title: "Section heading", accent: "#60a5fa", content: <p>...</p> },
    ],
    aside: <div>Optional sidebar content</div>,  // optional
  },
};
```

## SCSS conventions

```scss
.{plugin-name}-root {
  // CSS custom properties for the plugin
  --{plugin-name}-bg: #020617;
  --{plugin-name}-panel: rgba(7, 17, 34, 0.88);
  --{plugin-name}-border: rgba(148, 163, 184, 0.18);
  --{plugin-name}-text: #e2e8f0;

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--{plugin-name}-text);
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 28%),
    radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.12), transparent 30%),
    linear-gradient(180deg, #020617 0%, #071325 100%);
}

.{plugin-name}-stage {
  background: var(--{plugin-name}-panel);
  border: 1px solid var(--{plugin-name}-border);
  border-radius: 24px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
```

Dark theme defaults: bg `#0f172a`, text `#e2e8f0`, muted `#94a3b8`, borders `rgba(148,163,184,0.1)`.
Shared plugin-kit classes use `vc-` prefix. Per-plugin classes use the plugin name prefix.

## Hot zone pattern

Use `hotZones: string[]` in state to highlight active nodes:

```typescript
const hot = (zone: string) => runtime.hotZones.includes(zone);

b.node("broker")
  .fill(hot("broker") ? "#1e40af" : "#0f172a")
  .stroke(hot("broker") ? "#60a5fa" : "#334155", 2);
```

This makes the active part of the architecture visually dominant in each step.

## Registry wiring

Plugins are registered in `src/registry.ts`. The `generate-plugin` script handles this automatically with `--category`.

```typescript
import MyPlugin from "./plugins/my-plugin";

export const categories: PluginCategory[] = [
  {
    id: "my-category", // URL slug
    name: "My Category", // Display name
    description: "...",
    accent: "#3b82f6", // Card colour
    plugins: [MyPlugin],
  },
];
```

The store, routes, and landing page derive from this single source of truth.

## Common mistakes to avoid

- Forgetting to call `finish()` — step will never advance.
- Not cleaning up RAF/timeouts — animations bleed across steps.
- Using stale closures for `onAnimationComplete` — use `.current` ref.
- Signals disappearing when they should persist — use `useRef` for resting signals.
- Hardcoding node positions twice (in builder and overlay) — maintain a single position map.
- Not preserving pan/zoom on scene rebuild — save/restore via `pzRef`.
- Using `variant` for pill colours instead of inline `color`/`borderColor`.
