export function isInstalled(id: string): boolean {
  try {
    import.meta.resolve(id)
    return true
  }
  catch {
    return false
  }
}
