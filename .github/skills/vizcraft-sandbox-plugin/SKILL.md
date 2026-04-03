---
name: vizcraft-sandbox-plugin
description: "Build sandbox-style VizCraft plugins where users dynamically add/remove components and the step narrative adapts. USE WHEN: the user wants an interactive architecture builder, dynamic step generation, togglable infrastructure components, or a Controls panel. USE FOR: creating sandbox plugins with dynamic scenes, TaggedStep/StepKey patterns, component prerequisite/cascade systems, capacity models, Controls slot wiring, client scaling, and step-key-based animation hooks. DO NOT USE FOR: linear fixed-step plugins (use vizcraft-playground skill), non-VizCraft projects."
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

## Sandbox plugin anatomy

A sandbox plugin has **7 files** (one more than standard):

| File                    | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `index.ts`              | Plugin registration + **dynamic** `buildSteps(state)` + `StepKey` / `TaggedStep` |
| `{name}Slice.ts`        | State with togglable components, prerequisites, cascade, capacity model          |
| `use{Name}Animation.ts` | **Step-key–based** animation orchestration (not index-based)                     |
| `main.tsx`              | **Dynamic scene builder** — layout adapts to component state                     |
| `controls.tsx`          | **Controls component** — rendered in Shell's Controls slot                       |
| `concepts.tsx`          | Concept definitions (same as standard)                                           |
| `main.scss`             | Plugin styles + controls styles                                                  |

## Core pattern: TaggedStep with StepKey

### Problem

In a sandbox plugin, the step list changes when components are toggled. Using numeric `currentStep` indices to drive animations is fragile — adding a step shifts all subsequent indices.

### Solution: StepKey

Give every step a stable string key. The animation hook resolves the current step's key and switches on it.

```typescript
// index.ts
export type StepKey =
  | "overview"
  | "send-traffic"
  | "observe-metrics"
  | "db-flow"
  | "lb-distribute"
  | "scale-out"
  | "cache-hits"
  | "summary";

export interface TaggedStep extends DemoStep {
  key: StepKey;
}
```

### Dynamic step builder

`buildSteps(state)` reads the current component state and conditionally includes steps:

```typescript
export function buildSteps(state: MyState): TaggedStep[] {
  const { components: c } = state;

  const steps: TaggedStep[] = [
    { key: "overview", label: "Overview", nextButtonText: "Send Traffic" },
    { key: "send-traffic", label: "Send Traffic", nextButtonText: "Observe" },
    {
      key: "observe-metrics",
      label: "Observe Metrics",
      // Dynamic next button — depends on what's enabled
      nextButtonText: c.database ? "Show DB Flow" : "Summary",
    },
  ];

  if (c.database) {
    steps.push({
      key: "db-flow",
      label: "Server ↔ Database",
      nextButtonText: c.loadBalancer ? "Distribute Traffic" : "Summary",
    });
  }

  if (c.loadBalancer) {
    steps.push({
      key: "lb-distribute",
      label: "Load Balancer Distributes",
      nextButtonText: c.extraServers > 0 ? "Scale Out" : "Summary",
    });
  }

  // ... more conditional steps ...

  steps.push({ key: "summary", label: "Summary" });
  return steps;
}
```

**Key rules:**

- `nextButtonText` must be dynamic — it should point to the next _existing_ step.
- Always end with a terminal step (e.g. "summary").
- Export `buildSteps` so the animation hook can call it.

### Plugin registration with dynamic getSteps

```typescript
const MyPlugin: DemoPlugin<...> = {
  // ...
  Controls: MyControls,                                     // ← new slot
  getSteps: (state) => buildSteps(state),                   // ← dynamic
  // ...
};
```

The Shell calls `getSteps(modelState)` on every render, so the step indicator updates live.

## Step-key–based animation hook

```typescript
export const useMyAnimation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((s: RootState) => s.simulation);
  const runtime = useSelector((s: RootState) => s.myPlugin) as MyState;
  const [signals, setSignals] = useState<Signal[]>([]);
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  // ... cleanup, sleep, animateSignal, animateParallel helpers ...

  // Resolve current step KEY (not index)
  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  useEffect(() => {
    let cancelled = false;
    cleanup();
    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };
    const rt = () => runtimeRef.current; // always-fresh state

    const run = async () => {
      switch (
        currentKey // ← switch on KEY, not index
      ) {
        case "overview":
          dispatch(reset());
          finish();
          return;

        case "send-traffic":
          // Animate ALL clients, not a hardcoded subset
          await animateParallel(
            rt().clients.map((c) => ({ from: c.id, to: "cloud" })),
            700,
          );
          // ...
          finish();
          return;

        // ... other cases keyed by StepKey ...
      }
    };

    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [currentStep, currentKey /* stable deps */]);

  return { runtime, signals };
};
```

**Critical rules:**

- Switch on `currentKey`, never on `currentStep` number.
- Use `runtimeRef.current` (not closed-over `runtime`) inside async animation sequences to get fresh state.
- Animate **all** dynamic entities (e.g. ALL clients), never hardcode `.slice(0, N)`. Entities are added/removed dynamically and must all behave identically.
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

Some components require others to exist first:

```typescript
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {
  cache: ["database"], // can't add cache without DB
  extraServers: ["loadBalancer"], // can't add servers without LB
};
```

In the `addComponent` reducer, check prerequisites before allowing the add:

```typescript
addComponent(state, action: PayloadAction<ComponentName>) {
  const name = action.payload;
  const prereqs = PREREQUISITES[name];
  if (prereqs?.some(p => !state.components[p])) return; // blocked

  if (name === "extraServers") {
    if (state.components.extraServers >= 4) return;     // cap
    state.components.extraServers += 1;
  } else {
    if (state.components[name]) return;                 // already active
    (state.components[name] as boolean) = true;
  }
  computeMetrics(state);
},
```

### Cascade removal system

Removing a component must remove its dependents:

```typescript
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {
  database: ["cache"],
  loadBalancer: ["extraServers"],
};

removeComponent(state, action: PayloadAction<ComponentName>) {
  const name = action.payload;
  // ... remove the component ...

  // Cascade
  const cascades = CASCADE_REMOVE[name];
  if (cascades) {
    for (const dep of cascades) {
      if (dep === "extraServers") state.components.extraServers = 0;
      else (state.components[dep] as boolean) = false;
    }
  }
  computeMetrics(state);
},
```

### Capacity model

Define a pure function that computes max capacity from component state:

```typescript
function getMaxCapacity(c: InfraComponents): number {
  let cap = 60; // base solo server
  if (c.database) cap = 100; // DB frees server CPU
  if (c.loadBalancer) cap += 40; // LB enables distribution
  cap += c.extraServers * 50; // each server adds throughput
  if (c.cache) cap = Math.round(cap * 1.3); // cache multiplier
  return cap;
}
```

### Metrics computation

Always recompute derived metrics from source-of-truth fields:

```typescript
export function computeMetrics(state: MyState) {
  const rps = state.clients.length * 10; // demand = clients × rate
  state.requestsPerSecond = rps;
  state.maxCapacity = getMaxCapacity(state.components);
  state.throughput = Math.min(rps, state.maxCapacity);
  state.droppedRequests = Math.max(0, rps - state.maxCapacity);
  state.serverCpuPercent = Math.min(
    99,
    Math.round((rps / state.maxCapacity) * 100),
  );
  state.serverHealthy = state.serverCpuPercent < 95;
}
```

**Important:** Display `requestsPerSecond` / `maxCapacity` in the throughput badge (demand vs capacity), not `throughput` / `maxCapacity` (which would cap at max and hide overload).

## Controls component and Shell slot

### Shell wiring

The Shell renders `plugin.Controls` when defined:

```tsx
// Shell.tsx — inside .visualization-container
{
  plugin.Controls && (
    <div className="plugin-controls">
      <plugin.Controls />
    </div>
  );
}
```

With CSS:

```scss
.plugin-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}
```

### Controls component pattern

```tsx
const TOGGLES: Toggle[] = [
  {
    name: "database",
    label: "Database",
    addLabel: "+ Database",
    removeLabel: "− Database",
    color: "#22c55e",
  },
  {
    name: "loadBalancer",
    label: "Load Balancer",
    addLabel: "+ Load Balancer",
    removeLabel: "− Load Balancer",
    color: "#8b5cf6",
  },
  {
    name: "extraServers",
    label: "Servers",
    addLabel: "+ Server",
    removeLabel: "− Server",
    color: "#14b8a6",
    requires: ["loadBalancer"],
    multi: true,
  },
  {
    name: "cache",
    label: "Cache",
    addLabel: "+ Cache",
    removeLabel: "− Cache",
    color: "#f97316",
    requires: ["database"],
  },
];

const MyControls: React.FC = () => {
  const dispatch = useDispatch();
  const { components, clients } = useSelector((s: RootState) => s.myPlugin);

  const handleAdd = (name: ComponentName) => {
    dispatch(addComponent(name));
    dispatch(resetSimulation()); // ← CRITICAL: reset step index when story changes
  };

  const handleRemove = (name: ComponentName) => {
    dispatch(removeComponent(name));
    dispatch(resetSimulation()); // ← reset here too
  };

  return (
    <div className="my-controls">
      {/* Client +/- buttons */}
      <div className="my-controls__group">
        <span className="my-controls__label">Clients: {clients.length}</span>
        <button onClick={() => dispatch(removeClient())}>−</button>
        <button onClick={() => dispatch(addClient())}>+</button>
      </div>

      {/* Component toggles — data-driven from TOGGLES array */}
      {TOGGLES.map((toggle) => {
        const isActive = toggle.multi
          ? components[toggle.name] > 0
          : !!components[toggle.name];
        const prereqsMet =
          !toggle.requires || toggle.requires.every((r) => !!components[r]);

        return (
          <div key={toggle.name} className="my-controls__group">
            {isActive && (
              <button
                style={{ borderColor: toggle.color }}
                onClick={() => handleRemove(toggle.name)}
              >
                {toggle.removeLabel}
              </button>
            )}
            <button
              style={{ borderColor: toggle.color }}
              disabled={!prereqsMet}
              onClick={() => handleAdd(toggle.name)}
            >
              {toggle.addLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
};
```

**Critical:** Always dispatch `resetSimulation()` after toggling a component. This resets `currentStep` to 0, because the step list has changed and the old index may point to a removed step.

## Dynamic scene builder

The scene must adapt to component state. Use a vertical stacking pattern with a `nextY` tracker:

```typescript
const scene = (() => {
  const b = viz().view(W, H);
  let nextY = 40;

  // ── Always-present: Clients row ──────────────────
  const clientStartX = Math.max(80, W / 2 - (clients.length * 72) / 2);
  clients.forEach((client, i) => {
    b.node(client.id)
      .at(clientStartX + i * 72, nextY)
      .rect(56, 40, 8)
      .fill(hot("clients") ? "#1e3a8a" : "#0f172a")
      .stroke(hot("clients") ? "#60a5fa" : "#334155", 1.4)
      .image("/mobile.svg", 20, 20, { dy: -5, position: "center" });
  });
  nextY += 75;

  // ── Always-present: Internet ─────────────────────
  b.node("cloud").at(W/2 - 70, nextY).rect(140, 55, 14)
    .label("☁ Internet", { fill: "#fff", fontSize: 13, fontWeight: "bold" });
  nextY += 80;

  // ── Conditional: Load Balancer ───────────────────
  if (components.loadBalancer) {
    b.node("lb").at(W/2 - 80, nextY).rect(160, 52, 12)
      .label("Load Balancer", { fill: "#fff", fontSize: 13, fontWeight: "bold" });
    nextY += 75;
  }

  // ── Dynamic: Servers (1 + extraServers) ──────────
  const totalServers = 1 + components.extraServers;
  for (let i = 0; i < totalServers; i++) {
    b.node(`server-${i}`).at(...).rect(150, 56, 12)
      .image("/server.svg", 20, 20, { dx: -50, dy: -6, position: "center" })
      .label(i === 0 ? "HTTP Server" : `Server ${i + 1}`, { ... });
  }
  nextY += 80;

  // ── Conditional: Cache ───────────────────────────
  if (components.cache) {
    b.node("cache").at(W/2 - 65, nextY).rect(130, 48, 12)
      .label("Cache", { ... });
    nextY += 70;
  }

  // ── Conditional: Database ────────────────────────
  if (components.database) {
    b.node("database").at(W/2 - 70, nextY).rect(140, 52, 12)
      .image("/db.svg", 20, 20, { dx: -42, position: "center" })
      .label("Database", { ... });
  }

  // ── Edges adapt to topology ──────────────────────
  clients.forEach(client => {
    b.edge(client.id, "cloud", `e-${client.id}-cloud`).arrow(true);
  });

  if (components.loadBalancer) {
    b.edge("cloud", "lb", "e-cloud-lb").arrow(true);
    for (let i = 0; i < totalServers; i++) {
      b.edge("lb", `server-${i}`, `e-lb-server-${i}`).arrow(true);
    }
  } else {
    b.edge("cloud", "server-0", "e-cloud-server").arrow(true);
  }

  const dbSource = components.cache ? "cache" : "server-0";
  if (components.database) {
    b.edge(dbSource, "database", "e-to-db").arrow(true);
  }

  return b;
})();
```

**Key rules:**

- Use `nextY` tracker — never hardcode absolute Y for conditional nodes.
- All entity loops (clients, servers) must iterate the full dynamic collection.
- Edge topology adapts: cloud→LB→servers when LB present, cloud→server-0 otherwise.
- Use `.image()` with `position: "center"` and `dx`/`dy` offsets to place icons **inside** nodes. Never use `position: "left"` or `"right"` — they place icons outside the node bounds.

## Using icons with `.image()`

VizCraft supports embedding images inside nodes:

```typescript
.image(href, width, height, { dx?, dy?, position? })
```

- `href`: path to SVG/PNG (use `/filename.svg` for files in `public/`)
- `position`: `"center"` | `"above"` | `"below"` | `"left"` | `"right"`
- **Always use `"center"`** and offset with `dx`/`dy` to position inside the node
- `"left"` and `"right"` place the image **outside** the node boundary — avoid these

Example:

```typescript
b.node("server-0")
  .rect(150, 56, 12)
  .image("/server.svg", 20, 20, { dx: -50, dy: -6, position: "center" })
  .label("HTTP Server", { fill: "#fff", fontSize: 13, dx: 8, dy: -6 });
```

When using an icon + label together, offset the label with a positive `dx` to avoid overlap.

## Animation: treating entities as reusable units

**Critical pattern:** When animating collections (clients sending traffic, servers responding), always iterate the full dynamic collection. Never hardcode counts.

```typescript
// WRONG — only first 3 clients animate
await animateParallel(
  rt()
    .clients.slice(0, 3)
    .map((c) => ({ from: c.id, to: "cloud" })),
  700,
);

// CORRECT — all clients animate
await animateParallel(
  rt().clients.map((c) => ({ from: c.id, to: "cloud" })),
  700,
);
```

Entities added dynamically (via `addClient`, `addComponent`) are instantiated identically to their counterparts. The scene builder, edge wiring, and animation logic must treat them uniformly.

## Signal routing adapts to topology

When the architecture changes, signal destinations change:

```typescript
// In "send-traffic" step:
const target = rt().components.loadBalancer ? "lb" : "server-0";
await animateSignal("cloud", target, 600);

// In "db-flow" step:
const dbSource = rt().components.cache ? "cache" : "server-0";
await animateSignal(dbSource, "database", 700);
```

## Overlay: conditional annotations

Show warnings/annotations only when relevant:

```typescript
if (!components.database && droppedRequests > 0) {
  b.overlay((o) => {
    o.add(
      "text",
      {
        x: W / 2 + 120,
        y: nextY - 30,
        text: "Single point of failure!",
        fill: "#ef4444",
        fontSize: 14,
        fontWeight: 700,
      },
      { key: "spof-label" },
    );
  });
}
```

## Common sandbox-specific mistakes

1. **Switching on step index instead of StepKey** — animations break when steps are conditionally included/removed.
2. **Hardcoding `.slice(0, N)` on dynamic collections** — new entities won't animate. Iterate the full collection.
3. **Forgetting `resetSimulation()` after component toggle** — step index points to a now-invalid position.
4. **Forgetting cascade removals** — removing DB should also remove cache; removing LB should remove extra servers.
5. **Using `position: "left"` for `.image()`** — places icon outside node. Use `"center"` with `dx` offset.
6. **Displaying `throughput/maxCapacity` instead of `requestsPerSecond/maxCapacity`** — throughput is capped at max, hiding overload. Show demand vs capacity.
7. **Not using `runtimeRef.current` in async animation code** — the closure captures stale state. Always access fresh state via ref.
8. **Hardcoding edge topology** — edges must adapt. Cloud→LB→servers when LB exists, cloud→server-0 otherwise.
9. **Not bumping `nextY` for conditional nodes** — scene layout collapses or overlaps.

## Execution checklist

When creating a new sandbox plugin:

1. [ ] Define `ComponentName`, `InfraComponents` interface, `PREREQUISITES`, `CASCADE_REMOVE`
2. [ ] Write capacity model (`getMaxCapacity`) and `computeMetrics`
3. [ ] Create slice with `addComponent`/`removeComponent` + prerequisite/cascade logic
4. [ ] Define `StepKey` union and `TaggedStep extends DemoStep`
5. [ ] Write `buildSteps(state)` with conditional steps and dynamic `nextButtonText`
6. [ ] Create Controls component with TOGGLES array + `resetSimulation()` on every toggle
7. [ ] Write step-key–based animation hook using `buildSteps(runtime)[currentStep]?.key`
8. [ ] Build dynamic scene with `nextY` tracker, conditional nodes, adaptive edges
9. [ ] Use `.image()` with `position: "center"` for node icons
10. [ ] Register plugin with `Controls: MyControls` in DemoPlugin
11. [ ] Verify animations iterate ALL dynamic entities (clients, servers)
12. [ ] Test: add component → step list updates → animation matches new steps
13. [ ] Test: remove component → cascaded deps removed → step list shrinks → no crash
