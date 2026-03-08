<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
})

const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { data: blog } = await useStorefrontData(`blog-${locale.value}-${handle.value}`, `#graphql
    query FetchBlog($handle: String) {
        blog(handle: $handle) {
            ...BlogFields
        }
    }
    ${BLOG_FRAGMENT}
`, {
    variables: {
        handle: handle.value,
    },
    transform: data => data?.blog,
    cache: 'long',
})
</script>

<template>
    <UContainer class="py-6 lg:py-8">
        <UBreadcrumb
            :items="[
                { label: 'Blog' },
                { label: blog?.title, to: localePath(`/blog/${handle}`) },
            ]"
            class="mb-6 lg:mb-8"
        />

        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
            {{ blog?.title }}
        </h1>

        <UBlogPosts>
            <UBlogPost
                v-for="article in flattenConnection(blog?.articles)"
                :key="article.id"
                :title="article.title"
                :date="article.publishedAt"
                :description="article.excerpt ?? undefined"
                :to="localePath(`/blog/${handle}/${article.handle}`)"
            />
        </UBlogPosts>
    </UContainer>
</template>
