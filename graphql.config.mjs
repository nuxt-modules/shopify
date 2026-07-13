const extensionMap = {
  'admin': 'gql,graphql,ts,js',
  'customer-account': 'gql,graphql,ts,js,vue',
  'customer': 'gql,graphql,ts,js,vue',
  'account': 'gql,graphql,ts,js,vue',
}

const excludeFor = dir => [
  ...Object.entries(extensionMap).flatMap(([name, exts]) => [
    `${dir}/**/*.${name}.{${exts}}`,
    `${dir}/**/${name}.{${exts}}`,
    `${dir}/**/${name}/**/*.{${exts}}`,
    `${dir}/**/${name}/*.{${exts}}`,
    `${dir}/**/(${name})/**/*.{${exts}}`,
    `${dir}/**/(${name})/*.{${exts}}`,
  ]),
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/*.d.ts',
]

const project = dir => ({
  schema: `${dir}/.nuxt/schema/storefront.schema.json`,
  documents: `${dir}/**/*.{gql,graphql,ts,js,vue}`,
  exclude: excludeFor(dir),
})

export const projects = {
  'default': project('playgrounds/playground-v4'),
  'playground-v4-mock': project('playgrounds/playground-v4-mock'),
  'playground-v3': project('playgrounds/playground-v3'),
  'template': project('template'),
  'docs': project('docs'),
}

export default { projects }
