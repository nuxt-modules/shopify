export function windowRef<T = object>(): typeof globalThis & T {
  return window as unknown as typeof globalThis & T
}

export function waitFor<T>(getter: () => T | null, timeoutMs = 8000): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = getter()

    if (existing) {
      resolve(existing)
      return
    }

    const start = Date.now()

    const interval = setInterval(() => {
      const value = getter()

      if (value || Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(value)
      }
    }, 50)
  })
}
