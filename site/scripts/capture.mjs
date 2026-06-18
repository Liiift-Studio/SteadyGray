// Reproducible README screenshot harness for steadyGray.
// Drives the live demo at http://localhost:<PORT> with Playwright and writes
// retina PNGs to ../assets/. Run with: npm run capture (dev server must be running).
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

// Resolve assets dir relative to this file (site/scripts -> repo-root/assets)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSETS = join(__dirname, "..", "..", "assets")
const PORT = process.env.PORT || "3113"
const BASE = `http://localhost:${PORT}/`

// Background of the demo card, used to letterbox stitched comparisons.
const CARD_BG = "#0c1417"

/** Wait for fonts and a short settle so variable-font axes have rendered. */
async function settle(page) {
	await page.evaluate(() => document.fonts.ready)
	await page.waitForTimeout(450)
}

/** Set the "Max adjustment" range slider to a value and dispatch React's input event. */
async function setMaxAdjustment(page, value) {
	await page.evaluate((v) => {
		const slider = document.querySelector('input[type="range"][aria-label^="Max adjustment"]')
		if (!slider) throw new Error("max adjustment slider not found")
		const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
		setter.call(slider, String(v))
		slider.dispatchEvent(new Event("input", { bubbles: true }))
	}, value)
	// useDeferredValue + ResizeObserver re-run — give the canvas pass time.
	await page.waitForTimeout(700)
}

async function main() {
	const browser = await chromium.launch()
	// Viewport wider than the max-w-2xl demo column (672px) plus its padding, so the
	// paragraph element never overflows horizontally and nothing is clipped on the right.
	const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 820, height: 1700 } })
	await page.goto(BASE, { waitUntil: "networkidle" })
	await settle(page)

	// Clear any stray text selection so highlight bands don't appear in captures.
	await page.evaluate(() => window.getSelection()?.removeAllRanges())

	// The demo paragraph rendered by GrayValueText is the first <p> inside the demo container.
	const paragraph = page.locator(".relative.pb-8 > p").first()

	// Capture-only override: the demo card clips with overflow:hidden, and the per-line
	// letter-spacing correction widens lines a few px past the column. Lift the clip so
	// the full widened lines render (line breaks unchanged); we then clip-capture the
	// real content width. Screenshot-only — does not affect the deployed site.
	await page.addStyleTag({ content: `.rounded-xl { overflow: visible !important; }` })

	// Screenshot a viewport region spanning the paragraph's true content width
	// (clientWidth + any letter-spacing overflow), so no line is clipped on the right.
	async function shootParagraph(path) {
		const box = await paragraph.boundingBox()
		const contentW = await paragraph.evaluate(el => Math.max(el.scrollWidth, el.clientWidth))
		await page.screenshot({
			path,
			clip: { x: Math.max(0, box.x - 2), y: Math.max(0, box.y - 4), width: contentW + 6, height: box.height + 10 },
		})
	}

	// ---- Hero: equalized paragraph (moderate correction; full lines visible) ----
	await setMaxAdjustment(page, 0.04)
	await settle(page)
	await page.evaluate(() => window.getSelection()?.removeAllRanges())
	await shootParagraph(join(ASSETS, "hero.png"))
	console.log("wrote hero.png")

	// Measure per-line ink density (ratio of dark-on-light ink pixels) for the
	// currently rendered paragraph, using the same canvas technique the library uses.
	// Returns an array of { top, height, density } in element-local px.
	async function measureLineDensities() {
		return page.evaluate(() => {
			const p = document.querySelector(".relative.pb-8 > p")
			const cs = getComputedStyle(p)
			// Group child rects into lines by their top offset.
			const range = document.createRange()
			const rects = []
			for (const node of p.childNodes) {
				range.selectNodeContents(node)
				for (const r of range.getClientRects()) rects.push(r)
			}
			const base = p.getBoundingClientRect()
			const lines = new Map()
			for (const r of rects) {
				if (r.width < 2 || r.height < 2) continue
				const key = Math.round(r.top - base.top)
				const cur = lines.get(key) || { top: r.top - base.top, height: r.height, left: Infinity, right: -Infinity }
				cur.left = Math.min(cur.left, r.left - base.left)
				cur.right = Math.max(cur.right, r.right - base.left)
				lines.set(key, cur)
			}
			// Render each line region to a canvas and count ink pixels.
			const out = []
			const sorted = [...lines.values()].sort((a, b) => a.top - b.top)
			for (const ln of sorted) {
				const w = Math.max(1, Math.round(ln.right - ln.left))
				const h = Math.max(1, Math.round(ln.height))
				const cv = document.createElement("canvas")
				cv.width = w; cv.height = h
				const ctx = cv.getContext("2d")
				ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h)
				ctx.fillStyle = "#000"
				ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
				ctx.textBaseline = "alphabetic"
				// Reconstruct the line text from the spans within this vertical band.
				let text = ""
				for (const node of p.childNodes) {
					const el = node.nodeType === 1 ? node : null
					const r = el ? el.getBoundingClientRect() : null
					if (r && Math.abs((r.top - base.top) - ln.top) < ln.height * 0.6) text += (el.textContent || "")
				}
				ctx.fillText(text, 0, h * 0.78)
				const data = ctx.getImageData(0, 0, w, h).data
				let ink = 0
				for (let i = 0; i < data.length; i += 4) { if (data[i] < 128) ink++ }
				out.push({ top: ln.top, height: ln.height, density: ink / (w * h) })
			}
			return out
		})
	}

	// Normalize a set of line densities against a shared min/max so bars are
	// comparable across the before/after panels (this reveals convergence).
	const normalizeShared = (sets) => {
		const all = sets.flat().map(d => d.density)
		const lo = Math.min(...all), hi = Math.max(...all)
		const span = hi - lo || 1
		return sets.map(set => set.map(d => ({ ...d, norm: (d.density - lo) / span })))
	}

	// ---- Before/after: capture the SAME paragraph off vs on, then stitch ----
	// "Off": minimal adjustment ≈ untouched, lines keep their natural uneven colour.
	await setMaxAdjustment(page, 0.005)
	await settle(page)
	await page.evaluate(() => window.getSelection()?.removeAllRanges())
	const beforeBox = await paragraph.boundingBox()
	const beforeDens = await measureLineDensities()
	const beforeBuf = await paragraph.screenshot({ animations: "disabled" })

	// "On": equalization strong enough to converge the meters, gentle enough that
	// lines stay within the column (no right-edge clipping in the overflow-hidden card).
	await setMaxAdjustment(page, 0.045)
	await settle(page)
	await page.evaluate(() => window.getSelection()?.removeAllRanges())
	const afterDensRaw = await measureLineDensities()
	const afterBuf = await paragraph.screenshot()

	// Shared normalization so the bars in both panels share one scale.
	const [beforeNorm, afterNorm] = normalizeShared([beforeDens, afterDensRaw])

	// Build per-line density meters as positioned bars over each capture.
	// Bar length tracks each line's measured ink density (longer = denser line).
	// Spread (variance) of the bars is the "evenness" the tool corrects.
	const meterFor = (dens, imgH, captureH) => {
		const scale = imgH / captureH // CSS px per capture px (capture is element px)
		return dens.map(d => {
			const cy = (d.top + d.height / 2) * scale
			const len = Math.round(30 + d.norm * 80) // 30–110px bar, shared scale
			return `<div class="bar" style="top:${cy}px;width:${len}px"></div>`
		}).join("")
	}

	// Stitch the two captures vertically with labels and density meters.
	const beforeB64 = beforeBuf.toString("base64")
	const afterB64 = afterBuf.toString("base64")
	const w = Math.round(beforeBox.width)
	const imgW = w // displayed at native element width
	const beforeImgH = Math.round((beforeBox.height)) // element px ≈ display px at 1x
	const afterBox = await paragraph.boundingBox()
	const afterImgH = Math.round(afterBox.height)
	const METER_W = 130
	const total = w + METER_W
	await page.setViewportSize({ width: total + 64, height: 1700 })
	await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
		<style>
			:root { color-scheme: dark }
			body { margin:0; background:${CARD_BG}; font-family: ui-sans-serif, system-ui, sans-serif; }
			.wrap { width:${total}px; margin:0 auto; padding:28px 0; }
			.lbl { font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#7fa6b0; margin:0 0 12px; }
			.panel { margin-bottom:34px; }
			.row { position:relative; display:flex; align-items:flex-start; }
			.text { width:${imgW}px; position:relative; }
			.text img { display:block; width:${imgW}px; height:auto; }
			.meters { position:relative; width:${METER_W}px; }
			.bar { position:absolute; left:14px; height:6px; transform:translateY(-50%); border-radius:3px; background:#7fd0c4; }
			.metlbl { font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:#5e818b; margin:0 0 0 14px; }
			.rule { height:1px; background:rgba(127,166,176,0.18); margin:6px 0 30px; }
		</style></head><body><div class="wrap" id="cap">
			<div class="panel">
				<p class="lbl">Before — uneven line density</p>
				<div class="row"><div class="text"><img src="data:image/png;base64,${beforeB64}"></div>
				<div class="meters" style="height:${beforeImgH}px"><p class="metlbl">ink / line</p>${meterFor(beforeNorm, beforeImgH, beforeBox.height)}</div></div>
			</div>
			<div class="rule"></div>
			<div class="panel">
				<p class="lbl">After — equalized by steadyGray</p>
				<div class="row"><div class="text"><img src="data:image/png;base64,${afterB64}"></div>
				<div class="meters" style="height:${afterImgH}px"><p class="metlbl">ink / line</p>${meterFor(afterNorm, afterImgH, afterBox.height)}</div></div>
			</div>
		</div></body></html>`)
	await page.waitForTimeout(300)
	await page.locator("#cap").screenshot({ path: join(ASSETS, "before-after.png") })
	console.log("wrote before-after.png")

	await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
