// gray-value/src/core/types.ts — types and class constants
export interface GrayValueOptions {
	// targetDensity (0–1 ratio, default auto-detect from first line)
	// method ('letter-spacing' | 'word-spacing' | 'wdth')
	// maxAdjustment (em)
	// fontUrl (path to font file for opentype.js parsing)
}

/** CSS class names injected by gray-value — use these to target generated markup */
export const GRAY_VALUE_CLASSES = {
	word: 'gray-value-word',
	line: 'gray-value-line',
	probe: 'gray-value-probe',
} as const
