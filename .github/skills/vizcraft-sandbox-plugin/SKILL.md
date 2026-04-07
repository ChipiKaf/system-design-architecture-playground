---
name: vizcraft-sandbox-plugin
description: Build sandbox-style VizCraft plugins with dynamic components, declarative flow steps, capacity/prerequisite rules, and adaptive scenes.
---

# VizCraft Sandbox Plugin

Use this for sandbox-style VizCraft plugins where users add or remove components and the step narrative adapts.

This extends vizcraft-playground. Keep the base skill for plugin anatomy, builder API, signals, mounting, and SCSS. Use this file only for sandbox-specific rules.

## When to use

- The scene has togglable infrastructure components.
- Steps, layout, or metrics change based on enabled components.
- A Controls panel adds or removes entities.
- Capacity or throughput depends on composition.

## Generator

Use npm argument passthrough:

```bash
npm run generate -- my-plugin --sandbox --category "My Category"
```

## Sandbox shape

A sandbox plugin uses 8 files:

- flow-engine.ts: source of truth for STEPS, FlowBeat, token expansion.
- index.ts: registration and buildSteps(state).
- {name}Slice.ts: components, prerequisites, cascades, capacity.
- use{Name}Animation.ts: generic executor.
- main.tsx: dynamic scene builder.
- controls.tsx: Controls slot UI.
- concepts.tsx: concept definitions.
- main.scss: styles.

## Flow engine rules

- Define steps as data, not switches.
- Every step owns a unique signal path; never reuse the same from -> to in another step.
- Use $tokens for dynamic node sets and expand them at runtime.
- Keep buildSteps(state) as the filter/label layer: hide inactive steps and derive the next button from the next active step when needed.
- Keep executeFlow() generic: expand tokens, build cartesian-product pairs, patch hot zones, animate parallel signals, then apply the step explanation.

Minimal shapes:

```ts
FlowBeat: { from, to, when?, duration?, explain? }
StepDef: { key, label, when?, nextButton?, phase?, flow?, delay?, recalcMetrics?, finalHotZones?, explain?, action? }
```

## Generic animation hook order

1. reset or special action
2. early metric recompute
3. set phase
4. set hot zones for static steps
5. run flow beats
6. recompute after flow
7. optional delay
8. final hot zones
9. final explanation

Rules:

- Switch on currentKey, not step index.
- Use runtimeRef.current inside async code.
- Include currentKey in effect deps.

## Dynamic state

- Components can have prerequisites and cascade removals.
- extraServers-style counts are numeric when a component can repeat.
- Capacity should be derived from the current component set.
- Throughput should compare demand vs capacity, not capped throughput vs capacity.

## Controls and scene layout

- Render plugin.Controls through the Shell slot.
- Toggles should expose add/remove labels, optional prerequisites, and multi-instance support.
- Call resetSimulation() after every component toggle.
- Build the scene with a tracker such as nextY so conditional nodes do not break layout.
- Let edges adapt to topology; do not hardcode a single path if LB, cache, or DB may appear or disappear.
- Use .image() with position: "center" and offset inside the node; avoid left/right placement outside the node.

## Common mistakes

- Repeating the same signal path in multiple steps.
- Animating by step index instead of StepKey.
- Hardcoding collection lengths or edge counts.
- Forgetting cascaded removals.
- Forgetting runtimeRef.current in async animation code.
- Rendering demand as a capped throughput ratio.
- Leaving layout or controls unchanged when components change.

## Build checklist

- Run npm run generate -- my-plugin --sandbox --category "Category".
- Define components, prerequisites, and cascade rules.
- Write capacity metrics.
- Define unique STEPS entries.
- Map $tokens in expandToken.
- Make controls reset the simulation.
- Keep the scene adaptive.
- Test add/remove flows and step list updates.
