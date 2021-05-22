import commonjs from '@rollup/plugin-commonjs';
import nativePlugin from 'rollup-plugin-natives';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: false,
  },
  plugins: [
    nativePlugin({
      copyTo: 'dist/libs',
      sourcemap: false,
    }),
    nodeResolve({ preferBuiltins: false }),
    commonjs({ include: ['src/index.ts', 'node_modules/**'] }),
    json(),
    typescript(),
    terser(),
  ],
};
