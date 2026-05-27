import type { Metadata } from "next"
import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
	title: "steadyGray — Optical density equalisation for paragraphs | Type Tools",
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: "steadyGray measures the actual ink density of each paragraph line using Canvas pixel sampling, then adjusts letter-spacing to bring all lines to the same optical grey. Zero dependencies.",
	keywords: ["steadygray", "gray value", "optical density", "paragraph color", "letter spacing", "typography", "canvas pixel sampling", "typesetting", "readability", "TypeScript", "npm", "react"],
	openGraph: {
		title: "steadyGray — Optical density equalisation for paragraphs",
		description: "Equalize the visual grey of every paragraph line. Canvas pixel sampling, per-line letter-spacing correction. Zero dependencies.",
		url: "https://steadygray.com",
		siteName: "steadyGray",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "steadyGray — Optical density equalisation for paragraphs",
		description: "Equalize the visual grey of every paragraph line. Canvas pixel sampling, per-line letter-spacing correction. Zero dependencies.",
	},
	metadataBase: new URL("https://steadygray.com"),
	alternates: { canonical: "https://steadygray.com" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`h-full antialiased ${inter.variable}`}>
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	)
}
