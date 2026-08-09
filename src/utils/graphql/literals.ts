export interface GraphqlLiteral {
  start: number
  end: number
  content: string
  binding?: string
}

const INLINE_MARKER = /^\s*#graphql\s*\n/i
const PRECEDING_MARKER = /\/\*\s*GraphQL\s*\*\/\s*$/i
const ASSIGNED_BINDING = /(?:const|let|var)\s+(\w+)\s*=\s*$/

const DIVISION_OPERAND_END = /[)\]}\w$]/

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete',
  'void', 'throw', 'case', 'do', 'else', 'yield', 'await',
])

function startsRegexLiteral(code: string, index: number) {
  let previous = index - 1

  while (previous >= 0 && /\s/.test(code[previous]!)) previous--

  const preceding = code[previous]

  if (preceding === undefined) return true
  if (!DIVISION_OPERAND_END.test(preceding)) return true

  let wordStart = previous

  while (wordStart >= 0 && /\w/.test(code[wordStart]!)) wordStart--

  return REGEX_PRECEDING_KEYWORDS.has(code.slice(wordStart + 1, previous + 1))
}

function skipRegexLiteral(code: string, index: number) {
  let insideCharacterClass = false

  index++

  while (index < code.length) {
    const char = code[index]

    if (char === '\\') {
      index += 2
      continue
    }

    if (char === '\n') return index
    if (char === '[') insideCharacterClass = true
    else if (char === ']') insideCharacterClass = false
    else if (char === '/' && !insideCharacterClass) return index + 1

    index++
  }

  return index
}

function findLiteralEnd(code: string, start: number) {
  let index = start

  while (index < code.length) {
    const char = code[index]

    if (char === '\\') {
      index += 2
      continue
    }

    if (char === '`') return index

    if (char === '$' && code[index + 1] === '{') {
      let depth = 0
      index++

      while (index < code.length) {
        const inner = code[index]

        if (inner === '{') depth++
        else if (inner === '}' && --depth === 0) break
        else if (inner === '`') index = findLiteralEnd(code, index + 1)
        else if (inner === '\'' || inner === '"') {
          const quote = inner
          index++

          while (index < code.length && code[index] !== quote) {
            if (code[index] === '\\') index++
            index++
          }
        }

        index++
      }

      continue
    }

    index++
  }

  return index
}

export function findGraphqlLiterals(code: string): GraphqlLiteral[] {
  const literals: GraphqlLiteral[] = []

  let index = 0

  while (index < code.length) {
    const char = code[index]

    if (char === '/' && code[index + 1] === '/') {
      while (index < code.length && code[index] !== '\n') index++
      continue
    }

    if (char === '/' && code[index + 1] === '*') {
      const close = code.indexOf('*/', index + 2)
      index = close === -1 ? code.length : close + 2
      continue
    }

    if (char === '/' && startsRegexLiteral(code, index)) {
      index = skipRegexLiteral(code, index)
      continue
    }

    if (char === '\'' || char === '"') {
      const quote = char
      index++

      while (index < code.length && code[index] !== quote) {
        if (code[index] === '\\') index++
        index++
      }

      index++
      continue
    }

    if (char === '`') {
      const start = index + 1
      const end = findLiteralEnd(code, start)
      const content = code.slice(start, end)
      const preceding = code.slice(0, index)

      const isGraphql = INLINE_MARKER.test(content) || PRECEDING_MARKER.test(preceding)

      if (isGraphql) {
        literals.push({
          start,
          end,
          content,
          binding: preceding.trimEnd().match(ASSIGNED_BINDING)?.[1],
        })
      }

      index = end + 1
      continue
    }

    index++
  }

  return literals
}
