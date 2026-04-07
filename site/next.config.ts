import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
	turbopack: {
		// Set workspace root to the monorepo parent so Turbopack can resolve
		// sibling packages (e.g. ../package.json, @liiift-studio/gray-value)
		root: path.resolve(__dirname, ".."),
	},
};
export default nextConfig;
