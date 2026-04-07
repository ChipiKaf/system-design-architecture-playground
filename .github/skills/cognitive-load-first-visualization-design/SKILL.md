---
name: cognitive-load-first-visualization-design
description: Use cognitive load and visualization rules before building VizCraft scenes, steps, labels, motion, and controls.
license: Complete terms in LICENSE.txt
---

# Cognitive-Load-First Visualization Design

Use this before any new plugin, scene, animation, label, overlay, control, or layout change.

Cognitive load is part of correctness. If the scene is hard to decode, redesign it before coding.

## Core rules

- One core idea per plugin or step.
- Show only the concepts needed for the current step.
- Keep anchors stable: major regions, node positions, control placement, and color meaning.
- Reveal meaning in stages: skeleton -> one active path -> one transition -> result -> summary.
- Put essential labels next to the thing they describe; use tooltips for extras only.
- Prefer strong encodings first: position, alignment, length, proximity, enclosure.
- Animate only when motion explains change. One primary motion at a time.
- Dim inactive elements so the active path stands out.
- Avoid split attention: no distant legends, far-away captions, or dense overlays.
- If the scene feels crowded, split it into steps, modes, or overlays instead of shrinking everything.

## VizCraft-specific

- Show the architecture skeleton first.
- Animate one event before bursts or fan-out.
- Keep producers, brokers, consumers, and sinks spatially stable.
- Use color for role, not as the only encoding.
- Keep counters secondary to the flow.

## Before implementation

Write a short scene brief:

- Core concept:
- Viewer level:
- First thing shown:
- Final takeaway:
- Stable anchors:
- Active elements per step:
- Hidden until needed:
- Motion purpose:
- Essential labels:
- Overload risks:
- Simplifications chosen:

If any of these are unclear, redesign before building.

## Avoid

- Showing the full system at full intensity up front.
- Parallel motion for sequential lessons.
- Color doing all the work.
- Decorative or constant motion.
- Core meaning hidden in tooltips.
- Layout changes without instructional reason.
- Building first and cleaning up later.
