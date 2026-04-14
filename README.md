# Steady Gray

Compositors call it colour — the aggregate grey of a text block. When some lines are denser than others, the paragraph looks uneven. Steady Gray measures ink pixel density per line by rendering to an off-screen Canvas, then adjusts letter-spacing until every line matches the target. Even colour, line by line.

**[steadygray.com](https://steadygray.com)** · [npm](https://www.npmjs.com/package/@liiift-studio/steadygray) · [GitHub](https://github.com/Liiift-Studio/SteadyGray)

TypeScript · Canvas pixel sampling · React + Vanilla JS

---

## Install

```bash
npm install @liiift-studio/steadygray
```

---

## Usage

> **Next.js App Router:** this library uses browser APIs. Add `"use client"` to any component file that imports from it.

### React component

```tsx
import { GrayValueText } from '@liiift-studio/steadygray'

<GrayValueText maxAdjustment={0.05} calibrationFactor={2} linePreservation="scale">
  Your paragraph text here...
</GrayValueText>
```

`linePreservation="scale"` prevents line overflow by applying a `scaleX` transform after the spacing correction. Omit it if slight overflow is acceptable (e.g. when the element already has `overflow-x: hidden`).

### React hook

```tsx
import { useGrayValue } from '@liiift-studio/steadygray'

// Inside a React component:
const ref = useGrayValue({ maxAdjustment: 0.05, calibrationFactor: 2 })
return <p ref={ref}>{children}</p>
```

The hook re-runs automatically on resize via `ResizeObserver` and after fonts load via `document.fonts.ready`.

### Vanilla JS

```ts
import { applyGrayValue, removeGrayValue, getCleanHTML } from '@liiift-studio/steadygray'

const el = document.querySelector('p')
const original = getCleanHTML(el)
const opts = { maxAdjustment: 0.05, calibrationFactor: 2 }

function run() {
  applyGrayValue(el, original, opts)
}

run()
document.fonts.ready.then(run)

const ro = new ResizeObserver(() => run())
ro.observe(el)

// Later — disconnect and restore original markup:
// ro.disconnect()
// removeGrayValue(el, original)
```

### TypeScript

```ts
import type { GrayValueOptions } from '@liiift-studio/steadygray'

const opts: GrayValueOptions = { targetDensity: 0.35, maxAdjustment: 0.05, linePreservation: 'scale' }
```

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `targetDensity` | `'auto'` | Target optical density ratio (0–1). `'auto'` uses the average of all measured lines |
| `method` | `'letter-spacing'` | CSS spacing property to adjust per line: `'letter-spacing'` or `'word-spacing'` |
| `maxAdjustment` | `0.05` | Maximum spacing correction in em units. Positive and negative adjustments are both clamped to this value |
| `tolerance` | `0.01` | Minimum density difference before a correction is applied. Lines within this threshold of the target are left untouched |
| `calibrationFactor` | `2` | Correction strength — em spacing change per 1.0 density unit difference. Increase for more aggressive corrections |
| `lineDetection` | `'bcr'` | `'bcr'` reads actual browser layout — ground truth, works with any font and inline HTML. `'canvas'` uses `@chenglou/pretext` for arithmetic line breaking with no forced reflow on resize (`npm install @chenglou/pretext`). Falls back to `'bcr'` while pretext loads |
| `linePreservation` | `'none'` | `'none'` — line widths vary with the spacing correction (bounded by `maxAdjustment`). `'scale'` — applies a `scaleX` transform after correction so every line occupies exactly its original width; the density difference remains visible in glyph spacing but no line ever overflows the container |
| `as` | `'p'` | HTML element to render. *(React component only)* |

---

## How it works

Each detected line of text is rendered to an off-screen Canvas at the correct font size, weight, and family. The raw pixel data (`getImageData`) is read and ink pixels are counted — any pixel with alpha above a threshold is considered ink. The ratio of ink pixels to total pixels is the line's optical density. The average across all lines becomes the target (or you can set `targetDensity` manually). Each line then receives a `letter-spacing` (or `word-spacing`) correction proportional to its deviation from the target, clamped to `maxAdjustment`. The correction re-runs on resize and after fonts finish loading (`document.fonts.ready`).

**Line break safety:** Line breaks are always derived from the browser's natural layout — each run starts from the original HTML snapshot, detects lines at zero spacing, then locks them with `white-space: nowrap`. Word breaks never change as a result of the density correction.

**Width overflow:** The spacing correction intentionally changes each line's visual width. The maximum change is `maxAdjustment × characterCount`. At the default `maxAdjustment: 0.05em` and 60 characters per line at 16px, peak overflow is approximately 48px. Use `linePreservation: 'scale'` to prevent overflow entirely, or add `overflow-x: hidden` to the element's CSS if a small amount of clipping is acceptable.

---

## Dev notes

### `next` in root devDependencies

`package.json` at the repo root lists `next` as a devDependency. This is a **Vercel detection workaround** — not a real dependency of the npm package. Vercel's build system inspects the root `package.json` to detect the framework; without `next` present it falls back to a static build and skips the Next.js pipeline, breaking the `/site` subdirectory deploy.

The package itself has zero runtime dependencies. Do not remove this entry.

---

## Future improvements

- **Variable axis equalization** — use `wght` or `wdth` instead of letter-spacing as the equalization mechanism, for fonts where spacing is less flexible than weight
- **Dark mode awareness** — invert the pixel-counting logic when rendering on a dark background, so the density measurement is consistent regardless of color scheme
- **Configurable canvas DPR** — allow overriding the device pixel ratio used for the measurement canvas, to trade accuracy for performance on high-density displays
- **Iterative convergence** — apply corrections in multiple passes until all lines converge within `tolerance`, rather than a single-pass linear estimate
- **Per-paragraph target** — `measureLineDensity` is exported as a low-level canvas primitive; a high-level `measureDensity(el)` wrapper that takes just an element would allow cross-paragraph normalization without manually building font strings and canvas contexts

---

Current version: v1.1.8
