<script setup lang="ts">
// has variables, no transform
const { data: _test1 } = await useStorefrontData('test1', `#graphql
    query Test1($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: { handle: 'test' },
})

// has variables and transform
const { data: _test2 } = await useStorefrontData('test2', `#graphql
    query Test2($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: { handle: 'test' },
    transform: data => data?.collection,
})

// has variables as ref and transform
const { data: _test3 } = await useStorefrontData('test3', `#graphql
    query Test3($handle: String) {
        collection(handle: $handle) {
            id
            title
        }
    }
`, {
    variables: ref({ handle: 'test' }),
    transform: data => data?.collection,
})

// has single variable as ref and headers as ref and transform
const { data: _test4 } = await useStorefrontData('test4', `#graphql
    query Test4($handle: String) {
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

// no variables, no transform
const { data: _test5 } = await useStorefrontData('test5', `#graphql
    query Test5 {
        shop {
            name
        }
    }
`)

// no variables, has transform
const { data: _test6 } = await useStorefrontData('test6', `#graphql
    query Test6 {
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

// variables, has pick
const { data: _test7 } = await useStorefrontData('test7', `#graphql
    query Test7($first: Int!) {
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

// no variables, has pick
const { data: _test8 } = await useStorefrontData('test8', `#graphql
    query Test8 {
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

// no key, no variables, has pick
const { data: _test9 } = await useStorefrontData(`#graphql
    query Test9 {
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

// no key, no variables, has transform
const { data: _test10 } = await useStorefrontData(`#graphql
    query Test10 {
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

// no key, has single variable as ref and headers as ref and transform
const { data: _test11 } = await useStorefrontData(`#graphql
    query Test11($handle: String) {
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
</script>

<template>
    <div>Debug Types</div>
</template>
