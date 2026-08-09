export interface GraphqlDefinition {
  kind: 'fragment' | 'operation'
  name?: string
  start: number
  end: number
  text: string
}

const NAME_START = /[_A-Z]/i
const NAME_CHAR = /\w/
const FRAGMENT_SPREAD = /\.{3}\s*(?!on\W)([_A-Za-z]\w*)/g

const OPERATION_KEYWORDS = ['query', 'mutation', 'subscription']

function isKeywordAt(source: string, index: number, keyword: string) {
  if (!source.startsWith(keyword, index)) return false

  const before = source[index - 1]
  const after = source[index + keyword.length]

  return (before === undefined || !NAME_CHAR.test(before))
    && (after === undefined || !NAME_CHAR.test(after))
}

function skipComment(source: string, index: number) {
  while (index < source.length && source[index] !== '\n') index++

  return index
}

function skipString(source: string, index: number) {
  if (source.startsWith('"""', index)) {
    index += 3

    while (index < source.length && !source.startsWith('"""', index)) index++

    return Math.min(index + 3, source.length)
  }

  index++

  while (index < source.length && source[index] !== '"') {
    if (source[index] === '\\') index++
    index++
  }

  return Math.min(index + 1, source.length)
}

function skipInterpolation(source: string, index: number) {
  let depth = 0
  index++

  while (index < source.length) {
    if (source[index] === '{') depth++
    else if (source[index] === '}' && --depth === 0) return index + 1

    index++
  }

  return index
}

function skipIgnored(source: string, index: number) {
  const char = source[index]

  if (char === '#') return skipComment(source, index)
  if (char === '"') return skipString(source, index)
  if (char === '$' && source[index + 1] === '{') return skipInterpolation(source, index)

  return undefined
}

function readName(source: string, index: number) {
  while (index < source.length && /\s/.test(source[index]!)) index++

  if (index >= source.length || !NAME_START.test(source[index]!)) {
    return { name: undefined, end: index }
  }

  const start = index

  while (index < source.length && NAME_CHAR.test(source[index]!)) index++

  return { name: source.slice(start, index), end: index }
}

function readSelectionSet(source: string, index: number) {
  while (index < source.length && source[index] !== '{') {
    const skipped = skipIgnored(source, index)

    if (skipped !== undefined) {
      index = skipped
      continue
    }

    index++
  }

  if (index >= source.length) return -1

  let depth = 0

  while (index < source.length) {
    const skipped = skipIgnored(source, index)

    if (skipped !== undefined) {
      index = skipped
      continue
    }

    if (source[index] === '{') depth++
    else if (source[index] === '}' && --depth === 0) return index + 1

    index++
  }

  return -1
}

export function scanDefinitions(source: string): GraphqlDefinition[] {
  const definitions: GraphqlDefinition[] = []

  let index = 0

  while (index < source.length) {
    const skipped = skipIgnored(source, index)

    if (skipped !== undefined) {
      index = skipped
      continue
    }

    if (isKeywordAt(source, index, 'fragment')) {
      const { name, end: afterName } = readName(source, index + 'fragment'.length)
      const end = readSelectionSet(source, afterName)

      if (name && end > 0) {
        definitions.push({ kind: 'fragment', name, start: index, end, text: source.slice(index, end) })
        index = end
        continue
      }
    }

    const keyword = OPERATION_KEYWORDS.find(entry => isKeywordAt(source, index, entry))

    if (keyword) {
      const { name, end: afterName } = readName(source, index + keyword.length)
      const end = readSelectionSet(source, afterName)

      if (end > 0) {
        definitions.push({ kind: 'operation', name, start: index, end, text: source.slice(index, end) })
        index = end
        continue
      }
    }

    const startsShorthandOperation = source[index] === '{'

    if (startsShorthandOperation) {
      const end = readSelectionSet(source, index)

      if (end > 0) {
        definitions.push({ kind: 'operation', start: index, end, text: source.slice(index, end) })
        index = end
        continue
      }
    }

    index++
  }

  return definitions
}

function stripIgnored(source: string) {
  let index = 0
  let cursor = 0
  let stripped = ''

  while (index < source.length) {
    const skipped = skipIgnored(source, index)

    if (skipped !== undefined) {
      stripped += source.slice(cursor, index)
      index = skipped
      cursor = index
      continue
    }

    index++
  }

  return stripped + source.slice(cursor)
}

export function collectSpreads(source: string): Set<string> {
  const names = new Set<string>()

  for (const [, name] of stripIgnored(source).matchAll(FRAGMENT_SPREAD)) {
    if (name) names.add(name)
  }

  return names
}
