import dts from "vite-plugin-dts";

/** @type {import("vite").UserConfig} */
export default {
  build: {
    lib: {
      entry: "src/polyfill.ts",
      name: "scopedCSS",
      formats: ["umd"],
      fileName: () => "scoped.min.js",
    },
  },
  plugins: [dts()],
};
