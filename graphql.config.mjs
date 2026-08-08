import { readdirSync } from 'node:fs'

const extensions = {
  'admin': 'gql,graphql,ts,js',
  'customer-account': 'gql,graphql,ts,js,vue',
  'customer': 'gql,graphql,ts,js,vue',
  'account': 'gql,graphql,ts,js,vue',
}

const SCHEMA_SUFFIX = '.schema.json'
const API_VERSION = /^(?:unstable|\d{4}-\d{2})$/

const readSchemaDir = (path) => {
  try {
    return readdirSync(path)
  }
  catch {
    return []
  }
}

const schema = (dir, name) => {
  const path = `${dir}/.nuxt/schema`

  const version = readSchemaDir(path)
    .filter(file => file.startsWith(`${name}.`) && file.endsWith(SCHEMA_SUFFIX))
    .map(file => file.slice(name.length + 1, -SCHEMA_SUFFIX.length))
    .filter(candidate => API_VERSION.test(candidate))
    .sort()
    .at(-1)

  return `${path}/${name}${version ? `.${version}` : ''}${SCHEMA_SUFFIX}`
}

const ignore = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/*.d.ts',
]

const patterns = (dir, name) => [
  `${dir}/**/*.${name}.{${extensions[name]}}`,
  `${dir}/**/${name}.{${extensions[name]}}`,
  `${dir}/**/${name}/**/*.{${extensions[name]}}`,
  `${dir}/**/${name}/*.{${extensions[name]}}`,
  `${dir}/**/(${name})/**/*.{${extensions[name]}}`,
  `${dir}/**/(${name})/*.{${extensions[name]}}`,
]

const storefront = dir => ({
  schema: schema(dir, 'storefront'),
  documents: `${dir}/**/*.{gql,graphql,ts,js,vue}`,
  exclude: [
    ...['admin', 'customer-account', 'customer', 'account'].flatMap(name => patterns(dir, name)),
    ...ignore,
  ],
})

const admin = dir => ({
  schema: schema(dir, 'admin'),
  documents: patterns(dir, 'admin'),
  exclude: ignore,
})

const customerAccount = dir => ({
  schema: schema(dir, 'customer-account'),
  documents: ['customer-account', 'customer', 'account'].flatMap(name => patterns(dir, name)),
  exclude: ignore,
})

export const projects = {
  'playground-v4-admin': admin('playgrounds/playground-v4'),
  'playground-v4-customer-account': customerAccount('playgrounds/playground-v4'),
  'default': storefront('playgrounds/playground-v4'),

  'playground-v4-mock-storefront': storefront('playgrounds/playground-v4-mock'),

  'playground-v3-admin': admin('playgrounds/playground-v3'),
  'playground-v3-storefront': storefront('playgrounds/playground-v3'),

  'template-customer-account': customerAccount('template'),
  'template-storefront': storefront('template'),
  'docs-storefront': storefront('docs'),
}

export default { projects }
