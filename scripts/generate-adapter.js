#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Arg parsing ────────────────────────────────────────
// Usage:  npm run generate:adapter -- <plugin-name> --topic "Topic Label" --variants "var-a,var-b"
//   or:   npm run generate:adapter -- <plugin-name> --variant "new-variant" --topic "existing-topic"
const args = process.argv.slice(2);
let pluginName = null;
let topicLabel = null;
let variantsCsv = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--topic" || args[i] === "-t") {
    topicLabel = args[++i];
  } else if (args[i] === "--variants" || args[i] === "-v") {
    variantsCsv = args[++i];
  } else if (!args[i].startsWith("-")) {
    pluginName = args[i];
  }
}

if (!pluginName || !topicLabel) {
  console.error(
    "Usage: npm run generate:adapter -- <plugin-name> --topic \"Topic Label\" --variants \"var-a,var-b\"\n\n" +
    "  <plugin-name>   Existing modular plugin (kebab-case)\n" +
    "  --topic  / -t   Topic label (e.g. \"View Encapsulation\"). Creates topic if it doesn't exist.\n" +
    "  --variants / -v Comma-separated variant names (kebab-case).\n" +
    "                  If omitted, creates two placeholders: <topic>-opt-1, <topic>-opt-2\n\n" +
    "Examples:\n" +
    '  npm run generate:adapter -- angular --topic "Pipes" --variants "pure-pipe,impure-pipe"\n' +
    '  npm run generate:adapter -- angular --topic "Pipes" --variants "async-pipe"   # add to existing topic',
  );
  process.exit(1);
}

// ── Naming helpers ─────────────────────────────────────
const toPascalCase = (str) =>
  str.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());
const toCamelCase = (str) =>
  str.replace(/-\w/g, (m) => m[1].toUpperCase());
const toKebab = (str) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const pascalName = toPascalCase(pluginName);
const camelName = toCamelCase(pluginName);
const pluginDir = path.join(__dirname, "../src/plugins", pluginName);

// ── Validate plugin exists ────────────────────────────
if (!fs.existsSync(pluginDir)) {
  console.error(`Plugin "${pluginName}" not found at ${pluginDir}`);
  process.exit(1);
}

// ── Find adapters directory ───────────────────────────
// Modular plugins use {pluginName}-adapters/ or adapters/
let adaptersDir = path.join(pluginDir, `${pluginName}-adapters`);
if (!fs.existsSync(adaptersDir)) {
  adaptersDir = path.join(pluginDir, "adapters");
}
if (!fs.existsSync(adaptersDir)) {
  console.error(
    `No adapters directory found in ${pluginDir}.\n` +
    `Expected ${pluginName}-adapters/ or adapters/.\n` +
    "Is this a modular plugin?",
  );
  process.exit(1);
}
const adaptersDirName = path.basename(adaptersDir);

// ── Derive topic key and variant keys ─────────────────
const topicKey = toKebab(topicLabel);
const topicPrefix = topicKey.split("-").map(w => w[0]).join(""); // e.g. "view-encapsulation" → "ve"

let variantKeys;
if (variantsCsv) {
  variantKeys = variantsCsv.split(",").map((v) => v.trim()).filter(Boolean);
} else {
  variantKeys = [`${topicKey}-opt-1`, `${topicKey}-opt-2`];
}

// ── Read existing files ───────────────────────────────
const adapterIndexPath = path.join(adaptersDir, "index.ts");
const slicePath = path.join(pluginDir, `${camelName}Slice.ts`);
const flowEnginePath = path.join(pluginDir, "flow-engine.ts");

if (!fs.existsSync(adapterIndexPath)) {
  console.error(`Missing ${adapterIndexPath}`);
  process.exit(1);
}

let adapterIndex = fs.readFileSync(adapterIndexPath, "utf-8");
let sliceContent = fs.existsSync(slicePath) ? fs.readFileSync(slicePath, "utf-8") : null;
let flowEngine = fs.existsSync(flowEnginePath) ? fs.readFileSync(flowEnginePath, "utf-8") : null;

// ── Check if topic already exists ─────────────────────
const topicExists = adapterIndex.includes(`"${topicKey}"`);

// ── Check which variants already exist ────────────────
const newVariants = variantKeys.filter((vk) => !adapterIndex.includes(`"${vk}"`));
if (newVariants.length === 0) {
  console.error("All specified variants already exist in the adapter index. Nothing to do.");
  process.exit(0);
}

const existingVariants = variantKeys.filter((vk) => adapterIndex.includes(`"${vk}"`));
if (existingVariants.length > 0) {
  console.log(`  ℹ Skipping existing variants: ${existingVariants.join(", ")}`);
}

console.log("");

// ── 1. Create adapter files ──────────────────────────
const accentPairs = [
  ["#1e3a5f", "#3b82f6"],
  ["#064e3b", "#22c55e"],
  ["#4c1d95", "#a78bfa"],
  ["#713f12", "#eab308"],
  ["#7f1d1d", "#f87171"],
  ["#134e4a", "#2dd4bf"],
  ["#4a044e", "#e879f9"],
  ["#1e1b4b", "#818cf8"],
];

for (let i = 0; i < newVariants.length; i++) {
  const vk = newVariants[i];
  const varCamel = toCamelCase(vk) + "Adapter";
  const varLabel = vk.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const [fill, stroke] = accentPairs[i % accentPairs.length];
  const filePath = path.join(adaptersDir, `${vk}.ts`);

  if (fs.existsSync(filePath)) {
    console.log(`  ℹ File ${vk}.ts already exists, skipping`);
    continue;
  }

  const content = `import type { ${pascalName}Adapter } from "./types";
import type { ${pascalName}State } from "../${camelName}Slice";

export const ${varCamel}: ${pascalName}Adapter = {
  id: "${vk}",

  profile: {
    label: "${varLabel}",
    description: "Describe ${varLabel}'s approach.",
  },

  colors: {
    fill: "${fill}",
    stroke: "${stroke}",
  },

  computeMetrics(state: ${pascalName}State) {
    // TODO: compute real metrics for ${varLabel}
    void state;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expandToken(_token: string, _state: ${pascalName}State): string[] | null {
    return null;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFlowBeats(_state: ${pascalName}State) {
    return [];
  },

  buildTopology(builder, _state, helpers) {
    builder
      .node("node-a")
      .at(200, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-a") ? "${fill}" : "#0f172a")
      .stroke(helpers.hot("node-a") ? "${stroke}" : "#334155", 2)
      .label("${varLabel} — A", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .node("node-b")
      .at(650, 300)
      .rect(140, 60, 12)
      .fill(helpers.hot("node-b") ? "${fill}" : "#0f172a")
      .stroke(helpers.hot("node-b") ? "${stroke}" : "#334155", 2)
      .label("${varLabel} — B", { fill: "#fff", fontSize: 13, fontWeight: "bold" });

    builder
      .edge("node-a", "node-b", "edge-ab")
      .stroke("#475569", 2)
      .animate("flow", { duration: "3s" });
  },

  getStatBadges(_state: ${pascalName}State) {
    return [
      { label: "Variant", value: "${varLabel}", color: "${stroke}" },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  softReset(_state: ${pascalName}State) {
    // TODO: reset per-pass state
  },
};
`;
  fs.writeFileSync(filePath, content);
}
console.log(`  ✔ Created ${newVariants.length} adapter file(s): ${newVariants.map((v) => v + ".ts").join(", ")}`);

// ── 2. Update adapters/index.ts ──────────────────────

// 2a. Add imports for new adapters (before the topic definitions comment)
const importLines = newVariants.map((vk) => {
  const varCamel = toCamelCase(vk) + "Adapter";
  return `import { ${varCamel} } from "./${vk}";`;
}).join("\n");

const importAnchor = "/* ── Topic definitions";
if (adapterIndex.includes(importAnchor)) {
  adapterIndex = adapterIndex.replace(importAnchor, importLines + "\n\n" + importAnchor);
} else {
  // Fallback: insert after the last existing import
  const lastImportIdx = adapterIndex.lastIndexOf("import ");
  const lineEnd = adapterIndex.indexOf("\n", lastImportIdx);
  adapterIndex = adapterIndex.slice(0, lineEnd + 1) + importLines + "\n" + adapterIndex.slice(lineEnd + 1);
}

// 2b. Add to TopicKey union if new topic
if (!topicExists) {
  const topicKeyRegex = /(export type TopicKey\s*=[\s\S]*?)(;\s*\n)/;
  const tkMatch = adapterIndex.match(topicKeyRegex);
  if (tkMatch) {
    adapterIndex = adapterIndex.replace(
      topicKeyRegex,
      tkMatch[1] + `\n  | "${topicKey}"` + tkMatch[2],
    );
  }
}

// 2c. Add TOPICS entry if new topic
if (!topicExists) {
  const topicsArrayEnd = /(\n\];[\s\S]*?\/\* ── Adapter registry)/;
  const topicsMatch = adapterIndex.match(topicsArrayEnd);
  if (topicsMatch) {
    const topicEntry =
      `  {\n` +
      `    id: "${topicKey}",\n` +
      `    label: "${topicLabel}",\n` +
      `    variants: [${variantKeys.map((v) => `"${v}"`).join(", ")}],\n` +
      `    defaultVariant: "${variantKeys[0]}",\n` +
      `  },\n`;
    adapterIndex = adapterIndex.replace(
      topicsArrayEnd,
      "\n" + topicEntry + "];" + "\n\n" + topicsMatch[1].replace(/^\n\];/, ""),
    );
  } else {
    // Simpler fallback: insert before the closing ];
    const closingBracket = adapterIndex.lastIndexOf("];", adapterIndex.indexOf("ADAPTERS"));
    if (closingBracket !== -1) {
      const topicEntry =
        `  {\n` +
        `    id: "${topicKey}",\n` +
        `    label: "${topicLabel}",\n` +
        `    variants: [${variantKeys.map((v) => `"${v}"`).join(", ")}],\n` +
        `    defaultVariant: "${variantKeys[0]}",\n` +
        `  },\n`;
      adapterIndex = adapterIndex.slice(0, closingBracket) + topicEntry + adapterIndex.slice(closingBracket);
    }
  }
} else {
  // Topic exists — add new variants to its variants array
  for (const vk of newVariants) {
    // Find the topic entry and its variants array
    const topicEntryRegex = new RegExp(
      `(id:\\s*"${topicKey}"[\\s\\S]*?variants:\\s*\\[)([^\\]]*)(\\])`,
    );
    const teMatch = adapterIndex.match(topicEntryRegex);
    if (teMatch) {
      adapterIndex = adapterIndex.replace(
        topicEntryRegex,
        teMatch[1] + teMatch[2].trimEnd() + `, "${vk}"` + teMatch[3],
      );
    }
  }
}

// 2d. Add to ADAPTERS record
const adaptersRecordEnd = /(\n\};[\s\S]*?export function getAdapter)/;
const arMatch = adapterIndex.match(adaptersRecordEnd);
if (arMatch) {
  const adapterEntries = newVariants.map((vk) => {
    const varCamel = toCamelCase(vk) + "Adapter";
    return `  "${vk}": ${varCamel},`;
  }).join("\n");
  adapterIndex = adapterIndex.replace(
    adaptersRecordEnd,
    "\n" + adapterEntries + arMatch[0],
  );
} else {
  // Fallback: find the }; before getAdapter
  const getAdapterIdx = adapterIndex.indexOf("export function getAdapter");
  if (getAdapterIdx !== -1) {
    const closingIdx = adapterIndex.lastIndexOf("};", getAdapterIdx);
    if (closingIdx !== -1) {
      const adapterEntries = newVariants.map((vk) => {
        const varCamel = toCamelCase(vk) + "Adapter";
        return `  "${vk}": ${varCamel},`;
      }).join("\n");
      adapterIndex = adapterIndex.slice(0, closingIdx) + adapterEntries + "\n" + adapterIndex.slice(closingIdx);
    }
  }
}

fs.writeFileSync(adapterIndexPath, adapterIndex);
console.log(`  ✔ Updated ${adaptersDirName}/index.ts (imports, ${topicExists ? "variants" : "topic + variants"}, ADAPTERS)`);

// ── 3. Update slice — VariantKey union ───────────────
if (sliceContent) {
  const variantKeyRegex = /(export type VariantKey\s*=[\s\S]*?)(;\s*\n)/;
  const vkMatch = sliceContent.match(variantKeyRegex);
  if (vkMatch) {
    const newEntries = newVariants.map((vk) => `  | "${vk}"`).join("\n");
    sliceContent = sliceContent.replace(
      variantKeyRegex,
      vkMatch[1] + "\n" + newEntries + vkMatch[2],
    );
    fs.writeFileSync(slicePath, sliceContent);
    console.log(`  ✔ Updated ${camelName}Slice.ts (added ${newVariants.length} VariantKey(s))`);
  } else {
    console.log(`  ⚠ Could not find VariantKey union in ${camelName}Slice.ts — update manually`);
  }
}

// ── 4. Update flow-engine — StepKey + STEPS ──────────
if (flowEngine && !topicExists) {
  // 4a. Add step keys for the new topic
  const stepKeyRegex = /(export type StepKey\s*=[\s\S]*?)(;\s*\n)/;
  const skMatch = flowEngine.match(stepKeyRegex);
  if (skMatch) {
    const newStepKeys =
      `\n  /* ${topicLabel} */\n` +
      `  | "${topicPrefix}-demonstrate"\n` +
      `  | "${topicPrefix}-summary"`;
    flowEngine = flowEngine.replace(
      stepKeyRegex,
      skMatch[1] + newStepKeys + skMatch[2],
    );
  }

  // 4b. Add STEPS entries before the closing ];
  //     Find the last step entry's closing brace+comma, then the ];
  const stepsClose = flowEngine.lastIndexOf("];", flowEngine.indexOf("export function buildSteps"));
  if (stepsClose !== -1) {
    const stepBlock =
      `  // ── ${topicLabel} steps ──\n` +
      `  {\n` +
      `    key: "${topicPrefix}-demonstrate",\n` +
      `    label: "Demonstrate",\n` +
      `    when: (s) => s.topic === "${topicKey}",\n` +
      `    processingText: "Running…",\n` +
      `    nextButtonColor: "#2563eb",\n` +
      `    phase: "processing",\n` +
      `    flow: (s) => getAdapter(s.variant).getFlowBeats(s),\n` +
      `    recalcMetrics: true,\n` +
      `    explain: (s) => {\n` +
      `      const adapter = getAdapter(s.variant);\n` +
      `      return \`\${adapter.profile.label} in action.\`;\n` +
      `    },\n` +
      `  },\n` +
      `  {\n` +
      `    key: "${topicPrefix}-summary",\n` +
      `    label: "Summary",\n` +
      `    when: (s) => s.topic === "${topicKey}",\n` +
      `    phase: "summary",\n` +
      `    explain: () => "${topicLabel} complete. Try another variant or topic.",\n` +
      `  },\n`;
    flowEngine = flowEngine.slice(0, stepsClose) + stepBlock + flowEngine.slice(stepsClose);
  }

  fs.writeFileSync(flowEnginePath, flowEngine);
  console.log(`  ✔ Updated flow-engine.ts (added StepKey + STEPS for "${topicLabel}")`);
} else if (flowEngine && topicExists) {
  console.log(`  ℹ Topic "${topicKey}" already in flow-engine.ts — steps unchanged (add manually if needed)`);
} else {
  console.log(`  ⚠ No flow-engine.ts found — skip step generation`);
}

// ── Summary ──────────────────────────────────────────
console.log("");
console.log(`✔ Added ${newVariants.length} adapter(s) to "${pluginName}" under topic "${topicLabel}"\n`);
console.log("  Files created:");
for (const vk of newVariants) {
  console.log(`    • ${adaptersDirName}/${vk}.ts`);
}
console.log("");
console.log("  Files updated:");
console.log(`    • ${adaptersDirName}/index.ts`);
if (sliceContent) console.log(`    • ${camelName}Slice.ts`);
if (flowEngine && !topicExists) console.log(`    • flow-engine.ts`);
console.log("");
console.log("  Next steps:");
console.log(`    1. Implement computeMetrics(), buildTopology(), getFlowBeats() in each adapter`);
if (!topicExists) {
  console.log(`    2. Add per-topic state fields in ${camelName}Slice.ts`);
  console.log(`    3. Customise step labels/phases in flow-engine.ts`);
  console.log(`    4. Add "${topicLabel}" to TOPIC_QUESTIONS in main.tsx`);
  console.log(`    5. Add concept pills for the new topic in concepts.tsx`);
} else {
  console.log(`    2. Wire any new state fields needed for these variants`);
  console.log(`    3. Add concept pills for the new variants in concepts.tsx`);
}
console.log("");
