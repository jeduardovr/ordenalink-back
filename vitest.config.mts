import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC compiles the tests: esbuild (Vitest's default) doesn't emit decorator
// metadata, and Nest's dependency injection needs it.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
