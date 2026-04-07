"use client"

import { useState, useDeferredValue } from "react"
import { GrayValueText } from "gray-value"

const SAMPLE = `The colour of a page — the compositor's term for the aggregate grey of the text block — is determined by the ratio of ink to space across every line. A line with many narrow letters sits lighter than one with wide letters and generous spacing. Print compositors corrected this by hand, adjusting word spaces to equalise the grey. No web tool has automated this measurement. Gray Value uses Canvas to sample the actual ink pixels in each rendered line, then adjusts letter-spacing to bring every line to the same optical density. The adjustment is invisible when correct — all you notice is that the paragraph looks even.`

function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs uppercase tracking-widest opacity-50">{label}</span>
			<input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={e => onChange(Number(e.target.value))} onTouchStart={e => e.stopPropagation()} style={{ touchAction: 'none' }} />
			<span className="tabular-nums text-xs opacity-50 text-right">{fmt ? fmt(value) : value}</span>
		</div>
	)
}

export default function Demo() {
	const [maxAdjustment, setMaxAdjustment] = useState(0.05)
	const [calibrationFactor, setCalibrationFactor] = useState(2.0)
	const [method, setMethod] = useState<'letter-spacing' | 'word-spacing'>('letter-spacing')

	const dMax = useDeferredValue(maxAdjustment)
	const dCal = useDeferredValue(calibrationFactor)
	const dMethod = useDeferredValue(method)

	const sampleStyle: React.CSSProperties = {
		fontFamily: "var(--font-merriweather), serif",
		fontSize: "1.125rem",
		lineHeight: "1.8",
	}

	return (
		<div className="w-full">
			<div className="grid grid-cols-2 gap-6 mb-6">
				<Slider label="Max adjustment (em)" value={maxAdjustment} min={0.01} max={0.15} step={0.005} onChange={setMaxAdjustment} fmt={v => v.toFixed(3)} />
				<Slider label="Calibration factor" value={calibrationFactor} min={0.5} max={5} step={0.1} onChange={setCalibrationFactor} fmt={v => v.toFixed(1)} />
			</div>
			<div className="flex flex-wrap items-center gap-3 mb-8">
				<span className="text-xs uppercase tracking-widest opacity-50">Method</span>
				{(['letter-spacing', 'word-spacing'] as const).map(v => (
					<button key={v} onClick={() => setMethod(v)} className="text-xs px-3 py-1 rounded-full border transition-opacity" style={{ borderColor: 'currentColor', opacity: method === v ? 1 : 0.5, background: method === v ? 'var(--btn-bg)' : 'transparent' }}>{v}</button>
				))}
			</div>
			<GrayValueText maxAdjustment={dMax} calibrationFactor={dCal} method={dMethod} style={sampleStyle}>
				{SAMPLE}
			</GrayValueText>
			<p className="text-xs opacity-50 italic mt-6">Each line is measured by pixel density and adjusted by ±{maxAdjustment.toFixed(3)}em via {method}.</p>
		</div>
	)
}
