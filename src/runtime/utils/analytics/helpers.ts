export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8

    return value.toString(16)
  })
}

export function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))

  return match ? decodeURIComponent(match[1]!) : undefined
}

export function setCookie(name: string, value: string, maxAgeMs: number, domain?: string): void {
  const expires = new Date(Date.now() + maxAgeMs).toUTCString()

  let cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`

  if (domain) cookie += `; domain=${domain}`

  document.cookie = cookie
}

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
