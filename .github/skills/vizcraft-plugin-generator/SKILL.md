---
name: vizcraft-plugin-generator
description: Read before generating or scaffolding any VizCraft plugin. Use when starting a new plugin or choosing a generator mode; the only supported start is `npm run generate -- <plugin-name> ...`.
---

# VizCraft Plugin Generator

Use this before creating a new VizCraft plugin.

Start every plugin with the generator script. Do not hand-create plugin folders.

```bash
npm run generate -- <plugin-name> --category "Category Name" [--sandbox | --timeline | --comparison]
```

Modes:

- default: standard plugin
- `--sandbox`: dynamic controls + declarative flow engine
- `--timeline`: progressive reveal timeline
- `--comparison`: shared lab-engine comparison lab

After generation, use the matching plugin skill.
