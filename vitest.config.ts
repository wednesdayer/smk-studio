import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/renderer/src/controller/**', 'src/renderer/src/sequencer/**', 'src/renderer/src/state/**', 'src/renderer/src/audio/params.ts', 'src/renderer/src/audio/wav.ts', 'src/renderer/src/runtime/executor.ts'],
      exclude: ['**/*.test.ts', '**/midiAccess.ts']
    }
  }
})
