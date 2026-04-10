---
name: vizcraft-plugin-generator
description: Read before generating or scaffolding any VizCraft plugin. Use when starting a new plugin or choosing a generator mode; the only supported start is `npm run generate -- <plugin-name> ...`.
---

# VizCraft Plugin Generator

Use this before creating a new VizCraft plugin.

Start every plugin with the generator script. Do not hand-create plugin folders.

```bash
npm run generate -- <plugin-name> --category "Category Name" [--sandbox | --timeline | --comparison | --modular]
```

Modes:

- default: standard plugin
- `--sandbox` / `-s`: dynamic controls + declarative flow engine
- `--timeline` / `-t`: progressive reveal timeline
- `--comparison` / `-l`: shared lab-engine comparison lab
- `--modular` / `-m`: topic + variant adapter architecture (Angular-style)

Modes are mutually exclusive — use exactly one or none.

## Adding adapters to a modular plugin

After scaffolding a `--modular` plugin, use the adapter generator to add new topics or variants:

```bash
# Add a new topic with variants
npm run generate:adapter -- <plugin-name> --topic "Topic Label" --variants "var-a,var-b"

# Add a variant to an existing topic
npm run generate:adapter -- <plugin-name> --topic "Existing Topic" --variants "new-var"

# Omit --variants for two default placeholders
npm run generate:adapter -- <plugin-name> --topic "Topic Label"
```

This creates adapter files, updates `adapters/index.ts` (imports, TOPICS, ADAPTERS), adds to the `VariantKey` union in the slice, and adds step keys + STEPS entries in `flow-engine.ts` for new topics.

After generation, use the matching plugin skill:

| Mode           | Skill                          |
| -------------- | ------------------------------ |
| default        | vizcraft-playground            |
| `--sandbox`    | vizcraft-sandbox-plugin        |
| `--timeline`   | vizcraft-playground            |
| `--comparison` | vizcraft-comparison-lab-plugin |
| `--modular`    | vizcraft-modular-plugin        |
