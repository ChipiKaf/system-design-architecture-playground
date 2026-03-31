# Copilot Instructions — VizCraft Playground Builder

This repository prioritizes **cognitive clarity over implementation speed**.

All generated code, suggestions, and changes must follow **cognitive-load-first visualization design**.

---

## 🚨 Mandatory Rule: Design Before Code

Before implementing **any** of the following:

- new plugin
- feature addition
- UI change
- animation change
- step flow update
- visualization logic

You MUST first produce a **Cognitive Load Review**.

If this step is skipped, the implementation is incorrect.

---

## 🧠 Cognitive Load Review (Required)

Before writing code, define:

### 1. Core Concept

- What is the ONE idea this plugin or feature teaches?

### 2. Step Sequence

- Break into steps where each step answers ONE question
- Avoid multi-concept steps

### 3. Stable Anchors

- What stays visually fixed across steps?
  - node positions
  - layout regions
  - colors
  - labels

### 4. Active Elements Per Step

- What is the SINGLE focus per step?
- What is animated vs static?

### 5. Hidden vs Visible

- What is:
  - shown immediately
  - revealed later
  - never needed

### 6. Motion Justification

- Why is animation needed?
- What state change does it explain?

### 7. Overload Risks

Identify and reduce:

- too many simultaneous animations
- too many labels
- cluttered topology
- competing visual encodings
- split attention (far labels, legends, etc.)

---

## 🧩 Plugin Design Rules

All plugins must follow these principles:

### 1. Progressive Disclosure

- Start simple
- Add complexity step-by-step
- Never show everything at once

### 2. One Active Story at a Time

- Only ONE primary animation or flow per step

### 3. Stable Layout

- Do NOT move nodes between steps unless necessary for meaning

### 4. Visual Hierarchy

- Active elements = high emphasis
- Inactive elements = backgrounded

### 5. Local Understanding

- Users should not scan the whole screen to understand a step
- Avoid:
  - distant legends
  - disconnected labels
  - cross-referencing

### 6. Animation Discipline

- Animation must explain change
- Avoid decorative or constant motion

### 7. Density Control

If too many elements are visible:

- split into steps
- hide secondary info
- reduce simultaneous signals

---

## 🧪 Step Design Requirements

Each step must:

- have a clear purpose
- highlight a single concept
- maintain visual continuity
- end in a stable state

Bad:

- multiple simultaneous concepts
- multiple competing animations

Good:

- sequential, layered understanding

---

## 🏗️ Implementation Guidance

When generating code for plugins:

### DO:

- align `getSteps()` with cognitive sequence
- ensure each step maps to one concept
- keep reducer state minimal and focused
- structure components around:
  - stable layout
  - dynamic highlights
- isolate animation logic per step

### DO NOT:

- couple multiple concepts into one step
- introduce unnecessary UI controls
- render all states simultaneously
- animate everything at once

---

## 🎨 Visualization Rules (VizCraft)

When using VizCraft:

### Prefer:

- position and layout for meaning
- proximity for grouping
- direct labels near elements
- clear directional flows

### Avoid:

- encoding meaning only with color
- overlapping or ambiguous paths
- excessive visual effects
- noisy backgrounds

---

## 🔁 Example: Event Streaming Plugin

Correct approach:

1. Show architecture (static)
2. Animate single event flow
3. Show partitioning
4. Show load balancing
5. Show fan-out
6. Show burst
7. Summarize

Incorrect approach:

- show all producers, partitions, consumers, stats, and bursts at once

---

## ✅ Pre-Implementation Checklist

Before writing code, confirm:

- [ ] core concept is clearly defined
- [ ] steps are sequential and simple
- [ ] only one focus per step
- [ ] layout is stable
- [ ] animation has purpose
- [ ] no unnecessary elements are shown
- [ ] labels are local and clear
- [ ] scene is not visually overloaded

---

## 🧠 Guiding Principle

> If a user has to "figure out" the visualization, it is incorrectly designed.

Clarity is not polish — it is a requirement.

---

## ⚠️ Enforcement

If a generated solution violates these principles:

- it must be redesigned before implementation
- do NOT patch complexity with more UI or explanations
- simplify the visualization instead

---

## Expected Copilot Behavior

When assisting:

- propose a Cognitive Load Review first
- challenge overly complex designs
- simplify aggressively
- structure solutions around step-based understanding
- prioritize learning clarity over feature completeness
