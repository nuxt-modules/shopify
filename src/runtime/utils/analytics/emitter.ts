import type { AnalyticsEmitter } from '../../../module'

export function createEmitter(): AnalyticsEmitter {
  const listeners = new Map<string, Set<(payload: unknown) => void>>()

  return {
    on(event, listener) {
      const fn = listener as (payload: unknown) => void
      const set = listeners.get(event) ?? new Set<(payload: unknown) => void>()

      set.add(fn)
      listeners.set(event, set)

      return () => {
        set.delete(fn)
      }
    },

    emit(event, payload) {
      listeners.get(event)?.forEach((listener) => {
        try {
          listener(payload)
        }
        catch {
          // ignore
        }
      })
    },
  }
}
