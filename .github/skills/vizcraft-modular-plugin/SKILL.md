---
name: vizcraft-modular-plugin
description: "Build modular VizCraft plugins with topic + variant adapter architecture. Use when the user asks for a modular, topic-based, or Angular-style plugin; use for --modular generator output, topic dropdowns, variant buttons, and independent adapter files. Do not use for sandbox, comparison-lab, or standard linear plugins. Keep each step singular: one thing or one movement at a time."
---

# VizCraft Modular Plugin

Use this for VizCraft plugins that organise content into topics (interview questions, categories, concerns) with multiple variants per topic, each implemented as an independent adapter.

This extends vizcraft-playground. Keep the base skill for plugin anatomy, builder API, signals, mounting, and SCSS. Use this file only for modular-specific rules.

## When to use

- The plugin covers a broad domain with distinct sub-topics.
- Each topic has multiple approaches, patterns, or options to explore.
- Controls need a topic selector (dropdown) and variant buttons.
- You want independent adapter files per variant rather than inlined logic.
- The Angular plugin is the reference implementation.

## Generator

Use npm argument passthrough:

```bash
npm run generate -- my-plugin --modular --category "My Category"
```

## Modular plugin shape

A modular plugin uses these files:

| File                           | Purpose                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `{name}Slice.ts`               | `TopicKey`, `VariantKey`, topic/variant state, `setTopic`/`setVariant` reducers, metrics, `resetFlags()` |
| `flow-engine.ts`               | Topic-scoped steps with `when` guards, token expansion via adapters                                      |
| `use{Name}Animation.ts`        | Thin `useLabAnimation` wrapper (~30 lines)                                                               |
| `main.tsx`                     | Scene with `TOPIC_QUESTIONS`, topic-aware subtitle, adapter-delegated topology                           |
| `controls.tsx`                 | Topic `<select>` dropdown + variant buttons for the active topic                                         |
| `concepts.tsx`                 | Concept definitions                                                                                      |
| `index.ts`                     | Plugin registration with Controls wired                                                                  |
| `main.scss`                    | Styles including dropdown and button groups                                                              |
| `{name}-adapters/types.ts`     | Adapter interface contract                                                                               |
| `{name}-adapters/index.ts`     | `TopicKey`, `TopicDef`, `TOPICS` array, `ADAPTERS` registry, `getAdapter()`                              |
| `{name}-adapters/{variant}.ts` | One file per variant implementing the adapter interface                                                  |

## Key abstractions

### TopicKey and VariantKey

```typescript
export type TopicKey = "topic-a" | "topic-b";
export type VariantKey =
  | "topic-a-opt-1"
  | "topic-a-opt-2"
  | "topic-b-opt-1"
  | "topic-b-opt-2";
```

`TopicKey` groups related variants. `VariantKey` uniquely identifies each adapter. Both are union types in the slice.

### TopicDef and TOPICS array

```typescript
export interface TopicDef {
  id: TopicKey;
  label: string;
  variants: VariantKey[];
  defaultVariant: VariantKey;
}

export const TOPICS: TopicDef[] = [
  {
    id: "topic-a",
    label: "Topic A",
    variants: ["topic-a-opt-1", "topic-a-opt-2"],
    defaultVariant: "topic-a-opt-1",
  },
  {
    id: "topic-b",
    label: "Topic B",
    variants: ["topic-b-opt-1", "topic-b-opt-2"],
    defaultVariant: "topic-b-opt-1",
  },
];
```

This is the single source of truth for which variants belong to which topic. Controls and the slice both read from `TOPICS`.

### Adapter interface

Each variant is a file in `{name}-adapters/` implementing:

```typescript
interface Adapter {
  id: VariantKey;
  profile: { label: string; description: string };
  colors: { fill: string; stroke: string };
  computeMetrics(state: State): void; // mutate draft state
  expandToken(token: string, state: State): string[] | null;
  getFlowBeats(state: State): FlowBeat[];
  buildTopology(builder, state, helpers): void;
  getStatBadges(state: State): StatBadge[];
  softReset(state: State): void;
}
```

### ADAPTERS registry

```typescript
const ADAPTERS: Record<VariantKey, Adapter> = { ... };
export function getAdapter(key: VariantKey): Adapter { return ADAPTERS[key]; }
```

## Topic-scoped steps with `when` guards

Steps in `flow-engine.ts` use `when` to filter by current topic:

```typescript
{
  key: "ta-demonstrate",
  label: "Demonstrate",
  when: (s) => s.topic === "topic-a",
  flow: (s) => getAdapter(s.variant).getFlowBeats(s),
  recalcMetrics: true,
  explain: (s) => {
    const adapter = getAdapter(s.variant);
    return `${adapter.profile.label} in action.`;
  },
},
```

The shared `buildSteps(state)` filters out steps whose `when` returns false, so only steps for the active topic appear.

## Controls pattern

Controls render a topic dropdown and variant buttons:

```tsx
<select onChange={(e) => dispatch(setTopic(e.target.value as TopicKey))}>
  {TOPICS.map((t) => (
    <option key={t.id} value={t.id}>
      {t.label}
    </option>
  ))}
</select>;

{
  activeTopic.variants.map((vk) => (
    <button
      key={vk}
      className={`controls__btn${st.variant === vk ? " controls__btn--active" : ""}`}
      onClick={() => dispatch(setVariant(vk))}
    >
      {getAdapter(vk).profile.label}
    </button>
  ));
}
```

When `setTopic` fires, the slice should also update `variant` to the new topic's `defaultVariant` and call `resetFlags()`.

## TOPIC_QUESTIONS pattern

In `main.tsx`, define a record mapping topics to interview-style questions:

```typescript
const TOPIC_QUESTIONS: Record<TopicKey, string> = {
  "topic-a": "How does Topic A work?",
  "topic-b": "Explain Topic B's approach.",
};
```

Display the active question in the subtitle or sidebar to give context for each walkthrough.

## Core rules

- Keep variant logic in adapters, not scattered in the scene or slice.
- The TOPICS array is the source of truth for topic → variant mapping.
- Use `getAdapter(state.variant)` everywhere instead of switch statements.
- Each adapter file is self-contained: metrics, topology, flow beats, stat badges.
- Reset flags and step state when switching topics or variants.
- One step = one idea or one movement. Split multi-transition steps.
- Steps with `when` guards only show for the matching topic — don't duplicate logic.
- The animation hook stays thin; all variant-specific logic lives in adapters.

## Common mistakes

- Inlining variant logic in main.tsx instead of the adapter.
- Forgetting to update `variant` to `defaultVariant` when switching topics.
- Not calling `resetSimulation()` after topic or variant changes.
- Defining steps without `when` guards that should be topic-scoped.
- Putting topic-specific state in generic fields instead of per-topic fields.
- Making the TOPICS array and slice TopicKey drift out of sync.

## Adding topics and adapters incrementally

After the initial scaffold, use the adapter generator to add topics or variants without manual wiring:

```bash
# New topic with two variants
npm run generate:adapter -- my-plugin --topic "View Encapsulation" --variants "emulated,shadow-dom"

# Add a variant to an existing topic
npm run generate:adapter -- my-plugin --topic "View Encapsulation" --variants "none-encap"
```

The script creates adapter files and updates `adapters/index.ts`, the slice's `VariantKey` union, and `flow-engine.ts` (StepKey + STEPS for new topics). You still need to implement the adapter logic and add `TOPIC_QUESTIONS`/concepts manually.

## Build checklist

1. Run `npm run generate -- my-plugin --modular --category "Category"`.
2. Rename `TopicKey` and `VariantKey` values to match your domain.
3. Rename adapter files to match variant names.
4. Define `TOPICS` array with real topics and variants in `adapters/index.ts`.
5. Add per-topic state fields in the slice and wire `resetFlags()`.
6. Implement each adapter: `computeMetrics`, `buildTopology`, `getFlowBeats`, `expandToken`, `getStatBadges`, `softReset`.
7. Add per-topic steps with `when` guards in `flow-engine.ts`.
8. Add `TOPIC_QUESTIONS` entries in `main.tsx`.
9. Add concept pills and definitions in `concepts.tsx`.
10. Test topic switching, variant switching, replay, and step progression.

## Reference implementation

The Angular plugin (`src/plugins/angular/`) is the canonical modular plugin:

- 7 topics × 18 total variants
- `adapters/index.ts` defines `TOPICS` and `ADAPTERS`
- `controls.tsx` has topic dropdown + variant buttons
- `flow-engine.ts` has 35 step keys with per-topic `when` guards
- Each adapter file implements the full interface independently
