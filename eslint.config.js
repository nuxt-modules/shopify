import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
    features: {
        tooling: true,
        typescript: {
            strict: true,
        },
        stylistic: {
            indent: 4,
            semi: false,
        },
    },
}).override('nuxt/import/rules', {
    rules: {
        'import/order': ['error', {
            'groups': [
                'type',
                ['builtin', 'external'],
                ['internal', 'parent', 'sibling', 'index', 'object'],
            ],
            'newlines-between': 'always',
            'alphabetize': {
                order: 'asc',
            },
        }],
    },
})
