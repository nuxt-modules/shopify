<script setup lang="ts">
definePageMeta({
    validate: route =>
        typeof route.params.handle === 'string'
        && typeof route.params.article === 'string',
})

const localePath = useLocalePath()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)
const article = computed(() => route.params.article as string)

const { data: blog } = await useStorefrontData(`article-${locale.value}-${handle.value}`, `#graphql
    query FetchBlogArticle($handle: String!, $article: String!) {
        blog(handle: $handle) {
            title
            articleByHandle(handle: $article) {
                ...ArticleFields
            }
        }
    }
    ${ARTICLE_FRAGMENT}
`, {
    variables: {
        handle: handle.value,
        article: article.value,
    },
    transform: data => data?.blog,
})

const articleData = computed(() => blog.value?.articleByHandle)
</script>

<template>
    <UContainer class="py-6 lg:py-8">
        <UBreadcrumb
            :items="[
                { label: 'Blog' },
                { label: blog?.title, to: localePath(`/blog/${handle}`) },
                { label: articleData?.title, to: localePath(`/blog/${handle}/${article}`) },
            ]"
            class="mb-8"
        />

        <div
            class="prose lg:prose-lg max-w-none"
        >
            <h1>
                {{ articleData?.title }}
            </h1>

            <div v-html="articleData?.contentHtml" />
        </div>
    </UContainer>
</template>
