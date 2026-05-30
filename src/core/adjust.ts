// steadyGray/src/core/adjust.ts — canvas-based optical density equalization algorithm
import { GRAY_VALUE_CLASSES, type GrayValueOptions } from './types'

// ─── OpenType.js (optional peer dep for glyph-path mode) ──────────────────────

type OpentypeFont = {
	unitsPerEm: number
	charToGlyph: (ch: string) => OpentypeGlyph
}
type OpentypeGlyphPath = {
	commands: Array<
		| { type: 'M' | 'L'; x: number; y: number }
		| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
		| { type: 'Q'; x1: number; y1: number; x: number; y: number }
		| { type: 'Z' }
	>
}
type OpentypeGlyph = { path: OpentypeGlyphPath; advanceWidth: number }
type OpentypeModule = { load: (url: string, cb: (err: Error | null, font?: OpentypeFont) => void) => void }

let _opentype: OpentypeModule | null = null
let _opentypeLoading = false
const _fontCache = new Map<string, OpentypeFont | null>()

function tryLoadOpentype(): void {
	if (_opentype !== null || _opentypeLoading) return
	_opentypeLoading = true
	import(/* @vite-ignore */ 'opentype.js' as string)
		.then((m) => { _opentype = m as OpentypeModule })
		.catch(() => {
			console.warn('[steadygray] densityMode: "glyph-path" requires opentype.js — falling back to canvas')
		})
}

/**
 * Load an OpenType font from a URL and cache the result.
 * Calls `cb` with the font when ready, or null on error.
 */
function loadFont(url: string, cb: (font: OpentypeFont | null) => void): void {
	if (_fontCache.has(url)) { cb(_fontCache.get(url) ?? null); return }
	if (!_opentype) { cb(null); return }
	_opentype.load(url, (err, font) => {
		const result = err || !font ? null : font
		_fontCache.set(url, result)
		cb(result)
	})
}

/**
 * Compute the approximate filled area of a glyph path using the shoelace formula.
 * Cubic and quadratic bezier curves are approximated by sampling 8 points per segment.
 * Returns area in font units squared.
 *
 * @param glyph - opentype.js glyph with a .path.commands array
 */
function glyphPathArea(glyph: OpentypeGlyph): number {
	const commands = glyph.path.commands
	let area = 0
	let contourPoints: Array<[number, number]> = []
	let cx = 0, cy = 0 // current pen position

	const flushContour = () => {
		// Shoelace formula for a polygon
		const n = contourPoints.length
		if (n < 3) { contourPoints = []; return }
		let sum = 0
		for (let i = 0; i < n; i++) {
			const [x0, y0] = contourPoints[i]
			const [x1, y1] = contourPoints[(i + 1) % n]
			sum += x0 * y1 - x1 * y0
		}
		area += Math.abs(sum / 2)
		contourPoints = []
	}

	const STEPS = 8

	for (const cmd of commands) {
		if (cmd.type === 'M') {
			if (contourPoints.length > 0) flushContour()
			cx = cmd.x; cy = cmd.y
			contourPoints.push([cx, cy])
		} else if (cmd.type === 'L') {
			cx = cmd.x; cy = cmd.y
			contourPoints.push([cx, cy])
		} else if (cmd.type === 'C') {
			// Cubic bezier — sample STEPS intermediate points
			const x0 = cx, y0 = cy
			for (let s = 1; s <= STEPS; s++) {
				const t = s / STEPS
				const u = 1 - t
				const bx = u*u*u*x0 + 3*u*u*t*cmd.x1 + 3*u*t*t*cmd.x2 + t*t*t*cmd.x
				const by = u*u*u*y0 + 3*u*u*t*cmd.y1 + 3*u*t*t*cmd.y2 + t*t*t*cmd.y
				contourPoints.push([bx, by])
			}
			cx = cmd.x; cy = cmd.y
		} else if (cmd.type === 'Q') {
			// Quadratic bezier — sample STEPS intermediate points
			const x0 = cx, y0 = cy
			for (let s = 1; s <= STEPS; s++) {
				const t = s / STEPS
				const u = 1 - t
				const bx = u*u*x0 + 2*u*t*cmd.x1 + t*t*cmd.x
				const by = u*u*y0 + 2*u*t*cmd.y1 + t*t*cmd.y
				contourPoints.push([bx, by])
			}
			cx = cmd.x; cy = cmd.y
		} else if (cmd.type === 'Z') {
			flushContour()
		}
	}

	if (contourPoints.length > 0) flushContour()
	return area
}

/**
 * Measure line density using glyph path areas from an OpenType font.
 * Returns a value in [0, 1] where 0 = no ink and 1 = fully covered.
 *
 * @param text      - Text content of the line
 * @param font      - Loaded opentype.js font object
 * @param fontSize  - Rendered font size in CSS pixels
 * @param lineHeight - Rendered line height in CSS pixels
 */
function measureLineDensityGlyph(
	text: string,
	font: OpentypeFont,
	fontSize: number,
	lineHeight: number,
): number {
	const upm = font.unitsPerEm
	const scale = fontSize / upm
	const scale2 = scale * scale // area scales as the square of the linear scale

	let inkArea = 0
	let textWidth = 0

	for (const ch of text) {
		if (/\s/.test(ch)) continue
		const glyph = font.charToGlyph(ch)
		inkArea += glyphPathArea(glyph) * scale2
		textWidth += (glyph.advanceWidth ?? 0) * scale
	}

	if (textWidth <= 0 || lineHeight <= 0) return 0
	const totalArea = textWidth * lineHeight
	return Math.min(1, inkArea / totalArea)
}

// ─── Syllable (optional peer dep) ─────────────────────────────────────────────
type SyllableModule = { syllable: (word: string) => number } | { default: (word: string) => number }
let _syllable: ((word: string) => number) | null = null
let _syllableLoading = false

function tryLoadSyllable(): void {
	if (_syllable !== null || _syllableLoading) return
	_syllableLoading = true
	import(/* @vite-ignore */ 'syllable' as string)
		.then((m) => {
			const mod = m as SyllableModule
			_syllable = 'syllable' in mod ? mod.syllable : (mod as { default: (w: string) => number }).default
		})
		.catch(() => {
			console.warn('[steadygray] complexity: "syllable" requires the `syllable` package — falling back to "word-length"')
		})
}

// ─── Pretext (canvas line detection) ─────────────────────────────────────────

type PretextModule = {
	prepareWithSegments: (text: string, font: string) => unknown
	layoutWithLines: (prepared: unknown, maxWidth: number, lineHeight: number) => { lines: { text: string; width: number }[] }
}

let _pretext: PretextModule | null = null
let _pretextLoading = false

function tryLoadPretext(): void {
	if (_pretext !== null || _pretextLoading) return
	_pretextLoading = true
	import('@chenglou/pretext' as string)
		.then((m) => { _pretext = m as PretextModule })
		.catch(() => {
			console.warn('[steadygray] canvas lineDetection requires @chenglou/pretext — falling back to BCR')
		})
}

type PreparedEntry = { originalHTML: string; prepared: unknown }
const pretextCache = new WeakMap<HTMLElement, PreparedEntry>()

function getLineHeightPx(el: HTMLElement): number {
	const s = getComputedStyle(el)
	const lh = parseFloat(s.lineHeight)
	return isNaN(lh) ? parseFloat(s.fontSize) * 1.2 : lh
}

/** Resolved defaults applied when options are omitted */
const DEFAULTS = {
	targetDensity: 'auto' as const,
	method: 'letter-spacing' as const,
	maxAdjustment: 0.05,
	tolerance: 0.01,
	calibrationFactor: 2.0,
	mode: 'equalize' as const,
	complexity: 'word-length' as const,
	strength: 0.5,
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
 * Compute the relative luminance of an sRGB colour string (e.g. 'rgb(30, 30, 30)').
 * Returns a value in [0, 1] where 0 is black and 1 is white.
 * Used to detect dark-background contexts so canvas ink counting can be adapted.
 *
 * @param cssColor - Computed CSS color string from getComputedStyle
 */
function relativeLuminance(cssColor: string): number {
	const m = cssColor.match(/\d+/g)
	if (!m || m.length < 3) return 1 // default to light if unparseable
	const [r, g, b] = m.map((v) => {
		const c = parseInt(v, 10) / 255
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Measures the optical density (ink pixel ratio) of a single line of text
 * by rendering it to a Canvas and counting non-background pixels.
 *
 * The canvas is sized to the TEXT's own rendered width (via measureText), NOT the
 * container width. This gives the intrinsic character density of the line —
 * independent of whether the line is long or short. Using container width was
 * a bug: short lines would measure as sparse just because of trailing white space,
 * causing the algorithm to over-tighten them.
 *
 * Returns a value in [0, 1] where 0 = no ink and 1 = fully covered.
 *
 * @param text       - The text content of the line
 * @param fontStyle  - Canvas-compatible font string (e.g. "400 18px Georgia")
 * @param lineHeight - Height of the canvas in CSS pixels
 * @param canvas     - Canvas element to render into (reused across calls)
 * @param darkMode   - When true, text is drawn light-on-dark and light pixels are counted as ink
 */
export function measureLineDensity(
	text: string,
	fontStyle: string,
	lineHeight: number,
	canvas: HTMLCanvasElement,
	darkMode = false,
): number {
	// willReadFrequently tells Chrome to use a CPU-backed canvas for this context,
	// avoiding expensive GPU readback on each getImageData() call.
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return 0

	// Measure text width first — font must be set before measureText for accurate metrics.
	// Canvas width is set to the text's own rendered width, not the container width.
	// This normalizes density to the character ink area, not the full column area.
	ctx.font = fontStyle
	const textWidth = ctx.measureText(text).width
	if (textWidth <= 0) return 0

	// Scale canvas by devicePixelRatio so text renders at full resolution on retina displays.
	// Without this, text at 2× DPR renders at half size → wrong density readings.
	const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
	canvas.width = Math.max(1, Math.ceil(textWidth * dpr))
	canvas.height = Math.max(1, Math.ceil(lineHeight * dpr))

	// setTransform resets the matrix (avoids accumulation when the canvas is reused).
	// Re-apply font after canvas resize — resize resets context state.
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.clearRect(0, 0, textWidth, lineHeight)

	// Draw background then text. In dark mode, flip fg/bg so we can count
	// light pixels as ink — the density measurement stays consistent regardless
	// of whether the page renders dark-on-light or light-on-dark.
	ctx.fillStyle = darkMode ? 'black' : 'white'
	ctx.fillRect(0, 0, textWidth, lineHeight)
	ctx.fillStyle = darkMode ? 'white' : 'black'
	ctx.font = fontStyle
	// Approximate baseline at 75% of line height
	ctx.fillText(text, 0, lineHeight * 0.75)

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
	const data = imageData.data

	let inkPixels = 0
	const totalPixels = canvas.width * canvas.height

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i]
		const g = data[i + 1]
		const b = data[i + 2]
		if (darkMode) {
			// Light-on-dark: count pixels lighter than mid-grey as ink
			if (r > 115 || g > 115 || b > 115) inkPixels++
		} else {
			// Dark-on-light: count pixels darker than mid-grey as ink.
			// Threshold 140 correctly captures antialiased edges at high DPR.
			if (r < 140 || g < 140 || b < 140) inkPixels++
		}
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

	// active:false — skip all processing and restore original HTML immediately
	if ((options.active ?? true) === false) {
		element.innerHTML = originalHTML
		return
	}

	// E-ink / slow-refresh displays (Kindle, Remarkable, etc.) — CSS transitions
	// produce no visible effect but the canvas pixel-counting work still runs.
	// Skip the entire adjustment and restore the original HTML immediately.
	if (window.matchMedia?.('(update: slow)')?.matches) {
		element.innerHTML = originalHTML
		return
	}

	// Save scroll position — iOS Safari does not support overflow-anchor: none
	const scrollY = window.scrollY

	// Resolve options
	const targetDensityOpt = options.targetDensity ?? DEFAULTS.targetDensity
	const method = options.method ?? DEFAULTS.method
	const maxAdjustment = options.maxAdjustment ?? DEFAULTS.maxAdjustment
	const tolerance = options.tolerance ?? DEFAULTS.tolerance
	const calibrationFactor = options.calibrationFactor ?? DEFAULTS.calibrationFactor
	const linePreservation = options.linePreservation ?? 'none'
	const densityMode = options.densityMode ?? 'canvas'
	const mode = options.mode ?? DEFAULTS.mode
	const complexity = options.complexity ?? DEFAULTS.complexity
	const strength = Math.max(0, Math.min(1, options.strength ?? DEFAULTS.strength))

	// Kick off opentype.js load when glyph-path mode is requested
	if (densityMode === 'glyph-path') tryLoadOpentype()

	// Kick off syllable load when readability mode requests it
	if (mode === 'readability' && complexity === 'syllable') tryLoadSyllable()

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

	// Detect dark-mode context: when the background is darker than the text,
	// the canvas pixel-counting must be inverted to count light pixels as ink.
	const computedStyle = getComputedStyle(element)
	const fgLuminance = relativeLuminance(computedStyle.color)
	const bgLuminance = relativeLuminance(computedStyle.backgroundColor)
	const darkMode = bgLuminance < fgLuminance
	const baseWeight = parseFloat(computedStyle.fontWeight) || 400

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

	// --- Pass 3: Group word spans into visual lines ---
	// Canvas path: pretext arithmetic (no forced reflow on resize).
	// BCR path: getBoundingClientRect — ground truth for actual browser layout.

	const lineDetection = options.lineDetection ?? 'bcr'
	if (lineDetection === 'canvas') tryLoadPretext()

	const useCanvas = lineDetection === 'canvas' && _pretext !== null

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

	if (useCanvas) {
		// Canvas path — pretext gives us line texts and widths directly
		const cached = pretextCache.get(element)
		let prepared: unknown
		if (cached && cached.originalHTML === originalHTML) {
			prepared = cached.prepared
		} else {
			prepared = _pretext!.prepareWithSegments(element.textContent ?? '', getCanvasFontStyle(element))
			pretextCache.set(element, { originalHTML, prepared })
		}
		const lineHeight = getLineHeightPx(element)
		const { lines: pretextLines } = _pretext!.layoutWithLines(prepared, containerWidth, lineHeight)

		let si = 0
		for (const pl of pretextLines) {
			const target = pl.text.replace(/\s+/g, ' ').trim()
			const spans: HTMLElement[] = []
			let acc = ''
			while (si < wordSpans.length) {
				const word = (wordSpans[si].textContent ?? '').replace(/\s+/g, ' ').trim()
				acc = acc ? acc + ' ' + word : word
				spans.push(wordSpans[si])
				si++
				if (acc === target) break
			}
			if (spans.length > 0) {
				lines.push({ text: pl.text.trim(), width: pl.width, height: lineHeight, spans })
			}
		}
		while (si < wordSpans.length) {
			lines[lines.length - 1]?.spans.push(wordSpans[si++])
		}
		// Rebuild text for any lines that got extra spans
		for (const line of lines) {
			line.text = line.spans.map((s) => s.textContent ?? '').join('').trim()
		}
	} else {
		// BCR path — batch all reads before any writes
		let currentTop: number | null = null
		let currentLine: LineData | null = null

		for (const span of wordSpans) {
			const bcr = span.getBoundingClientRect()
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

		for (const line of lines) {
			line.text = line.spans.map((s) => s.textContent ?? '').join('').trim()
		}
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
	// Two modes: 'canvas' (default) and 'glyph-path' (opentype.js, exact area).
	// glyph-path falls back to canvas if opentype.js is not loaded or fontUrl is absent.

	const useGlyphPath = densityMode === 'glyph-path' && _opentype !== null && !!options.fontUrl

	// For glyph-path mode, attempt to load the font — use canvas while loading.
	// If the font is already in _fontCache the callback fires synchronously.
	let loadedFont: OpentypeFont | null = null
	if (useGlyphPath) loadFont(options.fontUrl!, (f) => { loadedFont = f })

	const canvas: HTMLCanvasElement = _canvas ?? document.createElement('canvas')

	const densities: number[] = lines.map((line) => {
		if (useGlyphPath && loadedFont) {
			return measureLineDensityGlyph(line.text, loadedFont, fontSize, line.height || fontSize)
		}
		return measureLineDensity(line.text, fontStyle, line.height || fontSize, canvas, darkMode)
	})

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
	// Compute per-line density targets.
	// In 'equalize' mode all lines share the same target.
	// In 'readability' mode, complex lines get a higher target so the algorithm
	// opens them up slightly more; simple lines get a lower target.
	let perLineTargets: number[]

	if (mode === 'readability') {
		// Compute per-line cognitive complexity
		const complexityScores = lines.map((line) => {
			const words = line.text.split(/\s+/).filter(Boolean)
			if (words.length === 0) return 0
			if (complexity === 'syllable' && _syllable !== null) {
				return words.reduce((sum, w) => sum + _syllable!(w), 0) / words.length
			}
			// 'word-length' (default) and 'pos' fallback
			return words.reduce((sum, w) => sum + w.length, 0) / words.length
		})

		const minC = Math.min(...complexityScores)
		const maxC = Math.max(...complexityScores)
		const rangeC = maxC - minC || 1

		// Normalize to [0, 1]. Complex lines get a LOWER density target so the
		// algorithm opens them up (more spacing); simple lines get a higher target
		// so they tighten slightly. Range is ±maxAdjustment×strength at strength=1.
		perLineTargets = complexityScores.map((c) => {
			const nc = (c - minC) / rangeC // 0 = simplest, 1 = most complex
			return targetDensity - (nc - 0.5) * strength * maxAdjustment * 2
		})
	} else {
		perLineTargets = densities.map(() => targetDensity)
	}

	// Per-line adjustment (linear approximation).
	// delta = (density - perLineTarget) * calibrationFactor
	// Dense lines (density > target) → positive delta → open up (more space / lighter weight / narrower).
	// Sparse lines (density < target) → negative delta → tighten (less space / heavier weight / wider).
	// Clamped to ±maxAdjustment (em for spacing, weight units for font-weight, wdth units for font-width).
	const adjustments: number[] = densities.map((density, i) => {
		const delta = (density - perLineTargets[i]) * calibrationFactor
		if (Math.abs(delta) < tolerance) return 0
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
		let lineStyle: string
		if (method === 'font-weight') {
			// Dense lines get positive adj → subtract to lighten; sparse lines get negative adj → add to darken.
			const newWeight = Math.max(1, Math.min(1000, Math.round(baseWeight - adj)))
			lineStyle = `${LINE_STYLE}font-weight:${newWeight};`
		} else if (method === 'font-width') {
			// Dense lines get positive adj → subtract to narrow (less ink); sparse → add to widen.
			// Note: font-variation-settings on child spans replaces the inherited value entirely.
			const newWidth = Math.max(50, Math.min(200, +(100 - adj).toFixed(1)))
			lineStyle = `${LINE_STYLE}font-variation-settings:"wdth" ${newWidth};`
		} else {
			const spacingProp = method === 'word-spacing' ? 'word-spacing' : 'letter-spacing'
			lineStyle = `${LINE_STYLE}${spacingProp}:${adj}em;`
		}

		// Reconstruct line text from spans; trim leading whitespace on each line start.
		// Escape HTML special characters: textContent returns decoded Unicode (e.g. '<'
		// not '&lt;'), so bare < > & would be mis-parsed when assigned to innerHTML.
		const rawLineText = line.spans
			.map((s, si) => {
				const t = s.textContent ?? ''
				return si === 0 ? t.replace(/^[^\S\u00a0]+/, '') : t
			})
			.join('')
		const lineText = rawLineText
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')

		html += `<span class="${GRAY_VALUE_CLASSES.line}" style="${lineStyle}">${lineText}</span>`
		if (i < lines.length - 1) {
			html += `<br data-gv-break="1">`
		}
	})

	element.innerHTML = html

	// --- Optional Pass 8: Scale preservation ---
	// After spacing correction, restore each line to the container's natural width
	// via a CSS scaleX transform. The density correction remains visually present
	// (glyph spacing ratios differ), but lines never overflow or fall short of the edge.
	if (linePreservation === 'scale') {
		const lineSpanEls = Array.from(
			element.querySelectorAll<HTMLElement>(`.${GRAY_VALUE_CLASSES.line}`)
		)
		// Batch read: measure corrected widths in a single layout pass
		const correctedWidths = lineSpanEls.map(span => span.getBoundingClientRect().width)
		// Batch write: apply scaleX to restore each line to containerWidth
		lineSpanEls.forEach((span, i) => {
			const cw = correctedWidths[i]
			if (cw > 0.5 && Math.abs(cw - containerWidth) > 0.5) {
				span.style.width = `${containerWidth}px`
				span.style.transform = `scaleX(${(containerWidth / cw).toFixed(6)})`
				span.style.transformOrigin = 'left center'
			}
		})
	}

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
