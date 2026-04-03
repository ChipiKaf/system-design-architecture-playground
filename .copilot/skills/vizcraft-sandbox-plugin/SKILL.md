---
name: vizcraft-sandbox-plugin
description: "Build sandbox-style VizCraft plugins where users dynamically add/remove components and the step narrative adapts. USE WHEN: the user wants an interactive architecture builder, dynamic step generation, togglable infrastructure components, or a Controls panel. USE FOR: creating sandbox plugins with declarative flow engines, dynamic scenes, TaggedStep/StepKey patterns, component prerequisite/cascade systems, capacity models, Controls slot wiring, client scaling, and configuration-driven animation hooks. DO NOT USE FOR: linear fixed-step plugins (use vizcraft-playground skill), non-VizCraft projects."
---

# VizCraft Sandbox Plugin Skill

Use this skill when building a **sandbox-style** VizCraft plugin — one where the user can dynamically add and remove scene components (nodes, infrastructure, actors) and the step narrative, scene layout, and animations all adapt reactively.

This extends the base `vizcraft-playground` skill. Read that skill first for foundational patterns (plugin anatomy, builder API, signals, mounting, SCSS). This skill covers only what is **different or additional** for sandbox plugins.

## When to use this skill

- User wants an interactive architecture builder (add DB, LB, cache, etc.)
- Steps should change based on what the user has toggled on/off
- User wants a Controls panel for adding/removing entities
- User wants metrics that react to composition (capacity, throughput, CPU)
- The scene layout must adapt dynamically to component presence

## Scaffolding

Use the generator with the `--sandbox` flag:

```bash
npm run generate my-plugin --sandbox --category "My Category"
```

This generates 8 files with the declarative flow engine, Controls panel, component-aware slice, and a generic animation hook. See the "Sandbox plugin anatomy" section below for details.

## Sandbox plugin anatomy

A sandbox plugin has **8 files** (two more than standard):

| File                    | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `flow-engine.ts`        | **Single source of truth** — declarative STEPS config, FlowBeat, token expansion     |
| `index.ts`              | Plugin registration — re-exports from flow-engine, uses `buildSteps(state)`          |
| `{name}Slice.ts`        | State with togglable components, prerequisites, cascade, capacity model              |
| `use{Name}Animation.ts` | **Generic executor** — reads STEPS config, no per-step imperative code               |
| `main.tsx`              | **Dynamic scene builder** — layout adapts to component state                         |
| `controls.tsx`          | **Controls component** — rendered in Shell's Controls slot                           |
| `concepts.tsx`          | Concept definitions (same as standard)                                               |
| `main.scss`             | Plugin styles + controls styles                                                      |

## Declarative Flow Engine (flow-engine.ts)

The flow engine is the **core innovation** of sandbox plugins. Instead of writing imperative animation code per step (which leads to repeated signal paths, out-of-sync animations, and fragile switch statements), you define steps and their animation flows as **data**.

### Why declarative?

Imperative animation code breaks in sandbox plugins because:
- Adding a component changes the step list and shifts indices
- Multiple steps end up animating the same signal path (e.g. "send-traffic" sends from clients→server→DB, then "db-flow" repeats server→DB)
- Bug fixes in one step can break another

The declarative approach solves this:
- Each step has a **unique flow** — no two steps share signal paths
- The engine handles token expansion, signal routing, and hot-zone derivation
- Adding a new step = adding an entry to the STEPS array. Zero animation code needed.

### Token expansion

Use `$`-prefixed tokens as shorthand for dynamic node sets. The engine expands them at runtime:

```typescript
export function expandToken(token: string, state: MyState): string[] {
  if (token === "$clients") return state.clients.map((c) => c.id);
  if (token === "$servers") {
    const count = 1 + state.components.extraServers;
    return Array.from({ length: count }, (_, i) => `server-${i}`);
  }
  return [token]; // literal node ID
}
```

### FlowBeat — one animation segment

```typescript
export interface FlowBeat {
  from: string;    // node ID or $token
  to: string;      // node ID or $token
  when?: (c: InfraComponents) => boolean;  // conditional
  duration?: number;      // ms, default 600
  explain?: string;       // shown during this beat
}
```

Tokens expand to parallel signals via cartesian product: `$clients → cloud` with 3 clients produces 3 parallel signals.

### StepDef — declarative step config

```typescript
export interface StepDef {
  key: StepKey;
  label: string;
  when?: (c: InfraComponents) => boolean;     // only include when true
  nextButton?: string | ((c: InfraComponents) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: MyState) => string);  // dispatched at start
  flow?: FlowBeat[];          // animation beats (unique to this step!)
  delay?: number;             // pause after flow (ms)
  recalcMetrics?: boolean;    // recompute derived metrics
  finalHotZones?: string[];   // hot zones after flow completes
  explain?: string | ((s: MyState) => string);  // shown after flow
  action?: "reset";           // special actions
}
```

### STEPS config — the single source of truth

**Critical rule: each step owns a unique signal path. Never animate the same from→to in two different steps.**

```typescript
export const STEPS: StepDef[] = [
  // 1. Overview — reset, no animation
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "reset",
  },

  // 2. Send Traffic — ONLY delivers to server layer
  //    Does NOT include DB, LB, or cache flows
  {
    key: "send-traffic",
    label: "Send Traffic",
    phase: "traffic",
    flow: [
      { from: "$clients", to: "cloud", duration: 700,
        explain: "Clients send requests through the internet." },
      { from: "cloud", to: "server-0", duration: 600,
        explain: "Requests arrive at the server." },
    ],
    recalcMetrics: true,
    explain: (s) => `Traffic: ${s.requestsPerSecond} rps demand, ${s.maxCapacity} capacity.`,
  },

  // 3. Observe Metrics — no animation, just read numbers
  {
    key: "observe-metrics",
    label: "Observe Metrics",
    recalcMetrics: true,
    delay: 500,
    phase: (s) => (s.droppedRequests > 0 ? "overloaded" : "stable"),
    finalHotZones: ["server-0"],
    explain: (s) => s.droppedRequests > 0
      ? `Overloaded! ${s.droppedRequests} dropped.`
      : `Stable at ${s.throughput} rps.`,
  },

  // 4. LB Distributes — unique: cloud → LB → servers
  {
    key: "lb-distribute",
    label: "Load Balancer Distributes",
    when: (c) => c.loadBalancer,
    phase: "lb-distribute",
    flow: [
      { from: "cloud", to: "lb", duration: 500 },
      { from: "lb", to: "$servers", duration: 700,
        explain: "LB fans out across all servers." },
    ],
  },

  // 5. DB Flow — unique: servers ↔ DB
  {
    key: "db-flow",
    label: "Server ↔ Database",
    when: (c) => c.database,
    phase: "db-flow",
    flow: [
      { from: "$servers", to: "database", duration: 700 },
      { from: "database", to: "$servers", duration: 700 },
    ],
  },

  // 6. Summary
  { key: "summary", label: "Summary", phase: "summary",
    explain: (s) => `Max capacity: ~${s.maxCapacity} rps.` },
];
```

### buildSteps — auto-derives step list from config

```typescript
export function buildSteps(state: MyState): TaggedStep[] {
  const { components: c } = state;
  const active = STEPS.filter((s) => !s.when || s.when(c));

  return active.map((step, i) => {
    const nextStep = active[i + 1];
    // Auto-derive nextButtonText from next step's label if not explicit
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") nextButtonText = step.nextButton(c);
    else if (typeof step.nextButton === "string") nextButtonText = step.nextButton;
    else if (nextStep) nextButtonText = nextStep.label;

    return { key: step.key, label: step.label, nextButtonText, ... };
  });
}
```

### executeFlow — generic flow executor

Walks beats, expands tokens, builds cartesian product signal pairs, auto-derives hot zones:

```typescript
export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  const components = deps.getState().components;
  const activeBeats = beats.filter((b) => !b.when || b.when(components));

  for (const beat of activeBeats) {
    if (deps.cancelled()) return;

    const state = deps.getState();
    const froms = expandToken(beat.from, state);
    const tos = expandToken(beat.to, state);

    // Cartesian product → parallel signal pairs
    const pairs: { from: string; to: string }[] = [];
    for (const f of froms) {
      for (const t of tos) {
        pairs.push({ from: f, to: t });
      }
    }

    // Auto-derive hot zones from participants
    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<MyState> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
```

## Generic Animation Hook (no switch statement)

The animation hook is **fully generic** — it reads config from `STEPS` and follows a fixed 9-step sequence. No per-step imperative code needed.

```typescript
export const useMyAnimation = (onAnimationComplete?: () => void) => {
  // ... standard setup (dispatch, selector, signals, refs) ...

  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  useEffect(() => {
    let cancelled = false;
    cleanup();

    const stepDef = STEPS.find((s) => s.key === currentKey);
    if (!stepDef) { finish(); return cleanup; }

    const run = async () => {
      // 1. Special actions (e.g. reset)
      if (stepDef.action === "reset") { dispatch(reset()); finish(); return; }

      // 2. Recalc metrics early (for non-flow steps that read derived state)
      if (stepDef.recalcMetrics && !stepDef.flow) dispatch(recalcMetrics());

      // 3. Set phase
      if (stepDef.phase) {
        const phase = typeof stepDef.phase === "function"
          ? stepDef.phase(rt()) : stepDef.phase;
        doPatch({ phase });
      }

      // 4. Set initial hot zones for non-flow steps
      if (stepDef.finalHotZones !== undefined && !stepDef.flow)
        doPatch({ hotZones: stepDef.finalHotZones });

      // 5. Execute flow beats
      if (stepDef.flow) {
        await executeFlow(stepDef.flow, {
          animateParallel, patch: doPatch, getState: rt,
          cancelled: () => cancelled,
        });
        if (cancelled) return;
      }

      // 6. Recalc after flow
      if (stepDef.recalcMetrics && stepDef.flow) dispatch(recalcMetrics());

      // 7. Delay
      if (stepDef.delay) { await sleep(stepDef.delay); if (cancelled) return; }

      // 8. Final hot zones
      if (stepDef.finalHotZones !== undefined) doPatch({ hotZones: stepDef.finalHotZones });
      else if (!stepDef.flow) doPatch({ hotZones: [] });

      // 9. Final explanation
      if (stepDef.explain) {
        const explanation = typeof stepDef.explain === "function"
          ? stepDef.explain(rt()) : stepDef.explain;
        doPatch({ explanation });
      }

      finish();
    };

    run();
    return () => { cancelled = true; cleanup(); };
  }, [currentStep, currentKey, cleanup, dispatch, sleep, animateParallel]);

  return { runtime, signals };
};
```

**Key rules:**
- Switch on `currentKey`, never on `currentStep` number.
- Use `runtimeRef.current` (not closed-over `runtime`) inside async sequences.
- Include `currentKey` in the `useEffect` dependency array.

## Component state with prerequisites and cascades

### State shape

```typescript
export interface InfraComponents {
  database: boolean;
  loadBalancer: boolean;
  cache: boolean;
  extraServers: number; // numeric for multi-instance components
}

export type ComponentName = keyof InfraComponents;
```

### Prerequisite system

```typescript
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {
  cache: ["database"],
  extraServers: ["loadBalancer"],
};
```

In the `addComponent` reducer, check prerequisites before allowing the add.

### Cascade removal system

```typescript
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {
  database: ["cache"],
  loadBalancer: ["extraServers"],
};
```

Removing a component auto-removes its dependents.

### Capacity model

```typescript
function getMaxCapacity(c: InfraComponents): number {
  let cap = 60;
  if (c.database) cap = 100;
  if (c.loadBalancer) cap += 40;
  cap += c.extraServers * 50;
  if (c.cache) cap = Math.round(cap * 1.3);
  return cap;
}
```

**Important:** Display `requestsPerSecond / maxCapacity` in the throughput badge (demand vs capacity), not `throughput / maxCapacity` (which caps at max, hiding overload).

## Controls component and Shell slot

### Shell wiring

The Shell renders `plugin.Controls` when defined:

```tsx
{plugin.Controls && (
  <div className="plugin-controls">
    <plugin.Controls />
  </div>
)}
```

### Controls component pattern

```tsx
const TOGGLES: Toggle[] = [
  { name: "database", addLabel: "+ Database", removeLabel: "− Database",
    color: "#22c55e" },
  { name: "loadBalancer", addLabel: "+ Load Balancer", removeLabel: "− Load Balancer",
    color: "#8b5cf6" },
  { name: "extraServers", addLabel: "+ Server", removeLabel: "− Server",
    color: "#14b8a6", requires: ["loadBalancer"], multi: true },
  { name: "cache", addLabel: "+ Cache", removeLabel: "− Cache",
    color: "#f97316", requires: ["database"] },
];
```

**Critical:** Always dispatch `resetSimulation()` after toggling a component. This resets `currentStep` to 0 because the step list has changed.

## Dynamic scene builder

The scene must adapt to component state. Use a vertical stacking pattern with a `nextY` tracker:

```typescript
const scene = (() => {
  const b = viz().view(W, H);
  let nextY = 40;

  // Always-present: Clients row
  const rowWidth = (clients.length - 1) * 72 + 56;
  const clientStartX = W / 2 - rowWidth / 2;
  clients.forEach((client, i) => {
    b.node(client.id).at(clientStartX + i * 72, nextY).rect(56, 40, 8)
      .image("/mobile.svg", 20, 20, { dy: -5, position: "center" });
  });
  nextY += 75;

  // Conditional: Load Balancer
  if (components.loadBalancer) {
    b.node("lb").at(W/2 - 80, nextY).rect(160, 52, 12)
      .label("Load Balancer", { ... });
    nextY += 75;
  }

  // Edges adapt to topology
  if (components.loadBalancer) {
    b.edge("cloud", "lb").arrow(true);
    for (let i = 0; i < totalServers; i++)
      b.edge("lb", `server-${i}`).arrow(true);
  } else {
    b.edge("cloud", "server-0").arrow(true);
  }

  return b;
})();
```

**Key rules:**
- Use `nextY` tracker — never hardcode absolute Y for conditional nodes.
- All entity loops must iterate the full dynamic collection.
- Edge topology adapts to component presence.
- Client row centering: use `(clients.length - 1) * gap + nodeWidth` for actual row width.

## Using icons with `.image()`

```typescript
.image(href, width, height, { dx?, dy?, position? })
```

- **Always use `"center"`** and offset with `dx`/`dy` to position inside the node
- `"left"` and `"right"` place the image **outside** the node boundary — avoid these
- When using icon + label together, offset the label with a positive `dx` to avoid overlap

## Common sandbox-specific mistakes

1. **Repeating signal paths across steps** — "send-traffic" animates the full path including DB, then "db-flow" repeats server→DB. Each step must own a unique flow.
2. **Switching on step index instead of StepKey** — animations break when steps are conditionally included/removed.
3. **Writing imperative animation code per step** — use the declarative STEPS config and the generic executor instead.
4. **Hardcoding `.slice(0, N)` on dynamic collections** — new entities won't animate. Iterate the full collection. Use `$tokens` for this.
5. **Forgetting `resetSimulation()` after component toggle** — step index points to a now-invalid position.
6. **Forgetting cascade removals** — removing DB should also remove cache; removing LB should remove extra servers.
7. **Using `position: "left"` for `.image()`** — places icon outside node. Use `"center"` with `dx` offset.
8. **Displaying `throughput/maxCapacity` instead of `requestsPerSecond/maxCapacity`** — throughput is capped at max, hiding overload.
9. **Not using `runtimeRef.current` in async animation code** — the closure captures stale state.
10. **Hardcoding edge topology** — edges must adapt. Cloud→LB→servers when LB exists, cloud→server-0 otherwise.

## Execution checklist

When creating a new sandbox plugin:

1. [ ] Run `npm run generate my-plugin --sandbox --category "Category"`
2. [ ] Define `InfraComponents` interface with your togglable components
3. [ ] Set up `PREREQUISITES` and `CASCADE_REMOVE` maps
4. [ ] Write capacity model (`getMaxCapacity`) and `computeMetrics`
5. [ ] Add `StepKey` entries for each component-specific step
6. [ ] Define `expandToken` mappings for your `$token` names
7. [ ] Configure `STEPS` array — each step with a **unique** flow (no overlap)
8. [ ] Add component TOGGLES in `controls.tsx` with `resetSimulation()` on every toggle
9. [ ] Build dynamic scene with `nextY` tracker, conditional nodes, adaptive edges
10. [ ] Use `.image()` with `position: "center"` for node icons
11. [ ] Verify each step's flow is unique — no two steps animate the same from→to
12. [ ] Test: add component → step list updates → animation matches
13. [ ] Test: remove component → cascaded deps removed → step list shrinks → no crash
