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
}).override('nuxt/vue/rules', {
    rules: {
        'vue/multi-word-component-names': 'off',
    },
}).override('nuxt/stylistic', {
    rules: {
        '@stylistic/array-bracket-spacing': ['error', 'always'],
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
                caseInsensitive: true,
            },
        }],
    },
}).prepend({
    rules: {
        'prefer-template': ['error'],
    },
})
