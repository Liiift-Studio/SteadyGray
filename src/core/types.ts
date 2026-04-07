// gray-value/src/core/types.ts — types and class constants

/** Options controlling the gray-value density-equalization algorithm */
export interface GrayValueOptions {
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
}

/** CSS class names injected by gray-value — use these to target generated markup */
export const GRAY_VALUE_CLASSES = {
	word: 'gv-word',
	line: 'gv-line',
	probe: 'gv-probe',
} as const
