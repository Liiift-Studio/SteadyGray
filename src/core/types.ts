// steadyGray/src/core/types.ts — types and class constants

/** Options controlling the gray-value density-equalization algorithm */
export interface GrayValueOptions {
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
	 * Which CSS spacing property to adjust per line.
	 * Default: 'letter-spacing'.
	 */
	method?: 'letter-spacing' | 'word-spacing'

	/**
	 * Maximum spacing adjustment in em units.
	 * Positive and negative adjustments are both clamped to this magnitude.
	 * Default: 0.05
	 */
	maxAdjustment?: number

	/**
	 * Acceptable density difference before a line is considered equalized.
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
}

/** CSS class names injected by gray-value — use these to target generated markup */
export const GRAY_VALUE_CLASSES = {
	word: 'gv-word',
	line: 'gv-line',
	probe: 'gv-probe',
} as const
