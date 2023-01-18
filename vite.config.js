import dts from "vite-plugin-dts";

/** @type {import("vite").UserConfig} */
export default {
  build: {
    lib: {
      entry: "src/index.ts",
      name: "scopedCSS",
      formats: ["umd"],
      fileName: "scoped",
    },
  },
  plugins: [dts()],
};
