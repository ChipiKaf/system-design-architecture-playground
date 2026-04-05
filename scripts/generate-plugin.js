import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Arg parsing ────────────────────────────────────────────
// Usage:  npm run generate <plugin-name> [--category "Category Name"] [--sandbox]
const args = process.argv.slice(2);
let pluginName = null;
let categoryName = null;
let isSandbox = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--category" || args[i] === "-c") {
    categoryName = args[++i];
  } else if (args[i] === "--sandbox" || args[i] === "-s") {
    isSandbox = true;
  } else if (!args[i].startsWith("-")) {
    pluginName = args[i];
  }
}

if (!pluginName) {
  console.error(
    "Usage: npm run generate <plugin-name> [--category \"Category Name\"] [--sandbox]\n" +
      "       Name must be kebab-case, e.g. npm run generate api-gateway\n" +
      "       --category / -c   Existing or new category to place the plugin in\n" +
      "       --sandbox / -s    Generate a sandbox plugin with declarative flow engine,\n" +
      "                         Controls panel, and dynamic component toggling",
  );
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────
const toPascalCase = (str) =>
  str.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());

const toCamelCase = (str) =>
  str.replace(/-\w/g, (m) => m[1].toUpperCase());

const pascalName = toPascalCase(pluginName);
const camelName = toCamelCase(pluginName);
const targetDir = path.join(__dirname, "../src/plugins", pluginName);

if (fs.existsSync(targetDir)) {
  console.error(`Plugin "${pluginName}" already exists at ${targetDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

/* ================================================================
   1. Redux Slice  — ${camelName}Slice.ts
   ================================================================ */
let sliceContent;
if (isSandbox) {
sliceContent = `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* ── Addable infrastructure components ───────────────── */
export interface InfraComponents {
  // TODO: add your togglable components here
  // database: boolean;
  // loadBalancer: boolean;
  // cache: boolean;
  // extraServers: number;
}

export type ComponentName = keyof InfraComponents;

/** Which components require which prerequisites. */
const PREREQUISITES: Partial<Record<ComponentName, ComponentName[]>> = {
  // cache: ["database"],
};

/** Which components cascade-remove when toggled off. */
const CASCADE_REMOVE: Partial<Record<ComponentName, ComponentName[]>> = {
  // database: ["cache"],
};

/* ── Client model ────────────────────────────────────── */
export interface ClientNode {
  id: string;
  type: "desktop" | "mobile";
}

/* ── State shape ─────────────────────────────────────── */
export interface ${pascalName}State {
  components: InfraComponents;
  clients: ClientNode[];

  /* derived metrics (recomputed by computeMetrics) */
  requestsPerSecond: number;
  maxCapacity: number;
  throughput: number;
  droppedRequests: number;

  /* ui */
  hotZones: string[];
  explanation: string;
  phase: string;
}

const defaultClients: ClientNode[] = [
  { id: "client-1", type: "desktop" },
  { id: "client-2", type: "mobile" },
  { id: "client-3", type: "desktop" },
];

/* ── Capacity model ──────────────────────────────────── */
function getMaxCapacity(c: InfraComponents): number {
  let cap = 60; // base solo capacity
  // TODO: adjust capacity based on components
  return cap;
}

export function computeMetrics(state: ${pascalName}State) {
  const rps = state.clients.length * 10;
  state.requestsPerSecond = rps;
  state.maxCapacity = getMaxCapacity(state.components);
  state.throughput = Math.min(rps, state.maxCapacity);
  state.droppedRequests = Math.max(0, rps - state.maxCapacity);
}

function describeArch(c: InfraComponents): string {
  const parts: string[] = ["Server"];
  // TODO: push active component labels
  return parts.join(" + ");
}

export const initialState: ${pascalName}State = {
  components: {
    // TODO: initialise your components (all off by default)
  } as InfraComponents,
  clients: defaultClients,

  requestsPerSecond: 30,
  maxCapacity: 60,
  throughput: 30,
  droppedRequests: 0,

  hotZones: [],
  explanation: "Welcome — build the architecture using the controls above.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const ${camelName}Slice = createSlice({
  name: "${camelName}",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState, clients: [...initialState.clients] };
      computeMetrics(s);
      return s;
    },
    patchState(state, action: PayloadAction<Partial<${pascalName}State>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },

    /* ── Component toggles ─────────────────────────── */
    addComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      const prereqs = PREREQUISITES[name];
      if (prereqs?.some((p) => !state.components[p])) return;

      // TODO: handle numeric components (e.g. extraServers)
      if (state.components[name]) return;
      (state.components[name] as boolean) = true;

      computeMetrics(state);
      state.explanation = \`Added! Architecture: \${describeArch(state.components)}. Capacity: ~\${state.maxCapacity} rps.\`;
    },

    removeComponent(state, action: PayloadAction<ComponentName>) {
      const name = action.payload;
      if (!state.components[name]) return;
      (state.components[name] as boolean) = false;

      const cascades = CASCADE_REMOVE[name];
      if (cascades) {
        for (const dep of cascades) {
          (state.components[dep] as boolean) = false;
        }
      }

      computeMetrics(state);
      state.explanation = \`Removed. Architecture: \${describeArch(state.components)}. Capacity: ~\${state.maxCapacity} rps.\`;
    },

    /* ── Client controls ───────────────────────────── */
    addClient(state) {
      if (state.clients.length >= 12) return;
      const id = \`client-\${Date.now()}\`;
      const type = state.clients.length % 2 === 0 ? "desktop" : "mobile";
      state.clients.push({ id, type });
      computeMetrics(state);
    },
    removeClient(state) {
      if (state.clients.length <= 1) return;
      state.clients.pop();
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  patchState,
  recalcMetrics,
  addComponent,
  removeComponent,
  addClient,
  removeClient,
} = ${camelName}Slice.actions;
export default ${camelName}Slice.reducer;
`;
} else {
sliceContent = `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ${pascalName}Phase = "overview" | "processing" | "summary";

export interface ${pascalName}State {
  phase: ${pascalName}Phase;
  explanation: string;
  hotZones: string[];
}

export const initialState: ${pascalName}State = {
  phase: "overview",
  explanation: "Welcome — explore the architecture before stepping through.",
  hotZones: [],
};

const ${camelName}Slice = createSlice({
  name: "${camelName}",
  initialState,
  reducers: {
    patchState(state, action: PayloadAction<Partial<${pascalName}State>>) {
      Object.assign(state, action.payload);
    },
    reset() {
      return initialState;
    },
  },
});

export const { patchState, reset } = ${camelName}Slice.actions;
export default ${camelName}Slice.reducer;
`;
} // end if/else sandbox slice

fs.writeFileSync(path.join(targetDir, `${camelName}Slice.ts`), sliceContent);

/* ================================================================
   2. Animation Hook  — use${pascalName}Animation.ts
   ================================================================ */
let hookContent;
if (isSandbox) {
hookContent = `import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import {
  patchState,
  reset,
  recalcMetrics,
  type ${pascalName}State,
} from "./${camelName}Slice";
import { STEPS, buildSteps, executeFlow, type StepKey } from "./flow-engine";

export type Signal = { id: string; color?: string } & SignalOverlayParams;

/* ──────────────────────────────────────────────────────────
   Declarative animation hook.

   Reads step config from STEPS, resolves the current step
   key, then uses executeFlow to run the declared beats.
   No per-step imperative code needed.
   ────────────────────────────────────────────────────────── */

export const use${pascalName}Animation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector(
    (state: RootState) => state.${camelName},
  ) as ${pascalName}State;
  const [signals, setSignals] = useState<Signal[]>([]);
  const rafRef = useRef<number>(0);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);

  onCompleteRef.current = onAnimationComplete;
  runtimeRef.current = runtime;

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timeoutsRef.current.forEach((id) => clearTimeout(id));
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

  const animateParallel = useCallback(
    (pairs: { from: string; to: string }[], duration: number) => {
      return new Promise<void>((resolve) => {
        const start = performance.now();
        const sigs = pairs.map((p, i) => ({
          id: \`par-\${i}-\${Date.now()}\`,
          from: p.from,
          to: p.to,
          progress: 0,
          magnitude: 0.8,
        }));

        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setSignals(sigs.map((s) => ({ ...s, progress: p })));
          if (p < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    },
    [],
  );

  /* ── Resolve current step ─────────────────────────── */
  const steps = buildSteps(runtime);
  const currentKey: StepKey | undefined = steps[currentStep]?.key;

  /* ── Generic step executor ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    cleanup();

    const finish = () => {
      if (!cancelled) setTimeout(() => onCompleteRef.current?.(), 0);
    };
    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<${pascalName}State>) => dispatch(patchState(p));

    const stepDef = STEPS.find((s) => s.key === currentKey);
    if (!stepDef) {
      finish();
      return cleanup;
    }

    const run = async () => {
      // 1. Special actions
      if (stepDef.action === "reset") {
        dispatch(reset());
        finish();
        return;
      }

      // 2. Recalc metrics early (for non-flow steps)
      if (stepDef.recalcMetrics && !stepDef.flow) {
        dispatch(recalcMetrics());
      }

      // 3. Set phase
      if (stepDef.phase) {
        const phase =
          typeof stepDef.phase === "function"
            ? stepDef.phase(rt())
            : stepDef.phase;
        doPatch({ phase });
      }

      // 4. Set initial hot zones for non-flow steps
      if (stepDef.finalHotZones !== undefined && !stepDef.flow) {
        doPatch({ hotZones: stepDef.finalHotZones });
      }

      // 5. Execute flow beats
      if (stepDef.flow) {
        await executeFlow(stepDef.flow, {
          animateParallel,
          patch: doPatch,
          getState: rt,
          cancelled: () => cancelled,
        });
        if (cancelled) return;
      }

      // 6. Recalc after flow
      if (stepDef.recalcMetrics && stepDef.flow) {
        dispatch(recalcMetrics());
      }

      // 7. Delay
      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      // 8. Final hot zones
      if (stepDef.finalHotZones !== undefined) {
        doPatch({ hotZones: stepDef.finalHotZones });
      } else if (!stepDef.flow) {
        doPatch({ hotZones: [] });
      }

      // 9. Final explanation
      if (stepDef.explain) {
        const explanation =
          typeof stepDef.explain === "function"
            ? stepDef.explain(rt())
            : stepDef.explain;
        doPatch({ explanation });
      }

      finish();
    };

    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [currentStep, currentKey, cleanup, dispatch, sleep, animateParallel]);

  return { runtime, signals };
};
`;
} else {
hookContent = `import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { SignalOverlayParams } from "vizcraft";
import { type RootState } from "../../store/store";
import { patchState, reset, type ${pascalName}Phase } from "./${camelName}Slice";

export type Signal = { id: string } & SignalOverlayParams;

export const use${pascalName}Animation = (onAnimationComplete?: () => void) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.${camelName});
  const [signals, setSignals] = useState<Signal[]>([]);
  const [animPhase, setAnimPhase] = useState<string>("idle");
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);

  onCompleteRef.current = onAnimationComplete;

  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    setSignals([]);
  }, []);

  const sleep = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), ms);
      timeoutsRef.current.push(id);
    });
  }, []);

  const finish = useCallback(() => {
    onCompleteRef.current?.();
  }, []);

  /* ── Step orchestration ─────────────────────────────────── */
  useEffect(() => {
    cleanup();

    const run = async () => {
      switch (currentStep) {
        case 0:
          dispatch(reset());
          setAnimPhase("idle");
          finish();
          break;

        case 1:
          dispatch(
            patchState({
              phase: "processing",
              explanation: "Step 1 — describe what is happening here.",
              hotZones: ["node-a"],
            }),
          );
          setAnimPhase("processing");
          await sleep(1200);
          finish();
          break;

        case 2:
          dispatch(
            patchState({
              phase: "summary",
              explanation: "All done — here is the takeaway.",
              hotZones: [],
            }),
          );
          setAnimPhase("idle");
          finish();
          break;

        default:
          finish();
      }
    };

    run();
    return cleanup;
  }, [currentStep]);

  return {
    runtime,
    currentStep,
    signals,
    animPhase,
    phase: runtime.phase,
  };
};
`;
} // end if/else sandbox hook

fs.writeFileSync(
  path.join(targetDir, `use${pascalName}Animation.ts`),
  hookContent,
);

/* ================================================================
   3. Concepts  — concepts.tsx
   ================================================================ */
const conceptsContent = `import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey = "overview";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  overview: {
    title: "${pascalName}",
    subtitle: "A brief explanation of this concept",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it does",
        accent: "#60a5fa",
        content: (
          <p>
            Explain the core concept here. Keep it concise — one or two
            paragraphs is usually enough.
          </p>
        ),
      },
    ],
  },
};
`;

fs.writeFileSync(path.join(targetDir, "concepts.tsx"), conceptsContent);

/* ================================================================
   4. Main Component  — main.tsx
   ================================================================ */
const mainContent = `import React, { useLayoutEffect, useRef, useEffect } from "react";
import {
  viz,
  type PanZoomController,
  type SignalOverlayParams,
} from "vizcraft";
import {
  useConceptModal,
  ConceptPills,
  PluginLayout,
  StageHeader,
  StatBadge,
  SidePanel,
  SideCard,
  CanvasStage,
} from "../../components/plugin-kit";
import { concepts, type ConceptKey } from "./concepts";
import { use${pascalName}Animation, type Signal } from "./use${pascalName}Animation";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const ${pascalName}Visualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, currentStep, signals, animPhase, phase } =
    use${pascalName}Animation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  const { explanation, hotZones } = runtime;
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // ── Nodes ────────────────────────────────────────────
    b.node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(hot("node-a") ? "#1e40af" : "#0f172a")
      .stroke(hot("node-a") ? "#60a5fa" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    b.node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(hot("node-b") ? "#065f46" : "#0f172a")
      .stroke(hot("node-b") ? "#34d399" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    // ── Edges ────────────────────────────────────────────
    b.edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });

    // ── Signals ──────────────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig) => {
          const { id, ...params } = sig;
          o.add("signal", params as SignalOverlayParams, { key: id });
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = viewportRef.current;
    builderRef.current?.destroy();
    builderRef.current = scene;
    pzRef.current =
      scene.mount(containerRef.current, {
        autoplay: true,
        panZoom: true,
        initialZoom: saved?.zoom ?? 1,
        initialPan: saved?.pan ?? { x: 0, y: 0 },
      }) ?? null;
    const unsub = pzRef.current?.onChange((s) => {
      viewportRef.current = s;
    });
    return () => { unsub?.(); };
  }, [scene]);

  useEffect(() => {
    return () => {
      builderRef.current?.destroy();
      builderRef.current = null;
      pzRef.current = null;
    };
  }, []);

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    { key: "overview", label: "${pascalName}", color: "#93c5fd", borderColor: "#3b82f6" },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="${pluginName}-root">
      <PluginLayout
        toolbar={
          <ConceptPills pills={pills} onOpen={openConcept} />
        }
        canvas={
          <div className="${pluginName}-stage">
            <StageHeader
              title="${pascalName}"
              subtitle="Describe the visualisation in one line."
            >
              <StatBadge
                label="Phase"
                value={phase}
                className={\`${pluginName}-phase ${pluginName}-phase--\${phase}\`}
              />
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
          </SidePanel>
        }
      />
      <ConceptModal />
    </div>
  );
};

export default ${pascalName}Visualization;
`;

fs.writeFileSync(path.join(targetDir, "main.tsx"), mainContent);

/* ================================================================
   5. Styles  — main.scss
   ================================================================ */
const scssContent = `.${pluginName}-root {
  --${pluginName}-bg: #020617;
  --${pluginName}-panel: rgba(7, 17, 34, 0.88);
  --${pluginName}-border: rgba(148, 163, 184, 0.18);
  --${pluginName}-text: #e2e8f0;
  --${pluginName}-muted: #94a3b8;

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--${pluginName}-text);
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 28%),
    radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.12), transparent 30%),
    linear-gradient(180deg, #020617 0%, #071325 100%);
}

/* ── Stage ──────────────────────────────────────────── */
.${pluginName}-stage {
  background: var(--${pluginName}-panel);
  border: 1px solid var(--${pluginName}-border);
  box-shadow: 0 20px 42px -28px rgba(0, 0, 0, 0.7);
  border-radius: 24px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Phase colours ──────────────────────────────────── */
.${pluginName}-phase--overview .vc-stat-badge__value { color: #fbbf24; }
.${pluginName}-phase--processing .vc-stat-badge__value { color: #60a5fa; }
.${pluginName}-phase--summary .vc-stat-badge__value { color: #86efac; }
`;

fs.writeFileSync(path.join(targetDir, "main.scss"), scssContent);

/* ================================================================
   6. Plugin Registration  — index.ts
   ================================================================ */
let indexContent;
if (isSandbox) {
indexContent = `import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ${pascalName}Visualization from "./main";
import ${pascalName}Controls from "./controls";
import ${camelName}Reducer, {
  type ${pascalName}State,
  initialState,
  reset,
} from "./${camelName}Slice";
import {
  buildSteps,
  type StepKey,
  type TaggedStep,
} from "./flow-engine";

type LocalRootState = { ${camelName}: ${pascalName}State };

const ${pascalName}Plugin: DemoPlugin<
  ${pascalName}State,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "${pluginName}",
  name: "${pascalName}",
  description: "Describe what this demo teaches in one sentence.",
  initialState,
  reducer: ${camelName}Reducer,
  Component: ${pascalName}Visualization,
  Controls: ${pascalName}Controls,
  restartConfig: { text: "Replay", color: "#3b82f6" },
  getSteps: (state: ${pascalName}State): DemoStep[] => buildSteps(state),
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.${camelName},
};

export { buildSteps };
export type { StepKey, TaggedStep };
export default ${pascalName}Plugin;
`;
} else {
indexContent = `import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ${pascalName}Visualization from "./main";
import ${camelName}Reducer, {
  type ${pascalName}State,
  initialState,
  reset,
} from "./${camelName}Slice";

type LocalRootState = { ${camelName}: ${pascalName}State };

const ${pascalName}Plugin: DemoPlugin<
  ${pascalName}State,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "${pluginName}",
  name: "${pascalName}",
  description: "Describe what this demo teaches in one sentence.",
  initialState,
  reducer: ${camelName}Reducer,
  Component: ${pascalName}Visualization,
  restartConfig: { text: "Replay", color: "#1e40af" },
  getSteps: (_: ${pascalName}State): DemoStep[] => [
    {
      label: "Overview",
      autoAdvance: false,
      nextButtonText: "Begin",
    },
    {
      label: "Step One",
      autoAdvance: true,
      processingText: "Running…",
    },
    {
      label: "Summary",
      autoAdvance: true,
    },
  ],
  init: (dispatch) => {
    dispatch(reset());
  },
  selector: (state: LocalRootState) => state.${camelName},
};

export default ${pascalName}Plugin;
`;
} // end if/else sandbox index

fs.writeFileSync(path.join(targetDir, "index.ts"), indexContent);

/* ================================================================
   7. (Sandbox only) Flow Engine  — flow-engine.ts
   ================================================================ */
if (isSandbox) {
const flowEngineContent = `import type { InfraComponents, ${pascalName}State } from "./${camelName}Slice";

/* ══════════════════════════════════════════════════════════
   Declarative Flow Engine

   Define steps and their animation flows as DATA.
   The engine handles token expansion, signal routing,
   hot-zone derivation, and sequential execution.
   ══════════════════════════════════════════════════════════ */

/* ── Token expansion ─────────────────────────────────────
   Use $-prefixed tokens as shorthand for dynamic node sets.
   The engine expands them to actual node IDs at runtime.
   ──────────────────────────────────────────────────────── */

export function expandToken(
  token: string,
  state: ${pascalName}State,
): string[] {
  if (token === "$clients") return state.clients.map((c) => c.id);
  // TODO: add more token expansions, e.g.:
  // if (token === "$servers") {
  //   const count = 1 + state.components.extraServers;
  //   return Array.from({ length: count }, (_, i) => \`server-\${i}\`);
  // }
  return [token];
}

/* ── Flow Beat ───────────────────────────────────────────
   One animation segment: signals travel from → to.
   Tokens ($clients, $servers) expand to parallel signals.
   ──────────────────────────────────────────────────────── */

export interface FlowBeat {
  from: string;
  to: string;
  when?: (c: InfraComponents) => boolean;
  duration?: number;
  explain?: string;
}

/* ── Step Definition ─────────────────────────────────────
   Declarative config for one step in the visualization.
   ──────────────────────────────────────────────────────── */

export type StepKey = "overview" | "send-traffic" | "observe-metrics" | "summary";
// TODO: add more step keys as you add components

export interface StepDef {
  key: StepKey;
  label: string;
  when?: (c: InfraComponents) => boolean;
  nextButton?: string | ((c: InfraComponents) => string);
  nextButtonColor?: string;
  processingText?: string;
  phase?: string | ((s: ${pascalName}State) => string);
  flow?: FlowBeat[];
  delay?: number;
  recalcMetrics?: boolean;
  finalHotZones?: string[];
  explain?: string | ((s: ${pascalName}State) => string);
  action?: "reset";
}

/* ── Step Configuration ──────────────────────────────────
   Single source of truth. Each step gets its own unique
   flow — never repeat the same signal path in two steps.
   ──────────────────────────────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "reset",
  },
  {
    key: "send-traffic",
    label: "Send Traffic",
    processingText: "Sending...",
    nextButtonColor: "#2563eb",
    phase: "traffic",
    flow: [
      {
        from: "$clients",
        to: "cloud",
        duration: 700,
        explain: "Clients send requests through the internet.",
      },
      {
        from: "cloud",
        to: "server-0",
        duration: 600,
        explain: "Requests arrive at the server.",
      },
    ],
    recalcMetrics: true,
    explain: (s) =>
      \`Traffic flowing. \${s.requestsPerSecond} rps demand, \${s.maxCapacity} capacity.\`,
  },
  {
    key: "observe-metrics",
    label: "Observe Metrics",
    nextButtonColor: "#2563eb",
    recalcMetrics: true,
    delay: 500,
    phase: (s) => (s.droppedRequests > 0 ? "overloaded" : "stable"),
    finalHotZones: ["server-0"],
    explain: (s) =>
      s.droppedRequests > 0
        ? \`Overloaded! \${s.droppedRequests} requests dropped.\`
        : \`Stable at \${s.throughput} rps. Try adding components.\`,
  },
  // TODO: add component-specific steps here (each with unique flow)
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: (s) =>
      \`Max capacity: ~\${s.maxCapacity} rps. Try adding or removing components and replaying.\`,
  },
];

/* ── Build active steps from config ──────────────────── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance?: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

export function buildSteps(state: ${pascalName}State): TaggedStep[] {
  const { components: c } = state;
  const active = STEPS.filter((s) => !s.when || s.when(c));

  return active.map((step, i) => {
    const nextStep = active[i + 1];
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "function") {
      nextButtonText = step.nextButton(c);
    } else if (typeof step.nextButton === "string") {
      nextButtonText = step.nextButton;
    } else if (nextStep) {
      nextButtonText = nextStep.label;
    }

    return {
      key: step.key,
      label: step.label,
      autoAdvance: false,
      nextButtonText,
      nextButtonColor: step.nextButtonColor,
      processingText: step.processingText,
    };
  });
}

/* ── Flow Executor ───────────────────────────────────── */

export interface FlowExecutorDeps {
  animateParallel: (
    pairs: { from: string; to: string }[],
    duration: number,
  ) => Promise<void>;
  patch: (p: Partial<${pascalName}State>) => void;
  getState: () => ${pascalName}State;
  cancelled: () => boolean;
}

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

    const hotZones = [...new Set([...froms, ...tos])];
    const update: Partial<${pascalName}State> = { hotZones };
    if (beat.explain) update.explanation = beat.explain;
    deps.patch(update);

    await deps.animateParallel(pairs, beat.duration ?? 600);
  }
}
`;

fs.writeFileSync(path.join(targetDir, "flow-engine.ts"), flowEngineContent);

/* ================================================================
   8. (Sandbox only) Controls  — controls.tsx
   ================================================================ */
const controlsContent = `import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  addClient,
  removeClient,
  addComponent,
  removeComponent,
  type ${pascalName}State,
  type ComponentName,
} from "./${camelName}Slice";

/* ── Component toggle descriptor ─────────────────────── */
interface Toggle {
  name: ComponentName;
  label: string;
  addLabel: string;
  removeLabel: string;
  color: string;
  requires?: ComponentName[];
  multi?: boolean;
}

const TOGGLES: Toggle[] = [
  // TODO: define your component toggles here, e.g.:
  // {
  //   name: "database",
  //   label: "Database",
  //   addLabel: "+ Database",
  //   removeLabel: "− Database",
  //   color: "#22c55e",
  // },
];

const ${pascalName}Controls: React.FC = () => {
  const dispatch = useDispatch();
  const { components, clients } = useSelector(
    (state: RootState) => state.${camelName},
  ) as ${pascalName}State;

  const handleAdd = (name: ComponentName) => {
    dispatch(addComponent(name));
    dispatch(resetSimulation());
  };

  const handleRemove = (name: ComponentName) => {
    dispatch(removeComponent(name));
    dispatch(resetSimulation());
  };

  return (
    <div className="${pluginName}-controls">
      {/* Client count */}
      <div className="${pluginName}-controls__group">
        <button
          className="${pluginName}-controls__btn"
          onClick={() => dispatch(removeClient())}
          disabled={clients.length <= 1}
        >
          −
        </button>
        <span className="${pluginName}-controls__label">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
        <button
          className="${pluginName}-controls__btn"
          onClick={() => dispatch(addClient())}
          disabled={clients.length >= 12}
        >
          +
        </button>
      </div>

      <span className="${pluginName}-controls__sep" />

      {/* Infrastructure toggles */}
      {TOGGLES.map((t) => {
        const isActive = t.multi
          ? (components[t.name] as number) > 0
          : !!components[t.name];
        const prereqMet =
          !t.requires || t.requires.every((r) => !!components[r]);
        const canAdd = t.multi
          ? prereqMet
          : !isActive && prereqMet;

        return (
          <div key={t.name} className="${pluginName}-controls__group">
            {isActive && (
              <button
                className="${pluginName}-controls__btn ${pluginName}-controls__btn--remove"
                style={{ borderColor: t.color }}
                onClick={() => handleRemove(t.name)}
              >
                {t.removeLabel}
              </button>
            )}
            {canAdd && (
              <button
                className="${pluginName}-controls__btn ${pluginName}-controls__btn--add"
                style={{ borderColor: t.color }}
                onClick={() => handleAdd(t.name)}
              >
                {t.addLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ${pascalName}Controls;
`;

fs.writeFileSync(path.join(targetDir, "controls.tsx"), controlsContent);
} // end sandbox-only files

/* ================================================================
   9. Update registry.ts — add import + wire into category
   ================================================================ */
const registryPath = path.join(__dirname, "../src/registry.ts");
if (fs.existsSync(registryPath)) {
  let regContent = fs.readFileSync(registryPath, "utf-8");

  // ── 7a. Add import after the last plugin import ──────────
  const regImport = `import ${pascalName}Plugin from "./plugins/${pluginName}";`;
  const lastPluginImportRegex = /import .*Plugin from ".\/plugins\/.*";/g;
  let match;
  let lastIdx = -1;
  while ((match = lastPluginImportRegex.exec(regContent)) !== null) {
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx !== -1) {
    regContent =
      regContent.slice(0, lastIdx) +
      "\n" +
      regImport +
      regContent.slice(lastIdx);
  }

  console.log("✔ Updated src/registry.ts with import for " + pascalName + "Plugin");

  // ── 7b. Place plugin into a category ─────────────────────
  if (categoryName) {
    // Check if category already exists by matching  name: "Category Name"
    // We look for   name: "...",   inside the categories array.
    const nameLiteralEscaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const categoryNameRegex = new RegExp(
      `name:\\s*["']${nameLiteralEscaped}["']`,
    );
    const categoryMatch = categoryNameRegex.exec(regContent);

    if (categoryMatch) {
      // ── Category exists: append plugin to its plugins array ──
      // Find the `plugins: [...]` line that follows this category name.
      // Search from the category name match position forward.
      const afterName = regContent.slice(categoryMatch.index);
      const pluginsArrayRegex = /plugins:\s*\[([^\]]*)\]/;
      const pluginsMatch = pluginsArrayRegex.exec(afterName);

      if (pluginsMatch) {
        const arrayContent = pluginsMatch[1].trimEnd();
        // Build the new array content — append the new plugin
        const newArrayContent = arrayContent.endsWith(",")
          ? arrayContent + " " + pascalName + "Plugin"
          : arrayContent + ", " + pascalName + "Plugin";

        const absStart = categoryMatch.index + pluginsMatch.index;
        const absEnd = absStart + pluginsMatch[0].length;
        regContent =
          regContent.slice(0, absStart) +
          "plugins: [" + newArrayContent + "]" +
          regContent.slice(absEnd);

        console.log(
          '✔ Added ' + pascalName + 'Plugin to existing category "' + categoryName + '"',
        );
      }
    } else {
      // ── Category does not exist: create a new one ────────────
      const categorySlug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const newCategory =
        "  {\n" +
        '    id: "' + categorySlug + '",\n' +
        '    name: "' + categoryName + '",\n' +
        '    description: "Add a description for this category.",\n' +
        '    accent: "#6366f1",\n' +
        "    plugins: [" + pascalName + "Plugin],\n" +
        "  },";

      // Insert before the closing `];` of the categories array.
      const closingBracket = /^];\s*$/m;
      const closingMatch = closingBracket.exec(regContent);

      if (closingMatch) {
        regContent =
          regContent.slice(0, closingMatch.index) +
          newCategory + "\n" +
          regContent.slice(closingMatch.index);

        console.log(
          '✔ Created new category "' + categoryName + '" with ' + pascalName + "Plugin",
        );
      } else {
        console.log(
          '⚠  Could not locate categories array — add "' + categoryName + '" manually.',
        );
      }
    }
  } else {
    console.log("");
    console.log("  ⚠  No --category flag provided. Add the plugin to a category manually:");
    console.log("     plugins: [..., " + pascalName + "Plugin],");
  }

  fs.writeFileSync(registryPath, regContent);
} else {
  console.log(
    "Could not find src/registry.ts — add the plugin to the registry manually.",
  );
}

console.log("");
console.log(
  '✔ Created ' + (isSandbox ? 'sandbox ' : '') + 'plugin "' + pluginName + '" in src/plugins/' + pluginName,
);
console.log("");
console.log("  Files generated:");
console.log("    • " + camelName + "Slice.ts      — Redux state & actions");
console.log("    • use" + pascalName + "Animation.ts — Step orchestration & signals");
console.log("    • concepts.tsx        — InfoModal concept definitions");
console.log("    • main.tsx            — Component (uses plugin-kit)");
console.log("    • main.scss           — Styles");
console.log("    • index.ts            — Plugin registration");
if (isSandbox) {
  console.log("    • flow-engine.ts      — Declarative step & flow config");
  console.log("    • controls.tsx        — Controls panel (component toggles)");
}
console.log("");
console.log("  Next steps:");
if (isSandbox) {
  console.log("    1. Define InfraComponents in " + camelName + "Slice.ts");
  console.log("    2. Add togglable components to TOGGLES in controls.tsx");
  console.log("    3. Define steps declaratively in STEPS array (flow-engine.ts)");
  console.log("    4. Build dynamic scene in main.tsx (nodes/edges adapt to state)");
  console.log("    5. Add concept pills & definitions in concepts.tsx");
} else {
  console.log("    1. Define your VizCraft nodes/edges in main.tsx");
  console.log("    2. Add step animations in use" + pascalName + "Animation.ts");
  console.log("    3. Add concept pills & definitions in concepts.tsx");
}
