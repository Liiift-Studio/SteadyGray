// steadyGray/src/react/useGrayValue.ts — React hook
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { applyGrayValue, getCleanHTML } from '../core/adjust'
import type { GrayValueOptions } from '../core/types'

/**
 * React hook that applies the gray-value effect to a ref'd element.
 * Automatically re-runs on resize (width changes only).
 */
export function useGrayValue(options: GrayValueOptions) {
	const ref = useRef<HTMLElement>(null)
	const originalHTMLRef = useRef<string | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const { maxAdjustment, calibrationFactor, method, tolerance, targetDensity, lineDetection } = options

	const run = useCallback(() => {
		const el = ref.current
		if (!el) return
		if (originalHTMLRef.current === null) {
			originalHTMLRef.current = getCleanHTML(el)
		}
		applyGrayValue(el, originalHTMLRef.current, optionsRef.current)
	}, [maxAdjustment, calibrationFactor, method, tolerance, targetDensity, lineDetection])

	useLayoutEffect(() => {
		run()

		let lastWidth = 0
		let rafId = 0
		const ro = new ResizeObserver((entries) => {
			const w = Math.round(entries[0].contentRect.width)
			if (w === lastWidth) return
			lastWidth = w
			cancelAnimationFrame(rafId)
			rafId = requestAnimationFrame(run)
		})
		ro.observe(ref.current!)
		return () => {
			ro.disconnect()
			cancelAnimationFrame(rafId)
		}
	}, [run])


	// Rerun after all fonts finish loading — measurements taken before font-swap
	// produce wrong results (Canvas glyph metrics use the fallback font).
	useEffect(() => {
		document.fonts.ready.then(run)
	}, [run])

	return ref
}
