import type { ProviderGetImage } from '@nuxt/image'

export const getImage: ProviderGetImage = (src, { modifiers = {} } = {}) => {
    const url = new URL(src)

    const { width, height } = modifiers

    url.searchParams.append('width', String(width))
    url.searchParams.append('height', String(height))

    return {
        url: url.toString(),
    }
}
