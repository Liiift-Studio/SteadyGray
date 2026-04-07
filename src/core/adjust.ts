// gray-value/src/core/adjust.ts — canvas-based optical density equalization algorithm
import { GRAY_VALUE_CLASSES, type GrayValueOptions } from './types'

/** Resolved defaults applied when options are omitted */
const DEFAULTS = {
	targetDensity: 'auto' as const,
	method: 'letter-spacing' as const,
	maxAdjustment: 0.05,
	tolerance: 0.01,
	calibrationFactor: 2.0,
}

/**
 * Returns the computed font string suitable for use as Canvas ctx.font.
 * Canvas does not support font-variation-settings, so we approximate using
 * numeric font-weight. Relative density comparisons remain consistent across
 * lines because all lines use the same font string.
 *
 * @param el - Element whose computed styles are read
 */
function getCanvasFontStyle(el: HTMLElement): string {
	const style = getComputedStyle(el)
	const weight = style.fontWeight
	const size = style.fontSize
	// Take only the first font-family entry, stripping quotes
	const family = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim()
	return `${weight} ${size} ${family}`
}

/**
 * Measures the optical density (ink pixel ratio) of a single line of text
 * by rendering it to a Canvas and counting non-white pixels.
 *
 * Returns a value in [0, 1] where 0 = no ink and 1 = fully black.
 *
 * @param text        - The text content of the line
 * @param fontStyle   - Canvas-compatible font string (e.g. "400 18px Georgia")
 * @param targetWidth - Width of the canvas in CSS pixels
 * @param lineHeight  - Height of the canvas in CSS pixels
 * @param canvas      - Canvas element to render into (reused across calls)
 */
export function measureLineDensity(
	text: string,
	fontStyle: string,
	targetWidth: number,
	lineHeight: number,
	canvas: HTMLCanvasElement,
): number {
	const ctx = canvas.getContext('2d')
	if (!ctx) return 0

	canvas.width = Math.max(1, Math.ceil(targetWidth))
	canvas.height = Math.max(1, Math.ceil(lineHeight))

	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = 'white'
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.fillStyle = 'black'
	ctx.font = fontStyle
	// Approximate baseline at 75% of line height
	ctx.fillText(text, 0, canvas.height * 0.75)

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
	const data = imageData.data

	let inkPixels = 0
	const totalPixels = canvas.width * canvas.height

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i]
		const g = data[i + 1]
		const b = data[i + 2]
		// Count as ink if significantly darker than white (threshold: 200)
		if (r < 200 || g < 200 || b < 200) inkPixels++
	}

	return totalPixels > 0 ? inkPixels / totalPixels : 0
}

/**
 * Returns the innerHTML of an element with all gray-value injected spans removed,
 * unwrapping their children in place. Safe for complex markup. Idempotent.
 *
 * @param el - Element that may contain gray-value markup
 */
export function getCleanHTML(el: HTMLElement): string {
	const clone = el.cloneNode(true) as HTMLElement
	const gvSpans = clone.querySelectorAll(
		`.${GRAY_VALUE_CLASSES.word}, .${GRAY_VALUE_CLASSES.line}`,
	)
	gvSpans.forEach((node) => {
		const parent = node.parentNode
		if (!parent) return
		while (node.firstChild) parent.insertBefore(node.firstChild, node)
		parent.removeChild(node)
	})
	// Also remove any injected <br> elements between lines
	clone.querySelectorAll('br[data-gv-break]').forEach((br) => br.remove())
	return clone.innerHTML
}

/**
 * Applies gray-value optical density equalization to an element.
 *
 * Algorithm (7 passes):
 *  1. Reset — restore original HTML
 *  2. Word wrap — wrap each word in a gv-word span
 *  3. Read phase — group words into visual lines via BCR
 *  4. Measure — render each line to Canvas and compute density ratio
 *  5. Target — compute target density (average or user-specified)
 *  6. Adjust — calculate per-line letter-spacing via linear approximation
 *  7. Write — rebuild HTML with gv-line spans carrying adjusted spacing
 *
 * Note: binary-search refinement of the spacing value is a future enhancement.
 * The linear approximation (calibrationFactor × density delta) is sufficient for v1
 * because relative density comparison between lines is what matters most.
 *
 * @param element      - Live DOM element to adjust (must be rendered and visible)
 * @param originalHTML - HTML snapshot taken before the first adjustment run
 * @param options      - GrayValueOptions (merged with defaults)
 * @param _canvas      - Optional injectable Canvas for testing (creates one if absent)
 */
export function applyGrayValue(
	element: HTMLElement,
	originalHTML: string,
	options: GrayValueOptions = {},
	_canvas?: HTMLCanvasElement,
): void {
	if (typeof window === 'undefined') return

	// Save scroll position — iOS Safari does not support overflow-anchor: none
	const scrollY = window.scrollY

	// Resolve options
	const targetDensityOpt = options.targetDensity ?? DEFAULTS.targetDensity
	const method = options.method ?? DEFAULTS.method
	const maxAdjustment = options.maxAdjustment ?? DEFAULTS.maxAdjustment
	const calibrationFactor = options.calibrationFactor ?? DEFAULTS.calibrationFactor

	// --- Pass 1: Reset ---
	element.innerHTML = originalHTML

	if (!element.offsetWidth) {
		// Element is not laid out — restore scroll and return gracefully
		requestAnimationFrame(() => {
			if (Math.abs(window.scrollY - scrollY) > 2) {
				window.scrollTo({ top: scrollY, behavior: 'instant' })
			}
		})
		return
	}

	const containerWidth = element.offsetWidth
	const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16
	const fontStyle = getCanvasFontStyle(element)

	// --- Pass 2: Word wrap ---
	// Recursive childNodes traversal (not createTreeWalker — happy-dom bug).
	// Each text node is split into word spans so BCR-based line detection works.
	const textNodes: Text[] = []
	;(function collectTextNodes(node: Node) {
		if (node.nodeType === Node.TEXT_NODE) {
			textNodes.push(node as Text)
		} else {
			node.childNodes.forEach(collectTextNodes)
		}
	})(element)

	const wordSpans: HTMLElement[] = []

	for (const textNode of textNodes) {
		const text = textNode.textContent ?? ''
		if (!text.trim()) continue

		const tokens = text.split(/(\S+)/)
		const fragment = document.createDocumentFragment()

		for (let i = 0; i < tokens.length; i += 2) {
			const space = tokens[i]       // whitespace before this word
			const word  = tokens[i + 1]   // the word itself
			if (!word) continue

			const isLastWord = tokens[i + 3] === undefined
			const trailingSpace = isLastWord ? (tokens[i + 2] ?? '') : ''

			const span = document.createElement('span')
			span.className = GRAY_VALUE_CLASSES.word
			span.style.cssText = 'display:inline-block;white-space:nowrap;'
			span.appendChild(document.createTextNode(space + word + trailingSpace))
			fragment.appendChild(span)
			wordSpans.push(span)
		}

		textNode.parentNode!.replaceChild(fragment, textNode)
	}

	if (wordSpans.length === 0) {
		// Nothing to process — restore scroll and return
		requestAnimationFrame(() => {
			if (Math.abs(window.scrollY - scrollY) > 2) {
				window.scrollTo({ top: scrollY, behavior: 'instant' })
			}
		})
		return
	}

	// --- Pass 3: Read phase — group word spans into visual lines ---
	// Each word's BCR.top identifies which visual row it sits on.
	// We batch all reads here before any writes.
	interface LineData {
		/** Raw text content of the line (spaces collapsed) */
		text: string
		/** Rendered width of the line in CSS pixels */
		width: number
		/** Rendered height (line-height) in CSS pixels */
		height: number
		/** The word span elements belonging to this line */
		spans: HTMLElement[]
	}

	const lines: LineData[] = []
	let currentTop: number | null = null
	let currentLine: LineData | null = null

	for (const span of wordSpans) {
		const bcr = span.getBoundingClientRect()
		// Round to nearest pixel to absorb subpixel jitter between words on the same row
		const top = Math.round(bcr.top)

		if (currentTop === null || top !== currentTop) {
			currentTop = top
			currentLine = {
				text: '',
				width: bcr.width,
				height: bcr.height || fontSize,
				spans: [span],
			}
			lines.push(currentLine)
		} else {
			currentLine!.width += bcr.width
			if (bcr.height > currentLine!.height) currentLine!.height = bcr.height
			currentLine!.spans.push(span)
		}
	}

	// Build text content per line from span text
	for (const line of lines) {
		line.text = line.spans.map((s) => s.textContent ?? '').join('').trim()
	}

	if (lines.length === 0) {
		requestAnimationFrame(() => {
			if (Math.abs(window.scrollY - scrollY) > 2) {
				window.scrollTo({ top: scrollY, behavior: 'instant' })
			}
		})
		return
	}

	// --- Pass 4: Measure density per line ---
	const canvas: HTMLCanvasElement = _canvas ?? document.createElement('canvas')

	const densities: number[] = lines.map((line) =>
		measureLineDensity(
			line.text,
			fontStyle,
			containerWidth,
			line.height || fontSize,
			canvas,
		),
	)

	// --- Pass 5: Calculate target density ---
	let targetDensity: number
	if (typeof targetDensityOpt === 'number') {
		targetDensity = targetDensityOpt
	} else {
		// 'auto' — use the average density across all lines
		const sum = densities.reduce((acc, d) => acc + d, 0)
		targetDensity = densities.length > 0 ? sum / densities.length : 0
	}

	// --- Pass 6: Calculate per-line spacing adjustment (linear approximation) ---
	// delta = (target - density) * calibrationFactor
	// Positive delta → line is too sparse → increase spacing
	// Negative delta → line is too dense → decrease spacing
	// Clamped to ±maxAdjustment em.
	const adjustments: number[] = densities.map((density) => {
		const delta = (targetDensity - density) * calibrationFactor
		return Math.max(-maxAdjustment, Math.min(maxAdjustment, delta))
	})

	// --- Pass 7: Write — rebuild HTML with gv-line spans ---
	// Reset to original HTML, then re-wrap into line spans.
	// Each line gets its own span with the computed spacing applied.
	element.innerHTML = originalHTML

	const LINE_STYLE = 'display:inline-block;white-space:nowrap;vertical-align:top;'

	let html = ''
	lines.forEach((line, i) => {
		const adj = adjustments[i]
		const spacingProp = method === 'word-spacing' ? 'word-spacing' : 'letter-spacing'
		const lineStyle = `${LINE_STYLE}${spacingProp}:${adj}em;`

		// Reconstruct line text from spans; trim leading whitespace on each line start
		const lineText = line.spans
			.map((s, si) => {
				const t = s.textContent ?? ''
				return si === 0 ? t.replace(/^[^\S\u00a0]+/, '') : t
			})
			.join('')

		html += `<span class="${GRAY_VALUE_CLASSES.line}" style="${lineStyle}">${lineText}</span>`
		if (i < lines.length - 1) {
			html += `<br data-gv-break="1">`
		}
	})

	element.innerHTML = html

	// Restore scroll position after DOM mutations
	requestAnimationFrame(() => {
		if (Math.abs(window.scrollY - scrollY) > 2) {
			window.scrollTo({ top: scrollY, behavior: 'instant' })
		}
	})
}

/**
 * Remove gray-value markup and restore original HTML.
 *
 * @param element      - Element previously adjusted by applyGrayValue
 * @param originalHTML - The clean HTML snapshot passed to applyGrayValue
 */
export function removeGrayValue(element: HTMLElement, originalHTML: string): void {
	element.innerHTML = originalHTML
}
