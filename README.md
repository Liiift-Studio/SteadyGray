# gray-value

> Paragraph optical density equalization — measure actual glyph area per line and equalize visual density across all lines

## Concept

For each line, sum the filled area of every glyph (bezier paths via opentype.js / Canvas). Divide by lineWidth × lineHeight to get a true optical density ratio. Equalize: adjust letter-spacing, word-spacing, or wdth per-line to bring all lines to the same target density. What hand compositors call 'color' — no digital tool does this automatically.

## Install

```bash
npm install gray-value
```

## Usage

### React

```tsx
import { GrayValueText } from 'gray-value'

<GrayValueText>
  Your paragraph text here.
</GrayValueText>
```

### Vanilla JS

```ts
import { applyGrayValue, getCleanHTML } from 'gray-value'

const el = document.querySelector('p')
const original = getCleanHTML(el)
applyGrayValue(el, original, { /* options */ })
```

## Options

| Option | Description |
|--------|-------------|
| `targetDensity` | 0–1 ratio, default auto-detect from first line |
| `method` | 'letter-spacing' | 'word-spacing' | 'wdth' |
| `maxAdjustment` | em |
| `fontUrl` | path to font file for opentype.js parsing |

## Development

```bash
npm install
npm test
npm run build
```

---

Part of the [Liiift Studio](https://liiift.studio) typography tools family.
See also: [Ragtooth](https://ragtooth.liiift.studio)
