// vitest.config.ts — test configuration
import { defineConfig } from 'vitest/config'

const OPTIONAL_PEER_DEPS = ['syllable', '@chenglou/pretext', 'opentype.js']

export default defineConfig({
	plugins: [
		{
			name: 'stub-optional-peer-deps',
			resolveId(id) {
				if (OPTIONAL_PEER_DEPS.includes(id)) return `\0${id}`
			},
			load(id) {
				if (OPTIONAL_PEER_DEPS.some((dep) => id === `\0${dep}`)) return 'export default null'
			},
		},
	],
	test: {
		environment: 'happy-dom',
	},
})
