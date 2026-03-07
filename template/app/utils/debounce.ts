/* eslint-disable @typescript-eslint/no-explicit-any */
export const debounce = (callback: (...args: any[]) => void, wait: number) => {
    let timeoutId: number | null = null

    return (...args: any[]) => {
        window.clearTimeout(timeoutId!)

        timeoutId = window.setTimeout(() => {
            callback(...args)
        }, wait)
    }
}
