// OG image for steadygray.com — generated at build time via next/og
// Satori (used by ImageResponse) supports TTF and WOFF but not WOFF2.
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'steadyGray — Optical density equalisation for paragraphs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
	const interLight = await readFile(join(process.cwd(), 'public/fonts/inter-300.woff'))
	return new ImageResponse(
		(
			<div style={{ background: '#001622', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', fontFamily: 'Inter, sans-serif' }}>
				{/* Label */}
				<span style={{ fontSize: 13, letterSpacing: '0.18em', color: '#a6bcc0', textTransform: 'uppercase' }}>steadyGray</span>

				{/* Even-colour bar preview + headline */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
						{[1, 1, 1, 1, 0.7].map((scale, i) => (
							<div key={i} style={{ width: `${scale * 540}px`, height: 3, background: i < 4 ? '#a6bcc0' : '#273031', borderRadius: 2 }} />
						))}
					</div>
					<div style={{ fontSize: 76, color: '#eff7f8', lineHeight: 1.06, fontWeight: 300 }}>Even colour,</div>
					<div style={{ fontSize: 76, color: '#a6bcc0', lineHeight: 1.06, fontWeight: 300 }}>line by line.</div>
				</div>

				{/* Footer */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
					<div style={{ fontSize: 14, color: '#a6bcc0', letterSpacing: '0.04em', display: 'flex', gap: 20 }}>
						<span>TypeScript</span>
						<span style={{ opacity: 0.4 }}>·</span>
						<span>Canvas pixel sampling</span>
						<span style={{ opacity: 0.4 }}>·</span>
						<span>React + Vanilla JS</span>
					</div>
					<div style={{ fontSize: 13, color: '#859699', letterSpacing: '0.04em' }}>steadygray.com</div>
				</div>
			</div>
		),
		{ ...size, fonts: [{ name: 'Inter', data: interLight, style: 'normal', weight: 300 }] },
	)
}
