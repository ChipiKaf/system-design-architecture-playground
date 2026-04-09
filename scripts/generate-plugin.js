import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Arg parsing ────────────────────────────────────────────
// Usage:  npm run generate -- <plugin-name> [--category "Category Name"] [--sandbox | --timeline | --comparison]
const args = process.argv.slice(2);
let pluginName = null;
let categoryName = null;
let isSandbox = false;
let isTimeline = false;
let isComparison = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--category" || args[i] === "-c") {
    categoryName = args[++i];
  } else if (args[i] === "--sandbox" || args[i] === "-s") {
    isSandbox = true;
  } else if (args[i] === "--timeline" || args[i] === "-t") {
    isTimeline = true;
  } else if (args[i] === "--comparison" || args[i] === "-l") {
    isComparison = true;
  } else if (!args[i].startsWith("-")) {
    pluginName = args[i];
  }
}

if (!pluginName) {
  console.error(
    "Usage: npm run generate -- <plugin-name> [--category \"Category Name\"] [--sandbox | --timeline | --comparison]\n" +
      "       Name must be kebab-case, e.g. npm run generate -- api-gateway\n" +
      "       --category    / -c   Existing or new category to place the plugin in\n" +
      "       --sandbox     / -s   Dynamic controls + declarative flow engine\n" +
      "       --timeline    / -t   Progressive-reveal timeline\n" +
      "       --comparison  / -l   Shared lab-engine comparison lab",
  );
  process.exit(1);
}

if ([isSandbox, isTimeline, isComparison].filter(Boolean).length > 1) {
  console.error("Error: --sandbox, --timeline, and --comparison are mutually exclusive.");
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
} else if (isTimeline) {
sliceContent = `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Phase = "overview" | "item-focus" | "connections" | "summary";

export interface ${pascalName}State {
  phase: Phase;
  activeItemId: string | null;
  /** How many items have been "reached" (0 = none, 1 = first item lit, etc.) */
  reachedIndex: number;
  explanation: string;
  hotZones: string[];
  showConnections: boolean;
}

export const initialState: ${pascalName}State = {
  phase: "overview",
  activeItemId: null,
  reachedIndex: 0,
  explanation:
    "Step through each item on the timeline to explore the details.",
  hotZones: [],
  showConnections: false,
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
} else if (isComparison) {
sliceContent = `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";
import { getAdapter } from "./${pluginName}-adapters";

/* ── Variant identifiers ─────────────────────────────── */
export type VariantKey = "variant-a" | "variant-b";
// TODO: rename / add variant keys to match your domain

/* ── State shape ─────────────────────────────────────── */
export interface ${pascalName}State extends LabState {
  variant: VariantKey;

  /* derived metrics (recomputed by computeMetrics) */
  latencyMs: number;
  throughput: number;
}

/* ── Metrics model (delegates to adapter) ────────────── */
export function computeMetrics(state: ${pascalName}State) {
  const adapter = getAdapter(state.variant);
  adapter.computeMetrics(state);
}

export const initialState: ${pascalName}State = {
  variant: "variant-a",
  latencyMs: 50,
  throughput: 1000,

  hotZones: [],
  explanation: "Welcome — select a variant and step through to compare.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */
const ${camelName}Slice = createSlice({
  name: "${camelName}",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      const adapter = getAdapter(state.variant);
      adapter.softReset(state);
      state.hotZones = [];
      state.explanation = adapter.profile.description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<${pascalName}State>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      const adapter = getAdapter(action.payload);
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = adapter.profile.description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const {
  reset,
  softResetRun,
  patchState,
  recalcMetrics,
  setVariant,
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
} else if (isTimeline) {
hookContent = `import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";
import {
  patchState,
  reset,
  type ${pascalName}State,
} from "./${camelName}Slice";
import {
  STEPS,
  resolveExplain,
  resolveHotZones,
  resolvePatch,
  type StepKey,
} from "./flow-engine";

/* ──────────────────────────────────────────────────────────
   Declarative animation hook — Timeline variant.

   Reads step config from STEPS, resolves the current step,
   then applies the declared phase / patch / hotZones /
   explanation.  No per-step imperative code needed.
   ────────────────────────────────────────────────────────── */

export const use${pascalName}Animation = (
  onAnimationComplete?: () => void,
) => {
  const dispatch = useDispatch();
  const { currentStep } = useSelector((state: RootState) => state.simulation);
  const runtime = useSelector((state: RootState) => state.${camelName});
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const onCompleteRef = useRef(onAnimationComplete);
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  useLayoutEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  });

  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
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

  /* ── Resolve current step key ─────────────────────── */
  const stepDef = STEPS[currentStep] ?? null;
  const currentKey: StepKey | undefined = stepDef?.key;

  /* ── Generic step executor ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    cleanup();

    const rt = () => runtimeRef.current;
    const doPatch = (p: Partial<${pascalName}State>) =>
      dispatch(patchState(p));

    if (!stepDef) {
      finish();
      return cleanup;
    }

    const run = async () => {
      // 1. Special actions
      if (stepDef.action === "reset") {
        dispatch(reset());
        await sleep(50);
        if (!cancelled) finish();
        return;
      }

      // 2. Build the full patch for this step
      const patch: Partial<${pascalName}State> = {};

      // Phase
      if (stepDef.phase) {
        patch.phase = stepDef.phase as ${pascalName}State["phase"];
      }

      // Hot zones
      patch.hotZones = resolveHotZones(stepDef, rt());

      // Explanation
      const explanation = resolveExplain(stepDef, rt());
      if (explanation !== undefined) {
        patch.explanation = explanation;
      }

      // Extra patch from step config
      const extra = resolvePatch(stepDef, rt());
      Object.assign(patch, extra);

      // 3. Apply the patch
      doPatch(patch);

      // 4. Delay
      if (stepDef.delay) {
        await sleep(stepDef.delay);
        if (cancelled) return;
      }

      // 5. Post-delay effects (connections step shows connections after delay)
      if (stepDef.key === "connections") {
        doPatch({ showConnections: true });
        await sleep(500);
        if (cancelled) return;
      }

      finish();
    };

    run();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [currentStep, currentKey, cleanup, dispatch, finish, sleep, stepDef]);

  return { runtime, currentStep };
};
`;
} else if (isComparison) {
hookContent = `import {
  patchState,
  softResetRun,
  recalcMetrics,
  type ${pascalName}State,
} from "./${camelName}Slice";
import { STEPS, buildSteps, expandToken, type StepKey } from "./flow-engine";
import {
  useLabAnimation,
  type Signal,
  type UseLabAnimationConfig,
} from "../../lib/lab-engine";

export type { Signal };

const labConfig: UseLabAnimationConfig<${pascalName}State, StepKey> = {
  selector: (root) => root.${camelName} as ${pascalName}State,
  allSteps: STEPS,
  buildSteps,
  expandToken,
  actions: () => ({
    resetRun: { create: () => softResetRun(), terminal: true },
    // TODO: add more action mappings as needed
  }),
  recalcMetrics: () => recalcMetrics(),
  patchState: (p) => patchState(p),
};

export const use${pascalName}Animation = (onAnimationComplete?: () => void) =>
  useLabAnimation(labConfig, onAnimationComplete);
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
let mainContent;
if (isTimeline) {
mainContent = `import React, {
  useLayoutEffect,
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { viz, type PanZoomController } from "vizcraft";
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
import { use${pascalName}Animation } from "./use${pascalName}Animation";
import {
  items,
  categoryColors,
  categoryLabels,
  eraRanges,
  connections,
  TIMELINE_Y,
  NODE_R,
  type ItemCategory,
  type TimelineItem,
} from "./data";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 1280;
const H = 700;

const ${pascalName}Visualization: React.FC<Props> = ({
  onAnimationComplete,
}) => {
  const { runtime } = use${pascalName}Animation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const lastAnimatedItemRef = useRef<string | null>(null);
  const isFirstMountRef = useRef(true);

  const {
    phase,
    activeItemId,
    explanation,
    reachedIndex,
    showConnections,
  } = runtime;

  const activeItem = useMemo(
    () => items.find((it) => it.id === activeItemId) ?? null,
    [activeItemId],
  );

  /* ── Detail modal state ───────────────────────────────── */
  const [detailItem, setDetailItem] = useState<TimelineItem | null>(null);
  const handleNodeClick = useCallback((itemId: string) => {
    const item = items.find((it) => it.id === itemId);
    if (item) setDetailItem(item);
  }, []);
  const closeDetail = useCallback(() => setDetailItem(null), []);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // Determine per-item state based on progressive index
    const itemState = (idx: number) => {
      const isReached = idx < reachedIndex;
      const isActive = items[idx]?.id === activeItemId;
      return { isReached, isActive, isUpcoming: !isReached && !isActive };
    };

    // Find the x-coordinate the progress bar should fill to
    const progressX =
      reachedIndex > 0 && reachedIndex <= items.length
        ? items[reachedIndex - 1].x
        : reachedIndex > items.length
          ? items[items.length - 1].x
          : 60;
    const activeIdx = reachedIndex > 0 ? reachedIndex - 1 : 0;
    const progressColor =
      reachedIndex > 0
        ? categoryColors[items[activeIdx].category].stroke
        : "#334155";

    // ── Overlays: timeline, era bands, connectors, glow ──
    b.overlay((o) => {
      // Grey timeline axis
      o.add(
        "rect",
        { x: 60, y: TIMELINE_Y - 1, w: 1200, h: 2, rx: 1, ry: 1, fill: "#1e293b", opacity: 0.5 },
        { key: "timeline-axis-bg" },
      );

      // Colored progress bar
      if (reachedIndex > 0) {
        o.add(
          "rect",
          {
            x: 60,
            y: TIMELINE_Y - 2,
            w: Math.max(0, progressX - 60),
            h: 4,
            rx: 2,
            ry: 2,
            fill: progressColor,
            opacity: 0.8,
          },
          { key: "timeline-progress" },
        );
      }

      // Era background bands & labels
      eraRanges.forEach((era) => {
        o.add(
          "rect",
          {
            x: era.x1,
            y: TIMELINE_Y - 8,
            w: era.x2 - era.x1,
            h: 16,
            rx: 8,
            ry: 8,
            fill: era.color,
            opacity: 0.08,
          },
          { key: \`era-bg-\${era.label}\` },
        );
        o.add(
          "text",
          {
            x: (era.x1 + era.x2) / 2,
            y: TIMELINE_Y + 30,
            text: era.label,
            fill: era.color,
            fontSize: 10,
            fontWeight: "600",
          },
          { key: \`era-label-\${era.label}\` },
        );
      });

      // Per-item overlays: connector lines, timeline dots, date labels, glow
      items.forEach((item, idx) => {
        const { isReached, isActive } = itemState(idx);
        const lit = isReached || isActive;
        const colors = categoryColors[item.category];

        // Vertical connector line
        const connFill = lit ? colors.stroke : "#1e293b";
        const connOpacity = isActive ? 0.85 : lit ? 0.55 : 0.15;
        if (item.position === "above") {
          o.add(
            "rect",
            {
              x: item.x - 0.5,
              y: item.y + NODE_R,
              w: 1,
              h: TIMELINE_Y - item.y - NODE_R,
              fill: connFill,
              opacity: connOpacity,
            },
            { key: \`conn-\${item.id}\` },
          );
        } else {
          o.add(
            "rect",
            {
              x: item.x - 0.5,
              y: TIMELINE_Y,
              w: 1,
              h: item.y - TIMELINE_Y - NODE_R,
              fill: connFill,
              opacity: connOpacity,
            },
            { key: \`conn-\${item.id}\` },
          );
        }

        // Timeline dot
        o.add(
          "circle",
          {
            x: item.x,
            y: TIMELINE_Y,
            r: isActive ? 5 : lit ? 4 : 3,
            fill: lit ? colors.stroke : "#334155",
          },
          { key: \`dot-\${item.id}\` },
        );

        // Date label
        o.add(
          "text",
          {
            x: item.x,
            y: item.position === "above" ? TIMELINE_Y + 16 : TIMELINE_Y - 14,
            text: item.dateLabel,
            fill: lit ? "#e2e8f0" : "#475569",
            fontSize: 8,
          },
          { key: \`date-\${item.id}\` },
        );

        // Glow rings on the currently active item
        if (isActive && phase === "item-focus") {
          o.add(
            "circle",
            {
              x: item.x,
              y: item.y,
              r: NODE_R + 8,
              fill: "none",
              stroke: colors.stroke,
              strokeWidth: 2,
              opacity: 0.4,
            },
            { key: \`glow1-\${item.id}\` },
          );
          o.add(
            "circle",
            {
              x: item.x,
              y: item.y,
              r: NODE_R + 16,
              fill: "none",
              stroke: colors.stroke,
              strokeWidth: 1,
              opacity: 0.18,
            },
            { key: \`glow2-\${item.id}\` },
          );
        }
      });

      // Connection lines (when enabled)
      if (showConnections) {
        connections.forEach((conn) => {
          const from = items.find((it) => it.id === conn.from);
          const to = items.find((it) => it.id === conn.to);
          if (!from || !to) return;
          o.add(
            "line",
            {
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
              stroke: conn.color ?? "#475569",
              strokeWidth: 1.5,
              opacity: 0.4,
            },
            { key: \`conn-line-\${conn.from}-\${conn.to}\` },
          );
        });
      }
    });

    // ── Item circle nodes (progressive coloring + rise-up on active) ──
    items.forEach((item, idx) => {
      const { isReached, isActive, isUpcoming } = itemState(idx);
      const colors = categoryColors[item.category];

      const nodeFill = isActive || isReached ? colors.fill : "#0c1222";
      const nodeStroke = isActive || isReached ? colors.stroke : "#1e293b";
      const nodeStrokeW = isActive ? 3 : isReached ? 2 : 1.5;
      const labelFill = isActive ? "#fff" : isReached ? colors.stroke : "#3e4a5a";

      const node = b
        .node(item.id)
        .at(item.x, item.y)
        .circle(NODE_R)
        .fill(nodeFill)
        .stroke(nodeStroke, nodeStrokeW)
        .label(item.shortName, {
          fill: labelFill,
          fontSize: 9,
          fontWeight: isActive ? "bold" : "normal",
          dy: item.position === "above" ? -(NODE_R + 10) : NODE_R + 14,
        })
        .tooltip({
          title: item.name,
          sections: [
            { label: "Date", value: item.dateLabel },
            { label: "Category", value: categoryLabels[item.category] },
          ],
        })
        .onClick(() => handleNodeClick(item.id));

      // Active node: rise up from below
      if (isActive) {
        const isNewlyActive = activeItemId !== lastAnimatedItemRef.current;
        if (isNewlyActive) {
          const riseFrom = item.position === "above" ? 30 : -30;
          node.animateTo(
            { scale: 1, opacity: 1, y: item.y },
            {
              duration: 500,
              easing: "easeOut",
              from: { scale: 0.6, opacity: 0, y: item.y + riseFrom },
            },
          );
        } else {
          node.animateTo(
            { scale: 1, opacity: 1 },
            { duration: 200, easing: "easeOut" },
          );
        }
      } else if (isUpcoming) {
        node.animateTo(
          { opacity: 0.35 },
          { duration: 400, easing: "easeOut" },
        );
      }
    });

    return b;
  })();

  /* ── Track last-animated item for rise-up decision ──── */
  useEffect(() => {
    lastAnimatedItemRef.current = activeItemId;
  }, [activeItemId]);

  /* ── Mount VizCraft scene (reconcile in place) ──────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
        }) ?? null;
    } else {
      const saved = pzRef.current?.getState() ?? viewportRef.current;
      builderRef.current?.destroy();
      builderRef.current = scene;
      pzRef.current =
        scene.mount(containerRef.current, {
          autoplay: true,
          panZoom: true,
          initialZoom: saved?.zoom ?? 1,
          initialPan: saved?.pan ?? { x: 0, y: 0 },
        }) ?? null;
    }
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

  /* ── Auto-pan to the active item ───────────────────── */
  useEffect(() => {
    if (!activeItemId || !pzRef.current) return;
    pzRef.current.zoomToNode(activeItemId, {
      zoom: 1.4,
      duration: 600,
      padding: 80,
    });
  }, [activeItemId]);

  /* ── Pill definitions ───────────────────────────────── */
  const pills = [
    { key: "overview", label: "${pascalName}", color: "#93c5fd", borderColor: "#3b82f6" },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="${pluginName}-root">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="${pluginName}-stage">
            <StageHeader
              title="${pascalName}"
              subtitle="Step through each item on the timeline."
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
            {activeItem && (
              <SideCard label={activeItem.name} variant="info">
                <div className="${pluginName}-detail-header">
                  <span
                    className="${pluginName}-type-badge"
                    style={{
                      color: categoryColors[activeItem.category].stroke,
                      borderColor: categoryColors[activeItem.category].stroke,
                    }}
                  >
                    {categoryLabels[activeItem.category]}
                  </span>
                  <span className="${pluginName}-meta">{activeItem.dateLabel}</span>
                </div>
                <p className="${pluginName}-description">{activeItem.description}</p>
              </SideCard>
            )}
          </SidePanel>
        }
      />
      {detailItem && (
        <div className="${pluginName}-detail-overlay" onClick={closeDetail}>
          <div
            className="${pluginName}-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="${pluginName}-detail-close" onClick={closeDetail}>
              ×
            </button>
            <div className="${pluginName}-detail-modal-header">
              <h2>{detailItem.name}</h2>
              <span className="${pluginName}-meta">{detailItem.dateLabel}</span>
            </div>
            <p className="${pluginName}-description">{detailItem.description}</p>
          </div>
        </div>
      )}
      <ConceptModal />
    </div>
  );
};

export default ${pascalName}Visualization;
`;
} else if (isComparison) {
mainContent = `import React, { useLayoutEffect, useRef, useEffect } from "react";
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
import { type ${pascalName}State } from "./${camelName}Slice";
import { getAdapter } from "./${pluginName}-adapters";
import "./main.scss";

interface Props {
  onAnimationComplete?: () => void;
}

const W = 900;
const H = 600;

const ${pascalName}Visualization: React.FC<Props> = ({ onAnimationComplete }) => {
  const { runtime, signals } =
    use${pascalName}Animation(onAnimationComplete);
  const { openConcept, ConceptModal } = useConceptModal<ConceptKey>(concepts);
  const containerRef = useRef<HTMLDivElement>(null!);
  const builderRef = useRef<ReturnType<typeof viz> | null>(null);
  const pzRef = useRef<PanZoomController | null>(null);
  const viewportRef = useRef<{
    zoom: number;
    pan: { x: number; y: number };
  } | null>(null);

  const st = runtime as ${pascalName}State;
  const { explanation, hotZones, phase, variant } = st;
  const adapter = getAdapter(variant);
  const hot = (zone: string) => hotZones.includes(zone);

  /* ── Build VizCraft scene ─────────────────────────────── */
  const scene = (() => {
    const b = viz().view(W, H);

    // Delegate topology building to the adapter
    adapter.buildTopology(b, st, { hot, phase });

    // ── Signals ──────────────────────────────────────────
    if (signals.length > 0) {
      b.overlay((o) => {
        signals.forEach((sig: Signal) => {
          const { id, colorClass, ...params } = sig;
          o.add(
            "signal",
            params as SignalOverlayParams,
            { key: id, className: colorClass },
          );
        });
      });
    }

    return b;
  })();

  /* ── Mount / destroy VizCraft scene ─────────────────── */
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const saved = pzRef.current?.getState() ?? viewportRef.current;
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

  /* ── Stat badges from adapter ───────────────────────── */
  const badges = adapter.getStatBadges(st);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="${pluginName}-root ${pluginName}-phase--\${phase}">
      <PluginLayout
        toolbar={<ConceptPills pills={pills} onOpen={openConcept} />}
        canvas={
          <div className="${pluginName}-stage">
            <StageHeader
              title="${pascalName}"
              subtitle={\`Comparing: \${adapter.profile.label}\`}
            >
              {badges.map((badge) => (
                <StatBadge
                  key={badge.label}
                  label={badge.label}
                  value={badge.value}
                  className={\`${pluginName}-phase ${pluginName}-phase--\${phase}\`}
                />
              ))}
            </StageHeader>
            <CanvasStage canvasRef={containerRef} />
          </div>
        }
        sidebar={
          <SidePanel>
            <SideCard label="What's happening" variant="explanation">
              <p>{explanation}</p>
            </SideCard>
            <SideCard label="Active Variant" variant="info">
              <p style={{ color: adapter.colors.stroke, fontWeight: 600 }}>
                {adapter.profile.label}
              </p>
              <p>{adapter.profile.description}</p>
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
} else {
mainContent = `import React, { useLayoutEffect, useRef, useEffect } from "react";
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
    const saved = pzRef.current?.getState() ?? viewportRef.current;
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
} // end if/else timeline mainContent

fs.writeFileSync(path.join(targetDir, "main.tsx"), mainContent);

/* ================================================================
   5. Styles  — main.scss
   ================================================================ */
let scssContent;
if (isTimeline) {
scssContent = `.${pluginName}-root {
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
.${pluginName}-phase--item-focus .vc-stat-badge__value { color: #60a5fa; }
.${pluginName}-phase--connections .vc-stat-badge__value { color: #14b8a6; }
.${pluginName}-phase--summary .vc-stat-badge__value { color: #86efac; }

/* ── Detail header ───────────────────────────────────── */
.${pluginName}-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.${pluginName}-type-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid;
  border-radius: 4px;
  padding: 0.12rem 0.5rem;
  margin-bottom: 0.25rem;
}

.${pluginName}-meta {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.${pluginName}-description {
  font-size: 0.82rem;
  color: #cbd5e1;
  line-height: 1.55;
}

/* ── Side card slide-in ──────────────────────────────── */
.${pluginName}-root .vc-side-card {
  animation: ${pluginName}-slide-in 0.25s ease-out both;
}
.${pluginName}-root .vc-side-card:nth-child(2) {
  animation-delay: 0.08s;
}
.${pluginName}-root .vc-side-card:nth-child(3) {
  animation-delay: 0.16s;
}

@keyframes ${pluginName}-slide-in {
  from {
    transform: translateX(16px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ── Stage header stat badge fade ────────────── */
.${pluginName}-root .vc-stat-badge {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

/* ── Timeline canvas transitions (vizcraft SVG) */
.${pluginName}-stage svg {
  & circle,
  & text,
  & line,
  & path {
    transition:
      fill 0.4s ease,
      stroke 0.4s ease,
      opacity 0.5s ease,
      r 0.4s ease,
      stroke-width 0.35s ease;
  }

  & rect {
    transition:
      fill 0.4s ease,
      stroke 0.4s ease,
      opacity 0.5s ease,
      width 0.6s ease,
      height 0.4s ease,
      x 0.4s ease,
      stroke-width 0.35s ease;
  }
}

/* ── Detail Modal ────────────────────────────────────── */
.${pluginName}-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  animation: ${pluginName}-fade-in 0.2s ease-out;
}

@keyframes ${pluginName}-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.${pluginName}-detail-modal {
  position: relative;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.6);
  animation: ${pluginName}-slide-up 0.25s ease-out;
}

@keyframes ${pluginName}-slide-up {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.${pluginName}-detail-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: rgba(30, 41, 59, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: background 0.15s;

  &:hover {
    background: rgba(51, 65, 85, 0.9);
  }
}

.${pluginName}-detail-modal-header {
  padding-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: #f1f5f9;
  }
}
`;
} else if (isComparison) {
scssContent = `.${pluginName}-root {
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
.${pluginName}-phase--traffic .vc-stat-badge__value { color: #60a5fa; }
.${pluginName}-phase--comparison .vc-stat-badge__value { color: #14b8a6; }
.${pluginName}-phase--summary .vc-stat-badge__value { color: #86efac; }

/* ── Controls ────────────────────────────────────────── */
.${pluginName}-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.${pluginName}-controls__btn {
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  padding: 0.3rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.${pluginName}-controls__btn:hover {
  background: rgba(51, 65, 85, 0.7);
}
.${pluginName}-controls__btn--active {
  border-color: currentColor;
  background: rgba(51, 65, 85, 0.5);
  font-weight: 700;
}

.${pluginName}-controls__sep {
  width: 1px;
  height: 1.2rem;
  background: rgba(148, 163, 184, 0.2);
}
`;
} else {
scssContent = `.${pluginName}-root {
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
} // end if/else timeline scssContent

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
} else if (isTimeline) {
indexContent = `import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ${pascalName}Visualization from "./main";
import ${camelName}Reducer, {
  type ${pascalName}State,
  initialState,
  reset,
} from "./${camelName}Slice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

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
  restartConfig: { text: "Restart", color: "#312e81" },
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
} else if (isComparison) {
indexContent = `import type { Action, Dispatch } from "@reduxjs/toolkit";
import type { DemoPlugin, DemoStep } from "../../types/ModelPlugin";
import ${pascalName}Visualization from "./main";
import ${pascalName}Controls from "./controls";
import ${camelName}Reducer, {
  type ${pascalName}State,
  initialState,
  reset,
} from "./${camelName}Slice";
import { buildSteps, type StepKey, type TaggedStep } from "./flow-engine";

type LocalRootState = { ${camelName}: ${pascalName}State };

const ${pascalName}Plugin: DemoPlugin<
  ${pascalName}State,
  Action,
  LocalRootState,
  Dispatch<Action>
> = {
  id: "${pluginName}",
  name: "${pascalName}",
  description: "Describe what this comparison lab teaches.",
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
   7b. (Timeline only) Flow Engine  — flow-engine.ts
   ================================================================ */
if (isTimeline) {
const flowEngineContent = `import type { ${pascalName}State } from "./${camelName}Slice";
import { items } from "./data";

/* ══════════════════════════════════════════════════════════
   Declarative Flow Engine — Timeline variant

   Defines every step as DATA.  The animation hook reads
   step config and applies it generically — no per-step
   imperative code.  Steps are built dynamically from the
   items array so adding/removing items automatically
   updates the step list.
   ══════════════════════════════════════════════════════════ */

/* ── Step keys ───────────────────────────────────────── */
export type StepKey = "overview" | "item-focus" | "connections" | "summary";

/* ── Step Definition ─────────────────────────────────── */
export interface StepDef {
  key: StepKey;
  label: string;

  /** Button label for advancing (defaults to next step's label). */
  nextButton?: string;
  nextButtonColor?: string;
  processingText?: string;

  /** Phase to set on the slice. */
  phase?: string;

  /** Special action dispatched instead of normal flow. */
  action?: "reset";

  /** Delay (ms) before marking animation complete. */
  delay?: number;

  /** Hot zones to set. Can be static or derived from state. */
  hotZones?: string[] | ((s: ${pascalName}State) => string[]);

  /** Explanation text (static or derived). */
  explain?: string | ((s: ${pascalName}State) => string);

  /** Extra partial state to patch onto the slice. */
  patch?:
    | Partial<${pascalName}State>
    | ((s: ${pascalName}State) => Partial<${pascalName}State>);

  /** For item-focus steps: the index into the items array (0-based). */
  itemIndex?: number;
}

/* ── Step Configuration ──────────────────────────────────
   Single source of truth.  Item-focus steps are generated
   from the items array so they stay in sync automatically.
   ──────────────────────────────────────────────────────── */

export const STEPS: StepDef[] = [
  /* ── 0. Overview ─────────────────────────────────── */
  {
    key: "overview",
    label: "Overview",
    nextButton: "Begin Timeline",
    nextButtonColor: "#8b5cf6",
    action: "reset",
  },

  /* ── 1..N. Per-item progressive reveal ──────────── */
  ...items.map((item, i) => ({
    key: "item-focus" as const,
    label: item.name,
    nextButton: i < items.length - 1 ? "Next" : "Connections",
    nextButtonColor: "#4c1d95",
    phase: "item-focus",
    delay: 600,
    itemIndex: i,
    hotZones: () => items.slice(0, i + 1).map((it) => it.id),
    explain: item.description,
    patch: (): Partial<${pascalName}State> => ({
      activeItemId: item.id,
      reachedIndex: i + 1,
      showConnections: false,
    }),
  })),

  /* ── N+1. Connections ────────────────────────────── */
  {
    key: "connections",
    label: "Connections",
    nextButton: "Summary",
    nextButtonColor: "#14b8a6",
    phase: "connections",
    delay: 400,
    hotZones: items.map((it) => it.id),
    explain:
      "Connection lines show relationships between items. Explore the patterns that emerge.",
    patch: {
      activeItemId: null,
      reachedIndex: items.length,
      showConnections: false,
    },
  },

  /* ── N+2. Summary ────────────────────────────────── */
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    delay: 600,
    hotZones: [],
    explain:
      "Summary of the timeline. Edit this to describe the overall takeaway.",
    patch: {
      activeItemId: null,
      reachedIndex: items.length,
      showConnections: false,
    },
  },
];

/* ── TaggedStep: what the step indicator / getSteps sees ── */

export interface TaggedStep {
  key: StepKey;
  label: string;
  autoAdvance: boolean;
  nextButtonText?: string;
  nextButtonColor?: string;
  processingText?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildSteps(_state?: ${pascalName}State): TaggedStep[] {
  return STEPS.map((step, i) => {
    const nextStep = STEPS[i + 1];
    let nextButtonText: string | undefined;
    if (typeof step.nextButton === "string") {
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

/* ── Resolve helpers ─────────────────────────────────── */

export function resolveExplain(
  step: StepDef,
  state: ${pascalName}State,
): string | undefined {
  if (typeof step.explain === "function") return step.explain(state);
  return step.explain;
}

export function resolveHotZones(
  step: StepDef,
  state: ${pascalName}State,
): string[] {
  if (typeof step.hotZones === "function") return step.hotZones(state);
  return step.hotZones ?? [];
}

export function resolvePatch(
  step: StepDef,
  state: ${pascalName}State,
): Partial<${pascalName}State> {
  if (!step.patch) return {};
  if (typeof step.patch === "function") return step.patch(state);
  return step.patch;
}
`;

fs.writeFileSync(path.join(targetDir, "flow-engine.ts"), flowEngineContent);

/* ================================================================
   7c. (Timeline only) Data  — data.ts
   ================================================================ */
const dataContent = `// ─── ${pascalName}: timeline items and layout data ───

/* ── Layout constants ────────────────────────────────── */
export const TIMELINE_Y = 340;
export const ITEM_Y_ABOVE = 150;
export const ITEM_Y_BELOW = 530;
export const NODE_R = 24;

/* ── Item categories ─────────────────────────────────── */
export type ItemCategory = "primary" | "secondary" | "context";

export const categoryColors: Record<
  ItemCategory,
  { fill: string; stroke: string }
> = {
  primary: { fill: "#1e3a5f", stroke: "#3b82f6" },
  secondary: { fill: "#134e4a", stroke: "#14b8a6" },
  context: { fill: "#1f2937", stroke: "#94a3b8" },
};

export const categoryLabels: Record<ItemCategory, string> = {
  primary: "Primary",
  secondary: "Secondary",
  context: "Context",
};

/* ── Timeline item interface ─────────────────────────── */
export interface TimelineItem {
  id: string;
  name: string;
  shortName: string;
  dateLabel: string;
  x: number;
  y: number;
  position: "above" | "below";
  category: ItemCategory;
  description: string;
}

/* ── All items, chronologically ordered ──────────────── */
export const items: TimelineItem[] = [
  // TODO: Replace these placeholders with your actual timeline data
  {
    id: "item-1",
    name: "First Event",
    shortName: "First",
    dateLabel: "Year 1",
    x: 120,
    y: ITEM_Y_ABOVE,
    position: "above",
    category: "primary",
    description: "Description of the first event.",
  },
  {
    id: "item-2",
    name: "Second Event",
    shortName: "Second",
    dateLabel: "Year 2",
    x: 280,
    y: ITEM_Y_BELOW,
    position: "below",
    category: "secondary",
    description: "Description of the second event.",
  },
  {
    id: "item-3",
    name: "Third Event",
    shortName: "Third",
    dateLabel: "Year 3",
    x: 440,
    y: ITEM_Y_ABOVE,
    position: "above",
    category: "primary",
    description: "Description of the third event.",
  },
  {
    id: "item-4",
    name: "Fourth Event",
    shortName: "Fourth",
    dateLabel: "Year 4",
    x: 600,
    y: ITEM_Y_BELOW,
    position: "below",
    category: "context",
    description: "Description of the fourth event.",
  },
  {
    id: "item-5",
    name: "Fifth Event",
    shortName: "Fifth",
    dateLabel: "Year 5",
    x: 760,
    y: ITEM_Y_ABOVE,
    position: "above",
    category: "secondary",
    description: "Description of the fifth event.",
  },
];

/* ── Era ranges (background bands) ───────────────────── */
export const eraRanges: {
  label: string;
  x1: number;
  x2: number;
  color: string;
}[] = [
  // TODO: define era ranges that group items visually
  { label: "Early Period", x1: 80, x2: 360, color: "#3b82f6" },
  { label: "Late Period", x1: 400, x2: 800, color: "#14b8a6" },
];

/* ── Connections between items ───────────────────────── */
export const connections: {
  from: string;
  to: string;
  color?: string;
}[] = [
  // TODO: define connection lines
  { from: "item-1", to: "item-3", color: "#3b82f6" },
  { from: "item-2", to: "item-4", color: "#14b8a6" },
];
`;

fs.writeFileSync(path.join(targetDir, "data.ts"), dataContent);
} // end timeline-only files

/* ================================================================
   7d. (Comparison only) Flow Engine  — flow-engine.ts
   ================================================================ */
if (isComparison) {
const flowEngineContent = `import type { ${pascalName}State } from "./${camelName}Slice";
import { getAdapter } from "./${pluginName}-adapters";
import {
  buildSteps as genericBuildSteps,
  executeFlow as genericExecuteFlow,
  type FlowBeat as GenericFlowBeat,
  type StepDef as GenericStepDef,
  type TaggedStep as GenericTaggedStep,
  type FlowExecutorDeps as GenericFlowExecutorDeps,
} from "../../lib/lab-engine";

/* ══════════════════════════════════════════════════════════
   ${pascalName} Lab — Declarative Flow Engine

   Uses the shared lab-engine for build/execute logic.
   Token expansion and flow beats delegate to adapters.
   ══════════════════════════════════════════════════════════ */

/* ── Specialised type aliases ──────────────────────────── */

export type FlowBeat = GenericFlowBeat<${pascalName}State>;
export type StepDef = GenericStepDef<${pascalName}State, StepKey>;
export type TaggedStep = GenericTaggedStep<StepKey>;
export type FlowExecutorDeps = GenericFlowExecutorDeps<${pascalName}State>;

/* ── Token expansion (delegates to adapter) ──────────── */

export function expandToken(token: string, state: ${pascalName}State): string[] {
  const adapter = getAdapter(state.variant);
  const expanded = adapter.expandToken(token, state);
  return expanded ?? [token];
}

/* ── Step keys ───────────────────────────────────────── */

export type StepKey = "overview" | "send-traffic" | "observe-metrics" | "summary";
// TODO: add more step keys as needed

/* ── Step Configuration ──────────────────────────────── */

export const STEPS: StepDef[] = [
  {
    key: "overview",
    label: "Architecture Overview",
    nextButton: "Send Traffic",
    action: "resetRun",
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return \`\${adapter.profile.label} selected. Step through to compare.\`;
    },
  },
  {
    key: "send-traffic",
    label: "Send Traffic",
    processingText: "Sending...",
    nextButtonColor: "#2563eb",
    phase: "traffic",
    flow: [
      {
        from: "node-a",
        to: "node-b",
        duration: 700,
        explain: "Requests flow from A to B.",
      },
    ],
    recalcMetrics: true,
    explain: (s) =>
      \`Throughput: \${s.throughput} rps — Latency: \${s.latencyMs}ms.\`,
  },
  {
    key: "observe-metrics",
    label: "Observe Metrics",
    nextButtonColor: "#2563eb",
    recalcMetrics: true,
    delay: 500,
    phase: "comparison",
    finalHotZones: ["node-b"],
    explain: (s) => {
      const adapter = getAdapter(s.variant);
      return \`\${adapter.profile.label} — \${s.throughput} rps at \${s.latencyMs}ms latency.\`;
    },
  },
  {
    key: "summary",
    label: "Summary",
    phase: "summary",
    explain: () =>
      \`Comparison complete. Try switching variants and replaying.\`,
  },
];

/* ── Build active steps ──────────────────────────────── */

export function buildSteps(state: ${pascalName}State): TaggedStep[] {
  return genericBuildSteps(STEPS, state);
}

/* ── Execute flow ────────────────────────────────────── */

export async function executeFlow(
  beats: FlowBeat[],
  deps: FlowExecutorDeps,
): Promise<void> {
  return genericExecuteFlow(beats, deps, expandToken);
}
`;

fs.writeFileSync(path.join(targetDir, "flow-engine.ts"), flowEngineContent);

/* ================================================================
   7d-ii. (Comparison only) Adapter scaffolding
   ================================================================ */
const adaptersDir = path.join(targetDir, `${pluginName}-adapters`);
fs.mkdirSync(adaptersDir, { recursive: true });

// ── types.ts ──────────────────────────────────────────────
const adapterTypesContent = `/**
 * ${pascalName}Adapter — the behavioural contract each variant must implement.
 *
 * Instead of scattering \\\`if (variant === "variant-a") … else …\\\`
 * throughout the slice, flow-engine, and main.tsx, each variant
 * implements this interface.  Consumers call \\\`getAdapter(variant)\\\`.
 */

import type { ${pascalName}State, VariantKey } from "../${camelName}Slice";
import type { FlowBeat } from "../flow-engine";

/* ── Static metadata ───────────────────────────────────── */

export interface VariantProfile {
  label: string;
  description: string;
}

export interface VariantColors {
  fill: string;   // dark node fill when highlighted
  stroke: string; // accent border
}

/* ── Scene rendering ───────────────────────────────────── */

export interface SceneHelpers {
  hot: (zone: string) => boolean;
  phase: string;
}

export interface StatBadgeConfig {
  label: string;
  value: string | number;
  color: string;
}

/* ── The adapter interface ─────────────────────────────── */

export interface ${pascalName}Adapter {
  /** Unique key matching VariantKey */
  id: VariantKey;

  /** Static display metadata */
  profile: VariantProfile;
  colors: VariantColors;

  /* ── Metrics ───────────────────────────────────────── */

  /** Compute and mutate derived metrics on the state */
  computeMetrics(state: ${pascalName}State): void;

  /* ── Token expansion (flow engine) ─────────────────── */

  /** Expand a $token into concrete node IDs, or null to use the token as-is */
  expandToken(token: string, state: ${pascalName}State): string[] | null;

  /* ── Flow engine ───────────────────────────────────── */

  /** Return adapter-specific flow beats for the main traffic step */
  getFlowBeats(state: ${pascalName}State): FlowBeat[];

  /* ── Scene (VizCraft topology) ─────────────────────── */

  /** Build the topology portion of the VizCraft scene */
  buildTopology(
    builder: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- viz() builder
    state: ${pascalName}State,
    helpers: SceneHelpers,
  ): void;

  /** Stat badges for the header */
  getStatBadges(state: ${pascalName}State): StatBadgeConfig[];

  /* ── Soft reset per animation pass ─────────────────── */

  /** Reset per-pass state (randomise, etc.) */
  softReset(state: ${pascalName}State): void;
}
`;

fs.writeFileSync(path.join(adaptersDir, "types.ts"), adapterTypesContent);

// ── index.ts ─────────────────────────────────────────────
const adapterIndexContent = `export type {
  ${pascalName}Adapter,
  StatBadgeConfig,
  SceneHelpers,
  VariantProfile,
  VariantColors,
} from "./types";

import type { VariantKey } from "../${camelName}Slice";
import type { ${pascalName}Adapter } from "./types";
import { variantAAdapter } from "./variant-a";
import { variantBAdapter } from "./variant-b";

const ADAPTERS: Record<VariantKey, ${pascalName}Adapter> = {
  "variant-a": variantAAdapter,
  "variant-b": variantBAdapter,
};

/** Look up the adapter for the given variant key. */
export function getAdapter(key: VariantKey): ${pascalName}Adapter {
  return ADAPTERS[key];
}

/** All registered adapters (for iteration in controls, etc.). */
export const allAdapters: ${pascalName}Adapter[] = Object.values(ADAPTERS);
`;

fs.writeFileSync(path.join(adaptersDir, "index.ts"), adapterIndexContent);

// ── variant-a.ts ─────────────────────────────────────────
const variantAContent = `import type { ${pascalName}Adapter } from "./types";
import type { ${pascalName}State } from "../${camelName}Slice";

export const variantAAdapter: ${pascalName}Adapter = {
  id: "variant-a",

  profile: {
    label: "Variant A",
    description: "Describe variant A's approach.",
  },

  colors: {
    fill: "#1e3a5f",
    stroke: "#3b82f6",
  },

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: ${pascalName}State) {
    // TODO: compute real metrics for variant A
    state.latencyMs = 50;
    state.throughput = 1000;
  },

  /* ── Token expansion ───────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandToken(_token: string, _state: ${pascalName}State): string[] | null {
    // TODO: expand $-tokens to concrete node IDs
    // e.g. if (token === "$nodes") return state.nodes.map(n => n.id);
    return null; // fallback — use token as-is
  },

  /* ── Flow engine ───────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFlowBeats(_state: ${pascalName}State) {
    // TODO: return adapter-specific flow beats
    return [];
  },

  /* ── Scene ─────────────────────────────────────────── */

  buildTopology(builder, _state, helpers) {
    // TODO: build variant-A-specific nodes & edges
    builder
      .node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-a") ? "#1e40af" : "#0f172a")
      .stroke(helpers.hot("node-a") ? "#60a5fa" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-b") ? "#065f46" : "#0f172a")
      .stroke(helpers.hot("node-b") ? "#34d399" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });
  },

  getStatBadges(state: ${pascalName}State) {
    return [
      { label: "Variant", value: "A", color: "#3b82f6" },
      { label: "Latency", value: \`\${state.latencyMs}ms\`, color: "#60a5fa" },
      { label: "Throughput", value: \`\${state.throughput} rps\`, color: "#22c55e" },
    ];
  },

  /* ── Soft reset ────────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  softReset(_state: ${pascalName}State) {
    // TODO: randomise per-pass state if needed
  },
};
`;

fs.writeFileSync(path.join(adaptersDir, "variant-a.ts"), variantAContent);

// ── variant-b.ts ─────────────────────────────────────────
const variantBContent = `import type { ${pascalName}Adapter } from "./types";
import type { ${pascalName}State } from "../${camelName}Slice";

export const variantBAdapter: ${pascalName}Adapter = {
  id: "variant-b",

  profile: {
    label: "Variant B",
    description: "Describe variant B's approach.",
  },

  colors: {
    fill: "#064e3b",
    stroke: "#22c55e",
  },

  /* ── Metrics ───────────────────────────────────────── */

  computeMetrics(state: ${pascalName}State) {
    // TODO: compute real metrics for variant B
    state.latencyMs = 120;
    state.throughput = 2000;
  },

  /* ── Token expansion ───────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandToken(_token: string, _state: ${pascalName}State): string[] | null {
    return null;
  },

  /* ── Flow engine ───────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFlowBeats(_state: ${pascalName}State) {
    return [];
  },

  /* ── Scene ─────────────────────────────────────────── */

  buildTopology(builder, _state, helpers) {
    // TODO: build variant-B-specific nodes & edges
    builder
      .node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-a") ? "#064e3b" : "#0f172a")
      .stroke(helpers.hot("node-a") ? "#22c55e" : "#334155", 2)
      .label("Node A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-b") ? "#064e3b" : "#0f172a")
      .stroke(helpers.hot("node-b") ? "#22c55e" : "#334155", 2)
      .label("Node B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });
  },

  getStatBadges(state: ${pascalName}State) {
    return [
      { label: "Variant", value: "B", color: "#22c55e" },
      { label: "Latency", value: \`\${state.latencyMs}ms\`, color: "#60a5fa" },
      { label: "Throughput", value: \`\${state.throughput} rps\`, color: "#22c55e" },
    ];
  },

  /* ── Soft reset ────────────────────────────────────── */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  softReset(_state: ${pascalName}State) {
    // TODO: randomise per-pass state if needed
  },
};
`;

fs.writeFileSync(path.join(adaptersDir, "variant-b.ts"), variantBContent);

console.log("  ✔ Created " + pluginName + "-adapters/ with types.ts, index.ts, variant-a.ts, variant-b.ts");

/* ================================================================
   7e. (Comparison only) Controls  — controls.tsx
   ================================================================ */
const controlsContent = `import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { type RootState } from "../../store/store";
import { resetSimulation } from "../../store/slices/simulationSlice";
import {
  setVariant,
  type ${pascalName}State,
  type VariantKey,
} from "./${camelName}Slice";
import { allAdapters } from "./${pluginName}-adapters";

const ${pascalName}Controls: React.FC = () => {
  const dispatch = useDispatch();
  const { variant } = useSelector(
    (state: RootState) => state.${camelName},
  ) as ${pascalName}State;

  const handleSwitch = (key: VariantKey) => {
    if (key === variant) return;
    dispatch(setVariant(key));
    dispatch(resetSimulation());
  };

  return (
    <div className="${pluginName}-controls">
      {allAdapters.map((adapter) => (
        <button
          key={adapter.id}
          className={\`${pluginName}-controls__btn\${adapter.id === variant ? " ${pluginName}-controls__btn--active" : ""}\`}
          style={adapter.id === variant ? { color: adapter.colors.stroke, borderColor: adapter.colors.stroke } : {}}
          onClick={() => handleSwitch(adapter.id)}
        >
          {adapter.profile.label}
        </button>
      ))}
    </div>
  );
};

export default ${pascalName}Controls;
`;

fs.writeFileSync(path.join(targetDir, "controls.tsx"), controlsContent);
} // end comparison-only files

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

const modeLabel = isSandbox ? 'sandbox ' : isTimeline ? 'timeline ' : isComparison ? 'comparison-lab ' : '';
console.log("");
console.log(
  '✔ Created ' + modeLabel + 'plugin "' + pluginName + '" in src/plugins/' + pluginName,
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
if (isTimeline) {
  console.log("    • flow-engine.ts      — Declarative step config (timeline)");
  console.log("    • data.ts             — Timeline items, categories, connections");
}
if (isComparison) {
  console.log("    • flow-engine.ts      — Lab-engine step & flow config");
  console.log("    • controls.tsx        — Variant selector panel");
  console.log("    • " + pluginName + "-adapters/");
  console.log("        types.ts          — Adapter interface contract");
  console.log("        index.ts          — getAdapter() registry");
  console.log("        variant-a.ts      — Variant A adapter");
  console.log("        variant-b.ts      — Variant B adapter");
}
console.log("");
console.log("  Next steps:");
if (isSandbox) {
  console.log("    1. Define InfraComponents in " + camelName + "Slice.ts");
  console.log("    2. Add togglable components to TOGGLES in controls.tsx");
  console.log("    3. Define steps declaratively in STEPS array (flow-engine.ts)");
  console.log("    4. Build dynamic scene in main.tsx (nodes/edges adapt to state)");
  console.log("    5. Add concept pills & definitions in concepts.tsx");
} else if (isTimeline) {
  console.log("    1. Define your timeline items in data.ts (id, name, x, y, category)");
  console.log("    2. Define era ranges and connections in data.ts");
  console.log("    3. Steps auto-generate from items — customise labels in flow-engine.ts");
  console.log("    4. Add concept pills & definitions in concepts.tsx");
  console.log("    5. Customise node tooltips and sidebar detail in main.tsx");
} else if (isComparison) {
  console.log("    1. Rename VariantKey values + adapter files to match your domain");
  console.log("    2. Implement computeMetrics() in each adapter");
  console.log("    3. Build variant-specific VizCraft topology in buildTopology()");
  console.log("    4. Add $-token expansion in expandToken() per adapter");
  console.log("    5. Define steps & flow beats in STEPS (flow-engine.ts)");
  console.log("    6. Add concept pills & definitions in concepts.tsx");
  console.log("    7. Uses shared lib/lab-engine — animation hook is ~30 lines");
} else {
  console.log("    1. Define your VizCraft nodes/edges in main.tsx");
  console.log("    2. Add step animations in use" + pascalName + "Animation.ts");
  console.log("    3. Add concept pills & definitions in concepts.tsx");
}
