---
name: vizcraft-comparison-lab-plugin
description: Build comparison-lab VizCraft plugins that compare variants or strategies with the shared lab-engine. Use when the user asks for a lab, comparison, or trade-off plugin; use for --comparison generator output, variant profiles, and shared flow execution. Do not use for sandbox or standard linear plugins.
---

# VizCraft Comparison Lab Plugin

Use this for VizCraft plugins that compare variants, strategies, or architecture options side by side.

This extends vizcraft-playground. Keep the base skill for plugin anatomy, builder API, signals, mounting, and SCSS. Use this file only for comparison-lab specific rules.

## When to use

- The user asks for a lab or comparison plugin.
- The demo compares variants, strategies, or trade-offs.
- A shared lab-engine should drive the animation.
- Variant-specific controls are needed.

## Generator

Use npm argument passthrough:

```bash
npm run generate -- my-plugin --comparison --category "My Category"
```

## Comparison lab shape

A comparison lab plugin uses these files:

- flow-engine.ts: step config, variant keys, token expansion, buildSteps.
- index.ts: plugin registration.
- {name}Slice.ts: variant state, profiles, metrics, reset / variant switching.
- use{Name}Animation.ts: thin wrapper around `useLabAnimation`.
- controls.tsx: variant selector panel.
- main.tsx: scene that adapts to the active variant.
- concepts.tsx: concept definitions.
- main.scss: styles.

## Core rules

- Keep variant logic in the slice and flow-engine, not spread across the scene.
- Use `VariantKey` and `VARIANT_PROFILES` as the source of truth for labels, colors, and descriptions.
- Define steps as data and give each step a unique flow path.
- Use the shared `lib/lab-engine` executor instead of writing per-step animation switches.
- Reset or soft-reset when switching variants so step state stays valid.
- Keep controls simple: one button per variant, with the active variant highlighted.
- Keep the scene structurally similar across variants so the comparison is obvious.
- Make metrics, explanations, and hot zones reflect the selected variant.

## Common mistakes

- Reusing the same flow path in multiple steps.
- Putting variant logic in the React scene instead of the slice / flow-engine.
- Forgetting to reset the run after changing variants.
- Letting controls or labels drift out of sync with `VARIANT_PROFILES`.
- Making each variant look so different that the comparison is harder to read.

## Build checklist

- Run `npm run generate -- my-plugin --comparison --category "Category"`.
- Define `VariantKey` and `VARIANT_PROFILES`.
- Add metrics and reset logic in the slice.
- Define steps and unique flows in `flow-engine.ts`.
- Keep the animation hook thin and generic.
- Build a stable scene that swaps details by variant.
- Add a simple controls panel for variant selection.
- Test variant switching, replay, and step progression.
