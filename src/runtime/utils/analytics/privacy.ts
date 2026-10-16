import type { TrackingConsent } from '../../../module'

export function canTrack(): boolean {
  if (typeof window === 'undefined') return false

  return window.Shopify?.customerPrivacy?.analyticsProcessingAllowed?.() ?? false
}

export function setTrackingConsent(consent: TrackingConsent, callback?: (result: { error?: string }) => void): void {
  const privacy = typeof window === 'undefined' ? undefined : window.Shopify?.customerPrivacy

  if (!privacy) {
    callback?.({ error: 'The Shopify Customer Privacy API is not available' })

    return
  }

  privacy.setTrackingConsent({ ...consent })
    .then(() => callback?.({}))
    .catch(error => callback?.({ error: error instanceof Error ? error.message : String(error) }))
}

export async function showPreferences(): Promise<void> {
  if (typeof window === 'undefined') return

  await window.privacyBanner?.showPreferences()
}
