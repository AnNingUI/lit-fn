import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	resolve: {
		alias: { "@": path.resolve(__dirname, "src") },
	},
	build: {
		lib: {
			entry: {
				index: path.resolve(__dirname, "src/index.ts"),
				adaper: path.resolve(__dirname, "src/adaper.ts"),
			},
			name: "LitFn",
			fileName: (format, entryName) => {
				return `${entryName}.${format}.js`;
			},
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["lit"],
			output: {
				globals: {
					lit: "lit",
				},
			},
		},
	},
	plugins: [
		dts({
			outDir: "dist/types",
			insertTypesEntry: true,
		}),
	],
});
