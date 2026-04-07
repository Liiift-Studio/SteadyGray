import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
	title: "Gray Value — Optical density equalisation for paragraphs",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "Gray Value measures the actual ink density of each paragraph line using Canvas, then adjusts letter-spacing to bring all lines to the same optical grey. The typographer's colour, automated.",
	keywords: ["gray value", "optical density", "letter spacing", "typography", "TypeScript", "npm", "canvas"],
	openGraph: {
		title: "Gray Value — Optical density equalisation for paragraphs",
		description: "Equalize the visual grey of every paragraph line. Canvas pixel sampling, per-line letter-spacing correction.",
		url: "https://gray-value.liiift.studio",
		siteName: "Gray Value",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Gray Value — Optical density equalisation for paragraphs",
		description: "Equalize the visual grey of every paragraph line. Canvas pixel sampling, per-line letter-spacing correction.",
	},
	metadataBase: new URL("https://gray-value.liiift.studio"),
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className="h-full antialiased">
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	)
}
