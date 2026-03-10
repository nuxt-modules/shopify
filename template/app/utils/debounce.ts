/* eslint-disable @typescript-eslint/no-explicit-any */
export const debounce = <T extends (...args: any[]) => void>(callback: T, wait: number) => {
    let timeoutId: number | null = null

    return (...args: Parameters<T>) => {
        window.clearTimeout(timeoutId!)

        timeoutId = window.setTimeout(() => {
            callback(...args)
        }, wait)
    }
}
