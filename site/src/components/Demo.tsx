"use client"

import { useState, useDeferredValue, useRef } from "react"
import { GrayValueText } from "@liiift-studio/steadygray"

const SAMPLE = `The colour of a page — the compositor's term for the aggregate grey of the text block — is determined by the ratio of ink to space across every line. A line with many narrow letters sits lighter than one with wide letters and generous spacing. Print compositors corrected this by hand, adjusting word spaces to equalise the grey. No web tool has automated this measurement. Gray Value uses Canvas to sample the actual ink pixels in each rendered line, then adjusts letter-spacing to bring every line to the same optical density. The adjustment is invisible when correct — all you notice is that the paragraph looks even.`

const INSPECTOR_R = 96

function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs uppercase tracking-widest opacity-50">{label}</span>
			<input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={e => onChange(Number(e.target.value))} onTouchStart={e => e.stopPropagation()} style={{ touchAction: 'none' }} />
			<span className="tabular-nums text-xs opacity-50 text-right">{fmt ? fmt(value) : value}</span>
		</div>
	)
}

/** Before/after toggle — left half = without effect, right half filled = with effect */
function BeforeAfterToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			aria-label="Toggle before/after comparison"
			title={active ? 'Hide comparison' : 'Compare without effect'}
			style={{
				position: 'absolute', bottom: 0, right: 0,
				width: 32, height: 32, borderRadius: '50%',
				border: '1px solid currentColor',
				opacity: active ? 0.8 : 0.25,
				background: 'transparent',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				cursor: 'pointer', transition: 'opacity 0.15s ease',
			}}
		>
			<svg width="14" height="10" viewBox="0 0 14 10" fill="none">
				<rect x="0.5" y="0.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1"/>
				<line x1="7" y1="0.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1"/>
				<rect x="8" y="1.5" width="5" height="7" fill="currentColor"/>
			</svg>
		</button>
	)
}

export default function Demo() {
	const [maxAdjustment, setMaxAdjustment] = useState(0.05)
	const [calibrationFactor, setCalibrationFactor] = useState(2.0)
	const [method, setMethod] = useState<'letter-spacing' | 'word-spacing'>('letter-spacing')
	const [beforeAfter, setComparing] = useState(false)

	// Blur circle position as fraction of container (0–1)
	const [circlePos, setCirclePos] = useState({ x: 0.5, y: 0.5 })
	const dragging = useRef(false)
	const containerRef = useRef<HTMLDivElement>(null)

	const handleCirclePointerDown = (e: React.PointerEvent) => {
		e.currentTarget.setPointerCapture(e.pointerId)
		dragging.current = true
	}
	const handleCirclePointerMove = (e: React.PointerEvent) => {
		if (!dragging.current || !containerRef.current) return
		const rect = containerRef.current.getBoundingClientRect()
		setCirclePos({
			x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
			y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
		})
	}
	const handleCirclePointerUp = () => { dragging.current = false }

	const dMax = useDeferredValue(maxAdjustment)
	const dCal = useDeferredValue(calibrationFactor)
	const dMethod = useDeferredValue(method)

	const sampleStyle: React.CSSProperties = {
		fontFamily: "var(--font-merriweather), serif",
		fontSize: "1.125rem",
		lineHeight: "1.8",
		fontVariationSettings: '"wght" 300, "opsz" 18, "wdth" 100',
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

			{/* Inspector wrapper — draggable blur circle; compare overlay and button sit inside */}
			<div
				ref={containerRef}
				className="relative pb-8"
			>
				<GrayValueText maxAdjustment={dMax} calibrationFactor={dCal} method={dMethod} style={sampleStyle}>
					{SAMPLE}
				</GrayValueText>
				{beforeAfter && (
					<p aria-hidden style={{ ...sampleStyle, position: 'absolute', top: 0, left: 0, width: '100%', margin: 0, opacity: 0.25, pointerEvents: 'none' }}>{SAMPLE}</p>
				)}
				<div
					aria-label="Drag to inspect"
					onPointerDown={handleCirclePointerDown}
					onPointerMove={handleCirclePointerMove}
					onPointerUp={handleCirclePointerUp}
					style={{
						position: 'absolute',
						left: `${circlePos.x * 100}%`,
						top: `${circlePos.y * 100}%`,
						transform: 'translate(-50%, -50%)',
						width: INSPECTOR_R * 2,
						height: INSPECTOR_R * 2,
						borderRadius: '50%',
						backdropFilter: 'blur(7px)',
						WebkitBackdropFilter: 'blur(7px)',
						border: '1px solid rgba(255,255,255,0.15)',
						boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
						cursor: 'grab',
						touchAction: 'none',
					}}
				/>
				<BeforeAfterToggle active={beforeAfter} onClick={() => setComparing(v => !v)} />
			</div>

			<p className="text-xs opacity-50 italic mt-8" style={{ lineHeight: "1.8" }}>Each line is measured by pixel density and adjusted by ±{maxAdjustment.toFixed(3)}em via {method}.</p>
		</div>
	)
}
