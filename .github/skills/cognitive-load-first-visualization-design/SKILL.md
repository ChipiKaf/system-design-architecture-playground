---
name: cognitive-load-first-visualization-design
description: "Apply cognitive load theory and evidence-based visualization design before building any feature, update, or plugin in the VizCraft playground builder. Use to shape scene structure, animation, labels, interaction, and progressive disclosure so demos remain understandable, low-friction, and instructionally clear."
license: Complete terms in LICENSE.txt
---

# Cognitive-Load-First Visualization Design

If a visualization teaches, explains, or simulates, cognitive load is part of the implementation.

## Use this before implementation, not after

Run this skill before:

- building a new plugin
- changing an existing plugin
- adding a new feature
- revising a scene
- introducing a new animation
- adding controls, labels, overlays, metrics, or callouts
- changing layout, color, or flow structure

Do not treat clarity as polish.
It is part of correctness.

## Design for working memory limits

People can only track a small number of meaningful items at once.

That means every plugin should deliberately control:

- how many concepts are visible at once
- how many active motion paths run at once
- how many labels compete for attention
- how many decisions the user must make in one step
- how many states are shown simultaneously

If the scene requires the viewer to decode too many things at once, reduce it before building.

## Separate intrinsic complexity from avoidable complexity

Some topics are naturally complex.
That is fine.

What is not fine is adding extra burden through:

- clutter
- decorative noise
- repeated labels
- split legends and far-away explanations
- too many colors
- too many simultaneous animations
- multiple competing visual encodings
- controls that appear before they are needed
- showing advanced states before the base mental model is formed

Do not make the learner pay for design decisions.

## Treat each plugin as a guided mental model

A plugin is not just a render.
It is a sequence for building understanding.

Before implementing, define:

- the single core idea the plugin teaches
- the minimum concepts needed for that idea
- the order in which those concepts should appear
- which parts should remain backgrounded until later
- which state transitions deserve emphasis

For every plugin, be able to answer:

1. What should the user understand first?
2. What should they ignore at first?
3. What changes over time?
4. What must stay visually stable?
5. What should be remembered after the final step?

If those answers are unclear, the plugin is not ready to build.

## Build in layers, not all at once

Prefer progressive disclosure.

Good sequence:

1. show the stable structure
2. highlight one active path or concept
3. animate one transition
4. confirm the outcome
5. move to the next concept
6. end with a summary state

Bad sequence:

- full architecture
- all labels
- all counters
- all paths
- all overlays
- all animations
- all explanations
- all controls

A scene should reveal meaning in stages.

## Prefer strong visual encodings

Use encodings that are fast to read.

Prefer:

- position
- alignment
- length
- proximity
- enclosure
- simple motion along a clear path
- direct labels near the thing they describe

Be careful with:

- area
- angle
- dense color-only distinction
- decorative gradients
- 3D styling
- overlapping paths
- ambiguous arrows
- labels that require cross-referencing

If two things must be compared, make the comparison visually immediate.

## Keep text integrated with the visual

Do not force users to bounce between:

- a node and a distant explanation
- a signal and a separate legend
- a chart and a detached caption
- a state and a hidden tooltip when the meaning is essential

Put essential meaning close to the mark.

Use:

- direct labels
- inline badges
- near-node annotations
- local captions
- step-level explanation tied to the active area

Use tooltips for enrichment, not for core understanding.

## Animate with intent

Animation should explain change, not decorate it.

Before adding animation, define:

- what state change it represents
- why motion helps more than static display
- what the start and end states are
- whether the user can still follow it at normal speed
- whether multiple motions can be split into smaller phases

Prefer:

- one primary motion at a time
- short transitions with obvious direction
- stable resting states between phases
- pulsing only for brief emphasis
- parallel animation only when parallelism is the concept

Avoid:

- constant motion
- unrelated pulse effects
- multiple competing flows
- motion that starts before the viewer has orientation
- animation that hides the final state too quickly

Motion should reduce explanation effort.

## Preserve anchors across steps

Users learn faster when some elements remain stable while one thing changes.

Keep stable where possible:

- major layout regions
- node positions
- group locations
- color meanings
- control placement
- step order
- primary labels

Change only what matters for the current explanation.

Do not reorganize the whole scene between steps unless that reorganization is the lesson.

## Reduce split attention in builder scenes

In VizCraft-based demos, split attention often appears when:

- labels are far from nodes
- stats are disconnected from the active animation
- controls appear in one place while effects happen elsewhere
- a legend is required to decode obvious states
- several panels must be mentally merged

Before implementing, ask:

- Can the user understand the active event without scanning the entire canvas?
- Can the meaning be read locally?
- Is the current step visually obvious?
- Are inactive regions visually quiet?

If not, restructure first.

## Make inactive elements recede

Not everything deserves equal emphasis.

Background elements should look like background elements.

Use this intentionally:

- desaturated or softer strokes for inactive paths
- reduced contrast for non-active nodes
- stronger contrast only on the active path
- subtle labels for context, stronger labels for current focus
- persistent but quiet stats
- minimal secondary ornamentation

Visual hierarchy is part of teaching.

## Keep scene density honest

Every plugin should have a density budget.

Before implementation, estimate:

- number of persistent nodes
- number of simultaneously visible edges
- number of simultaneous labels
- number of simultaneous signals
- number of controls shown at once
- number of stats cards shown at once

If a scene exceeds what can be scanned comfortably, split it into:

- steps
- modes
- tabs
- overlays
- collapsible detail
- secondary views

Do not solve overload by shrinking everything.

## Design steps around one question each

Each step should answer one main question.

Examples:

- What are the core actors?
- How does an event enter the system?
- How is routing decided?
- Who consumes what?
- What persists?
- What gets broadcast?

If one step answers three questions, split it.

Step titles, button labels, and processing text should reinforce the single question being answered.

## Use plugin contracts to enforce clarity

Every plugin should declare its cognitive structure, not just its reducer and component.

Before implementing, define:

- learning goal
- primary entities
- active path per step
- stable anchors
- optional detail layers
- summary state
- restart behavior
- controls that are safe before step 0 only
- controls that can be changed mid-flow without confusion

Do not let plugin structure drift away from explanation structure.

## Review the scene before coding

Write a short pre-implementation scene brief:

- Core concept:
- Viewer level:
- First thing shown:
- Final takeaway:
- Stable anchors:
- Active elements per step:
- Hidden until needed:
- Motion purpose:
- Essential labels:
- Optional tooltip details:
- Possible overload risks:
- Simplifications chosen:

If you cannot write this clearly, do not start implementation yet.

## Apply these rules to VizCraft plugins

For plugins like event streaming, queueing, workflows, orchestration, retries, or distributed systems:

- show the architecture skeleton first
- animate one event before showing bursts
- keep producers, brokers, consumers, and sinks spatially stable
- use color to distinguish role, not to encode everything
- keep counters secondary to the flow
- make the currently active path visually dominant
- keep advanced metadata quiet until the base model lands
- use bursts only after the single-event story is understood
- make fan-out and load-balancing visually distinct
- let resting states confirm what just happened

The viewer should never have to infer the lesson from chaos.

## Add pre-implementation checks

Before building any feature, update, or new plugin, verify:

- the main idea fits in one sentence
- each step teaches one thing
- there is a clear visual hierarchy
- essential text is integrated with the scene
- the chosen encoding is easy to read
- animation has instructional purpose
- inactive information is de-emphasized
- controls do not introduce premature complexity
- summary state reinforces the mental model
- the scene can be understood without tooltips alone

If any of these fail, redesign before coding.

## Expected output from the AI

When using this skill for a new feature, update, or plugin:

- produce a pre-implementation cognitive-load review
- identify overload risks before coding
- propose a step sequence
- define stable anchors and active elements
- recommend visual encodings
- recommend label and annotation placement
- decide what should be static, animated, or hidden
- simplify the scene before implementation starts
- align controls and stats with the teaching goal
- flag anything that should be split into separate steps or plugins

## Avoid

- Building first and cleaning up later
- Showing the entire system at full intensity immediately
- Parallel motion when the lesson is sequential
- Core meaning hidden in tooltips
- Legends required for basic understanding
- Decorative motion
- Color doing all the work
- Dense overlays on top of dense topology
- Changing layout between steps without reason
- Adding a feature or plugin without a cognitive-load review first

Clarity is a build-time requirement.
For the VizCraft playground builder, every feature, update, and plugin should pass this skill before implementation begins.
