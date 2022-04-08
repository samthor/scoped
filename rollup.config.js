import { terser } from "rollup-plugin-terser";

export default [
  {
    input: 'src/polyfill.js',
    output: [
      {
        file: 'dist/polyfill.js',
        format: 'umd'
      },
    ],
    plugins: []
  },
  {
    input: 'src/polyfill.js',
    output: [
      {
        file: 'dist/polyfill.min.js',
        format: 'umd'
      },
    ],
    plugins: [terser()]
  },
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/lib.js',
        format: 'cjs'
      },
      {
        file: 'dist/lib.esm.js',
        format: 'es'
      }
    ],
    plugins: []
  },
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/lib.min.js',
        format: 'cjs'
      },
    ],
    plugins: [terser()]
  },
];