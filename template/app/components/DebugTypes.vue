<script setup lang="ts">
// This should work (has variables, no transform)
const { data: _test1 } = await useAsyncStorefront('test1', `#graphql
    query TestWithVariables1($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: { handle: 'test' },
})

// This should work (has variables and transform)
const { data: _test2 } = await useAsyncStorefront('test2', `#graphql
    query TestWithVariables2($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: { handle: 'test' },
    transform: data => data?.collection,
})

// This should work (has variables as maybeRef and transform)
const { data: _test23 } = await useAsyncStorefront('test23', `#graphql
    query TestWithVariables23($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: ref({ handle: 'test' }),
    transform: data => data?.collection,
})

// This should work (has single variable as maybeRef and transform and headers as maybeRef)
const { data: _test24 } = await useAsyncStorefront('test24', `#graphql
    query TestWithVariables24($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: { handle: ref('test') },
    headers: ref({
        'X-Test-Header': 'test-value',
    }),
    transform: data => data?.collection,
})

// This should work (no variables, no transform)
const { data: _test3 } = await useAsyncStorefront('test3', `#graphql
    query TestNoVariables1 {
        shop {
            name
        }
    }
`)

// This FAILS (no variables, has transform)
const { data: _test4 } = await useAsyncStorefront('test4', `#graphql
    query TestNoVariables2 {
        shop {
            name
        }
    }
`, {
    transform: data => data?.shop?.name,
    headers: {
        'X-Test-Header': 'test-value',
    },
})

// This should work (variables, has pick)
const { data: _test5 } = await useAsyncStorefront('test5', `#graphql
    query TestNoVariables3($first: Int!) {
        shop {
            name
        }
        products(first: $first) {
            edges {
                node {
                    id
                }
            }
        }
    }
`, {
    pick: ['shop'],
    variables: { first: 10 },
})

// This FAILS (no variables, has pick)
const { data: _test6 } = await useAsyncStorefront('test6', `#graphql
    query TestNoVariables4 {
        shop {
            name
        }
        products(first: 1) {
            edges {
                node {
                    id
                }
            }
        }
    }
`, {
    pick: ['shop'],
})
</script>

<template>
    <div>Debug Types</div>
</template>
