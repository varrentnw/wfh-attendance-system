import { defineConfig } from 'vitest/config';

// Unit tests cover logic that needs no database or framework.
// The flows that span services are covered by the browser tests in ../e2e.
export default defineConfig({
  test: {
    include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
  },
});
