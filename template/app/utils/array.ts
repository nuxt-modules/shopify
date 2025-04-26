export function chunk<T>(arr: Array<T>, size: number): Array<Array<T>> {
    const res: Array<Array<T>> = []

    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, size + i))
    }
    return res
}
