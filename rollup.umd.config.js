import { uglify } from 'rollup-plugin-uglify';

const umdConfig = {
  output: {
    format: 'umd',
    name: 'scoped',
  },
  plugins: []
};

if (process.env.NODE_ENV === 'production') {
  umdConfig.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
    })
  );
}

export default umdConfig;