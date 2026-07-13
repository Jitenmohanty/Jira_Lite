import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Integration tests hit a real Postgres; run files serially to avoid
    // cross-test interference, and allow generous time for DB round-trips.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
