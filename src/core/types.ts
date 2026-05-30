// steadyGray/src/core/types.ts — types and class constants

/** Options controlling the gray-value density-equalization algorithm */
export interface GrayValueOptions {
	/** When false, skip all processing and restore original HTML. Default: true */
	active?: boolean
	/**
	 * Density measurement method. Default: 'canvas'
	 *
	 * - **'canvas'** (default) — renders each line to an off-screen canvas and counts ink pixels.
	 *   Fast and works with any font. Accuracy is affected by antialiasing and subpixel rendering.
	 *
	 * - **'glyph-path'** — loads the font binary via `opentype.js`, extracts each glyph's bezier
	 *   path, and computes the true filled area using the shoelace formula. Font-exact: independent
	 *   of rendering engine, antialiasing, or display DPR. Requires the font to be served from the
	 *   same origin (CORS) and the `opentype.js` package: `npm install opentype.js`.
	 *   Falls back to 'canvas' if `opentype.js` is not installed or the font cannot be loaded.
	 */
	densityMode?: 'canvas' | 'glyph-path'
	/**
	 * URL of the font file to use for glyph-path measurement.
	 * Required when `densityMode: 'glyph-path'`. Ignored in canvas mode.
	 * Must be same-origin or CORS-enabled. Supports OTF, TTF, WOFF, WOFF2.
	 */
	fontUrl?: string
	/**
	 * Line detection method. Default: 'bcr'
	 *
	 * - **'bcr'** (default) — uses `getBoundingClientRect()` on injected word spans.
	 *   Ground truth: reads actual browser layout, handles all inline HTML and any font.
	 *
	 * - **'canvas'** — uses `@chenglou/pretext` canvas measurement for arithmetic line
	 *   breaking. No forced reflow on resize. Requires `@chenglou/pretext` to be installed.
	 *   Falls back to 'bcr' on the first render while pretext loads.
	 *   Avoid with `system-ui` font (canvas resolves differently on macOS).
	 */
	lineDetection?: 'bcr' | 'canvas'
	/**
	 * Target optical density ratio (0–1).
	 * 'auto' = average of all measured line densities (default).
	 */
	targetDensity?: number | 'auto'

	/**
	 * Which CSS property to adjust per line. Default: 'letter-spacing'.
	 *
	 * - **'letter-spacing'** (default) — adjusts inter-character spacing in em units.
	 * - **'word-spacing'** — adjusts inter-word spacing in em units.
	 * - **'font-weight'** — adjusts font weight per line. `maxAdjustment` is in weight
	 *   units (e.g. 100 = ±100 weight from the base). Requires a font with a wght axis
	 *   or multiple weight variants. Set `calibrationFactor` to ~500–2000 and
	 *   `maxAdjustment` to ~50–200 for visible results.
	 * - **'font-width'** — adjusts the `wdth` variable font axis per line via
	 *   `font-variation-settings`. `maxAdjustment` is in wdth units (e.g. 20 = ±20).
	 *   Requires a font with a wdth axis. Set `calibrationFactor` to ~300–1000 and
	 *   `maxAdjustment` to ~10–40 for visible results. Note: applying per-line
	 *   `font-variation-settings` replaces any inherited `font-variation-settings` on
	 *   that line span, so other axes (wght, opsz) will not be inherited.
	 */
	method?: 'letter-spacing' | 'word-spacing' | 'font-weight' | 'font-width'

	/**
	 * Maximum adjustment magnitude — unit depends on `method`:
	 * - letter-spacing / word-spacing: em units. Default: 0.05
	 * - font-weight: weight units (e.g. 100 = ±100). Default when weight mode: 100
	 * - font-width: wdth axis units (e.g. 20 = ±20). Default when width mode: 20
	 *
	 * Positive and negative adjustments are both clamped to this magnitude.
	 */
	maxAdjustment?: number

	/**
	 * Minimum calibrated adjustment magnitude below which no spacing change is applied.
	 * The comparison is against `(density - target) * calibrationFactor`, so the
	 * effective density threshold scales with `calibrationFactor`. At the default
	 * calibrationFactor of 2.0, a tolerance of 0.01 suppresses density deltas smaller
	 * than 0.005. Increase to suppress more corrections; decrease for finer sensitivity.
	 * Default: 0.01
	 */
	tolerance?: number

	/**
	 * Linear scaling factor: em spacing change per 1.0 density unit difference.
	 * Increase to apply stronger corrections, decrease to be more conservative.
	 * Default: 2.0
	 */
	calibrationFactor?: number
	/**
	 * Line width preservation strategy after the spacing correction is applied. Default: 'none'
	 *
	 * Density equalization adjusts letter-spacing per line, which alters each line's visual width.
	 * Lines that receive positive spacing grow wider than the container; lines that receive
	 * negative spacing leave a gap. Both are bounded by `maxAdjustment`.
	 *
	 * - **'none'** (default) — no compensation. Line widths vary up to ±maxAdjustment × charCount.
	 *   Suitable when `maxAdjustment` is small (≤ 0.05em) and slight overflow is acceptable.
	 *
	 * - **'scale'** — after applying spacing, a CSS `scaleX` transform is added to each line so it
	 *   occupies exactly its original width. The density correction remains visible as a change in
	 *   glyph spacing ratio, but lines never overflow the container. Slightly alters glyph
	 *   proportions at large correction values.
	 */
	linePreservation?: 'none' | 'scale'

	/**
	 * Algorithm mode. Default: 'equalize'
	 *
	 * - **'equalize'** (default) — bring all lines toward the same target density.
	 *
	 * - **'readability'** — per-line cognitive complexity weighting. Instead of
	 *   targeting the same density on every line, complex lines (long words / high
	 *   syllable count) receive a higher spacing target so the algorithm opens them
	 *   up slightly more. Simple lines receive a lower target. The paragraph looks
	 *   nearly uniform but is reading-optimized rather than purely optically even.
	 */
	mode?: 'equalize' | 'readability'

	/**
	 * Complexity metric used in readability mode. Default: 'word-length'
	 *
	 * - **'word-length'** — average characters per word (zero deps, effective).
	 * - **'syllable'** — average syllables per word. Requires `npm install syllable`.
	 *   Falls back to 'word-length' if not installed.
	 * - **'pos'** — content vs function word ratio. Not yet implemented; falls back
	 *   to 'word-length'. Reserved for a future version with the `compromise` package.
	 */
	complexity?: 'word-length' | 'syllable' | 'pos'

	/**
	 * How aggressively to weight complex lines in readability mode. Range 0–1.
	 * At 0: same as 'equalize'. At 1: maximum complexity weighting.
	 * Default: 0.5
	 */
	strength?: number
}

/** CSS class names injected by gray-value — use these to target generated markup */
export const GRAY_VALUE_CLASSES = {
	word: 'gv-word',
	line: 'gv-line',
	probe: 'gv-probe',
} as const
