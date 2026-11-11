import { vi } from 'vitest'

export function stubHangingFetch() {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    if (init?.signal?.aborted) reject(init.signal.reason)

    init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))
  }))

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}
