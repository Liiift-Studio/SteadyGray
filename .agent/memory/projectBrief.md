---
name: project-brief
description: Core identity, scope, and constraints for gray-value
type: project
---

# gray-value — Project Brief

## Identity
- **Package name**: `gray-value`
- **Version**: 0.0.1 (pre-release)
- **Author**: Quinn Keaveney / Liiift Studio

## What It Is
For each line, sum the filled area of every glyph (bezier paths via opentype.js / Canvas). Divide by lineWidth × lineHeight to get a true optical density ratio. Equalize: adjust letter-spacing, word-spacing, or wdth per-line to bring all lines to the same target density. What hand compositors call 'color' — no digital tool does this automatically.

## What It Is Not
- Not a general animation library
- Not a CSS preprocessor
- Not a font loading utility

## API Surface (target)
Options: targetDensity, method, maxAdjustment, fontUrl

## Constraints
- Framework-agnostic core (vanilla JS)
- Optional React bindings (peer deps)
- SSR safe (guard typeof window)
- Zero required dependencies (opentype.js optional)
- TypeScript strict mode

## Status
Bootstrap complete. Algorithm not yet implemented.
See PROCESS.md for the build guide.
