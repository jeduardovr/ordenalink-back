import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Each file boots the whole app and registers businesses (bcrypt cost 12),
    // and files run in parallel: the 5 s / 10 s defaults are too tight.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
