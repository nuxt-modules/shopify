const extensions = {
  'admin': 'gql,graphql,ts,js',
  'customer-account': 'gql,graphql,ts,js,vue',
  'customer': 'gql,graphql,ts,js,vue',
  'account': 'gql,graphql,ts,js,vue',
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
  schema: `${dir}/.nuxt/schema/storefront.schema.json`,
  documents: `${dir}/**/*.{gql,graphql,ts,js,vue}`,
  exclude: [
    ...['admin', 'customer-account', 'customer', 'account'].flatMap(name => patterns(dir, name)),
    ...ignore,
  ],
})

const admin = dir => ({
  schema: `${dir}/.nuxt/schema/admin.schema.json`,
  documents: patterns(dir, 'admin'),
  exclude: ignore,
})

const customerAccount = dir => ({
  schema: `${dir}/.nuxt/schema/customer-account.schema.json`,
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
