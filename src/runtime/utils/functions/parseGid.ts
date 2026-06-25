const GID_REGEXP = /gid:\/\/shopify\/\w*\/(\d+)/

/**
 * Parses a global ID and returns the ID of the record.
 *
 * @param gid a global ID to parse (e.g. 'gid://shopify/HydrogenStorefront/1')
 *
 * @returns the ID of the record (e.g. '1')
 */
export function parseGid(gid: string): string {
  const matches = GID_REGEXP.exec(gid)

  if (matches && matches[1] !== undefined) {
    return matches[1]
  }

  throw new Error(`[shopify] invalid global ID: ${gid}`)
}
