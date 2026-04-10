# Steady Gray

Paragraph optical density equalization — measure actual glyph area per line via canvas and adjust letter-spacing or word-spacing to bring every line to the same visual weight. The even grey of a well-set paragraph.

**[steadygray.com](https://steadygray.com)** · [npm](https://www.npmjs.com/package/@liiift-studio/steadygray) · [GitHub](https://github.com/Liiift-Studio/SteadyGray)

---

## Install

```bash
npm install @liiift-studio/steadygray
```

---

## Usage

### React component

```tsx
import { GrayValueText } from '@liiift-studio/steadygray'

<GrayValueText targetDensity="auto" method="letter-spacing">
  Your paragraph text here...
</GrayValueText>
```

### React hook

```tsx
import { useGrayValue } from '@liiift-studio/steadygray'

function Paragraph({ children }) {
  const ref = useGrayValue({ targetDensity: 'auto', maxAdjustment: 0.05 })
  return <p ref={ref}>{children}</p>
}
```

### Vanilla JS

```ts
import { applyGrayValue, getCleanHTML } from '@liiift-studio/steadygray'

const el = document.querySelector('p')
const originalHTML = getCleanHTML(el)

applyGrayValue(el, originalHTML, { targetDensity: 'auto' })
```

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lineDetection` | `'bcr' \| 'canvas'` | `'bcr'` | Line detection method — `'bcr'` reads browser layout; `'canvas'` uses `@chenglou/pretext` for zero-reflow resize |
| `targetDensity` | `number \| 'auto'` | `'auto'` | Target optical density ratio (0–1). `'auto'` uses the average of all measured lines |
| `method` | `'letter-spacing' \| 'word-spacing'` | `'letter-spacing'` | CSS spacing property to adjust per line |
| `maxAdjustment` | `number` | `0.05` | Maximum spacing adjustment in em units |
| `tolerance` | `number` | `0.01` | Acceptable density difference before a line is considered equalized |
| `calibrationFactor` | `number` | `2.0` | em spacing change per 1.0 density unit difference |

---

## Dev notes

### `next` in root devDependencies

`package.json` at the repo root lists `next` as a devDependency. This is a **Vercel detection workaround** — not a real dependency of the npm package. Vercel's build system inspects the root `package.json` to detect the framework; without `next` present it falls back to a static build and skips the Next.js pipeline, breaking the `/site` subdirectory deploy.

The package itself has zero runtime dependencies. Do not remove this entry.

---

Current version: v1.0.0
