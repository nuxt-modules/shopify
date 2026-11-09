import { vi } from 'vitest'

type LoggerMethod = 'start' | 'success' | 'debug' | 'info' | 'warn' | 'error'

export function createLoggerStub(overrides: Partial<Record<LoggerMethod, (...args: never[]) => unknown>> = {}) {
  return { start: vi.fn(), success: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), ...overrides }
}
