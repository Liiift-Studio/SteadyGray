import Demo from "@/components/Demo"
import CopyInstall from "@/components/CopyInstall"
import CodeBlock from "@/components/CodeBlock"
import ToolDirectory from "@/components/ToolDirectory"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-widest opacity-50">steadygray</p>
					<h1 className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-merriweather), serif", fontVariationSettings: '"wght" 300, "opsz" 144', lineHeight: "1.05em" }}>
						Even colour,<br />
						<span style={{ opacity: 0.5, fontStyle: "italic" }}>line by line.</span>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall />
					<a href="https://github.com/Liiift-Studio/SteadyGray" className="text-sm opacity-50 hover:opacity-100 transition-opacity">GitHub</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-50 tracking-wide">
					<span>TypeScript</span><span>·</span><span>Canvas pixel sampling</span><span>·</span><span>React + Vanilla JS</span>
				</div>
				<p className="text-base opacity-60 leading-relaxed max-w-lg">
					Compositors call it colour — the aggregate grey of a text block. When some lines are denser than others, the paragraph looks uneven. Gray Value measures ink pixel density per line using Canvas and adjusts letter-spacing until the paragraph has even colour throughout.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<p className="text-xs uppercase tracking-widest opacity-50">Live demo</p>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "rgba(0,0,0,0.25)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">How it works</p>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed opacity-70">
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Canvas pixel sampling</p>
						<p>Each line of text is rendered to an off-screen Canvas at the correct font size and weight. The pixel data is read and ink pixels are counted. The ratio of ink to total pixels gives the line&apos;s optical density.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Per-line spacing correction</p>
						<p>The average density across all lines becomes the target. Each line gets a letter-spacing adjustment proportional to its deviation from the target, clamped to the maxAdjustment limit. The correction is re-run on resize.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex items-baseline gap-4">
					<p className="text-xs uppercase tracking-widest opacity-50">Usage</p>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Drop-in component</p>
						<CodeBlock code={`import { GrayValueText } from '@liiift-studio/steadygray'

<GrayValueText maxAdjustment={0.05} calibrationFactor={2}>
  Your paragraph text here...
</GrayValueText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Hook</p>
						<CodeBlock code={`import { useGrayValue } from '@liiift-studio/steadygray'

const ref = useGrayValue({ maxAdjustment: 0.05, calibrationFactor: 2 })
<p ref={ref}>{children}</p>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Vanilla JS</p>
						<CodeBlock code={`import { applyGrayValue, removeGrayValue, getCleanHTML } from '@liiift-studio/steadygray'

const el = document.querySelector('p')
const original = getCleanHTML(el)
applyGrayValue(el, original, { maxAdjustment: 0.05, calibrationFactor: 2 })

// Later — restore original:
removeGrayValue(el, original)`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Options</p>
						<table className="w-full text-xs">
							<thead><tr className="opacity-50 text-left"><th className="pb-2 pr-6 font-normal">Option</th><th className="pb-2 pr-6 font-normal">Default</th><th className="pb-2 font-normal">Description</th></tr></thead>
							<tbody className="opacity-70">
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">targetDensity</td><td className="py-2 pr-6">&apos;auto&apos;</td><td className="py-2">Target density ratio (0–1). &apos;auto&apos; uses the average of all lines.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">method</td><td className="py-2 pr-6">&apos;letter-spacing&apos;</td><td className="py-2">CSS property to adjust: &apos;letter-spacing&apos; or &apos;word-spacing&apos;.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">maxAdjustment</td><td className="py-2 pr-6">0.05</td><td className="py-2">Max spacing correction in em units.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">tolerance</td><td className="py-2 pr-6">0.01</td><td className="py-2">Minimum density difference required before a correction is applied. Adjustments smaller than this threshold are skipped.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">calibrationFactor</td><td className="py-2 pr-6">2.0</td><td className="py-2">Strength of the correction. Higher = more aggressive.</td></tr>
								<tr className="border-t border-white/10 hover:bg-white/5 transition-colors"><td className="py-2 pr-6 font-mono">lineDetection</td><td className="py-2 pr-6">&apos;bcr&apos;</td><td className="py-2">&apos;bcr&apos; reads actual browser layout — ground truth, works with any font and inline HTML. &apos;canvas&apos; uses <a href="https://github.com/chenglou/pretext" className="underline opacity-70">@chenglou/pretext</a> for arithmetic line breaking with no forced reflow on resize. Install pretext separately.</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<SiteFooter current="steadyGray" npmVersion={version} siteVersion={siteVersion} />

		</main>
	)
}
