/**
 * Flattens a GraphQL connection object by extracting its nodes.
 *
 * @param connection - The object containing edges or nodes
 *
 * @returns An array of nodes
 */
export const flattenConnection = <T>(
  connection?: {
    edges?: ({ node: T } | null)[]
    nodes?: (T | null)[]
  } | null,
): T[] => {
  if (Array.isArray(connection?.edges)) {
    return connection.edges.flatMap(edge => edge?.node == null ? [] : [edge.node])
  }

  if (Array.isArray(connection?.nodes)) {
    return connection.nodes.flatMap(node => node == null ? [] : [node])
  }

  return []
}
