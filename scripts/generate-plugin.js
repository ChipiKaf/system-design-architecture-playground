import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Arg parsing ────────────────────────────────────────────
// Usage:  npm run generate <plugin-name> [--category "Category Name"]
const args = process.argv.slice(2);
let pluginName = null;
let categoryName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--category" || args[i] === "-c") {
    categoryName = args[++i];
  } else if (!args[i].startsWith("-")) {
    pluginName = args[i];
  }
}

if (!pluginName) {
  console.error(
    "Usage: npm run generate <plugin-name> [--category \"Category Name\"]\n" +
      "       Name must be kebab-case, e.g. npm run generate api-gateway\n" +
      "       --category / -c   Existing or new category to place the plugin in",
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
const sliceContent = `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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

fs.writeFileSync(path.join(targetDir, `${camelName}Slice.ts`), sliceContent);

/* ================================================================
   2. Animation Hook  — use${pascalName}Animation.ts
   ================================================================ */
const hookContent = `import { useCallback, useEffect, useRef, useState } from "react";
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
const indexContent = `import type { Action, Dispatch } from "@reduxjs/toolkit";
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

fs.writeFileSync(path.join(targetDir, "index.ts"), indexContent);

/* ================================================================
   7. Update registry.ts — add import + wire into category
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
  '✔ Created plugin "' + pluginName + '" in src/plugins/' + pluginName,
);
console.log("");
console.log("  Files generated:");
console.log("    • " + camelName + "Slice.ts      — Redux state & actions");
console.log("    • use" + pascalName + "Animation.ts — Step orchestration & signals");
console.log("    • concepts.tsx        — InfoModal concept definitions");
console.log("    • main.tsx            — Component (uses plugin-kit)");
console.log("    • main.scss           — Styles");
console.log("    • index.ts            — Plugin registration");
console.log("");
console.log("  Next steps:");
console.log("    1. Define your VizCraft nodes/edges in main.tsx");
console.log("    2. Add step animations in use" + pascalName + "Animation.ts");
console.log("    3. Add concept pills & definitions in concepts.tsx");
