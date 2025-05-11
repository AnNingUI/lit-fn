import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	resolve: {
		alias: { "@": "/src" },
	},
	build: {
		lib: {
			entry: "src/index.ts",
			name: "LitFn",
			fileName: (format) => `index.${format}.js`,
			formats: ["es", "cjs", "umd"],
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
